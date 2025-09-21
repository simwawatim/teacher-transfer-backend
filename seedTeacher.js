// seedTeacher.js
const sequelize = require('./config/db');
const Teacher = require('./models/Teacher');
const User = require('./models/User');
const School = require('./models/School');
const bcrypt = require('bcrypt');

const seed = async () => {
  try {
    await sequelize.sync({ force: false });

    // 1️⃣ Find or create a school
    let school = await School.findOne();
    if (!school) {
      console.log("No school found. Creating a default school...");
      school = await School.create({
        name: "Default Primary School",
        type: "Primary",
        address: "123 School Rd"
      });
      console.log("School created:", school.toJSON());
    }

    // 2️⃣ Create a teacher
    const teacher = await Teacher.create({
      firstName: "John",
      lastName: "Doe",
      profilePicture: "profile.jpg",
      email: "john.doe@example.com",
      nrc: "123456789",
      tsNo: "TS12345",
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

    // 3️⃣ Create a user linked to the teacher
    const rawPassword = "password123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      username: "john_doe",
      password: hashedPassword,
      role: "teacher",
      teacherProfileId: teacher.id
    });

    console.log("User created:", {
      id: user.id,
      username: user.username,
      role: user.role,
      teacherProfileId: user.teacherProfileId,
      password: rawPassword // ✅ raw password logged
    });

    console.log("Seeding completed successfully!");
    process.exit(0);

  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seed();
