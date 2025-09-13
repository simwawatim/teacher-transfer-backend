const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Teacher = require('./Teacher');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('teacher', 'headteacher', 'admin'), 
    defaultValue: 'teacher' 
  },
  teacherProfileId: {
    type: DataTypes.INTEGER,
    references: {
      model: Teacher,
      key: 'id'
    }
  }
});

User.belongsTo(Teacher, { foreignKey: 'teacherProfileId', as: 'teacherProfile', onDelete: 'CASCADE' });
Teacher.hasOne(User, { foreignKey: 'teacherProfileId', as: 'user', onDelete: 'CASCADE' });

module.exports = User;
