const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Note'
    },
    // Plain-text fallback for search, snippets, and TXT export
    content: {
        type: String,
        default: ''
    },
    // Rich HTML content from the notebook editor
    htmlContent: {
        type: String,
        default: ''
    },
    folder: {
        type: String,
        default: 'General',
        trim: true
    },
    paperStyle: {
        type: String,
        enum: ['lined', 'plain', 'grid', 'dotted'],
        default: 'lined'
    },
    pageColor: {
        type: String,
        default: '#fdfbf7' // Warm cream notebook paper
    },
    fontFamily: {
        type: String,
        default: "'Inter', sans-serif"
    },
    fontSize: {
        type: String,
        default: '16px'
    },
    textColor: {
        type: String,
        default: '#1e293b'
    },
    showMarginLine: {
        type: Boolean,
        default: true
    },
    isQuickNote: {
        type: Boolean,
        default: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);