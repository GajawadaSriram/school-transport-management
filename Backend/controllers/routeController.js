const Route = require("../models/Route");
const Bus = require("../models/Bus");

exports.createRoute = async (req, res) => {
  try {
    const { routeName, startLocation, endLocation, stops } = req.body;

    const existingRoute = await Route.findOne({ routeName });
    if (existingRoute) {
      return res.status(400).json({ message: "Route name already exists" });
    }

    const route = await Route.create({
      routeName,
      startLocation,
      endLocation,
      stops,
    });

    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignRoute = async (req, res) => {
  try {
    const { routeId, busId } = req.body;

    const route = await Route.findById(routeId);
    const bus = await Bus.findById(busId);

    if (!route || !bus) {
      return res.status(404).json({ message: "Route or Bus not found" });
    }

    route.assignedBus = busId;
    await route.save();

    res.status(200).json({ message: "Route assigned to bus successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().populate("assignedBus", "busNumber capacity");
    res.status(200).json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await Route.findById(routeId).populate("assignedBus", "busNumber capacity assignedDriver");
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    res.status(200).json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const updates = req.body;
    
    const route = await Route.findByIdAndUpdate(routeId, updates, { new: true });
    if (!route) return res.status(404).json({ message: "Route not found" });

    res.status(200).json({ message: "Route updated successfully", route });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await Route.findByIdAndDelete(routeId);
    if (!route) return res.status(404).json({ message: "Route not found" });

    res.status(200).json({ message: "Route deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
