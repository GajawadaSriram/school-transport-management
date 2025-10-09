const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { roleOnly } = require("../middlewares/roleMiddleware");
const router = express.Router();
const {
  createBus,
  getBuses,
  getBusById,
  updateBus,
  assignDriver,
  removeDriver,
} = require("../controllers/busConctroller");

router.post("/",protect,roleOnly("admin"),createBus);
router.get("/",protect,roleOnly("admin"), getBuses);
router.get("/:busId", protect, getBusById);
router.put("/:busId",protect,roleOnly("admin"), updateBus);
router.post("/assign-driver", protect, roleOnly("admin"), assignDriver);
router.post("/remove-driver", protect, roleOnly("admin"), removeDriver);

module.exports = router;
