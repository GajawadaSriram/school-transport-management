 const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { protect } = require('../middlewares/authMiddleware');
const { roleOnly } = require('../middlewares/roleMiddleware');
const registerUser = require('../controllers/auth/registerController');
const loginUser = require('../controllers/auth/loginController');
const User = require('../models/User');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, (req, res) => {
  res.json(req.user); 
});

// Refresh token endpoint
router.post('/refresh', protect, (req, res) => {
  try {
            if (!process.env.JWT_SECRET) {
          return res.status(500).json({ message: "Server configuration error: JWT_SECRET not set" });
        }
        
        const token = jwt.sign(
          { id: req.user._id, role: req.user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
    res.status(200).json({
      message: "Token refreshed successfully",
      token,
      user: { id: req.user._id, name: req.user.name, role: req.user.role }
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ message: "Server error during token refresh" });
  }
});

// Get all users (admin only) - for notification management
router.get('/users', protect, roleOnly('admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ name: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;
