const Teacher = require("../models/Teacher");
const School = require("../models/School");
const Transfer = require("../models/TransferRequest");
const User = require("../models/User");
const { Op, Sequelize } = require("sequelize");


const getStats = async (req, res) => {
  try {
    let teacherSchoolId = null;
    let transferCondition = {}; // default: no restriction
    let teacherCondition = {};  // for Teacher.count()

    // Restrict stats if headteacher
    if (req.user && req.user.role === "headteacher") {
      const user = await User.findOne({
        where: { id: req.user.id },
        include: { model: Teacher, as: "teacherProfile" }
      });

      if (!user || !user.teacherProfile) {
        return res.status(404).json({ message: "Teacher record not found" });
      }

      teacherSchoolId = user.teacherProfile.currentSchoolId;

      // Teachers must belong to this school
      teacherCondition = { currentSchoolId: teacherSchoolId };

      // Transfers must involve this school (either from or to)
      transferCondition = {
        [Op.or]: [
          { fromSchoolId: teacherSchoolId },
          { toSchoolId: teacherSchoolId }
        ]
      };
    }

    // Total counts
    const totalTeachers = await Teacher.count({ where: teacherCondition });
    const totalSchools = teacherSchoolId ? 1 : await School.count();
    const pendingTransfers = await Transfer.count({
      where: { status: "pending", ...transferCondition }
    });

    // Prepare months array
    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const transferByMonth = months.map(month => ({
      month,
      pending: 0,
      approved: 0,
      rejected: 0
    }));

    // Current year
    const currentYear = new Date().getFullYear();

    // Fetch transfers grouped by month & status
    const transfers = await Transfer.findAll({
      attributes: [
        [Sequelize.literal(`EXTRACT(MONTH FROM "createdAt")`), "month"],
        "status",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
      ],
      where: {
        ...transferCondition,
        [Op.and]: Sequelize.where(
          Sequelize.literal(`EXTRACT(YEAR FROM "createdAt")`),
          currentYear
        )
      },
      group: ["month", "status"],
      raw: true
    });

    // Map counts to transferByMonth array
    transfers.forEach(t => {
      const monthIndex = parseInt(t.month, 10) - 1; // EXTRACT returns 1-12
      if (monthIndex >= 0 && monthIndex < 12) {
        transferByMonth[monthIndex][t.status.toLowerCase()] = parseInt(t.count, 10);
      }
    });

    // Return stats
    res.json({
      totals: { totalTeachers, totalSchools, pendingTransfers },
      transferByMonth
    });

  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

module.exports = { getStats };
