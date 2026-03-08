const StudentProfile = require('../models/StudentProfile');
const Branch = require('../models/Branch');

async function generateStudentId(branchId) {
  const branch = await Branch.findById(branchId);
  const prefix = branch ? branch.code.toUpperCase().slice(0, 3) : 'STU';
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await StudentProfile.countDocuments({ branch: branchId });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${year}${seq}`;
}

module.exports = { generateStudentId };
