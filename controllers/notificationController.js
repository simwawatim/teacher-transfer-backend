const Notification = require('../models/Notification');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const nodemailer = require('nodemailer');

/** Nodemailer transporter */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/** Send email */
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"School System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
};

/** Create notification and send email */
exports.createNotification = async (req, res) => {
  const { fromId, toId, message } = req.body;

  try {
    const fromUser = await User.findByPk(fromId, { include: ['teacherProfile'] });
    const toUser = await User.findByPk(toId, { include: ['teacherProfile'] });
    if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });

    // Create notification
    const notification = await Notification.create({ fromId, toId, message });

    // Prepare names and email
    const fromName = fromUser.teacherProfile
      ? `${fromUser.teacherProfile.firstName} ${fromUser.teacherProfile.lastName}`
      : fromUser.username;

    const toEmail = toUser.email; // ensure User model has 'email' column

    // Send email ONLY when creating
    if (toEmail) {
      await sendEmail(
        toEmail,
        'New Notification',
        `You have a new message from ${fromName}: "${message}"`
      );
    }

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Get notifications for a user (no email) */
exports.getUserNotifications = async (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = await Notification.findAll({
      where: { toId: userId },
      include: [
        {
          model: User,
          as: 'from',
          attributes: ['id', 'username'],
          include: [{ model: Teacher, as: 'teacherProfile', attributes: ['firstName','lastName'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = notifications.map(n => ({
      id: n.id,
      message: n.message,
      read: n.read,
      from: n.from.teacherProfile
        ? `${n.from.teacherProfile.firstName} ${n.from.teacherProfile.lastName}`
        : n.from.username,
      createdAt: n.createdAt
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Mark notification as read (no email) */
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findByPk(id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.read = true;
    await notification.save();
    res.status(200).json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
