const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const crypto = require("crypto");
sequelize.sync();



function generateRandomPassword() {
  return Math.random().toString(36).slice(-4);
}

function generateUsername(firstName, lastName) {
  const randomNum = Math.floor(10 + Math.random() * 90); // 2-digit random
  const f = firstName ? firstName.substring(0, 2).toLowerCase() : "xx";
  const l = lastName ? lastName.substring(0, 2).toLowerCase() : "yy";
  return `${f}${l}${randomNum}`;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

exports.register = async (req, res) => {
  const { role, teacherData } = req.body;

  try {
    const validRoles = ["teacher", "headteacher", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: `Role must be one of: ${validRoles.join(", ")}`
      });
    }

    let teacherProfile = null;
    let username, password;

    if (role === "teacher" || role === "headteacher") {
      if (!teacherData)
        return res.status(400).json({ message: "Teacher data is required" });

      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "currentSchoolId",
        "currentPosition"
      ];
      for (const field of requiredFields) {
        if (!teacherData[field])
          return res
            .status(400)
            .json({ message: `${field} is required for teacher profile` });
      }

      if (!isValidEmail(teacherData.email))
        return res.status(400).json({ message: "Invalid email format" });

      const school = await School.findByPk(teacherData.currentSchoolId);
      if (!school)
        return res.status(400).json({ message: "Current school does not exist" });

      teacherProfile = await Teacher.create({
        ...teacherData,
        experience: JSON.stringify(teacherData.experience || [])
      });

      if (!teacherProfile || !teacherProfile.id)
        return res
          .status(500)
          .json({ message: "Failed to create teacher profile" });
      username = generateUsername(teacherData.firstName, teacherData.lastName);
      password = generateRandomPassword();
    } else {
      username = "admin" + Math.floor(10 + Math.random() * 90);
      password = generateRandomPassword();
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      username = username + Math.floor(Math.random() * 100);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });

    console.log("✅ New user registered:", {
      userId: newUser.id,
      username,
      password,
      role,
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });

    res.status(201).json({
      message: teacherProfile
        ? "User and teacher profile registered successfully"
        : "User registered successfully",
      userId: newUser.id,
      username,
      password, 
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


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

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};