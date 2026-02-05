const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { roleOnly } = require("../middlewares/roleMiddleware");
const {
  createRoute,
  assignRoute,
  getRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
} = require("../controllers/routeController");

const router = express.Router();

router.post("/", protect, roleOnly("admin"), createRoute);
router.post("/assign-bus", protect, roleOnly("admin"), assignRoute);
router.put("/:routeId", protect, roleOnly("admin"), updateRoute);
router.delete("/:routeId", protect, roleOnly("admin"), deleteRoute);
router.get("/", getRoutes);
router.get("/:routeId", protect, getRouteById);

module.exports = router;
