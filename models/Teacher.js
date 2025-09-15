const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const School = require('./School');

const Teacher = sequelize.define('Teacher', {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    validate: { isEmail: true } 
  },
  nrc: { type: DataTypes.STRING, allowNull: false }, 
  tsNo: { type: DataTypes.STRING, allowNull: false }, 
  address: { type: DataTypes.STRING },
  maritalStatus: { type: DataTypes.ENUM('Single','Married','Divorced','Widowed') },
  medicalCertificate: { type: DataTypes.STRING },
  academicQualifications: { type: DataTypes.STRING }, 
  professionalQualifications: { 
    type: DataTypes.ENUM(
      'Primary Diploma','Secondary Diploma','Primary Degree','Secondary Degree'
    ) 
  },
  currentSchoolType: { type: DataTypes.ENUM('Community','Primary','Secondary') },
  currentSchoolName: { type: DataTypes.STRING }, 
  currentPosition: { 
    type: DataTypes.ENUM(
      'Class Teacher','Subject Teacher','Senior Teacher','HOD','Deputy Head','Head Teacher'
    ) 
  },
  subjectSpecialization: { type: DataTypes.STRING }, 
  experience: { type: DataTypes.TEXT } 
}, {
  indexes: [
    { unique: true, fields: ['email'], name: 'unique_email' },
    { unique: true, fields: ['nrc'], name: 'unique_nrc' },
    { unique: true, fields: ['tsNo'], name: 'unique_tsNo' }
  ]
});

Teacher.belongsTo(School, { foreignKey: 'currentSchoolId', as: 'currentSchool' });

module.exports = Teacher;
