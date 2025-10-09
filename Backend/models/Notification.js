const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    relatedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    notificationType: {
      type: String,
      enum: ['delay', 'cancellation', 'update', 'general'],
      default: 'general'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

notificationSchema.index({ relatedRoute: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
