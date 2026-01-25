import { Express } from 'express';
import { gameRoutes } from './games.js';
import { userRoutes } from './users.js';
import { paymentRoutes } from './payments.js';

export function setupApiRoutes(app: Express) {
  app.use('/api/games', gameRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/payments', paymentRoutes);
}

