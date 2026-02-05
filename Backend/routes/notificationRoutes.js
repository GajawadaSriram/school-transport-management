const express = require('express');
const router = express.Router();
const {
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationTargets,
  sendAdminNotification,
  getUserNotificationsById
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

router.get('/debug', (req, res) => {
  console.log('🔍 DEBUG: Notification routes are working!');
  res.json({ message: 'Notification routes are working!', timestamp: new Date() });
});

router.get('/', protect, getUserNotificationsById); 
router.patch('/:notificationId/read', protect, markNotificationRead); 
router.patch('/mark-all-read', protect, markAllNotificationsRead); 
router.delete('/:id', protect, markNotificationRead); 

router.post('/admin/send', protect, restrictTo('admin'), sendAdminNotification); 
router.get('/targets', protect, restrictTo('admin'), getNotificationTargets); 

module.exports = router;
