const mongoose = require('mongoose');

const dailyEntrySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

const monthlyHeatmapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  entries: {
    type: [dailyEntrySchema],
    default: []
  }
}, {
  timestamps: true
});

monthlyHeatmapSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

const MonthlyHeatmap = mongoose.model('MonthlyHeatmap', monthlyHeatmapSchema);

module.exports = MonthlyHeatmap;
