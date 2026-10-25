const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    resource: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Resource', 
        required: true 
    }
}, { 
    timestamps: true // Automatically tracks exactly when they downloaded it
});

module.exports = mongoose.model('Download', downloadSchema);