import { Router } from 'express';
import { socialController } from './social.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/like/:yapId', requireAuth, (req, res, next) => socialController.toggleLike(req, res, next));
router.get('/likes/:yapId', (req, res, next) => socialController.getYapLikers(req, res, next));
router.post('/reyap/:yapId', requireAuth, (req, res, next) => socialController.toggleReyap(req, res, next));
router.post('/follow/:followeeId', requireAuth, (req, res, next) => socialController.toggleFollow(req, res, next));
router.post('/bookmark/:yapId', requireAuth, (req, res, next) => socialController.toggleBookmark(req, res, next));
router.get('/bookmarks', requireAuth, (req, res, next) => socialController.getBookmarks(req, res, next));
router.post('/block/:userId', requireAuth, (req, res, next) => socialController.blockUser(req, res, next));
router.post('/unblock/:userId', requireAuth, (req, res, next) => socialController.unblockUser(req, res, next));
router.get('/blocks', requireAuth, (req, res, next) => socialController.getBlockedUsers(req, res, next));
router.get('/is-blocked/:userId', requireAuth, (req, res, next) => socialController.isUserBlocked(req, res, next));
router.post('/report', requireAuth, (req, res, next) => socialController.report(req, res, next));
router.get('/reports', requireAuth, (req, res, next) => socialController.getUserReports(req, res, next));

router.get('/follow-requests', requireAuth, (req, res, next) => socialController.getFollowRequests(req, res, next));
router.post('/follow-requests/:requesterId/accept', requireAuth, (req, res, next) => socialController.acceptFollowRequest(req, res, next));
router.post('/follow-requests/:requesterId/reject', requireAuth, (req, res, next) => socialController.rejectFollowRequest(req, res, next));
router.delete('/followers/:followerId', requireAuth, (req, res, next) => socialController.removeFollower(req, res, next));

export const socialRoutes = router;
