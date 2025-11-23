const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const controller = require('./controller');

// Multer configuration for avatar uploads.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it does not already exist.
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Invalid file type'), false);
  cb(null, true);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Current user's profile.
router.get('/me', auth, controller.getMe);
router.put('/me', auth, controller.updateMe);

// Avatar upload returns { url } pointing to /uploads/<filename>.
router.post('/avatar', auth, upload.single('file'), controller.uploadAvatar);

// Public profile fetch by userId; includes follower counts and follow state.
router.get('/:id', controller.getById);
router.get('/:id/followers', controller.listFollowers);
router.get('/:id/following', controller.listFollowing);

// Follow/unfollow another user.
router.post('/:id/follow', auth, controller.followUser);
router.delete('/:id/follow', auth, controller.unfollowUser);

module.exports = router;
