const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  message: { type: DataTypes.STRING, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associations
Notification.belongsTo(User, { as: 'from', foreignKey: 'fromId' });
Notification.belongsTo(User, { as: 'to', foreignKey: 'toId' });

User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'fromId' });
User.hasMany(Notification, { as: 'receivedNotifications', foreignKey: 'toId' });

module.exports = Notification;
