const TransferRequest = require('../models/TransferRequest');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
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


    if (teacher.currentSchoolId === toSchoolId) {
      return res.status(400).json({ message: "You cannot request a transfer to your current school." });
    }


    const existing = await TransferRequest.findOne({
      where: { teacherId, status: 'pending' }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending transfer request.' });
    }
    console.log('teacher:', teacher);
    console.log('teacher.currentSchoolId:', teacher.currentSchoolId);

    const transfer = await TransferRequest.create({

      
      teacherId,
      fromSchoolId: teacher.currentSchoolId,
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
    console.log(`[INFO] User making request: id=${user.id}, role=${user.role}`);

    let whereClause = {};
    

    if (user.role === 'teacher') {
      // Teachers only see their own requests
      if (!user.teacherProfileId) {
        console.error(`[ERROR] Teacher profile not linked. userId=${user.id}`);
        return res.status(400).json({ message: "Teacher profile not linked to this account." });
      }

      whereClause.teacherId = user.teacherProfileId;
      console.log(`[INFO] Applying filter for teacher: teacherId=${user.teacherProfileId}`);

    } else if (user.role === 'headteacher') {
      // Headteachers: find their schoolId from Teacher profile
      if (!user.teacherProfileId) {
        console.error(`[ERROR] Headteacher profile not linked. userId=${user.id}`);
        return res.status(400).json({ message: "Headteacher profile not linked to this account." });
      }

      const teacher = await Teacher.findByPk(user.teacherProfileId, {
        include: [{ model: School, as: 'currentSchool' }]
      });

      if (!teacher || !teacher.currentSchoolId) {
        console.error(`[ERROR] Headteacher does not belong to any school. userId=${user.id}`);
        return res.status(400).json({ message: "Headteacher does not belong to any school." });
      }

      // Headteacher sees all requests from their school
      whereClause.fromSchoolId = teacher.currentSchoolId;
      console.log(`[INFO] Applying filter for headteacher: fromSchoolId=${teacher.currentSchoolId}`);

    } else {
      // Admin sees all
      console.log(`[INFO] Admin user: no filters applied`);
    }

    console.log(`[INFO] Fetching transfer requests with filter:`, whereClause);

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

    console.log(`[INFO] Found ${requests.length} transfer requests`);

    // Log available transfers
    if (requests.length > 0) {
      console.log(`[INFO] Available Transfers:`);
      requests.forEach(reqItem => {
        console.log(
          `- Transfer ID: ${reqItem.id}, Teacher: ${reqItem.teacher.firstName} ${reqItem.teacher.lastName}, From: ${reqItem.fromSchool?.name || 'N/A'}, To: ${reqItem.toSchool?.name || 'N/A'}`
        );
      });
    } else {
      console.log(`[INFO] No available transfers found.`);
    }

    res.status(200).json(requests);

  } catch (err) {
    console.error(`[ERROR] Failed to get transfer requests: ${err.message}`, err);
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
