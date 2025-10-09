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
    
    const { relatedRoute, title, message, notificationType = 'general', priority = 'medium' } = req.body;
    const adminId = req.user.id;

    console.log('🔍 DEBUG: Admin notification request:', { relatedRoute, title, message, notificationType, priority, adminId });

    if (!relatedRoute || !title || !message) {
      console.log('❌ DEBUG: Missing required fields');
      return res.status(400).json({ 
        message: 'Route ID, title, and message are required' 
      });
    }

    console.log('🔍 DEBUG: About to find route');

    const route = await Route.findById(relatedRoute);
    console.log('🔍 DEBUG: Route found:', route ? { routeId: route._id, routeName: route.routeName } : 'NOT FOUND');
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    console.log('🔍 DEBUG: About to find users for route');

    const users = await User.find({ selectedRoute: relatedRoute });

    console.log('🔍 DEBUG: Users found for route:', users.length);
    console.log('🔍 DEBUG: User details:', users.map(u => ({ id: u._id, name: u.name, role: u.role, selectedRoute: u.selectedRoute, assignedBus: u.assignedBus })));

    if (users.length === 0) {
      console.log('❌ DEBUG: No users found for route');
      return res.status(400).json({ 
        message: 'No users found for this route' 
      });
    }

    console.log('🔍 DEBUG: Creating database notifications for all users');

    const userNotifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      relatedRoute: relatedRoute,
      relatedBus: user.assignedBus || null,
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
      relatedRoute: relatedRoute,
      relatedBus: route.assignedBus || null,
      notificationType,
      priority,
      sentBy: adminId,
      readBy: []
    });

    console.log('✅ DEBUG: Global notification created:', globalNotification._id);

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
