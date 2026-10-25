const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const resourceController = require('../controllers/resourceController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
});

const upload = multer({ storage });

router.use(authMiddleware);

router.get('/', resourceController.getResources);
router.get('/dashboard', resourceController.getDashboardResources);
router.post('/', upload.single('file'), resourceController.uploadResource);
router.post('/download/:id', resourceController.trackDownload);
router.delete('/:id', resourceController.deleteResource);

module.exports = router;