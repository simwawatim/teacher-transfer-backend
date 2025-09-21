const TransferRequest = require('../models/TransferRequest');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const { sendEmail } = require('../utils/email'); 

// --------------------
// Request a transfer
// --------------------
exports.requestTransfer = async (req, res) => {
  const { teacherId, toSchoolId } = req.body;

  try {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const toSchool = await School.findByPk(toSchoolId);
    if (!toSchool) return res.status(404).json({ message: 'Target school not found' });

    const existing = await TransferRequest.findOne({
      where: { teacherId, status: 'pending' }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending transfer request.' });
    }

    const transfer = await TransferRequest.create({
      teacherId,
      fromSchoolId: teacher.schoolId,
      toSchoolId,
      status: 'pending'
    });

    // Send email to teacher about the transfer request
    if (teacher.email) {
      const message = `Hello ${teacher.firstName},

Your transfer request from ${teacher.schoolId} to ${toSchool.name} has been submitted and is pending approval.

You will be notified once the status changes.`;
      await sendEmail(teacher.email, 'Transfer Request Submitted', message, 'School System');
    }

    res.status(201).json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// --------------------
// Get all transfer requests
// --------------------
exports.getTransferRequests = async (req, res) => {
  try {
    const user = req.user;
    let whereClause = {};

    if (user.role !== 'admin') {
      whereClause.teacherId = user.id;
    }

    const requests = await TransferRequest.findAll({
      where: whereClause,
      include: [
        { 
          model: Teacher, 
          as: 'teacher',
          include: [{ model: School, as: 'currentSchool' }]
        },
        { model: School, as: 'fromSchool' },
        { model: School, as: 'toSchool' }
      ],
      order: [['id', 'DESC']]
    });

    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// --------------------
// Update transfer status
// --------------------
exports.updateTransferStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status, reason } = req.body;

  const allowedStatuses = [
    'pending',
    'headteacher_approved',
    'headteacher_rejected',
    'approved',
    'rejected'
  ];

  if (!status || !allowedStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` });
  }

  try {
    const transfer = await TransferRequest.findByPk(requestId, {
      include: [{ model: Teacher, as: 'teacher' }, { model: School, as: 'toSchool' }]
    });
    if (!transfer) return res.status(404).json({ message: "Transfer request not found" });

    // Update teacher's school if approved
    if (status.toLowerCase() === 'approved') {
      const teacher = await Teacher.findByPk(transfer.teacherId);
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      teacher.schoolId = transfer.toSchoolId;
      await teacher.save();
    }

    transfer.status = status.toLowerCase();
    transfer.statusReason = reason || "";
    await transfer.save();

    // Send email notification to teacher about status change
    if (transfer.teacher && transfer.teacher.email) {
      const teacher = transfer.teacher;
      const toSchoolName = transfer.toSchool ? transfer.toSchool.name : 'target school';
      let message = `Hello ${teacher.firstName},\n\n`;
      message += `Your transfer request to ${toSchoolName} has been updated.`;
      message += `\n\nStatus: ${transfer.status}`;
      if (reason) message += `\nReason: ${reason}`;

      await sendEmail(teacher.email, 'Transfer Request Status Update', message, 'School System');
    }

    res.status(200).json({ message: `Transfer ${status.toLowerCase()} successfully`, transfer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// --------------------
// Get transfer by ID
// --------------------
exports.getTransferById = async (req, res) => {
  const { requestId } = req.params;

  try {
    const transfer = await TransferRequest.findByPk(requestId, {
      include: [
        {
          model: Teacher,
          as: 'teacher',
          include: [{ model: School, as: 'currentSchool' }]
        },
        { model: School, as: 'fromSchool' },
        { model: School, as: 'toSchool' }
      ]
    });

    if (!transfer) return res.status(404).json({ message: 'Transfer request not found' });

    res.status(200).json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
