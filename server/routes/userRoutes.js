const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure Multer for Profile Picture Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, WEBP, and GIF image files are allowed.'), false);
    }
};

const uploadAvatar = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter
});

router.get('/profile', authMiddleware, userController.getUserProfile);
router.put('/profile', authMiddleware, userController.updateUserProfile);

router.post(
    '/profile/avatar',
    authMiddleware,
    (req, res, next) => {
        uploadAvatar.single('avatar')(req, res, (err) => {
            if (err) {
                return res.status(400).json({ message: err.message || 'Image upload failed.' });
            }
            next();
        });
    },
    userController.uploadProfilePicture
);
router.delete('/profile/avatar', authMiddleware, userController.removeProfilePicture);

router.put('/quick-chat', authMiddleware, userController.updateQuickChatSlots);

// Friend Network Routes
router.get('/search', authMiddleware, userController.searchUsers);
router.get('/friends', authMiddleware, userController.getFriendsAndRequests);
router.post('/friend-request/:id', authMiddleware, userController.sendFriendRequest);
router.post('/accept-request/:id', authMiddleware, userController.acceptFriendRequest);
router.post('/reject-request/:id', authMiddleware, userController.rejectFriendRequest);

module.exports = router;