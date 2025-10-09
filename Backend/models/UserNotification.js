const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: { 
    type: String, 
    required: true,
    trim: true
  },
  relatedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    required: true,
  },
  relatedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
    required: false,
    default: null
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
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model("UserNotification", userNotificationSchema);
