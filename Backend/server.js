const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");

const path = require('path');

require('dotenv').config();


if (!process.env.JWT_SECRET) {
  console.log('⚠️  JWT_SECRET not found, trying with explicit path...');
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const fs = require('fs');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists at:', envPath);
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading .env file:', err.message);
  }
} else {
  console.log('❌ .env file NOT found at:', envPath);
}

const app = express();
const server = http.createServer(app);

// 🛡️ Robust CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://busnotify.me",
  "https://school-transport-management-ocou-2sx9h6aqh.vercel.app"
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});


app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/buses", require("./routes/busRoutes"));
app.use("/api/routes", require("./routes/routeRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));


const { Server } = require('socket.io');
const socketService = require("./services/socket/socketService");

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

socketService.initialize(io);


const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected successfully");

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO initialized`);
      console.log(`🔗 Test server: http://localhost:${PORT}/test`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
