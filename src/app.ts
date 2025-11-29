import express, { Request, Response } from 'express';
import { config } from './shared';
import { indexRouter } from './index';
import { sampleRouter } from './sample';

const app = express();
const port: number = config.port;
const basePath: string = '/node';

// Health check endpoint for ALB
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).send('OK');
});

// Mount routers
app.use(basePath, indexRouter);
app.use(basePath, sampleRouter);

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, (): void => {
    console.log(`App listening on port ${port}`);
  });
}

export default app;
