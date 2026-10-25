const Event = require('../models/Event');

const getAuthUserId = (req) => String(req.user?.userId || req.user?.id || req.user?._id || '');

// 1. Get all events/reminders for the logged-in user
exports.getEvents = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const events = await Event.find({ user: userId }).sort({ startDate: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error('getEvents error:', error);
        res.status(500).json({ message: 'Failed to fetch calendar events.' });
    }
};

// 2. Create a new event/reminder
exports.createEvent = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const { title, description, startDate, endDate, category, location } = req.body;

        if (!title || !startDate) {
            return res.status(400).json({ message: 'Title and start date are required.' });
        }

        const newEvent = await Event.create({
            title: title.trim(),
            description: (description || '').trim(),
            startDate,
            endDate: endDate || startDate,
            category: category || 'Study Session',
            location: (location || '').trim(),
            user: userId
        });

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('createEvent error:', error);
        res.status(500).json({ message: 'Failed to create reminder.' });
    }
};

// 3. Update an existing event/reminder
exports.updateEvent = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const event = await Event.findOne({ _id: req.params.id, user: userId });
        if (!event) {
            return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
        }

        const allowed = ['title', 'description', 'startDate', 'endDate', 'category', 'location'];
        allowed.forEach((field) => {
            if (req.body[field] !== undefined) {
                event[field] = req.body[field];
            }
        });

        await event.save();
        res.status(200).json(event);
    } catch (error) {
        console.error('updateEvent error:', error);
        res.status(500).json({ message: 'Failed to update reminder.' });
    }
};

// 4. Delete an event/reminder
exports.deleteEvent = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        const deleted = await Event.findOneAndDelete({ _id: req.params.id, user: userId });
        if (!deleted) {
            return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Reminder deleted.' });
    } catch (error) {
        console.error('deleteEvent error:', error);
        res.status(500).json({ message: 'Failed to delete reminder.' });
    }
};