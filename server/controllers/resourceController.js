const fs = require('fs');
const path = require('path');
const Resource = require('../models/Resource');
const User = require('../models/user');
const Conversation = require('../models/Conversation');

const getAuthUserId = (req) => String(req.user?.userId || req.user?.id || req.user?._id || '');

// 1. Get All Visible Resources (Public + User's Study Groups)
exports.getResources = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const myGroups = await Conversation.find({ isGroupChat: true, participants: myId }).select('_id');
        const myGroupIds = myGroups.map((g) => g._id);

        const query = {
            $or: [
                { sharedInGroup: null },
                { sharedInGroup: { $exists: false } },
                { sharedInGroup: { $in: myGroupIds } },
                { uploader: myId }
            ]
        };

        const resources = await Resource.find(query)
            .populate({ path: 'uploader', select: 'name email rollNumber profilePicture', strictPopulate: false })
            .populate({ path: 'sharedInGroup', select: 'chatName', strictPopulate: false })
            .sort({ createdAt: -1 });

        res.status(200).json(resources);
    } catch (error) {
        console.error('getResources error:', error);
        res.status(500).json({ message: 'Failed to load study resources.' });
    }
};

// 2. Upload a Study Resource (+10 Reward Score)
exports.uploadResource = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const { title, subject, category, description, sharedInGroup } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Please attach a file to upload.' });
        }
        if (!title || !subject) {
            return res.status(400).json({ message: 'Title and Subject are required.' });
        }

        const newResource = await Resource.create({
            title: title.trim(),
            subject: subject.trim(),
            category: category || 'Lecture Notes',
            description: (description || '').trim(),
            fileUrl: req.file.filename,
            uploader: myId,
            sharedInGroup: sharedInGroup || null
        });

        await User.findByIdAndUpdate(myId, { $inc: { rewardBalance: 10 } });

        const populated = await Resource.findById(newResource._id)
            .populate({ path: 'uploader', select: 'name email rollNumber profilePicture', strictPopulate: false })
            .populate({ path: 'sharedInGroup', select: 'chatName', strictPopulate: false });

        res.status(201).json(populated);
    } catch (error) {
        console.error('uploadResource error:', error);
        res.status(500).json({ message: 'Failed to upload resource.' });
    }
};

// 3. Track Download Count
exports.trackDownload = async (req, res) => {
    try {
        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloadCount: 1 } },
            { new: true }
        );
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        res.status(200).json(resource);
    } catch (error) {
        res.status(500).json({ message: 'Failed to record download.' });
    }
};

// 4. Get Dashboard Summary (Friend Uploads & Group Uploads)
exports.getDashboardResources = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const currentUser = await User.findById(myId).select('friends');
        const friendIds = currentUser?.friends || [];

        const myGroups = await Conversation.find({ isGroupChat: true, participants: myId }).select('_id');
        const myGroupIds = myGroups.map((g) => g._id);

        const [friendsNotes, groupNotes] = await Promise.all([
            Resource.find({
                uploader: { $in: friendIds },
                $or: [{ sharedInGroup: null }, { sharedInGroup: { $exists: false } }]
            })
                .populate({ path: 'uploader', select: 'name email rollNumber', strictPopulate: false })
                .sort({ createdAt: -1 })
                .limit(5),
            Resource.find({
                sharedInGroup: { $in: myGroupIds }
            })
                .populate({ path: 'uploader', select: 'name email rollNumber', strictPopulate: false })
                .populate({ path: 'sharedInGroup', select: 'chatName', strictPopulate: false })
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        res.status(200).json({
            friendsNotes: friendsNotes || [],
            groupNotes: groupNotes || [],
            recentDownloads: []
        });
    } catch (error) {
        console.error('getDashboardResources error:', error);
        res.status(200).json({ friendsNotes: [], groupNotes: [], recentDownloads: [] });
    }
};

// 5. Delete a Resource (Uploader Only)
exports.deleteResource = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });

        if (String(resource.uploader) !== myId) {
            return res.status(403).json({ message: 'You can only delete resources you uploaded.' });
        }

        if (resource.fileUrl) {
            const filePath = path.join(__dirname, '../uploads', resource.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => {});
            }
        }

        await Resource.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Resource deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete resource.' });
    }
};