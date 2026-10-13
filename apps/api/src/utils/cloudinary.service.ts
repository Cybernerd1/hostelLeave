/**
 * Cloudinary Upload Service
 *
 * Handles file uploads to Cloudinary.
 * If Cloudinary credentials are fully configured in environment variables,
 * uploads files directly to Cloudinary. Otherwise, falls back to local storage URL.
 */

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

// Check if valid Cloudinary credentials are provided
const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret &&
  !config.cloudinary.cloudName.includes('your_cloudinary')
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary service initialized successfully.');
} else {
  logger.info('Cloudinary API credentials not detected. Falling back to local file storage.');
}

export class CloudinaryService {
  /**
   * Upload a local file (from Multer disk storage) to Cloudinary or local fallback.
   * @param localFilePath Absolute or relative path to the local file
   * @param folder Target folder in Cloudinary
   * @returns Public URL of the uploaded file
   */
  async uploadFile(localFilePath: string, folder = config.cloudinary.folder): Promise<string> {
    const fullPath = path.resolve(localFilePath);

    if (isCloudinaryConfigured && fs.existsSync(fullPath)) {
      try {
        const result = await cloudinary.uploader.upload(fullPath, {
          folder: folder,
          resource_type: 'raw',  // Use 'raw' so PDFs/docs are served with correct Content-Type
          use_filename: true,
          unique_filename: true,
        });

        // Clean up temporary local file after successful upload to Cloudinary
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // Ignore unlink errors
        }

        return result.secure_url;
      } catch (err) {
        logger.error('Failed to upload file to Cloudinary, using local fallback:', err);
      }
    }

    // Fallback URL if Cloudinary is not configured or fails
    const filename = path.basename(localFilePath);
    return `/uploads/documents/${filename}`;
  }

  /**
   * Upload multiple files to Cloudinary / local fallback.
   * @param files Array of Express.Multer.File objects
   * @returns Array of public file URLs
   */
  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map((file) => this.uploadFile(file.path));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Cloudinary given its URL or public ID.
   */
  async deleteFile(fileUrlOrPublicId: string): Promise<boolean> {
    if (!isCloudinaryConfigured || !fileUrlOrPublicId) return false;

    try {
      // Extract public_id from Cloudinary URL if full URL is passed
      let publicId = fileUrlOrPublicId;
      if (fileUrlOrPublicId.startsWith('http')) {
        const parts = fileUrlOrPublicId.split('/');
        const fileNameWithExt = parts.pop() || '';
        const folderName = parts.pop() || '';
        const fileName = fileNameWithExt.split('.')[0];
        publicId = folderName ? `${folderName}/${fileName}` : fileName;
      }

      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      return true;
    } catch (err) {
      logger.error('Error deleting file from Cloudinary:', err);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
