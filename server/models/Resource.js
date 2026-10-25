const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, default: 'Lecture Notes' },
    description: { type: String, default: '' },
    fileUrl: { type: String, required: true },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sharedInGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        default: null
    },
    downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);