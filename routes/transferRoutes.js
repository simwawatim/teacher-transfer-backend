const express = require('express');
const router = express.Router();
const {
  requestTransfer,
  getTransferRequests,
  approveTransfer,
  rejectTransfer
} = require('../controllers/transferController');

router.post('/', requestTransfer);                     // Submit request
router.get('/', getTransferRequests);                  // Get all requests
router.put('/approve/:requestId', approveTransfer);    // Approve request
router.put('/reject/:requestId', rejectTransfer);      // Reject request

module.exports = router;
