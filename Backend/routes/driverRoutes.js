const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { roleOnly } = require('../middlewares/roleMiddleware');
const User = require('../models/User');

router.post('/create-driver', protect, roleOnly('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const driver = await User.create({
      name,
      email,
      password,
      role: 'driver'
    });
    
    const driverResponse = {
      _id: driver._id,
      name: driver.name,
      email: driver.email,
      role: driver.role,
      createdAt: driver.createdAt
    };
    
    res.status(201).json({ message: 'Driver account created successfully', driver: driverResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/drivers', protect, roleOnly('admin'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('-password');
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/drivers/:driverId', protect, roleOnly('admin'), async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const Bus = require('../models/Bus');
    const assignedBus = await Bus.findOne({ driver: driverId });
    if (assignedBus) {
      return res.status(400).json({ message: 'Cannot remove driver who is currently assigned to a bus. Please unassign them first.' });
    }
    
    await User.findByIdAndDelete(driverId);
    
    res.status(200).json({ message: 'Driver removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/available-drivers', protect, roleOnly('admin'), async (req, res) => {
  try {
    const availableDrivers = await User.find({ 
      role: 'driver', 
      assignedBus: null 
    }).select('-password');
    
    console.log(`Available drivers: ${availableDrivers.length}`);
    
    res.status(200).json(availableDrivers);
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/debug-assignments', protect, roleOnly('admin'), async (req, res) => {
  try {
    const Bus = require('../models/Bus');
    const buses = await Bus.find().populate('driver', 'name email');
    const allDrivers = await User.find({ role: 'driver' }).select('-password');
    
    const debugInfo = {
      totalDrivers: allDrivers.length,
      totalBuses: buses.length,
      busesWithDrivers: buses.filter(bus => bus.driver).length,
      busesWithoutDrivers: buses.filter(bus => !bus.driver).length,
      driverAssignments: buses.map(bus => ({
        busNumber: bus.busNumber,
        driver: bus.driver ? { id: bus.driver._id, name: bus.driver.name } : null
      })),
      allDrivers: allDrivers.map(driver => ({
        id: driver._id,
        name: driver.name,
        email: driver.email
      }))
    };
    
    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/route-info/:driverId', protect, async (req, res) => {
  try {
    const { driverId } = req.params;
    if (req.user.role !== 'admin' && req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Not authorized to access this driver information' });
    }
    const driver = await User.findById(driverId).select('-password');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    const Bus = require('../models/Bus');
    const bus = await Bus.findOne({ driver: driverId });
    if (!bus) {
      return res.status(200).json({
        driver,
        bus: null,
        route: null,
        message: 'Driver is not assigned to any bus'
      });
    }
    const Route = require('../models/Route');
    const route = await Route.findOne({ assignedBus: bus._id });
    
    const response = {
      driver,
      bus: {
        _id: bus._id,
        busNumber: bus.busNumber,
        capacity: bus.capacity
      },
      route: route ? {
        _id: route._id,
        routeName: route.routeName,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        stops: route.stops
      } : null
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching driver route info:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
