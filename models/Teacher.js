const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const School = require('./School');

const Teacher = sequelize.define('Teacher', {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  profilePicture: { type: DataTypes.STRING },
  email: { 
  type: DataTypes.STRING, 
  allowNull: false, 
  validate: { isEmail: true } 
},
  nrc: { 
    type: DataTypes.STRING, 
    allowNull: false, 

  },
  tsNo: 
    { 
      
      type: DataTypes.STRING, 
      allowNull: false, 
     },
  address: { type: DataTypes.STRING },
  maritalStatus: { type: DataTypes.ENUM('Single','Married','Divorced','Widowed') },

  medicalCertificate: { type: DataTypes.TEXT, allowNull: false },
  academicQualifications: { type: DataTypes.TEXT, allowNull: false }, 
  professionalQualifications: { type: DataTypes.TEXT, allowNull: false },

  currentSchoolType: { type: DataTypes.ENUM('Community','Primary','Secondary') },
  currentPosition: { type: DataTypes.ENUM('Class Teacher','Subject Teacher','Senior Teacher','HOD','Deputy Head','Head Teacher') },
  subjectSpecialization: { type: DataTypes.STRING },
  experience: { type: DataTypes.TEXT }
});

// Relation with School
Teacher.belongsTo(School, { foreignKey: 'currentSchoolId', as: 'currentSchool' });

module.exports = Teacher;
