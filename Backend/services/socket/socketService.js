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
    
    io.on('connection', (socket) => {
      console.log('🔌 New socket connection:', socket.id);

      socket.on('authenticate', async (data) => {
        try {
          const userId = data.userId || data.user?.id;
          socket.userId = userId;
          
          if (userId) {
            console.log('✅ Socket authenticated for user:', userId);
            socket.emit('socketConnected');
          } else {
            console.log('❌ No userId provided in authentication data');
          }
        } catch (error) {
          console.error('❌ Socket authentication error:', error);
          socket.emit('socketError', { error: 'Authentication failed' });
        }
      });

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

          console.log(`✅ Student ${socket.userId} subscribed to route ${routeId}`);
          console.log(`📊 Active users on route ${routeId}:`, this.activeUsersByRoute.get(routeId).size);
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

          const { title, message, routeId, busId, notificationType, priority } = notificationData;

          const targetRoutes = await Route.find({ _id: routeId });
          const targetBus = await Bus.findById(busId);

          if (!targetRoutes.length || !targetBus) {
            socket.emit('socketError', { error: 'Invalid route or bus' });
            return;
          }

          const notification = new Notification({
            title,
            message,
            relatedRoute: targetRoutes[0]._id,
            relatedBus: targetBus,
            notificationType: notificationType || 'general',
            priority: priority || 'medium',
            sentBy: socket.userId,
            readBy: []
          });

          await notification.save();
          console.log('📢 New notification created:', notification._id);

          this.io.to(`route_${targetRoutes[0]._id}`).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            relatedRoute: targetRoutes[0],
            relatedBus: targetBus,
            notificationType: notification.notificationType,
            priority: notification.priority,
            sentBy: { _id: socket.userId },
            createdAt: notification.createdAt,
            isRead: false
          });

          socket.emit('notificationSent', { success: true, notificationId: notification._id });

        } catch (error) {
          console.error('❌ Notification sending error:', error);
          socket.emit('socketError', { error: 'Failed to send notification' });
        }
      });

      socket.on('markNotificationRead', async (notificationId) => {
        try {
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
}

module.exports = new SocketService();
