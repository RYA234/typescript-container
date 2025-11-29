import { Request, Response } from 'express';
import path from 'path';
import { ChatbotService } from './service';
import { ChatRequest } from '../interfaces';

export class ChatbotController {
  private chatbotService: ChatbotService;

  constructor() {
    this.chatbotService = new ChatbotService();
  }

  getIndex = (_req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, 'views', 'chat.html'));
  };

  postChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body as ChatRequest;

      if (!message || message.trim() === '') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const response = await this.chatbotService.chat(message);
      res.json(response);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  };
}
