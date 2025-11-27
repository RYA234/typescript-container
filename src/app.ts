import express, { Request, Response } from 'express';

const app = express();
const port: number = parseInt(process.env.PORT || '3000', 10);
const basePath: string = '/node';

// Health check endpoint for ALB
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).send('OK');
});

// Main application endpoint
app.get(basePath, (_req: Request, res: Response): void => {
  res.send('Hello from Node.js on ECS!');
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, (): void => {
    console.log(`App listening on port ${port}`);
  });
}

export default app;
