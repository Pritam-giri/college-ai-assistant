// models/Timetable.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const timetableSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true, min: 1, max: 6 },
    day: {
      type: String,
      enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      required: true,
    },
    slots: [
      {
        time: String, // e.g. "9:00-10:00"
        subject: String,
        faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
        room: String,
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

timetableSchema.plugin(departmentPlugin);
timetableSchema.index({ department: 1, semester: 1, day: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
