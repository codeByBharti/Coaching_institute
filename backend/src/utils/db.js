const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coaching_institute';
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    // Drop legacy rollNumber unique index to fix E11000 duplicate key error
    try {
      const StudentProfile = require('../models/StudentProfile');
      await StudentProfile.collection.dropIndex('rollNumber_1');
      console.log('Dropped rollNumber_1 index');
    } catch (e) {
      /* ignore if index does not exist */
    }
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
}

module.exports = connectDb;

