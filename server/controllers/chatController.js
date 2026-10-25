const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/user');
const mongoose = require('mongoose');

const getAuthUserId = (req) => {
    if (!req.user) return '';
    if (typeof req.user === 'string') return req.user;
    return String(req.user.userId || req.user.id || req.user._id || '');
};

const readUnreadCount = (chatDoc, userId) => {
    if (!chatDoc || !chatDoc.unreadCounts) return 0;
    if (typeof chatDoc.unreadCounts.get === 'function') {
        return Number(chatDoc.unreadCounts.get(String(userId)) || 0);
    }
    return Number(chatDoc.unreadCounts[String(userId)] || 0);
};

const writeUnreadCount = (chatDoc, userId, count) => {
    const uid = String(userId);
    if (!chatDoc.unreadCounts || typeof chatDoc.unreadCounts !== 'object') {
        chatDoc.unreadCounts = {};
    }
    if (typeof chatDoc.unreadCounts.set === 'function') {
        chatDoc.unreadCounts.set(uid, count);
    } else {
        chatDoc.unreadCounts = { ...chatDoc.unreadCounts, [uid]: count };
    }
    chatDoc.markModified('unreadCounts');
};

const isParticipant = (chatDoc, userId) =>
    (chatDoc?.participants || []).some((participant) => String(participant?._id || participant) === String(userId));

// 1. Access or Create a 1-on-1 Personal Chat
exports.accessChat = async (req, res) => {
    try {
        const targetUserId = String(req.body?.userId || '').trim();
        const myId = getAuthUserId(req);

        if (!mongoose.Types.ObjectId.isValid(targetUserId) || !mongoose.Types.ObjectId.isValid(myId)) {
            return res.status(400).json({ message: 'Valid user IDs are required to open a chat.' });
        }
        if (targetUserId === myId) {
            return res.status(400).json({ message: 'You cannot open a conversation with yourself.' });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(myId).select('_id'),
            User.findById(targetUserId).select('_id')
        ]);
        if (!currentUser) return res.status(401).json({ message: 'Authenticated student was not found.' });
        if (!targetUser) return res.status(404).json({ message: 'Student not found.' });

        // Find all 1-on-1 conversations that include the logged-in user
        const myDirectChats = await Conversation.find({
            isGroupChat: { $ne: true },
            participants: myId
        }).populate({ path: 'participants', select: '-password', strictPopulate: false });

        // Match the conversation that also contains targetUserId
        let existingChat = myDirectChats.find((chat) =>
            (chat.participants || []).some((p) => String(p?._id || p) === targetUserId)
        );

        if (existingChat) {
            try {
                if (existingChat.latestMessage) {
                    existingChat = await existingChat.populate({
                        path: 'latestMessage',
                        strictPopulate: false,
                        populate: {
                            path: 'sender',
                            select: 'name email rollNumber profilePicture',
                            strictPopulate: false
                        }
                    });
                }
            } catch (popErr) {
                console.warn('Non-fatal latestMessage populate warning:', popErr.message);
            }
            return res.status(200).json(existingChat);
        }

        // Otherwise create a brand-new 1-on-1 conversation
        const createdChat = await Conversation.create({
            chatName: 'Personal Chat',
            isGroupChat: false,
            participants: [myId, targetUserId],
            unreadCounts: { [myId]: 0, [targetUserId]: 0 }
        });

        const fullChat = await Conversation.findById(createdChat._id)
            .populate({ path: 'participants', select: '-password', strictPopulate: false });

        return res.status(200).json(fullChat);
    } catch (error) {
        console.error('accessChat error:', error.name, error.code || 'unknown');
        return res.status(500).json({ message: 'Server error opening chat.' });
    }
};

// 2. Fetch All Conversations for Logged-In Student
exports.fetchChats = async (req, res) => {
    try {
        const myId = getAuthUserId(req);
        if (!myId) return res.status(200).json([]);

        let results = await Conversation.find({
            participants: myId
        })
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false })
            .sort({ updatedAt: -1 });

        try {
            results = await Conversation.populate(results, {
                path: 'latestMessage',
                strictPopulate: false,
                populate: {
                    path: 'sender',
                    select: 'name email rollNumber profilePicture',
                    strictPopulate: false
                }
            });
        } catch (popErr) {
            console.warn('Non-fatal fetchChats populate warning:', popErr.message);
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('fetchChats error:', error);
        res.status(500).json({ message: 'Failed to fetch conversations.' });
    }
};

// 3. Create a Study Group Chat
exports.createGroupChat = async (req, res) => {
    const myId = getAuthUserId(req);
    if (!req.body?.users || typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ message: 'Please provide a group name and select members.' });
    }

    let users;
    try {
        users = typeof req.body.users === 'string' ? JSON.parse(req.body.users) : req.body.users;
    } catch (error) {
        return res.status(400).json({ message: 'Group members must be a valid list of student IDs.' });
    }
    if (!Array.isArray(users) || users.length < 1) {
        return res.status(400).json({ message: 'Please select at least 1 friend to form a group.' });
    }

    const uniqueParticipants = Array.from(new Set([...users.map(String), myId]));
    if (!uniqueParticipants.every((userId) => mongoose.Types.ObjectId.isValid(userId))) {
        return res.status(400).json({ message: 'Group members must be valid student IDs.' });
    }
    const initialUnread = {};
    uniqueParticipants.forEach((uid) => { initialUnread[uid] = 0; });

    try {
        if (await User.countDocuments({ _id: { $in: uniqueParticipants } }) !== uniqueParticipants.length) {
            return res.status(400).json({ message: 'One or more selected students do not exist.' });
        }
        if (req.body.description !== undefined && typeof req.body.description !== 'string') {
            return res.status(400).json({ message: 'Group description must be text.' });
        }

        const groupChat = await Conversation.create({
            chatName: req.body.name.trim(),
            description: (req.body.description || '').trim(),
            participants: uniqueParticipants,
            isGroupChat: true,
            groupAdmin: myId,
            unreadCounts: initialUnread
        });

        const fullGroupChat = await Conversation.findById(groupChat._id)
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false });

        res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error('createGroupChat error:', error);
        res.status(500).json({ message: 'Failed to create group chat.' });
    }
};

// 4. Send a Message & Increment Unread Counts for Recipients
exports.sendMessage = async (req, res) => {
    const { content, chatId } = req.body || {};
    const senderId = getAuthUserId(req);

    if (typeof content !== 'string' || !content.trim() || !mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: 'Message content and chatId are required.' });
    }

    try {
        const chatDoc = await Conversation.findById(chatId);
        if (!chatDoc) return res.status(404).json({ message: 'Conversation not found.' });
        if (!isParticipant(chatDoc, senderId)) {
            return res.status(403).json({ message: 'You are not a member of this conversation.' });
        }

        let message = await Message.create({
            sender: senderId,
            content: content.trim(),
            conversation: chatId
        });

        (chatDoc.participants || []).forEach((partId) => {
            const pid = String(partId?._id || partId);
            if (pid !== senderId) {
                const prevCount = readUnreadCount(chatDoc, pid);
                writeUnreadCount(chatDoc, pid, prevCount + 1);
            } else {
                writeUnreadCount(chatDoc, pid, 0);
            }
        });

        chatDoc.latestMessage = message._id;
        await chatDoc.save();

        message = await Message.findById(message._id)
            .populate({ path: 'sender', select: 'name email rollNumber profilePicture', strictPopulate: false })
            .populate({
                path: 'conversation',
                strictPopulate: false,
                populate: {
                    path: 'participants',
                    select: 'name email rollNumber profilePicture',
                    strictPopulate: false
                }
            });

        const io = req.app.get('io');
        if (io) {
            (chatDoc.participants || [])
                .map((participant) => String(participant?._id || participant))
                .filter((participantId) => participantId !== senderId)
                .forEach((participantId) => io.to(participantId).emit('message_received', message));
        }
        res.status(200).json(message);
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
};

// 5. Fetch All Messages for a Conversation & Clear Unread Count
exports.allMessages = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.status(400).json({ message: 'Invalid conversation ID.' });
        }
        const chatDoc = await Conversation.findById(req.params.chatId);
        if (!chatDoc) return res.status(404).json({ message: 'Conversation not found.' });
        if (!isParticipant(chatDoc, myId)) {
            return res.status(403).json({ message: 'You are not a member of this conversation.' });
        }

        if (readUnreadCount(chatDoc, myId) > 0) {
            writeUnreadCount(chatDoc, myId, 0);
            await chatDoc.save();
        }

        const messages = await Message.find({ conversation: req.params.chatId })
            .populate({ path: 'sender', select: 'name email rollNumber profilePicture', strictPopulate: false })
            .populate({ path: 'conversation', strictPopulate: false })
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error('allMessages error:', error);
        res.status(500).json({ message: 'Failed to load messages.' });
    }
};

// 6. Explicitly Mark a Conversation as Read
exports.markChatRead = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.status(400).json({ message: 'Invalid conversation ID.' });
        }
        const chatDoc = await Conversation.findById(req.params.chatId);
        if (!chatDoc) return res.status(404).json({ message: 'Conversation not found.' });
        if (!isParticipant(chatDoc, myId)) {
            return res.status(403).json({ message: 'You are not a member of this conversation.' });
        }

        writeUnreadCount(chatDoc, myId, 0);
        await chatDoc.save();

        res.status(200).json({ message: 'Conversation marked as read.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update read status.' });
    }
};

// 7. Explore Campus Study Groups
exports.exploreGroups = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        const groups = await Conversation.find({ isGroupChat: true })
            .populate({ path: 'groupAdmin', select: 'name rollNumber profilePicture', strictPopulate: false })
            .select('chatName description participants groupAdmin updatedAt')
            .sort({ updatedAt: -1 });

        const formatted = groups.map((g) => ({
            _id: g._id,
            chatName: g.chatName,
            description: g.description || 'Collaborative student study group on Mindora.',
            memberCount: (g.participants || []).length,
            isMember: (g.participants || []).map((p) => String(p?._id || p)).includes(myId),
            groupAdmin: g.groupAdmin,
            updatedAt: g.updatedAt
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load study groups.' });
    }
};

// 8. Join a Study Group
exports.joinGroup = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.status(400).json({ message: 'Invalid study group ID.' });
        }
        if (!await User.exists({ _id: myId })) {
            return res.status(401).json({ message: 'Authenticated student was not found.' });
        }
        const chat = await Conversation.findById(req.params.chatId);
        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: 'Study group not found.' });
        }

        const existingIds = (chat.participants || []).map((p) => String(p?._id || p));
        if (!existingIds.includes(myId)) {
            chat.participants.push(myId);
        }
        writeUnreadCount(chat, myId, 0);
        await chat.save();

        const updatedChat = await Conversation.findById(req.params.chatId)
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false });

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: 'Failed to join study group.' });
    }
};

// 9. Rename a Group Chat (Admin Only)
exports.renameGroup = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        const { chatId, chatName, description } = req.body;
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: 'Invalid study group ID.' });
        }
        const chat = await Conversation.findById(chatId);
        if (!chat || !chat.isGroupChat) return res.status(404).json({ message: 'Group not found.' });

        if (!isParticipant(chat, myId) || String(chat.groupAdmin) !== myId) {
            return res.status(403).json({ message: 'Only the group admin can update group details.' });
        }

        const updateData = {};
        if (chatName) updateData.chatName = chatName.trim();
        if (description !== undefined) updateData.description = description.trim();

        const updatedChat = await Conversation.findByIdAndUpdate(chatId, updateData, { new: true })
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false });

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update group.' });
    }
};

// 10. Add Member to Group (Admin Only)
exports.addToGroup = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        const { chatId, userId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid group and student IDs are required.' });
        }
        const chat = await Conversation.findById(chatId);
        if (!chat || !chat.isGroupChat) return res.status(404).json({ message: 'Group not found.' });

        if (!isParticipant(chat, myId) || String(chat.groupAdmin) !== myId) {
            return res.status(403).json({ message: 'Only the group admin can add members.' });
        }
        if (!await User.exists({ _id: userId })) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const updatedChat = await Conversation.findByIdAndUpdate(
            chatId,
            { $addToSet: { participants: userId } },
            { new: true }
        )
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false });

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add member.' });
    }
};

// 11. Remove Member or Leave Group
exports.removeFromGroup = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        const { chatId, userId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid group and student IDs are required.' });
        }
        const chat = await Conversation.findById(chatId);
        if (!chat || !chat.isGroupChat) return res.status(404).json({ message: 'Group not found.' });

        const isSelfLeaving = String(userId) === myId;
        const isAdmin = String(chat.groupAdmin) === myId;
        if (!isParticipant(chat, myId)) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }
        if (!isParticipant(chat, userId)) {
            return res.status(404).json({ message: 'Student is not a member of this group.' });
        }

        if (!isAdmin && !isSelfLeaving) {
            return res.status(403).json({ message: 'Only the group admin can remove members.' });
        }

        const updatedChat = await Conversation.findByIdAndUpdate(
            chatId,
            { $pull: { participants: userId } },
            { new: true }
        )
            .populate({ path: 'participants', select: '-password', strictPopulate: false })
            .populate({ path: 'groupAdmin', select: '-password', strictPopulate: false });

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove member.' });
    }
};

// 12. Delete a Message
exports.deleteMessage = async (req, res) => {
    const myId = getAuthUserId(req);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
            return res.status(400).json({ message: 'Invalid message ID.' });
        }
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found.' });

        if (String(message.sender) !== myId) {
            return res.status(403).json({ message: 'You can only delete your own messages.' });
        }
        const conversation = await Conversation.findById(message.conversation);
        if (!conversation || !isParticipant(conversation, myId)) {
            return res.status(403).json({ message: 'You are not authorized to access this conversation.' });
        }

        await Message.findByIdAndDelete(req.params.messageId);
        res.status(200).json({ message: 'Message deleted.', messageId: req.params.messageId });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete message.' });
    }
};