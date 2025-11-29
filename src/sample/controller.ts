import { Request, Response } from 'express';
import path from 'path';
import { SampleService } from './service';

export class SampleController {
  private sampleService: SampleService;

  constructor() {
    this.sampleService = new SampleService();
  }

  getIndex = (_req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
  };

  getHealth = (_req: Request, res: Response): void => {
    const healthStatus = this.sampleService.getHealthStatus();
    res.json(healthStatus);
  };

  getWelcome = (_req: Request, res: Response): void => {
    const message = this.sampleService.getWelcomeMessage();
    res.send(message);
  };
}
