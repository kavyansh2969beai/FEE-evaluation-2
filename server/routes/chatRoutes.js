const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', chatController.accessChat);
router.get('/', chatController.fetchChats);
router.post('/group', chatController.createGroupChat);
router.get('/groups/explore', chatController.exploreGroups);
router.post('/group/join/:chatId', chatController.joinGroup);

router.put('/group/rename', chatController.renameGroup);
router.put('/group/add', chatController.addToGroup);
router.put('/group/remove', chatController.removeFromGroup);

router.post('/message', chatController.sendMessage);
router.get('/message/:chatId', chatController.allMessages);
router.put('/read/:chatId', chatController.markChatRead);
router.delete('/message/:messageId', chatController.deleteMessage);

module.exports = router;