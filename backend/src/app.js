import express from 'express';
import { publicPath } from './config/paths.js';
import { chargerSession } from './middleware/session.js';
import pageRoutes from './routes/pageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import protectedApiRoutes from './routes/protectedApiRoutes.js';

export async function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(async (req, res, next) => {
    await chargerSession(req, res, next);
  });

  app.use(pageRoutes);
  app.use(authRoutes);
  app.use('/api', protectedApiRoutes);

  app.use(express.static(publicPath));

  app.use(async (req, res) => {
    res.status(404).json({ message: 'Route introuvable' });
  });

  return app;
}