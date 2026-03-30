import { Request, Response } from 'express';
import path from 'path';

export class PhaserController {
  getIndex(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
  }
}
