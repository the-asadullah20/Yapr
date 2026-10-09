import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service.js';

export class AiController {
  async summarize(req: Request, res: Response, next: NextFunction) {
    try {
      const { yapId, text, yapText, threadText } = req.body;
      const content = text || yapText;
      if (!content) return res.status(400).json({ error: 'Text is required for summarization' });
      const result = await aiService.summarize(yapId, content, threadText);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async translate(req: Request, res: Response, next: NextFunction) {
    try {
      const { text, targetLanguage = 'English' } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required for translation' });
      const result = await aiService.translate(text, targetLanguage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async polish(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });
      const result = await aiService.polish(text);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
