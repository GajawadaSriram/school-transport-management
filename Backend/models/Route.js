const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    startLocation: {
      name: { type: String, required: true },
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    endLocation: {
      name: { type: String, required: true },
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    stops: [
      {
        name: { type: String, required: true },
        latitude: { type: Number, required: false,default: null },
        longitude: { type: Number, required: false,default: null },
      },
    ],
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Route", routeSchema);
