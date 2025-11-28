import express, { Request, Response } from 'express';
import { config } from './config';

const app = express();
const port: number = config.port;
const basePath: string = '/node';

// Health check endpoint for ALB
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).send('OK');
});

// Main application endpoint
app.get(basePath, (_req: Request, res: Response): void => {
  res.send('Hello from Node.js on ECS!');
});

// Health check with configuration status (safe for production)
app.get(`${basePath}/health`, (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    configured: {
      gemini: !!config.gemini.apiKey,
      supabase: !!config.supabase.url && !!config.supabase.anonKey,
    },
    timestamp: new Date().toISOString(),
  });
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, (): void => {
    console.log(`App listening on port ${port}`);
  });
}

export default app;
