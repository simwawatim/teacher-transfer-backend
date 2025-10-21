// seedTeacher.js
const sequelize = require('./config/db');
const Teacher = require('./models/Teacher');
const User = require('./models/User');
const School = require('./models/School');
const bcrypt = require('bcrypt');

const seed = async () => {
  try {
    await sequelize.sync({ force: false });
    let school = await School.findOne();
    if (!school) {
      console.log("No school found. Creating a default school...");
      school = await School.create({
        name: "Default Primary School",
        type: "Primary",
        address: "123 School Rd",
        code: "DPS001"
      });
      console.log("School created:", school.toJSON());
    }

    const teacher = await Teacher.create({
      firstName: "John",
      lastName: "Doe",
      profilePicture: "profile.jpg",
      email: "test.admin@example.com",
      nrc: "120456789",
      tsNo: "TS12349",
      address: "123 Main St",
      maritalStatus: "Single",
      medicalCertificate: "certificate.pdf",
      academicQualifications: "B.Ed in Mathematics",
      professionalQualifications: "Teaching Diploma",
      currentSchoolType: "Primary",
      currentSchoolId: school.id,
      currentPosition: "Class Teacher",
      subjectSpecialization: "Mathematics",
      experience: "5 years teaching experience"
    });

    console.log("Teacher created:", teacher.toJSON());
    const rawPassword = "password123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      username: "testadmin",
      password: hashedPassword,
      role: "admin",
      teacherProfileId: teacher.id
    });

    console.log("User created:", {
      id: user.id,
      username: user.username,
      role: user.role,
      teacherProfileId: user.teacherProfileId,
      password: rawPassword 
    });

    console.log("Seeding completed successfully!");
    process.exit(0);

  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seed();
