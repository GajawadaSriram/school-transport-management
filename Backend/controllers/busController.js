const Bus = require("../models/Bus");
const User = require("../models/User");

exports.createBus = async (req, res) => {
  try {
    const { busNumber, capacity } = req.body;
    console.log(busNumber);
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ message: "Bus number already exists" });
    }

    const newBus = await Bus.create({ busNumber, capacity });
    res.status(201).json(newBus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBuses = async (req, res) => {
  try {
    const buses = await Bus.find().populate('driver', 'name email');
    res.status(200).json(buses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBusById = async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await Bus.findById(busId).populate('driver', 'name email');
    
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }
    
    res.status(200).json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { busId } = req.params;
    const { busNumber, capacity } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    if (busNumber !== bus.busNumber) {
      const existingBus = await Bus.findOne({ busNumber });
      if (existingBus) {
        return res.status(400).json({ message: "Bus number already exists" });
      }
    }

    bus.busNumber = busNumber;
    bus.capacity = capacity;
    await bus.save();

    res.status(200).json({ message: "Bus updated successfully", bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { busId, driverId } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(404).json({ message: "Driver not found" });
    }

    const existingAssignment = await Bus.findOne({ driver: driverId });
    if (existingAssignment) {
      return res.status(400).json({ message: "Driver is already assigned to another bus" });
    }

    if (bus.driver) {
      return res.status(400).json({ message: "Bus already has a driver assigned" });
    }

    bus.driver = driverId;
    await bus.save();

    await User.findByIdAndUpdate(driverId, { assignedBus: busId });

    await bus.populate('driver', 'name email');
    
    res.status(200).json({ message: "Driver assigned successfully", bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeDriver = async (req, res) => {
  try {
    const { busId } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (!bus.driver) {
      return res.status(400).json({ message: "Bus has no driver assigned" });
    }

    const driverId = bus.driver;
    bus.driver = null;
    await bus.save();

    if (driverId) {
      await User.findByIdAndUpdate(driverId, { assignedBus: null });
    }
    
    res.status(200).json({ message: "Driver removed successfully", bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
