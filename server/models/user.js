const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    passwordHash: { type: String, select: false },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    department: { type: String, default: 'Computer Science & Engineering' },
    semester: { type: String, default: 'Undergraduate' },
    skills: { type: [String], default: [] },
    themePreference: {
        type: String,
        enum: ['light', 'dark', 'midnight'],
        default: 'light'
    },
    rewardBalance: { type: Number, default: 0 },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    quickChatSlots: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }],
        default: [null, null, null, null]
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);