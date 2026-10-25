const Note = require('../models/Note');

// 1. Get all notes for the logged-in student
exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const notes = await Note.find({ user: userId }).sort({ updatedAt: -1 });
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notes.' });
    }
};

// 2. Create a new note
exports.createNote = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const {
            title, content, htmlContent, folder, paperStyle,
            pageColor, fontFamily, fontSize, textColor,
            showMarginLine, isQuickNote
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Note title is required.' });
        }

        const newNote = new Note({
            title: title.trim(),
            content: content !== undefined ? content : '',
            htmlContent: htmlContent !== undefined ? htmlContent : (content || ''),
            folder: folder || 'General',
            paperStyle: paperStyle || 'lined',
            pageColor: pageColor || '#fdfbf7',
            fontFamily: fontFamily || "'Inter', sans-serif",
            fontSize: fontSize || '16px',
            textColor: textColor || '#1e293b',
            showMarginLine: showMarginLine !== undefined ? showMarginLine : true,
            isQuickNote: Boolean(isQuickNote),
            user: userId
        });

        await newNote.save();
        res.status(201).json(newNote);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create note.' });
    }
};

// 3. Update an existing note
exports.updateNote = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const note = await Note.findOne({ _id: req.params.id, user: userId });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized.' });
        }

        const allowedFields = [
            'title', 'content', 'htmlContent', 'folder',
            'paperStyle', 'pageColor', 'fontFamily',
            'fontSize', 'textColor', 'showMarginLine', 'isQuickNote'
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                note[field] = req.body[field];
            }
        });

        await note.save();
        res.status(200).json(note);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save note changes.' });
    }
};

// 4. Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: userId });
        if (!deleted) {
            return res.status(404).json({ message: 'Note not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Note deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete note.' });
    }
};