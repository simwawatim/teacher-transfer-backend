const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const sendEmailViaAPI = require('../utils/sendEmailViaAPI');

const { Op } = require("sequelize");


sequelize.sync();

function generateRandomPassword() {
  return Math.random().toString(36).slice(-4);
}

function generateUsername(firstName, lastName) {
  const randomNum = Math.floor(10 + Math.random() * 90);
  const f = firstName ? firstName.substring(0, 2).toLowerCase() : "xx";
  const l = lastName ? lastName.substring(0, 2).toLowerCase() : "yy";
  return `${f}${l}${randomNum}`;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}


exports.register = async (req, res) => {
  try {
    const { role, teacherData } = req.body;

    console.log("Body:", req.body);
    console.log("Files:", req.files);
    if (!role || !["teacher", "headteacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let teacherProfile = null;
    let username, password, userEmail;

    if (role === "teacher" || role === "headteacher") {
      if (!teacherData) {
        return res.status(400).json({ message: "Teacher data missing" });
      }

      const parsedTeacherData = {};
      for (let key in teacherData) {
        try {
          parsedTeacherData[key] = JSON.parse(teacherData[key]);
        } catch {
          parsedTeacherData[key] = teacherData[key];
        }
      }

      parsedTeacherData.schoolId = parsedTeacherData.currentSchoolId;

      const requiredFields = [
        { key: "firstName", name: "First Name" },
        { key: "lastName", name: "Last Name" },
        { key: "email", name: "Email" },
        { key: "nrc", name: "NRC" },
        { key: "tsNo", name: "TS Number" },
        { key: "currentSchoolId", name: "Current School" },
        { key: "currentSchoolType", name: "Current School Type" },
        { key: "currentPosition", name: "Current Position" },
      ];
      for (const { key, name } of requiredFields) {
        if (!parsedTeacherData[key] || parsedTeacherData[key].toString().trim() === "") {
          return res.status(400).json({ message: `${name} is required.` });
        }
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsedTeacherData.email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const nrcRegex = /^\d{6}\/\d{2}\/\d{1}$/;
      if (!nrcRegex.test(parsedTeacherData.nrc)) {
        return res.status(400).json({ message: "Invalid NRC format. Expected format: 123456/78/9" });
      }
      if (
        parsedTeacherData.maritalStatus &&
        !["Single", "Married", "Divorced", "Widowed"].includes(parsedTeacherData.maritalStatus)
      ) {
        return res.status(400).json({ message: "Invalid marital status." });
      }

      const existingTeacher = await Teacher.findOne({
        where: {
          [Op.or]: [
            { email: parsedTeacherData.email },
            { nrc: parsedTeacherData.nrc },
            { tsNo: parsedTeacherData.tsNo }
          ]
        }
      });

      if (existingTeacher) {
        let takenField;
        if (existingTeacher.email === parsedTeacherData.email) takenField = "Email";
        else if (existingTeacher.nrc === parsedTeacherData.nrc) takenField = "NRC";
        else if (existingTeacher.tsNo === parsedTeacherData.tsNo) takenField = "TS Number";
        return res.status(400).json({ message: `${takenField} is already registered.` });
      }

      parsedTeacherData.medicalCertificate = req.files.medicalCertificate?.[0]?.path || null;
      parsedTeacherData.academicQualifications = req.files.academicQualifications?.[0]?.path || null;
      parsedTeacherData.professionalQualifications = req.files.professionalQualifications?.[0]?.path || null;

      const requiredFiles = [
        { key: "medicalCertificate", name: "Medical Certificate" },
        { key: "academicQualifications", name: "Academic Qualifications" },
        { key: "professionalQualifications", name: "Professional Qualifications" },
      ];
      for (const { key, name } of requiredFiles) {
        if (!parsedTeacherData[key]) {
          return res.status(400).json({ message: `${name} file is required.` });
        }
      }

  
      if (parsedTeacherData.experience && typeof parsedTeacherData.experience !== "string") {
        parsedTeacherData.experience = JSON.stringify(parsedTeacherData.experience);
      }
      teacherProfile = await Teacher.create(parsedTeacherData);


      username = generateUsername(parsedTeacherData.firstName, parsedTeacherData.lastName);
      password = generateRandomPassword();
      userEmail = parsedTeacherData.email;

    } else {
      username = "admin" + Math.floor(10 + Math.random() * 90);
      password = generateRandomPassword();
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      teacherProfileId: teacherProfile?.id || null,
    });


    if (userEmail) {
      const fullName = teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : username;

      const emailMessage = `
        Hello <b>${fullName}</b>,<br><br>
        Your account has been created successfully.<br>
        <b>Username:</b> ${username}<br>
        <b>Password:</b> ${password}<br><br>
        Please change your password after your first login.
      `;

      await sendEmailViaAPI({
        to: userEmail,
        subject: "Welcome to Our Platform",
        message: emailMessage,
        header: "Welcome Email",
        actionUrl: "https://teacher-transfer-frontend.vercel.app/home",
        actionText: "Go to Dashboard"
      });
    }

    res.status(201).json({
      message: teacherProfile ? "Teacher created successfully" : "User registered successfully",
      userId: newUser.id,
      username,
      password,
      teacherProfileId: teacherProfile?.id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};



const JWT_SECRET = "3F9d$g7!aBz#8LpQv&k9XsYw^Rt2GhUe!4JmPqLz1YwQp8RkVs7NxDz2MjFqLtHu"; 


exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      where: { username },
      include: [{ model: Teacher, as: 'teacherProfile' }]
    });

    if (!user) return res.status(400).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      teacherProfileId: user.teacherProfileId || null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

