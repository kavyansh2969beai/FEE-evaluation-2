const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    chatName: { type: String, trim: true, default: 'Personal Chat' },
    description: { type: String, default: '', trim: true },
    isGroupChat: { type: Boolean, default: false },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    unreadCounts: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Conversation', conversationSchema);