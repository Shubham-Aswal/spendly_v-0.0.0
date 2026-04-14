const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spendly';
const fallbackUri = 'mongodb://127.0.0.1:27017/spendly';

const connectToDb = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('Connected to DB successfully');
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed for ${mongoUri}:`, error.message);

    if (mongoUri !== fallbackUri) {
      console.warn(`Attempting fallback MongoDB URI: ${fallbackUri}`);
      try {
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        console.log('Connected to DB successfully');
        return true;
      } catch (fallbackError) {
        console.error(`MongoDB fallback connection failed:`, fallbackError.message);
        return false;
      }
    }

    return false;
  }
};

module.exports = { connectToDb };