const Notification = require('../../models/Notification');
const User = require('../../models/User');
const Route = require('../../models/Route');
const Bus = require('../../models/Bus');

class SocketService {
  constructor() {
    this.io = null;
    this.socket = null;
    this.userId = null;
    this.activeUsersByRoute = new Map();
    this.socketToUser = new Map();
  }

  getActiveUsersForRoute(routeId) {
    return this.activeUsersByRoute.get(routeId) || new Set();
  }

  getAllActiveUsers() {
    const allUsers = new Set();
    for (const users of this.activeUsersByRoute.values()) {
      users.forEach(userId => allUsers.add(userId));
    }
    return allUsers;
  }

  initialize(io) {
    this.io = io;

    // Use middleware for authentication
    const jwt = require('jsonwebtoken');
    const User = require('../../models/User');

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: Token missing'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.userName = user.name;
        socket.userRole = user.role;
        socket.selectedRoute = user.selectedRoute?.toString();

        console.log(`🔐 Socket authenticated via handshake for: ${user.name} (${user.role}) - Route: ${socket.selectedRoute || 'none'}`);
        next();
      } catch (err) {
        console.error('❌ Socket handshake authentication error:', err.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      console.log('🔌 New socket connection:', socket.id, 'User:', socket.userId);

      // 🏠 Auto-join route room if it's a student with a selected route
      if (socket.selectedRoute) {
        socket.join(`route_${socket.selectedRoute}`);

        // Debug: Check room membership
        const clients = this.io.sockets.adapter.rooms.get(`route_${socket.selectedRoute}`);
        const clientCount = clients ? clients.size : 0;

        console.log(`🏠 Student ${socket.userName} auto-joined room: route_${socket.selectedRoute}`);
        console.log(`📊 Room route_${socket.selectedRoute} now has ${clientCount} active client(s)`);
      }

      socket.on('subscribeToRoute', async (routeId) => {
        try {
          if (!socket.userId) {
            socket.emit('socketError', { error: 'Not authenticated' });
            return;
          }

          await User.findByIdAndUpdate(socket.userId, { selectedRoute: routeId });

          if (!this.activeUsersByRoute.has(routeId)) {
            this.activeUsersByRoute.set(routeId, new Set());
          }
          this.activeUsersByRoute.get(routeId).add(socket.userId);

          this.socketToUser.set(socket.id, { userId: socket.userId, routeId });

          socket.join(`route_${routeId}`);

          // Debug: Check room membership
          const clients = this.io.sockets.adapter.rooms.get(`route_${routeId}`);
          const clientCount = clients ? clients.size : 0;

          console.log(`✅ Student ${socket.userId} joined room: route_${routeId}`);
          console.log(`📊 Room route_${routeId} now has ${clientCount} active client(s)`);

          socket.emit('subscriptionConfirmed');

        } catch (error) {
          console.error('❌ Route subscription error:', error);
          socket.emit('socketError', { error: 'Failed to subscribe to route' });
        }
      });

      socket.on('sendNotification', async (notificationData) => {
        try {
          if (!socket.userId) {
            socket.emit('socketError', { error: 'Not authenticated' });
            return;
          }

          const { title, message, relatedRoute, relatedBus, notificationType, priority } = notificationData;
          console.log('📢 Processing socket notification:', { title, relatedRoute, relatedBus });

          let targetRouteIds = [];
          let targetBusId = relatedBus;
          let fallbackRouteId = relatedRoute;

          if (relatedRoute) {
            const route = await Route.findById(relatedRoute);
            if (!route) {
              socket.emit('socketError', { error: 'Route not found' });
              return;
            }
            targetRouteIds = [relatedRoute];
            targetBusId = targetBusId || route.assignedBus;
          } else if (relatedBus) {
            const routes = await Route.find({ assignedBus: relatedBus });
            targetRouteIds = routes.map(r => r._id.toString());
            if (targetRouteIds.length > 0) fallbackRouteId = targetRouteIds[0];
          }

          if (targetRouteIds.length === 0 || !fallbackRouteId) {
            console.log('⚠️ Invalid target selection for notification');
            socket.emit('socketError', { error: 'Invalid route or bus selection' });
            return;
          }

          const notification = new Notification({
            title,
            message,
            relatedRoute: fallbackRouteId,
            relatedBus: targetBusId,
            notificationType: notificationType || 'general',
            priority: priority || 'medium',
            sentBy: socket.userId,
            readBy: []
          });

          await notification.save();
          console.log('📢 New notification created in DB:', notification._id);

          // Broadcast to each target route
          targetRouteIds.forEach(routeId => {
            const roomName = `route_${routeId}`;
            console.log(`📡 Broadcasting to room: ${roomName}`);
            this.io.to(roomName).emit('notification', {
              _id: notification._id,
              title: notification.title,
              message: notification.message,
              relatedRoute: routeId,
              relatedBus: relatedBus || targetBusId,
              notificationType: notification.notificationType,
              priority: notification.priority,
              sentBy: { _id: socket.userId },
              createdAt: notification.createdAt,
              isRead: false
            });
          });

          socket.emit('notificationSent', { success: true, notificationId: notification._id });

        } catch (error) {
          console.error('❌ Notification sending error:', error);
          socket.emit('socketError', { error: 'Failed to send notification' });
        }
      });

      socket.on('markNotificationRead', async (data) => {
        try {
          const { notificationId } = data;
          if (!socket.userId) {
            socket.emit('socketError', { error: 'Not authenticated' });
            return;
          }

          const notification = await Notification.findById(notificationId);
          if (!notification) {
            socket.emit('socketError', { error: 'Notification not found' });
            return;
          }

          if (!notification.readBy.includes(socket.userId)) {
            notification.readBy.push(socket.userId);
            await notification.save();
          }

          socket.emit('notificationRead', { notificationId });

        } catch (error) {
          console.error('❌ Error marking notification as read:', error);
          socket.emit('socketError', { error: 'Failed to mark notification as read' });
        }
      });

      socket.on('driverUpdateStop', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('socketError', { error: 'Not authenticated' });
            return;
          }

          const { busId, routeId, currentStopIndex, stopName } = data;

          const driver = await User.findById(socket.userId);
          const bus = await Bus.findById(busId);

          if (!driver) {
            socket.emit('socketError', { error: 'Driver not found' });
            return;
          }
          if (!bus) {
            socket.emit('socketError', { error: 'Bus not found' });
            return;
          }
          if (!bus.driver) {
            socket.emit('socketError', { error: 'No driver assigned to this bus' });
            return;
          }
          if (bus.driver.toString() !== socket.userId) {
            socket.emit('socketError', { error: 'This bus is assigned to a different driver' });
            return;
          }

          const routeForBus = await Route.findOne({ assignedBus: busId }).select('_id');
          if (!routeForBus) {
            socket.emit('socketError', { error: 'No route assigned to this bus' });
            return;
          }
          if (routeForBus._id.toString() !== routeId) {
            socket.emit('socketError', { error: 'Route mismatch for this bus' });
            return;
          }

          bus.currentStopIndex = currentStopIndex;
          bus.lastUpdated = new Date();
          await bus.save();

          console.log(`🚌 Driver ${driver.name} updated bus ${bus.busNumber} to stop ${currentStopIndex}: ${stopName} (route ${routeId})`);

          const roomName = `route_${routeId}`;
          const room = this.io.sockets.adapter.rooms.get(roomName);
          const listenersCount = room ? room.size : 0;
          console.log(`📣 Emitting busLocationUpdate to room ${roomName} with ${listenersCount} listener(s)`);

          this.io.to(roomName).emit('busLocationUpdate', {
            busId,
            routeId,
            currentStopIndex,
            stopName,
            busNumber: bus.busNumber,
            driverName: driver.name,
            timestamp: new Date(),
            type: 'location_update'
          });
          console.log(`✅ busLocationUpdate emitted for bus ${bus.busNumber} stop ${currentStopIndex}`);

          socket.emit('stopUpdateConfirmed', {
            success: true,
            stopIndex: currentStopIndex,
            stopName: stopName
          });

        } catch (error) {
          console.error('❌ Error updating bus stop:', error);
          socket.emit('socketError', { error: 'Failed to update bus stop' });
        }
      });

      socket.on('driverTripCompleted', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('socketError', { error: 'Not authenticated' });
            return;
          }

          const { busId, routeId } = data;

          const driver = await User.findById(socket.userId);
          const bus = await Bus.findById(busId);
          if (!driver || !bus || bus.driver?.toString() !== socket.userId) {
            socket.emit('socketError', { error: 'Not authorized to complete this trip' });
            return;
          }

          this.io.to(`route_${routeId}`).emit('driverUpdatesClear', {
            routeId,
            busId
          });

          socket.emit('tripCompletedConfirmed', { success: true });
        } catch (error) {
          console.error('❌ Error completing trip:', error);
          socket.emit('socketError', { error: 'Failed to complete trip' });
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);

        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          const { userId, routeId } = userInfo;

          if (this.activeUsersByRoute.has(routeId)) {
            this.activeUsersByRoute.get(routeId).delete(userId);

            if (this.activeUsersByRoute.get(routeId).size === 0) {
              this.activeUsersByRoute.delete(routeId);
            }
          }

          this.socketToUser.delete(socket.id);

          console.log(`👋 User ${userId} disconnected from route ${routeId}`);
          console.log(`📊 Active users on route ${routeId}:`, this.activeUsersByRoute.get(routeId)?.size || 0);
        }
      });
    });
  }

  // Broadcast notification to specific routes
  broadcastNotification(routeIds, notificationData) {
    if (!this.io) {
      console.error('❌ Socket.IO not initialized');
      return;
    }

    const targetRouteIds = Array.isArray(routeIds) ? routeIds : [routeIds];

    targetRouteIds.forEach(routeId => {
      const roomName = `route_${routeId}`;

      // Debug: Check how many people are actually in this room
      const clients = this.io.sockets.adapter.rooms.get(roomName);
      const clientCount = clients ? clients.size : 0;

      console.log(`📡 BROADCAST: Emitting 'notification' to ${roomName} (${clientCount} targets)`);
      this.io.to(roomName).emit('notification', notificationData);

      if (clientCount === 0) {
        console.warn(`⚠️  WARNING: Room ${roomName} is empty! No connected users will see this in real-time.`);
      }
    });
  }
}

module.exports = new SocketService();
