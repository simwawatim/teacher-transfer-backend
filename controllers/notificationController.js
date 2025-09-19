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

/** Send email with HTML template */
const sendEmail = async (to, subject, message, fromName) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #2E86C1;">School System Notification</h2>
      <p>Hello,</p>
      <p>You have a new notification from <strong>${fromName}</strong>:</p>
      <blockquote style="background-color: #f2f2f2; padding: 10px; border-left: 4px solid #2E86C1;">
        ${message}
      </blockquote>
      <p style="margin-top: 20px;">Please log in to your account to respond or view more details.</p>
      <hr>
      <p style="font-size: 0.9em; color: #888;">This is an automated message from your School System.</p>
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

  if (!fromTeacherId || !toTeacherId) {
    return res.status(400).json({ message: 'fromTeacherId and toTeacherId are required' });
  }

  try {
    const fromTeacher = await Teacher.findByPk(fromTeacherId, { include: ['user'] });
    const toTeacher = await Teacher.findByPk(toTeacherId, { include: ['user'] });

    if (!fromTeacher) return res.status(404).json({ message: `Sender teacher not found (ID: ${fromTeacherId})` });
    if (!toTeacher) return res.status(404).json({ message: `Recipient teacher not found (ID: ${toTeacherId})` });

    const fromUserId = fromTeacher.user?.id;
    const toUserId = toTeacher.user?.id;

    if (!fromUserId) return res.status(404).json({ message: `Sender teacher has no associated user` });
    if (!toUserId) return res.status(404).json({ message: `Recipient teacher has no associated user` });

    // Create notification in DB
    const notification = await Notification.create({
      fromId: fromUserId,
      toId: toUserId,
      message
    });

    const fromName = `${fromTeacher.firstName} ${fromTeacher.lastName}`;

    // Send HTML email
    const toEmail = toTeacher.email;
    if (toEmail) await sendEmail(toEmail, 'New Notification', message, fromName);

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
          as: 'from', // matches your Notification association
          attributes: ['id', 'email'],
          include: [
            {
              model: Teacher,
              as: 'teacher', // make sure User has Teacher association
              attributes: ['firstName', 'lastName']
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
      from: n.from?.teacher
        ? `${n.from.teacher.firstName} ${n.from.teacher.lastName}`
        : 'Unknown',
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
