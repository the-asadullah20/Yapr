import { Request, Response, NextFunction } from 'express';
import { profilesService } from './profiles.service.js';

export class ProfilesController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.params;
      const profile = await profilesService.getProfile(identifier, req.user?.id);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  }

  async checkUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const username = String(req.query.username || '');
      const result = await profilesService.checkUsernameAvailability(username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const updated = await profilesService.updateProfile(req.user.id, req.body);
      res.json({ profile: updated });
    } catch (err) {
      next(err);
    }
  }

  async getUserYaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.params;
      const result = await profilesService.getUserYaps(identifier, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.params;
      const followers = await profilesService.getFollowers(identifier);
      res.json({ followers });
    } catch (err) {
      next(err);
    }
  }

  async getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.params;
      const following = await profilesService.getFollowing(identifier);
      res.json({ following });
    } catch (err) {
      next(err);
    }
  }

  async getCountries(req: Request, res: Response) {
    res.json({ countries: profilesService.getCountries() });
  }
}

export const profilesController = new ProfilesController();
