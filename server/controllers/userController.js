const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const Conversation = require('../models/Conversation');
const Note = require('../models/Note');
const Resource = require('../models/Resource');

const getAuthUserId = (req) => req.user.userId || req.user.id || req.user._id;

// 1. Get Logged-In Student Profile + Real Activity Overview
exports.getUserProfile = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const user = await User.findById(userId)
            .select('-password')
            .populate('quickChatSlots', 'name email rollNumber bio profilePicture');

        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Calculate real activity metrics from MongoDB
        const [groupsCount, notesCount, resourcesCount, recentResources, recentNotes, recentGroups] = await Promise.all([
            Conversation.countDocuments({ isGroupChat: true, participants: userId }),
            Note.countDocuments({ user: userId }),
            Resource.countDocuments({ uploader: userId }),
            Resource.find({ uploader: userId }).sort({ createdAt: -1 }).limit(4).select('title subject category downloadCount createdAt'),
            Note.find({ user: userId }).sort({ updatedAt: -1 }).limit(4).select('title folder updatedAt pageColor'),
            Conversation.find({ isGroupChat: true, participants: userId }).sort({ updatedAt: -1 }).limit(4).select('chatName description participants updatedAt')
        ]);

        res.status(200).json({
            ...user.toObject(),
            stats: {
                friendsCount: (user.friends || []).length,
                groupsCount,
                notesCount,
                resourcesCount
            },
            recentActivity: {
                resources: recentResources,
                notes: recentNotes,
                groups: recentGroups
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Failed to load profile.' });
    }
};

// 2. Update Profile Information & Theme Preference
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const { name, bio, department, semester, skills, themePreference } = req.body;

        const updateFields = {};
        if (name !== undefined && name.trim()) updateFields.name = name.trim();
        if (bio !== undefined) updateFields.bio = String(bio).slice(0, 500);
        if (department !== undefined) updateFields.department = department.trim();
        if (semester !== undefined) updateFields.semester = semester.trim();
        if (Array.isArray(skills)) {
            updateFields.skills = skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 15);
        }
        if (['light', 'dark', 'midnight'].includes(themePreference)) {
            updateFields.themePreference = themePreference;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update profile.' });
    }
};

// 3. Upload / Replace Profile Picture
exports.uploadProfilePicture = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!req.file) {
            return res.status(400).json({ message: 'Please select a valid image file.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Remove previous avatar file from disk if one existed
        if (user.profilePicture) {
            const oldPath = path.join(__dirname, '../uploads', user.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, () => {});
            }
        }

        user.profilePicture = req.file.filename;
        await user.save();

        res.status(200).json({
            message: 'Profile picture updated!',
            profilePicture: user.profilePicture
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload profile picture.' });
    }
};

// 4. Remove Profile Picture
exports.removeProfilePicture = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (user.profilePicture) {
            const oldPath = path.join(__dirname, '../uploads', user.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, () => {});
            }
        }

        user.profilePicture = '';
        await user.save();

        res.status(200).json({ message: 'Profile picture removed.', profilePicture: '' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove profile picture.' });
    }
};

// 5. Search Students by Roll Number or Name
exports.searchUsers = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const search = req.query.search ? req.query.search.trim() : '';
        const query = search
            ? {
                $or: [
                    { rollNumber: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const users = await User.find({ ...query, _id: { $ne: myId } })
            .select('name email rollNumber profilePicture department bio friendRequests friends');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to search students.' });
    }
};

// 6. Send a Friend Request
exports.sendFriendRequest = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = String(getAuthUserId(req));

        if (targetUserId === myId) {
            return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
        }

        const [targetUser, currentUser] = await Promise.all([
            User.findById(targetUserId),
            User.findById(myId)
        ]);

        if (!targetUser) return res.status(404).json({ message: 'Student not found.' });

        const existingFriends = (targetUser.friends || []).map(String);
        if (existingFriends.includes(myId)) {
            return res.status(400).json({ message: 'You are already friends.' });
        }

        const existingRequests = (targetUser.friendRequests || []).map(String);
        if (existingRequests.includes(myId)) {
            return res.status(400).json({ message: 'Friend request already sent.' });
        }

        // If they already sent us a request, let the user know
        if ((currentUser?.friendRequests || []).map(String).includes(targetUserId)) {
            return res.status(400).json({ message: 'This student already sent you a request! Accept it in your requests tab.' });
        }

        await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { friendRequests: myId }
        });

        res.status(200).json({ message: 'Friend request sent!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send friend request.' });
    }
};

// 7. Accept a Friend Request
exports.acceptFriendRequest = async (req, res) => {
    try {
        const senderId = req.params.id;
        const myId = getAuthUserId(req);

        await User.findByIdAndUpdate(myId, {
            $addToSet: { friends: senderId },
            $pull: { friendRequests: senderId }
        });

        await User.findByIdAndUpdate(senderId, {
            $addToSet: { friends: myId },
            $pull: { friendRequests: myId }
        });

        res.status(200).json({ message: 'Friend request accepted!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to accept request.' });
    }
};

// 8. Reject or Cancel a Friend Request
exports.rejectFriendRequest = async (req, res) => {
    try {
        const otherUserId = req.params.id;
        const myId = getAuthUserId(req);

        await User.findByIdAndUpdate(myId, { $pull: { friendRequests: otherUserId } });
        await User.findByIdAndUpdate(otherUserId, { $pull: { friendRequests: myId } });

        res.status(200).json({ message: 'Friend request removed.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove friend request.' });
    }
};

// 9. Get My Friends & Pending Requests (with profilePicture & rollNumber)
exports.getFriendsAndRequests = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        const user = await User.findById(myId)
            .populate('friends', 'name email rollNumber profilePicture department bio')
            .populate('friendRequests', 'name email rollNumber profilePicture department bio');

        res.status(200).json({
            friends: user?.friends || [],
            friendRequests: user?.friendRequests || []
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch friends.' });
    }
};

// 10. Save Quick-Chat Shortcut Slots (Max 4 slots)
exports.updateQuickChatSlots = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const { slots } = req.body;

        if (!Array.isArray(slots) || slots.length > 4) {
            return res.status(400).json({ message: 'Quick chat must be an array of up to 4 slots.' });
        }

        const normalizedSlots = [0, 1, 2, 3].map((i) => slots[i] || null);

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { quickChatSlots: normalizedSlots } },
            { new: true }
        ).populate('quickChatSlots', 'name email rollNumber bio profilePicture');

        res.status(200).json({
            message: 'Quick chat shortcuts updated.',
            quickChatSlots: updatedUser.quickChatSlots
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update quick chat shortcuts.' });
    }
};