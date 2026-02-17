const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');

router.post('/', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').trim().notEmpty().withMessage('Comments are required'),
  body('serviceQuality').optional().isInt({ min: 1, max: 5 }).withMessage('Service quality must be between 1 and 5'),
  body('recommend').optional().isIn(['yes', 'no']).withMessage('Recommend must be yes or no')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { orderId, rating, comments, serviceQuality, recommend } = req.body;
    const feedback = new Feedback({
      userId: req.user._id,
      orderId: orderId || null,
      rating, comments,
      serviceQuality: serviceQuality || null,
      recommend: recommend || 'yes'
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const feedbacksWithDetails = await Promise.all(feedbacks.map(async (feedback) => {
      let orderDetails = "General Feedback";
      if (feedback.orderId) {
        const order = await Order.findById(feedback.orderId);
        if (order) {
          const serviceName = order.serviceType === 'dry-clean' ? 'Dry Cleaning' : 'Wash & Fold';
          orderDetails = `Order #${order._id.toString().slice(-6)} - ${serviceName}`;
        }
      }
      return { ...feedback.toObject(), orderDetails };
    }));
    res.json(feedbacksWithDetails);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;