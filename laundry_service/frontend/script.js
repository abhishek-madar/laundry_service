// API Base URL - uses relative path for production, localhost for development
const API_BASE_URL = "/api";
let currentUser = null;
let authToken = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");
  checkAuth();
  setupEventListeners();
  initializeDatePicker();
  setupServiceCards();
  setupAuthAnimation();
  setupFormValidation();
  setupFooterLinks();
  setupRealTimeValidation();
  setupBookingWizard();
  setupPaymentMethods();
  setupFeedbackStars();
  setupCommentCounter();
});

function setupFormValidation() {
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("Signup form submitted");

      const name = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const phone = document.getElementById("signup-phone").value;
      const address = document.getElementById("signup-address").value;
      const password = document.getElementById("signup-password").value;
      const confirmPassword = document.getElementById(
        "signup-confirm-password",
      ).value;

      if (!validateName(name)) {
        showNotification(
          "Please enter a valid full name (minimum 3 characters)",
          "error",
        );
        return;
      }
      if (!validateEmail(email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }
      if (!validatePhone(phone)) {
        showNotification("Please enter a valid 10-digit phone number", "error");
        return;
      }
      if (!validateAddress(address)) {
        showNotification(
          "Please enter a valid address (minimum 10 characters)",
          "error",
        );
        return;
      }
      if (password !== confirmPassword) {
        showNotification("Passwords do not match", "error");
        return;
      }
      if (!validatePassword(password)) {
        showNotification("Password must be at least 6 characters", "error");
        return;
      }

      await handleSignup({ name, email, phone, address, password });
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("Login form submitted");

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      if (!validateEmail(email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }
      if (!password) {
        showNotification("Please enter your password", "error");
        return;
      }

      await handleLogin({ email, password });
    });
  }

  const editProfileForm = document.getElementById("edit-profile-form");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("edit-name").value;
      const phone = document.getElementById("edit-phone").value;
      const address = document.getElementById("edit-address").value;
      const password = document.getElementById("edit-password").value;
      const confirmPassword = document.getElementById(
        "edit-confirm-password",
      ).value;

      if (!validateName(name)) {
        showNotification("Please enter a valid full name", "error");
        return;
      }
      if (!validatePhone(phone)) {
        showNotification("Please enter a valid 10-digit phone number", "error");
        return;
      }
      if (!validateAddress(address)) {
        showNotification("Please enter a valid address", "error");
        return;
      }
      if (password && password !== confirmPassword) {
        showNotification("Passwords do not match", "error");
        return;
      }
      if (password && !validatePassword(password)) {
        showNotification("Password must be at least 6 characters", "error");
        return;
      }

      await handleEditProfile({ name, phone, address, password });
    });
  }
}

function validateName(name) {
  return name && name.trim().length >= 3;
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  return /^[0-9]{10}$/.test(cleaned);
}

function validateAddress(address) {
  return address && address.trim().length >= 10;
}

function validatePassword(password) {
  return password.length >= 6;
}

async function handleLogin(credentials) {
  try {
    console.log("Attempting login with:", credentials.email);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    console.log("Login response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    authToken = data.token;
    currentUser = data.user;

    sessionStorage.setItem("authToken", authToken);
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    showMainApp();
    loadUserData();
    showNotification("Login successful!", "success");
  } catch (error) {
    console.error("Login error:", error);
    showNotification(
      error.message || "Login failed. Please try again.",
      "error",
    );
  }
}

async function handleSignup(userData) {
  try {
    console.log("Attempting signup with:", userData.email);

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log("Signup response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Signup failed");
    }

    authToken = data.token;
    currentUser = data.user;

    sessionStorage.setItem("authToken", authToken);
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    showMainApp();
    loadUserData();
    showNotification("Account created successfully!", "success");
  } catch (error) {
    console.error("Signup error:", error);
    showNotification(
      error.message || "Signup failed. Please try again.",
      "error",
    );
  }
}

async function handleEditProfile(profileData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Profile update failed");
    }

    currentUser = { ...currentUser, ...data.user };
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    updateProfileDisplay(currentUser);
    prefillBookingForm();
    showNotification("Profile updated successfully!", "success");
    document.getElementById("edit-profile-modal").style.display = "none";
  } catch (error) {
    console.error("Profile update error:", error);
    showNotification(error.message, "error");
  }
}

function checkAuth() {
  console.log("Checking authentication...");
  const token = sessionStorage.getItem("authToken");
  const user = sessionStorage.getItem("user");

  if (token && user) {
    console.log("User found in session storage");
    authToken = token;
    currentUser = JSON.parse(user);
    showMainApp();
    loadUserData();
  } else {
    console.log("No user found, showing auth forms");
    showAuthForms();
  }
}

function showAuthForms() {
  document.getElementById("auth-forms").classList.remove("hidden");
  document.getElementById("main-app").classList.add("hidden");
}

function showMainApp() {
  document.getElementById("auth-forms").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");
}

function setupAuthAnimation() {
  const container = document.querySelector("#auth-forms .container");
  const LoginLink = document.querySelector(".SignInLink");
  const RegisterLink = document.querySelector(".SignUpLink");

  if (RegisterLink) {
    RegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      container.classList.add("active");
    });
  }

  if (LoginLink) {
    LoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      container.classList.remove("active");
    });
  }
}

function setupEventListeners() {
  const logoutBtnProfile = document.getElementById("logout-btn-profile");
  if (logoutBtnProfile) {
    logoutBtnProfile.addEventListener("click", handleLogout);
  }

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = e.target.closest("a").getAttribute("data-page");
      if (currentUser) {
        switchPage(page);
      } else {
        showNotification("Please login first", "error");
      }
    });
  });

  const bookNowHero = document.getElementById("book-now-hero");
  if (bookNowHero) {
    bookNowHero.addEventListener("click", () => switchPage("book"));
  }

  const bookFirstOrder = document.getElementById("book-first-order");
  if (bookFirstOrder) {
    bookFirstOrder.addEventListener("click", () => switchPage("book"));
  }

  const addMoneyProfile = document.getElementById("add-money-profile");
  if (addMoneyProfile) {
    addMoneyProfile.addEventListener("click", openWalletModal);
  }

  const editProfileBtn = document.getElementById("edit-profile-btn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", openEditProfileModal);
  }

  const feedbackForm = document.getElementById("feedback-form");
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", handleFeedbackSubmit);
  }

  setupWalletModal();
  setupBookingForm();
  setupEditProfileModal();
  setupServicePage();
}

function setupFooterLinks() {
  document.querySelectorAll(".footer-section a[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        const page = e.target.closest("a").getAttribute("data-page");
        switchPage(page);
      } else {
        showNotification("Please login first", "error");
      }
    });
  });
}

function handleLogout() {
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("user");
  authToken = null;
  currentUser = null;
  showAuthForms();
  showNotification("Logged out successfully", "success");
}

function switchPage(page) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-links a")
    .forEach((link) => link.classList.remove("active"));

  const pageElement = document.getElementById(`${page}-page`);
  if (pageElement) {
    pageElement.classList.add("active");
  }

  const navLink = document.querySelector(`[data-page="${page}"]`);
  if (navLink) {
    navLink.classList.add("active");
  }

  if (page === "orders") {
    loadOrders();
  } else if (page === "profile") {
    loadProfile();
  } else if (page === "book") {
    prefillBookingForm();
    calculatePrice();
  } else if (page === "feedback") {
    loadOrdersForFeedback();
    loadFeedbackHistory();
  }
}

function loadUserData() {
  if (!currentUser) return;

  document.getElementById("profile-fullname").textContent = currentUser.name;
  document.getElementById("profile-email").textContent = currentUser.email;
  document.getElementById("profile-wallet-balance").textContent =
    `₹${currentUser.walletBalance.toFixed(2)}`;
  document.getElementById("wallet-balance-display").textContent =
    `₹${currentUser.walletBalance.toFixed(2)}`;

  prefillBookingForm();
  switchPage("home");
}

async function loadProfile() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const userData = await response.json();
      updateProfileDisplay(userData);
      loadTransactions();
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

function updateProfileDisplay(userData) {
  document.getElementById("detail-name").textContent = userData.name;
  document.getElementById("detail-email").textContent = userData.email;
  document.getElementById("detail-phone").textContent = userData.phone;
  document.getElementById("detail-address").textContent = userData.address;
  document.getElementById("detail-join-date").textContent = new Date(
    userData.createdAt,
  ).toLocaleDateString("en-IN");
  document.getElementById("profile-wallet-balance").textContent =
    `₹${userData.walletBalance.toFixed(2)}`;
  document.getElementById("wallet-balance-display").textContent =
    `₹${userData.walletBalance.toFixed(2)}`;

  if (currentUser) {
    currentUser.walletBalance = userData.walletBalance;
    sessionStorage.setItem("user", JSON.stringify(currentUser));
  }
}

async function loadTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/transactions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    const transactionsList = document.getElementById("transactions-list");
    if (!transactionsList) return;

    transactionsList.innerHTML = "";

    if (response.ok) {
      const transactions = await response.json();

      if (transactions.length === 0) {
        transactionsList.innerHTML =
          '<p class="no-transactions">No transactions yet</p>';
        return;
      }

      transactions.forEach((transaction) => {
        const transactionItem = document.createElement("div");
        transactionItem.className = "transaction-item";

        const amountClass =
          transaction.type === "credit" ? "positive" : "negative";
        const amountSign = transaction.type === "credit" ? "+" : "-";
        const date = new Date(transaction.createdAt).toLocaleDateString(
          "en-IN",
        );

        transactionItem.innerHTML = `
                    <div>
                        <strong>${transaction.description}</strong>
                        <p style="font-size: 0.9rem; color: #666;">${date}</p>
                    </div>
                    <div class="transaction-amount ${amountClass}">${amountSign}₹${transaction.amount.toFixed(2)}</div>
                `;

        transactionsList.appendChild(transactionItem);
      });
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
  }
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    const ordersList = document.getElementById("orders-list");
    if (!ordersList) return;

    if (response.ok) {
      const orders = await response.json();
      displayOrders(orders);
    } else {
      displayOrders([]);
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    displayOrders([]);
  }
}

function displayOrders(orders) {
  const ordersList = document.getElementById("orders-list");
  if (!ordersList) return;

  ordersList.innerHTML = "";

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-box-open"></i>
                <h3>No Orders Yet</h3>
                <p>Book your first laundry service to get started!</p>
                <button class="btn-primary" id="book-first-order">Book Now</button>
            </div>
        `;
    document
      .getElementById("book-first-order")
      ?.addEventListener("click", () => switchPage("book"));
    return;
  }

  orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((order) => {
      const orderItem = document.createElement("div");
      orderItem.className = "order-item";

      const serviceName =
        order.serviceType === "dry-clean" ? "Dry Cleaning" : "Wash & Fold";
      const expressText = order.express ? " (Express)" : "";
      const statusClass = `status-${order.status ? order.status.toLowerCase() : "scheduled"}`;
      const statusText = order.status || "Scheduled";
      const orderId = order._id ? order._id.slice(-6) : "N/A";
      const pickupDate = order.pickupDate
        ? new Date(order.pickupDate).toLocaleDateString("en-IN")
        : "N/A";
      const createdDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN")
        : "N/A";

      orderItem.innerHTML = `
            <h4>Order #${orderId}
                <span class="order-status ${statusClass}">${statusText}</span>
            </h4>
            <div class="order-details">
                <div class="detail-column">
                    <p><strong>Service:</strong> ${serviceName}${expressText}</p>
                    <p><strong>Weight:</strong> ${order.weight} kg</p>
                    <p><strong>Amount:</strong> ₹${order.totalAmount || "0"}</p>
                </div>
                <div class="detail-column">
                    <p><strong>Pickup:</strong> ${pickupDate} at ${order.pickupTime || "N/A"}</p>
                    <p><strong>Address:</strong> ${order.address ? order.address.substring(0, 50) : ""}${order.address && order.address.length > 50 ? "..." : ""}</p>
                    <p><strong>Placed on:</strong> ${createdDate}</p>
                </div>
            </div>
        `;

      ordersList.appendChild(orderItem);
    });
}

function setupWalletModal() {
  const modal = document.getElementById("wallet-modal");
  const closeBtn = document.querySelector(".close");
  const addMoneyBtn = document.getElementById("add-to-wallet");
  const amountOptions = document.querySelectorAll(".amount-option");
  const customAmountInput = document.getElementById("custom-amount");
  const paymentMethods = document.querySelectorAll(
    'input[name="payment-method"]',
  );

  if (!modal || !closeBtn || !addMoneyBtn) return;

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    resetWalletModal();
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      resetWalletModal();
    }
  });

  amountOptions.forEach((option) => {
    option.addEventListener("click", function () {
      amountOptions.forEach((opt) => opt.classList.remove("active"));
      this.classList.add("active");
      if (customAmountInput) customAmountInput.value = "";
    });
  });

  if (customAmountInput) {
    customAmountInput.addEventListener("input", function () {
      amountOptions.forEach((opt) => opt.classList.remove("active"));
    });
  }

  paymentMethods.forEach((method) => {
    method.addEventListener("change", function () {
      document.querySelectorAll(".payment-details").forEach((detail) => {
        detail.classList.add("hidden");
      });

      if (this.value === "card") {
        document
          .getElementById("card-payment-details")
          ?.classList.remove("hidden");
      } else if (this.value === "upi") {
        document
          .getElementById("upi-payment-details")
          ?.classList.remove("hidden");
      } else if (this.value === "netbanking") {
        document
          .getElementById("netbanking-payment-details")
          ?.classList.remove("hidden");
      }
    });
  });

  addMoneyBtn.addEventListener("click", async function () {
    let amount = 0;
    const activeOption = document.querySelector(".amount-option.active");

    if (activeOption) {
      amount = parseFloat(activeOption.getAttribute("data-amount"));
    } else if (customAmountInput && customAmountInput.value) {
      amount = parseFloat(customAmountInput.value);
    }

    if (!amount || amount < 100) {
      showNotification("Minimum amount to add is ₹100", "error");
      return;
    }

    if (amount > 10000) {
      showNotification("Maximum amount to add is ₹10,000", "error");
      return;
    }

    const paymentMethod = document.querySelector(
      'input[name="payment-method"]:checked',
    )?.value;

    try {
      const response = await fetch(`${API_BASE_URL}/users/add-money`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ amount, paymentMethod }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add money");
      }

      if (currentUser) {
        currentUser.walletBalance = data.newBalance;
        sessionStorage.setItem("user", JSON.stringify(currentUser));
      }

      updateWalletDisplay();
      loadTransactions();

      showNotification(
        `Successfully added ₹${amount.toFixed(2)} to your wallet!`,
        "success",
      );

      modal.style.display = "none";
      resetWalletModal();
    } catch (error) {
      console.error("Add money error:", error);
      showNotification(error.message, "error");
    }
  });
}

function resetWalletModal() {
  document
    .querySelectorAll(".amount-option")
    .forEach((opt) => opt.classList.remove("active"));
  const customAmount = document.getElementById("custom-amount");
  if (customAmount) customAmount.value = "";

  const cardNumber = document.getElementById("modal-card-number");
  const cardExpiry = document.getElementById("modal-card-expiry");
  const cardCvv = document.getElementById("modal-card-cvv");
  const upiId = document.getElementById("modal-upi-id");
  const bankSelect = document.getElementById("bank-select");

  if (cardNumber) cardNumber.value = "";
  if (cardExpiry) cardExpiry.value = "";
  if (cardCvv) cardCvv.value = "";
  if (upiId) upiId.value = "";
  if (bankSelect) bankSelect.value = "";
}

function updateWalletDisplay() {
  if (currentUser) {
    document.getElementById("profile-wallet-balance").textContent =
      `₹${currentUser.walletBalance.toFixed(2)}`;
    document.getElementById("modal-balance").textContent =
      `₹${currentUser.walletBalance.toFixed(2)}`;
    document.getElementById("wallet-balance-display").textContent =
      `₹${currentUser.walletBalance.toFixed(2)}`;
  }
}

function setupBookingForm() {
  const weightInput = document.getElementById("weight");
  const expressBtn = document.getElementById("express-btn");
  const expressHidden = document.getElementById("express");
  const timeSlots = document.querySelectorAll(".time-slot");
  const serviceCards = document.querySelectorAll(".service-card-select");
  const paymentOptions = document.querySelectorAll(".payment-option-card");
  const nextButtons = document.querySelectorAll(".btn-next");
  const prevButtons = document.querySelectorAll(".btn-prev");
  const bookingForm = document.getElementById("booking-form");

  let currentStep = 1;

  function updateWizardProgress() {
    document.querySelectorAll(".step").forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum <= currentStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });

    document.querySelectorAll(".wizard-step").forEach((step) => {
      const stepNum = parseInt(step.getAttribute("data-step"));
      if (stepNum === currentStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  function updateSidebar() {
    const selectedService = document.querySelector(
      'input[name="service"]:checked',
    );
    const serviceName = selectedService
      ? selectedService.value === "dry-clean"
        ? "Dry Cleaning"
        : "Wash & Fold"
      : "--";
    document.getElementById("sidebar-service").textContent = serviceName;

    const weight = weightInput ? weightInput.value : "5";
    document.getElementById("sidebar-weight").textContent = `${weight} kg`;

    const isExpress = expressHidden ? expressHidden.value === "true" : false;
    document.getElementById("sidebar-express").textContent = isExpress
      ? "Yes"
      : "No";

    const pickupDate = document.getElementById("pickup-date")?.value;
    if (pickupDate) {
      const date = new Date(pickupDate);
      document.getElementById("sidebar-date").textContent =
        date.toLocaleDateString("en-IN");
    }

    const pickupTime = document.getElementById("pickup-time")?.value;
    if (pickupTime) {
      document.getElementById("sidebar-time").textContent = pickupTime;
    }

    const totalAmount =
      document.getElementById("total-amount")?.textContent || "₹0";
    document.getElementById("sidebar-total").textContent = totalAmount;
  }

  if (expressBtn && expressHidden) {
    expressBtn.addEventListener("click", function () {
      const isActive = this.getAttribute("data-active") === "true";

      if (isActive) {
        this.classList.remove("active");
        this.setAttribute("data-active", "false");
        expressHidden.value = "false";
        this.innerHTML =
          '<span class="express-toggle-off"><i class="fas fa-plus"></i> Add Express</span>';
      } else {
        this.classList.add("active");
        this.setAttribute("data-active", "true");
        expressHidden.value = "true";
        this.innerHTML =
          '<span class="express-toggle-on"><i class="fas fa-check"></i> Added</span>';
      }

      calculatePrice();
      updateSidebar();
    });
  }

  timeSlots.forEach((slot) => {
    slot.addEventListener("click", function () {
      const time = this.getAttribute("data-time");

      timeSlots.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");

      const pickupTimeInput = document.getElementById("pickup-time");
      if (pickupTimeInput) {
        pickupTimeInput.value = time;
      }

      updateSidebar();
    });
  });

  serviceCards.forEach((card) => {
    card.addEventListener("click", function () {
      const radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;

        serviceCards.forEach((c) => c.classList.remove("active"));
        this.classList.add("active");

        calculatePrice();
        updateSidebar();
      }
    });
  });

  paymentOptions.forEach((card) => {
    card.addEventListener("click", function () {
      const radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;

        document
          .querySelectorAll(".payment-details-section")
          .forEach((section) => {
            section.classList.add("hidden");
          });

        const paymentMethod = this.getAttribute("data-payment");
        if (paymentMethod === "card") {
          document.getElementById("card-details")?.classList.remove("hidden");
        } else if (paymentMethod === "upi") {
          document.getElementById("upi-details")?.classList.remove("hidden");
        }
      }
    });
  });

  document.querySelectorAll(".weight-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (!weightInput) return;

      const action = this.getAttribute("data-action");
      let currentWeight = parseInt(weightInput.value) || 1;

      if (action === "increase" && currentWeight < 20) {
        weightInput.value = currentWeight + 1;
      } else if (action === "decrease" && currentWeight > 1) {
        weightInput.value = currentWeight - 1;
      }

      const event = new Event("change", { bubbles: true });
      weightInput.dispatchEvent(event);

      calculatePrice();
      updateSidebar();
    });
  });

  if (weightInput) {
    weightInput.addEventListener("change", function () {
      calculatePrice();
      updateSidebar();
    });

    weightInput.addEventListener("input", function () {
      calculatePrice();
      updateSidebar();
    });
  }

  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (validateStep(currentStep) && currentStep < 4) {
        currentStep++;
        updateWizardProgress();
        updateSidebar();
      }
    });
  });

  prevButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (currentStep > 1) {
        currentStep--;
        updateWizardProgress();
        updateSidebar();
      }
    });
  });

  function validateStep(step) {
    switch (step) {
      case 1:
        const name = document.getElementById("name")?.value;
        const phone = document.getElementById("phone")?.value;
        const address = document.getElementById("address")?.value;

        if (!name || !validateName(name)) {
          showNotification("Please enter a valid name", "error");
          return false;
        }
        if (!phone || !validatePhone(phone)) {
          showNotification(
            "Please enter a valid 10-digit phone number",
            "error",
          );
          return false;
        }
        if (!address || !validateAddress(address)) {
          showNotification("Please enter a valid address", "error");
          return false;
        }
        return true;

      case 3:
        const pickupDate = document.getElementById("pickup-date")?.value;
        const pickupTime = document.getElementById("pickup-time")?.value;

        if (!pickupDate) {
          showNotification("Please select a pickup date", "error");
          return false;
        }
        if (!pickupTime) {
          showNotification("Please select a pickup time", "error");
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  document.querySelectorAll('input[name="service"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      calculatePrice();
      updateSidebar();
    });
  });

  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  updateWizardProgress();
  calculatePrice();
  updateSidebar();

  const defaultTimeSlot = document.querySelector(".time-slot");
  if (defaultTimeSlot && !document.getElementById("pickup-time")?.value) {
    defaultTimeSlot.click();
  }
}

function prefillBookingForm() {
  if (!currentUser) return;

  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const addressInput = document.getElementById("address");

  if (nameInput) nameInput.value = currentUser.name || "";
  if (phoneInput) phoneInput.value = currentUser.phone || "";
  if (addressInput) addressInput.value = currentUser.address || "";

  const expressBtn = document.getElementById("express-btn");
  const expressHidden = document.getElementById("express");

  if (expressBtn && expressHidden) {
    expressBtn.classList.remove("active");
    expressBtn.setAttribute("data-active", "false");
    expressHidden.value = "false";
    expressBtn.innerHTML =
      '<span class="express-toggle-off"><i class="fas fa-plus"></i> Add Express</span>';
  }
}

function calculatePrice() {
  try {
    const selectedService = document.querySelector(
      'input[name="service"]:checked',
    );
    if (!selectedService) return;

    const serviceType = selectedService.value;
    const weightInput = document.getElementById("weight");
    const weight = parseInt(weightInput?.value) || 1;
    const expressHidden = document.getElementById("express");
    const expressSelected = expressHidden?.value === "true";

    const servicePrices = { "dry-clean": 250, "wash-fold": 150 };
    let serviceCost = servicePrices[serviceType]
      ? servicePrices[serviceType] * weight
      : 0;
    let expressCharge = expressSelected ? 200 : 0;
    const totalAmount = serviceCost + expressCharge;

    const serviceCostEl = document.getElementById("service-cost");
    const expressChargeEl = document.getElementById("express-charge");
    const totalAmountEl = document.getElementById("total-amount");
    const confirmAmountEl = document.getElementById("confirm-amount");
    const finalAmountEl = document.getElementById("final-amount");
    const sidebarTotalEl = document.getElementById("sidebar-total");

    if (serviceCostEl) serviceCostEl.textContent = `₹${serviceCost}`;
    if (expressChargeEl) expressChargeEl.textContent = `₹${expressCharge}`;
    if (totalAmountEl) totalAmountEl.textContent = `₹${totalAmount}`;
    if (confirmAmountEl) confirmAmountEl.textContent = totalAmount;
    if (finalAmountEl) finalAmountEl.textContent = totalAmount;
    if (sidebarTotalEl) sidebarTotalEl.textContent = `₹${totalAmount}`;
  } catch (error) {
    console.error("Error calculating price:", error);
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showNotification("Please login to book a service", "error");
    return;
  }

  const name = document.getElementById("name")?.value;
  const phone = document.getElementById("phone")?.value;
  const address = document.getElementById("address")?.value;
  const pickupDate = document.getElementById("pickup-date")?.value;
  const pickupTime = document.getElementById("pickup-time")?.value;
  const weight = document.getElementById("weight")?.value;
  const selectedService = document.querySelector(
    'input[name="service"]:checked',
  );
  const serviceType = selectedService?.value;
  const expressHidden = document.getElementById("express");
  const express = expressHidden?.value === "true";
  const selectedPayment = document.querySelector(
    'input[name="payment"]:checked',
  );
  const paymentMethod = selectedPayment?.value;

  if (
    !name ||
    !phone ||
    !address ||
    !pickupDate ||
    !pickupTime ||
    !weight ||
    !serviceType ||
    !paymentMethod
  ) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const weightNum = parseInt(weight);
  const servicePrices = { "dry-clean": 250, "wash-fold": 150 };
  let serviceCost = servicePrices[serviceType] * weightNum;
  let expressCharge = express ? 200 : 0;
  const totalAmount = serviceCost + expressCharge;

  if (paymentMethod === "wallet" && currentUser.walletBalance < totalAmount) {
    showNotification(
      `Insufficient wallet balance. Required: ₹${totalAmount}`,
      "error",
    );
    openWalletModal();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        address,
        pickupDate,
        pickupTime,
        serviceType,
        weight: weightNum,
        express,
        totalAmount,
        paymentMethod,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Booking failed");
    }

    if (paymentMethod === "wallet" && data.newBalance !== undefined) {
      currentUser.walletBalance = data.newBalance;
      sessionStorage.setItem("user", JSON.stringify(currentUser));
      updateWalletDisplay();
    }

    showNotification("Booking confirmed successfully!", "success");

    if (document.getElementById("booking-form")) {
      document.getElementById("booking-form").reset();
    }

    prefillBookingForm();
    calculatePrice();

    setTimeout(() => {
      loadOrders();
      switchPage("orders");
    }, 1000);
  } catch (error) {
    console.error("Booking error:", error);
    showNotification(
      error.message || "Server error. Please try again.",
      "error",
    );
  }
}

function setupServicePage() {
  const categories = document.querySelectorAll(".category");
  const serviceItems = document.querySelectorAll(".service-item");
  const selectButtons = document.querySelectorAll(".select-service");

  categories.forEach((category) => {
    category.addEventListener("click", function () {
      const categoryType = this.getAttribute("data-category");

      categories.forEach((cat) => cat.classList.remove("active"));
      this.classList.add("active");

      serviceItems.forEach((item) => {
        if (
          categoryType === "all" ||
          item.getAttribute("data-category") === categoryType
        ) {
          item.style.display = "flex";
        } else {
          item.style.display = "none";
        }
      });
    });
  });

  selectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const serviceType = this.getAttribute("data-service");

      if (!currentUser) {
        showNotification("Please login to book services", "error");
        return;
      }

      switchPage("book");

      setTimeout(() => {
        if (serviceType === "dry-clean") {
          document.getElementById("dry-clean").checked = true;
        } else if (serviceType === "wash-fold") {
          document.getElementById("wash-fold").checked = true;
        } else if (serviceType === "express") {
          const expressBtn = document.getElementById("express-btn");
          const expressHidden = document.getElementById("express");
          if (expressBtn && expressHidden) {
            expressBtn.classList.add("active");
            expressBtn.setAttribute("data-active", "true");
            expressHidden.value = "true";
            expressBtn.innerHTML =
              '<span class="express-toggle-on"><i class="fas fa-check"></i> Added</span>';
          }
        } else if (serviceType === "hand-wash") {
          showNotification(
            "Hand Wash service selected. Price is ₹300/kg",
            "success",
          );
        } else if (serviceType === "premium") {
          showNotification(
            "Premium Laundry selected. Price is ₹400/kg",
            "success",
          );
        } else if (serviceType === "stain-removal") {
          showNotification("Stain Removal service added as extra", "success");
        }

        calculatePrice();
      }, 300);
    });
  });
}

function setupServiceCards() {
  const serviceCards = document.querySelectorAll(".service-card");
  serviceCards.forEach((card) => {
    card.addEventListener("click", function () {
      if (!currentUser) {
        showNotification("Please login to view service details", "error");
        return;
      }

      const serviceTitle = this.querySelector("h3")?.textContent;
      if (serviceTitle) {
        showServiceDetails(serviceTitle);
      }
    });
  });
}

function showServiceDetails(serviceName) {
  const serviceInfo = {
    "Dry Cleaning": {
      description:
        "Professional dry cleaning for suits, dresses, and delicate fabrics using eco-friendly solvents.",
      price: "₹250/kg",
      time: "48 hours",
      includes: ["Stain removal", "Steam pressing", "Eco-friendly solvents"],
    },
    "Wash & Fold": {
      description:
        "Everyday laundry washed, dried, and neatly folded for your convenience.",
      price: "₹150/kg",
      time: "24 hours",
      includes: ["Washing", "Drying", "Folding", "Premium detergent"],
    },
    "Special Care": {
      description:
        "Special treatment for stains, delicate items, and special fabrics.",
      price: "₹300/kg",
      time: "72 hours",
      includes: [
        "Hand wash",
        "Special detergents",
        "Air drying",
        "Careful handling",
      ],
    },
    "Express Service": {
      description: "Get your clothes cleaned and delivered within 24 hours.",
      price: "+₹200",
      time: "24 hours",
      includes: ["Priority processing", "Fast pickup", "Quick delivery"],
    },
  };

  const service = serviceInfo[serviceName];
  if (!service) return;

  const modal = document.createElement("div");
  modal.className = "service-modal";
  modal.innerHTML = `
        <div class="service-modal-content">
            <div class="service-modal-header">
                <h2>${serviceName}</h2>
                <span class="close-service-modal">&times;</span>
            </div>
            <div class="service-modal-body">
                <div class="service-detail">
                    <p class="service-description">${service.description}</p>
                    <div class="service-stats">
                        <div class="stat">
                            <i class="fas fa-tag"></i>
                            <div>
                                <span class="stat-label">Price</span>
                                <span class="stat-value">${service.price}</span>
                            </div>
                        </div>
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <div>
                                <span class="stat-label">Turnaround</span>
                                <span class="stat-value">${service.time}</span>
                            </div>
                        </div>
                    </div>
                    <div class="service-includes">
                        <h4>Service Includes:</h4>
                        <ul>
                            ${service.includes.map((item) => `<li><i class="fas fa-check-circle"></i> ${item}</li>`).join("")}
                        </ul>
                    </div>
                </div>
                <div class="service-actions">
                    <button class="btn-secondary close-service-btn">Close</button>
                    <button class="btn-primary book-this-service">Book This Service</button>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
  };

  modal
    .querySelector(".close-service-modal")
    .addEventListener("click", closeModal);
  modal
    .querySelector(".close-service-btn")
    .addEventListener("click", closeModal);
  modal.querySelector(".book-this-service").addEventListener("click", () => {
    closeModal();
    switchPage("book");

    setTimeout(() => {
      if (serviceName === "Dry Cleaning") {
        document.getElementById("dry-clean")?.click();
      } else if (serviceName === "Wash & Fold") {
        document.getElementById("wash-fold")?.click();
      } else if (serviceName === "Express Service") {
        const expressBtn = document.getElementById("express-btn");
        const expressHidden = document.getElementById("express");
        if (expressBtn && expressHidden) {
          expressBtn.click();
        }
      }
      calculatePrice();
    }, 300);
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function setupEditProfileModal() {
  const modal = document.getElementById("edit-profile-modal");
  const closeBtn = document.querySelector(".close-edit");

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

function openEditProfileModal() {
  const modal = document.getElementById("edit-profile-modal");
  if (modal && currentUser) {
    document.getElementById("edit-name").value = currentUser.name || "";
    document.getElementById("edit-phone").value = currentUser.phone || "";
    document.getElementById("edit-address").value = currentUser.address || "";
    document.getElementById("edit-password").value = "";
    document.getElementById("edit-confirm-password").value = "";
    modal.style.display = "block";
  }
}

function openWalletModal() {
  const modal = document.getElementById("wallet-modal");
  if (modal && currentUser) {
    document.getElementById("modal-balance").textContent =
      `₹${currentUser.walletBalance.toFixed(2)}`;
    modal.style.display = "block";
  }
}

function setupBookingWizard() {
  const serviceCards = document.querySelectorAll(".service-card-select");

  serviceCards.forEach((card) => {
    card.addEventListener("click", function () {
      serviceCards.forEach((c) => c.classList.remove("active"));
      this.classList.add("active");

      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      calculatePrice();
    });
  });
}

function setupPaymentMethods() {
  const paymentRadios = document.querySelectorAll('input[name="payment"]');

  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      document
        .querySelectorAll(".payment-details-section")
        .forEach((section) => {
          section.classList.add("hidden");
        });

      if (this.value === "card") {
        document.getElementById("card-details")?.classList.remove("hidden");
      } else if (this.value === "upi") {
        document.getElementById("upi-details")?.classList.remove("hidden");
      }
    });
  });
}

function setupFeedbackStars() {
  const stars = document.querySelectorAll(".stars i");
  const ratingValue = document.getElementById("rating-value");
  const ratingText = document.querySelector(".rating-text");

  if (!stars.length || !ratingValue) return;

  stars.forEach((star, index) => {
    star.addEventListener("click", function () {
      const rating = index + 1;
      ratingValue.value = rating;

      stars.forEach((s, i) => {
        if (i < rating) {
          s.classList.add("active");
        } else {
          s.classList.remove("active");
        }
      });

      const ratings = [
        "Select rating",
        "Poor",
        "Fair",
        "Good",
        "Very Good",
        "Excellent",
      ];
      if (ratingText) ratingText.textContent = ratings[rating];
    });

    star.addEventListener("mouseover", function () {
      const rating = index + 1;
      stars.forEach((s, i) => {
        if (i < rating) {
          s.classList.add("hover");
        } else {
          s.classList.remove("hover");
        }
      });
    });

    star.addEventListener("mouseout", function () {
      stars.forEach((s) => s.classList.remove("hover"));
    });
  });
}

function setupCommentCounter() {
  const commentsTextarea = document.getElementById("feedback-comments");
  const charCountSpan = document.getElementById("char-count");

  if (!commentsTextarea || !charCountSpan) return;

  const updateCounter = () => {
    const length = commentsTextarea.value.length;
    charCountSpan.textContent = length;

    if (length > 1000) {
      charCountSpan.style.color = "#e74c3c";
    } else if (length > 800) {
      charCountSpan.style.color = "#f39c12";
    } else {
      charCountSpan.style.color = "#2a9d8f";
    }
  };

  updateCounter();
  commentsTextarea.addEventListener("input", updateCounter);
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showNotification("Please login to submit feedback", "error");
    return;
  }

  const orderId = document.getElementById("feedback-order")?.value;
  const ratingValue = document.getElementById("rating-value")?.value;
  const comments = document.getElementById("feedback-comments")?.value;
  const qualityRadio = document.querySelector('input[name="quality"]:checked');
  const recommendRadio = document.querySelector(
    'input[name="recommend"]:checked',
  );

  if (!ratingValue || parseInt(ratingValue) === 0) {
    showNotification("Please select a rating", "error");
    return;
  }

  if (!comments || comments.trim().length === 0) {
    showNotification("Please enter your comments", "error");
    return;
  }

  const feedbackData = {
    orderId: orderId || null,
    rating: parseInt(ratingValue),
    comments: comments,
    serviceQuality: qualityRadio ? parseInt(qualityRadio.value) : null,
    recommend: recommendRadio ? recommendRadio.value : "yes",
  };

  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = "Submitting...";
  submitButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(feedbackData),
    });

    if (response.ok) {
      showNotification("Feedback submitted successfully!", "success");
      resetFeedbackForm();
      await loadFeedbackHistory();
    } else {
      throw new Error("Failed to submit feedback");
    }
  } catch (error) {
    console.error("Feedback error:", error);
    showNotification(error.message, "error");
  } finally {
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
}

function resetFeedbackForm() {
  const form = document.getElementById("feedback-form");
  if (form) form.reset();

  document
    .querySelectorAll(".stars i")
    .forEach((star) => star.classList.remove("active"));

  const ratingValue = document.getElementById("rating-value");
  if (ratingValue) ratingValue.value = "0";

  const ratingText = document.querySelector(".rating-text");
  if (ratingText) ratingText.textContent = "Select rating";

  const charCount = document.getElementById("char-count");
  if (charCount) charCount.textContent = "0";
}

async function loadFeedbackHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const feedbacks = await response.json();
      displayFeedbackHistory(feedbacks);
    }
  } catch (error) {
    console.error("Error loading feedback:", error);
  }
}

function displayFeedbackHistory(feedbacks) {
  const feedbackList = document.getElementById("feedback-list");
  if (!feedbackList) return;

  feedbackList.innerHTML = "";

  if (!feedbacks || feedbacks.length === 0) {
    feedbackList.innerHTML = `
            <div class="no-feedback">
                <i class="fas fa-comment-dots"></i>
                <h4>No Feedback Yet</h4>
                <p>Share your first feedback to help us improve!</p>
            </div>
        `;
    return;
  }

  feedbacks
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((feedback) => {
      const feedbackItem = document.createElement("div");
      feedbackItem.className = "feedback-item";

      let stars = "";
      for (let i = 1; i <= 5; i++) {
        stars +=
          i <= feedback.rating
            ? '<i class="fas fa-star" style="color: #ffc107;"></i>'
            : '<i class="far fa-star" style="color: #ddd;"></i>';
      }

      const serviceQuality = feedback.serviceQuality
        ? `${feedback.serviceQuality}/5`
        : "Not rated";
      const recommendText =
        feedback.recommend === "yes"
          ? "Would recommend"
          : "Would not recommend";

      let formattedDate = "Date not available";
      try {
        if (feedback.createdAt) {
          formattedDate = new Date(feedback.createdAt).toLocaleDateString(
            "en-IN",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          );
        }
      } catch (e) {}

      feedbackItem.innerHTML = `
            <div class="feedback-item-header">
                <h4>${feedback.orderDetails || "General Feedback"}</h4>
                <div class="feedback-rating">${stars}</div>
            </div>
            <p class="feedback-comments">${feedback.comments || "No comments"}</p>
            <div class="feedback-meta">
                <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                <span><i class="fas fa-star-half-alt"></i> Quality: ${serviceQuality}</span>
                <span><i class="fas fa-user-check"></i> ${recommendText}</span>
            </div>
        `;

      feedbackList.appendChild(feedbackItem);
    });
}

async function loadOrdersForFeedback() {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    const feedbackSelect = document.getElementById("feedback-order");
    if (!feedbackSelect) return;

    feedbackSelect.innerHTML =
      '<option value="">Select an order (optional)</option>';

    if (response.ok) {
      const orders = await response.json();

      orders.forEach((order) => {
        const option = document.createElement("option");
        option.value = order._id || "";
        const serviceName =
          order.serviceType === "dry-clean" ? "Dry Cleaning" : "Wash & Fold";
        option.textContent = `Order #${order._id ? order._id.slice(-6) : ""} - ${serviceName}`;
        feedbackSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading orders for feedback:", error);
  }
}

function initializeDatePicker() {
  const today = new Date().toISOString().split("T")[0];
  const pickupDateInput = document.getElementById("pickup-date");

  if (pickupDateInput) {
    pickupDateInput.min = today;
    if (!pickupDateInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      pickupDateInput.value = tomorrow.toISOString().split("T")[0];
    }
  }
}

function showNotification(message, type) {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

  document.body.appendChild(notification);

  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    });

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

function setupRealTimeValidation() {
  const signupEmail = document.getElementById("signup-email");
  const loginEmail = document.getElementById("login-email");

  if (signupEmail) {
    signupEmail.addEventListener("blur", function () {
      if (this.value && !validateEmail(this.value)) {
        this.style.borderColor = "#ff3860";
      } else {
        this.style.borderColor = "";
      }
    });
  }

  if (loginEmail) {
    loginEmail.addEventListener("blur", function () {
      if (this.value && !validateEmail(this.value)) {
        this.style.borderColor = "#ff3860";
      } else {
        this.style.borderColor = "";
      }
    });
  }
}
