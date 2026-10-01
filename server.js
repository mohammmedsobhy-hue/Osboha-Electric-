import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static assets from Vite build output
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA Fallback: send index.html for any request that doesn't match a static file
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Production server running at http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
