import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiHandler from './api/[...route].js'; // Vercel API entry point

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Handle backend API requests using the existing Vercel handlers
app.all('/api/*', async (req, res) => {
  try {
    await apiHandler(req, res);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// React router fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VPS Server is running on port ${PORT}`);
});
