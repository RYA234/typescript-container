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

// Configuration status endpoint (doesn't expose secrets)
app.get('/config-status', (_req: Request, res: Response): void => {
  res.json({
    status: 'configured',
    services: {
      gemini: config.gemini.apiKey.startsWith('dummy') ? 'dummy' : 'configured',
      supabase: {
        url: config.supabase.url,
        anonKey: config.supabase.anonKey.startsWith('dummy') ? 'dummy' : 'configured',
      },
    },
    port: config.port,
  });
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, (): void => {
    console.log(`App listening on port ${port}`);
  });
}

export default app;
