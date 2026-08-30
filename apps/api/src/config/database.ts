/**
 * Database Configuration
 *
 * MongoDB connection with retry logic and event logging.
 */

import mongoose from 'mongoose';

import { config } from './index';
import { logger } from '../utils/logger';

/**
 * Connect to MongoDB with retry logic.
 * Retries up to 5 times with exponential backoff.
 */
export async function connectDatabase(): Promise<void> {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      });

      logger.info(`✅ MongoDB connected successfully to ${maskConnectionString(config.mongodbUri)}`);

      // Connection event handlers
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
        process.exit(0);
      });

      return;
    } catch (error) {
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      logger.error(
        `MongoDB connection attempt ${retries}/${maxRetries} failed. Retrying in ${delay / 1000}s...`,
        error,
      );

      if (retries === maxRetries) {
        logger.error('Max MongoDB connection retries reached. Exiting...');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

/**
 * Mask the connection string for logging (hide credentials).
 */
function maskConnectionString(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return uri.replace(/:\/\/[^@]+@/, '://****:****@');
  }
}
