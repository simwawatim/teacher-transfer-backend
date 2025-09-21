const express = require('express');
const router = express.Router();
const {
  createNotification,
  getUserNotifications,
  markAsRead,
  getNotificationCounts
} = require('../controllers/notificationController');

router.post('/', createNotification);
router.get('/:userId', getUserNotifications);
router.put('/read/:id', markAsRead);

router.get('/counts/:userId', getNotificationCounts);

module.exports = router;
