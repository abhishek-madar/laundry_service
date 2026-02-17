const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

// MongoDB connection caching for serverless (prevents reconnecting on every function call)
let cachedDb = null;
let isConnected = false;

async function connectToDatabase() {
  if (cachedDb && isConnected) {
    return cachedDb;
  }
  
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  try {
    cachedDb = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "freshclean",
    });
    isConnected = true;
    console.log("Connected to MongoDB Atlas");
    return cachedDb;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

const app = express();

console.log("Starting server...");
console.log(
  "MONGODB_URI status:",
  process.env.MONGODB_URI ? "✅ Defined" : "❌ Not defined",
);
console.log(
  "JWT_SECRET status:",
  process.env.JWT_SECRET ? "✅ Defined" : "❌ Not defined",
);

// Note: Database connection is handled lazily in each API route
// This is optimized for serverless environments like Vercel

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // Also allow localhost for development and Vercel for production
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
      ];
      
      // Allow Vercel production domains
      if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for API calls
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend")));

const JWT_SECRET = process.env.JWT_SECRET;
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  walletBalance: { type: Number, default: 500 },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  pickupTime: { type: String, required: true },
  serviceType: { type: String, required: true },
  weight: { type: Number, required: true },
  express: { type: Boolean, default: false },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, default: "scheduled" },
  createdAt: { type: Date, default: Date.now },
});

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  paymentMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const feedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  orderId: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true },
  serviceQuality: { type: Number, min: 1, max: 5 },
  recommend: { type: String, enum: ["yes", "no"] },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Order = mongoose.model("Order", orderSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

const authMiddleware = async (req, res, next) => {
  try {
    // Connect to database for each request (lazy connection for serverless)
    await connectToDatabase();
    
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId }).select(
      "-password",
    );
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
app.post("/api/auth/signup", async (req, res) => {
  console.log("Signup request received:", req.body);
  try {
    // Connect to database for each request (lazy connection for serverless)
    await connectToDatabase();
    
    const { name, email, phone, address, password } = req.body;
    if (!name || !email || !phone || !address || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      walletBalance: 500,
    });

    await user.save();
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const userResponse = user.toObject();
    delete userResponse.password;

    res
      .status(201)
      .json({
        message: "User created successfully",
        token,
        user: userResponse,
      });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  console.log("Login request received:", req.body.email);
  try {
    // Connect to database for each request (lazy connection for serverless)
    await connectToDatabase();
    
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: "Login successful", token, user: userResponse });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/users/profile", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/users/profile", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const { name, phone, address, password } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: "Profile updated successfully", user: userResponse });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/users/add-money", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const { amount, paymentMethod } = req.body;
    if (!amount || amount < 100 || amount > 10000) {
      return res
        .status(400)
        .json({ message: "Amount must be between ₹100 and ₹10,000" });
    }

    const user = await User.findById(req.user._id);
    user.walletBalance += amount;
    await user.save();

    const transaction = new Transaction({
      userId: user._id.toString(),
      type: "credit",
      amount,
      description: "Wallet Top-up",
      paymentMethod,
    });
    await transaction.save();

    res.json({
      message: "Money added successfully",
      newBalance: user.walletBalance,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/users/transactions", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const transactions = await Transaction.find({
      userId: req.user._id.toString(),
    })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const {
      name,
      phone,
      address,
      pickupDate,
      pickupTime,
      serviceType,
      weight,
      express,
      totalAmount,
      paymentMethod,
    } = req.body;

    if (
      !name ||
      !phone ||
      !address ||
      !pickupDate ||
      !pickupTime ||
      !serviceType ||
      !weight ||
      !totalAmount ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(req.user._id);

    if (paymentMethod === "wallet") {
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      user.walletBalance -= totalAmount;
      await user.save();

      const transaction = new Transaction({
        userId: user._id.toString(),
        type: "debit",
        amount: totalAmount,
        description: "Laundry Service Payment",
        paymentMethod: "wallet",
      });
      await transaction.save();
    }

    const order = new Order({
      userId: user._id.toString(),
      name,
      phone,
      address,
      pickupDate: new Date(pickupDate),
      pickupTime,
      serviceType,
      weight,
      express: express || false,
      totalAmount,
      paymentMethod,
      status: "scheduled",
    });

    await order.save();
    res
      .status(201)
      .json({
        message: "Order created successfully",
        order,
        newBalance: user.walletBalance,
      });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const orders = await Order.find({ userId: req.user._id.toString() }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/api/feedback", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const { orderId, rating, comments, serviceQuality, recommend } = req.body;

    if (!rating || !comments) {
      return res
        .status(400)
        .json({ message: "Rating and comments are required" });
    }

    const feedback = new Feedback({
      userId: req.user._id.toString(),
      orderId: orderId || null,
      rating,
      comments,
      serviceQuality: serviceQuality || null,
      recommend: recommend || "yes",
    });

    await feedback.save();
    res
      .status(201)
      .json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/feedback", authMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const feedbacks = await Feedback.find({
      userId: req.user._id.toString(),
    }).sort({ createdAt: -1 });

    const feedbacksWithDetails = await Promise.all(
      feedbacks.map(async (feedback) => {
        let orderDetails = "General Feedback";
        if (feedback.orderId) {
          const order = await Order.findById(feedback.orderId);
          if (order) {
            const serviceName =
              order.serviceType === "dry-clean"
                ? "Dry Cleaning"
                : "Wash & Fold";
            orderDetails = `Order #${order._id.toString().slice(-6)} - ${serviceName}`;
          }
        }
        return { ...feedback.toObject(), orderDetails };
      }),
    );

    res.json(feedbacksWithDetails);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "FreshClean API is running" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    await connectToDatabase();
    const userCount = await User.countDocuments();
    res.json({
      status: "success",
      message: "Database connected successfully",
      userCount: userCount,
      database: mongoose.connection.name,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Export for Vercel serverless
module.exports = app;
