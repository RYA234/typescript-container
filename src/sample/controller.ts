import { Request, Response } from 'express';
import { SampleService } from './service';

export class SampleController {
  private sampleService: SampleService;

  constructor() {
    this.sampleService = new SampleService();
  }

  getHealth = (_req: Request, res: Response): void => {
    const healthStatus = this.sampleService.getHealthStatus();
    res.json(healthStatus);
  };

  getWelcome = (_req: Request, res: Response): void => {
    const message = this.sampleService.getWelcomeMessage();
    res.send(message);
  };
}
