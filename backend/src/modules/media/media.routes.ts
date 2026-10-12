import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { mediaController } from './media.controller.js';
import { requireAuth } from '../../middleware/auth.js';

// Max upload size: 20MB
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are permitted'));
    }
  },
});

// Middleware to catch Multer file size errors gracefully
function handleMulterUpload(uploadMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File size exceeds maximum 20MB limit. Please upload a smaller file.',
          });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}

const router = Router();

router.post('/avatar', requireAuth, handleMulterUpload(upload.single('avatar')), (req, res, next) => {
  mediaController.uploadAvatar(req, res, next);
});

router.post('/upload', requireAuth, handleMulterUpload(upload.single('file')), (req, res, next) => {
  mediaController.uploadPostMedia(req, res, next);
});

export const mediaRoutes = router;
