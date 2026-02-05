const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/busdb');
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("DB connection failed", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
