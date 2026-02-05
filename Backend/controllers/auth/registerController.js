const express = require('express');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, selectedRoute } = req.body;
    console.log("Registration request body:", req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    if (role && role !== 'student' && role !== 'admin') {
      return res.status(400).json({ message: "Invalid role. Only students and admins can register." });
    }
    
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      selectedRoute: role === 'student' ? selectedRoute : undefined,
      assignedBus: null
    });

    res.status(201).json({
      message: "Registration successful. Please login to continue.",
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

module.exports = registerUser;
