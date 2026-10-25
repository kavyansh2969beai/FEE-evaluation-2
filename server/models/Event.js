const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String,
        default: ''
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date, 
        required: true 
    },
    isAllDay: {
        type: Boolean,
        default: false
    },
    location: {
        type: String,
        default: ''
    },
    reminder: {
        type: String,
        enum: ['none', '15min', '1hour', '1day'],
        default: 'none'
    },
    category: {
        type: String,
        enum: ['Study Session', 'Group Meeting', 'Deadline', 'Exam'],
        default: 'Study Session'
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Event', eventSchema);