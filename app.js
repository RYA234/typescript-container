const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const basePath = '/node';

// Health check endpoint for ALB
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Main application endpoint
app.get(basePath, (req, res) => {
  res.send('Hello from Node.js on ECS!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});