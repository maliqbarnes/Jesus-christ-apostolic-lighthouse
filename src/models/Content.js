const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tag: { type: String, default: 'EVENT' },
  title: { type: String, required: true },
  time: { type: String, required: true },
  description: { type: String, default: '' }
});

const slideSchema = new mongoose.Schema({
  id: { type: String, required: true },
  badge: { type: String, default: 'MINISTRY' },
  title: { type: String, required: true },
  image: { type: String, required: true }
});

const contentSchema = new mongoose.Schema({
  key: { type: String, default: 'main_content', unique: true },
  events: [eventSchema],
  services: {
    sunday: { type: String, default: '11:00 AM' },
    wednesday: { type: String, default: 'Tuesday • 7:00 PM' },
    announcement: { type: String, default: 'Welcome to JCAL!' },
    announcementActive: { type: Boolean, default: false }
  },
  giving: {
    givelify: { type: String, default: 'JCAL Ministries' },
    cashapp: { type: String, default: '$JoyInv' },
    zelle: { type: String, default: 'jcalministriesintl@gmail.com' }
  },
  carousel: {
    audioUrl: { type: String, default: '/audio/8553940285143159747.m4a' },
    audioMode: { type: String, default: 'file' },
    slides: [slideSchema]
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', contentSchema);
