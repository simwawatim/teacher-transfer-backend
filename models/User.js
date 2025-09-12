// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Teacher = require('./Teacher');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin','headteacher','teacher'), defaultValue: 'teacher' },
});

User.belongsTo(Teacher, { 
  foreignKey: 'teacherProfileId', 
  as: 'teacherProfile',
  onDelete: 'CASCADE'
});

module.exports = User;
