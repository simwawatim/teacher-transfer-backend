const Teacher = require("../models/Teacher");
const School = require("../models/School");
const Transfer = require('../models/TransferRequest');
const { Op, Sequelize } = require("sequelize");

const getStats = async (req, res) => {
  try {
    // Total counts
    const totalTeachers = await Teacher.count();
    const totalSchools = await School.count();
    const pendingTransfers = await Transfer.count({ where: { status: "Pending" } });

    // Months
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const transferByMonth = months.map(month => ({ month, Pending: 0, Approved: 0, Rejected: 0 }));

    // Fetch all transfers this year grouped by month and status
    const currentYear = new Date().getFullYear();
    const transfers = await Transfer.findAll({
      attributes: [
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('createdAt')), currentYear),
      group: ['month', 'status'],
      raw: true
    });

    // Map counts into transferByMonth
    transfers.forEach(t => {
      const monthIndex = t.month - 1; // MONTH returns 1-12
      transferByMonth[monthIndex][t.status] = parseInt(t.count, 10);
    });

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
