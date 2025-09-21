const Notification = require('../models/Notification');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
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

/** Send email helper */
const sendEmail = async (to, subject, message, fromName) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #2E86C1;">School System Notification</h2>
      <p>Hello,</p>
      <p>You have a new notification from <strong>${fromName}</strong>:</p>
      <blockquote style="background-color: #f2f2f2; padding: 10px; border-left: 4px solid #2E86C1;">
        ${message}
      </blockquote>
      <p>Please log in to your account to respond or view more details.</p>
      <hr>
      <p style="font-size: 0.9em; color: #888;">Automated message.</p>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: `"School System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlTemplate
    });
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
};

/** Create notification */
exports.createNotification = async (req, res) => {
  const { fromTeacherId, toTeacherId, message } = req.body;
  if (!fromTeacherId || !toTeacherId)
    return res.status(400).json({ message: 'fromTeacherId and toTeacherId required' });

  try {
    const fromTeacher = await Teacher.findByPk(fromTeacherId, { include: ['user'] });
    const toTeacher = await Teacher.findByPk(toTeacherId, { include: ['user'] });
    if (!fromTeacher) return res.status(404).json({ message: 'Sender not found' });
    if (!toTeacher) return res.status(404).json({ message: 'Recipient not found' });

    const notification = await Notification.create({
      fromId: fromTeacher.user.id,
      toId: toTeacher.user.id,
      message
    });

    if (toTeacher.email) {
      const fromName = `${fromTeacher.firstName} ${fromTeacher.lastName}`;
      await sendEmail(toTeacher.email, 'New Notification', message, fromName);
    }

    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/** Get notifications for a user */
exports.getUserNotifications = async (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = await Notification.findAll({
      where: { toId: userId },
      include: [
        {
          model: User,
          as: 'from',
          attributes: ['id'],
          include: [
            {
              model: Teacher,
              as: 'teacherProfile',
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = notifications.map(n => ({
      id: n.id,
      message: n.message,
      read: n.read,
      from: n.from?.teacherProfile
        ? `${n.from.teacherProfile.firstName} ${n.from.teacherProfile.lastName}`
        : 'Unknown',
      fromEmail: n.from?.teacherProfile?.email || null,
      createdAt: n.createdAt
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/** Mark notification as read */
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findByPk(id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    notification.read = true;
    await notification.save();
    res.status(200).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/** Get unread & read counts */
exports.getNotificationCounts = async (req, res) => {
  const { userId } = req.params;
  try {
    const unreadCount = await Notification.count({ where: { toId: userId, read: false } });
    const readCount = await Notification.count({ where: { toId: userId, read: true } });
    res.status(200).json({ unreadCount, readCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
