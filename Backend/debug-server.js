const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test route to see if basic Express is working
app.get('/test', (req, res) => {
  res.json({ message: 'Basic Express server is working' });
});

// Try to load notification routes
try {
  console.log('Attempting to load notification routes...');
  const notificationRoutes = require('./routes/notificationRoutes');
  app.use('/api/notifications', notificationRoutes);
  console.log('✅ Notification routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading notification routes:', error.message);
  console.error('Stack trace:', error.stack);
}

// Try to load other routes
try {
  console.log('Attempting to load auth routes...');
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  console.log('Attempting to load bus routes...');
  const busRoutes = require('./routes/busRoutes');
  app.use('/api/buses', busRoutes);
  console.log('✅ Bus routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading bus routes:', error.message);
}

try {
  console.log('Attempting to load route routes...');
  const routeRoutes = require('./routes/routeRoutes');
  app.use('/api/routes', routeRoutes);
  console.log('✅ Route routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading route routes:', error.message);
}

// List all registered routes
console.log('\n📋 Registered Routes:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`Route: ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`Route: ${Object.keys(handler.route.methods)} ${handler.route.path}`);
        }
      });
    }
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Debug server running on port ${PORT}`);
  console.log('Test the server with: http://localhost:5000/test');
  console.log('Test notifications with: http://localhost:5000/api/notifications/user');
});
