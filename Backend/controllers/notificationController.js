const Notification = require('../models/Notification');
const User = require('../models/User');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const UserNotification = require('../models/UserNotification');
const socketService = require('../services/socket/socketService');



const markNotificationRead = async (req, res) => {
  try {
    const { notificationId, id } = req.params;
    const userId = req.user.id;
    const notificationIdToUse = notificationId || id;

    const userNotification = await UserNotification.findOneAndDelete({
      _id: notificationIdToUse,
      userId: userId
    });

    if (userNotification) {
      return res.json({
        success: true,
        message: 'Notification marked as read and removed',
        deleted: true
      });
    }

    const notification = await Notification.findById(notificationIdToUse);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await UserNotification.deleteMany({ userId: userId });

    res.json({
      message: `${result.deletedCount} notifications marked as read and removed`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};









const getNotificationTargets = async (req, res) => {
  try {
    const routes = await Route.find()
      .populate('assignedBus', 'busNumber')
      .select('routeName assignedBus')
      .exec();

    const routesWithUserCounts = await Promise.all(
      routes.map(async (route) => {
        const userCount = await User.countDocuments({ selectedRoute: route._id });
        return {
          _id: route._id,
          routeName: route.routeName,
          assignedBus: route.assignedBus,
          userCount: userCount
        };
      })
    );

    const activeRoutes = routesWithUserCounts.filter(route => route.userCount > 0);

    console.log('🔍 DEBUG: Available routes for notifications:', activeRoutes);

    res.json({
      routes: activeRoutes,
      message: 'Routes with assigned users'
    });

  } catch (error) {
    console.error('Error fetching notification targets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendAdminNotification = async (req, res) => {
  try {
    console.log('🔍 DEBUG: Function started');

    const { relatedRoute, relatedBus, targetType, title, message, notificationType = 'general', priority = 'medium' } = req.body;
    const adminId = req.user.id;

    console.log('🔍 DEBUG: Admin notification request:', { targetType, relatedRoute, relatedBus, title, message, notificationType, priority, adminId });

    if (targetType !== 'all' && !relatedRoute && !relatedBus) {
      console.log('❌ DEBUG: Missing target selection');
      return res.status(400).json({
        message: 'A target (Specific Route, Bus, or All Routes), title, and message are required'
      });
    }

    if (!title || !message) {
      console.log('❌ DEBUG: Missing title or message');
      return res.status(400).json({
        message: 'Title and message are required'
      });
    }

    console.log('🔍 DEBUG: Determining targets based on type:', targetType);

    let targetRoutes = [];
    let targetBusId = relatedBus;
    let fallbackRouteId = relatedRoute;

    if (targetType === 'all') {
      const allRoutes = await Route.find().select('_id');
      targetRoutes = allRoutes.map(r => r._id);
      if (targetRoutes.length === 0) {
        return res.status(400).json({ message: 'No routes found to broadcast to' });
      }
      fallbackRouteId = targetRoutes[0]; // Use first route as a fallback placeholder
    } else if (relatedRoute) {
      const route = await Route.findById(relatedRoute);
      if (!route) return res.status(404).json({ message: 'Route not found' });
      targetRoutes = [relatedRoute];
      targetBusId = targetBusId || route.assignedBus;
    } else if (relatedBus) {
      const routes = await Route.find({ assignedBus: relatedBus });
      targetRoutes = routes.map(r => r._id);
      if (targetRoutes.length > 0) fallbackRouteId = targetRoutes[0];
    }

    if (targetRoutes.length === 0) {
      return res.status(400).json({
        message: 'No routes found for this selection'
      });
    }

    const users = await User.find({ selectedRoute: { $in: targetRoutes } });

    if (users.length === 0) {
      return res.status(400).json({
        message: 'No users found for this route'
      });
    }

    console.log('🔍 DEBUG: Creating database notifications for all users');

    const userNotifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      relatedRoute: user.selectedRoute,
      relatedBus: user.assignedBus || targetBusId || null,
      notificationType,
      priority,
      sentBy: adminId,
      isRead: false,
      readAt: null
    }));

    const createdNotifications = await UserNotification.insertMany(userNotifications);
    console.log('💾 DEBUG: Created DB copies for', createdNotifications.length, 'users');

    console.log('🔍 DEBUG: About to create global notification');

    const globalNotification = await Notification.create({
      title,
      message,
      relatedRoute: fallbackRouteId,
      relatedBus: targetBusId,
      notificationType,
      priority,
      sentBy: adminId,
      readBy: []
    });

    console.log('✅ DEBUG: Global notification created:', globalNotification._id);

    // 🚀 NEW: Real-time broadcast using socketService
    try {
      socketService.broadcastNotification(targetRoutes, {
        _id: globalNotification._id,
        title,
        message,
        notificationType,
        priority,
        sentBy: { _id: adminId, name: req.user.name },
        relatedRoute: fallbackRouteId,
        relatedBus: targetBusId,
        createdAt: globalNotification.createdAt,
        isRead: false
      });
      console.log('📡 DEBUG: Real-time broadcast triggered for routes:', targetRoutes);
    } catch (socketError) {
      console.error('⚠️ DEBUG: Socket broadcast failed (non-critical):', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      totalUsers: users.length,
      globalNotificationId: globalNotification._id,
      dbCopiesCreated: createdNotifications.length
    });

  } catch (error) {
    console.error('❌ DEBUG: Error sending admin notification:', error);
    console.error('❌ DEBUG: Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserNotificationsById = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 DEBUG: getUserNotificationsById called for userId:', userId);

    const user = await User.findById(userId).select('selectedRoute');
    console.log('🔍 DEBUG: User found:', user ? { id: user._id, selectedRoute: user.selectedRoute } : 'NOT FOUND');

    if (!user || !user.selectedRoute) {
      console.log('❌ DEBUG: No user or no selectedRoute');
      return res.json([]);
    }

    const allUserNotifications = await UserNotification.find({ userId: userId });
    console.log('🔍 DEBUG: All notifications for this user:', allUserNotifications.length);
    console.log('🔍 DEBUG: Sample notification:', allUserNotifications[0]);

    const notifications = await UserNotification.find({
      userId: userId,
      relatedRoute: user.selectedRoute
    })
      .populate('relatedRoute', 'routeName')
      .populate('relatedBus', 'busNumber')
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .exec();

    console.log('🔍 DEBUG: User notifications for route:', {
      userId: userId,
      selectedRoute: user.selectedRoute,
      notificationCount: notifications.length
    });

    res.json(notifications);

  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationTargets,
  sendAdminNotification,
  getUserNotificationsById
};
