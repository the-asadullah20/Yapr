import { Router } from 'express';
import multer from 'multer';
import { mediaController } from './media.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are permitted'));
    }
  },
});

const router = Router();

router.post('/avatar', requireAuth, upload.single('avatar'), (req, res, next) => {
  mediaController.uploadAvatar(req, res, next);
});

router.post('/upload', requireAuth, upload.single('file'), (req, res, next) => {
  mediaController.uploadPostMedia(req, res, next);
});

export const mediaRoutes = router;
