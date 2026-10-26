/**
 * File Upload Middleware
 *
 * Multer configuration for document uploads.
 * Files are stored locally in the uploads directory.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { config } from '../config';
import { generateUploadFilename } from '@hostel/shared-utils';
import { AppError } from '../utils/AppError';
// Ensure upload directory exists
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for organization
const subdirs = ['documents', 'profiles', 'temp'];
subdirs.forEach((dir) => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

/**
 * Multer storage configuration.
 * Files are stored with unique names to prevent collisions.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'documents'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = generateUploadFilename(file.originalname);
    cb(null, uniqueName);
  },
});

/**
 * Profile image storage.
 */
const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'profiles'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = generateUploadFilename(file.originalname);
    cb(null, uniqueName);
  },
});

/**
 * File filter - only allow specified file types.
 */
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(
      `File type ${file.mimetype} is not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`,
      400,
      'INVALID_FILE_TYPE',
    ));
  }
};

/**
 * Document upload middleware.
 * Accepts up to 5 files with 'documents' field name.
 */
export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 5,
  },
}).array('documents', 5);

/**
 * Single profile image upload.
 */
export const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
}).single('profileImage');

/**
 * CSV/Excel upload middleware.
 * Accepts CSV and Excel files for student import.
 */
const csvExcelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'temp'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = generateUploadFilename(file.originalname);
    cb(null, uniqueName);
  },
});

const csvExcelFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(
      `File type ${file.mimetype} is not allowed. Only CSV and Excel files are accepted.`,
      400,
      'INVALID_FILE_TYPE',
    ));
  }
};

export const uploadCsvExcel = multer({
  storage: csvExcelStorage,
  fileFilter: csvExcelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
}).single('file');

/**
 * Get the public URL path for an uploaded file.
 */
export function getFileUrl(filename: string, subdirectory: string = 'documents'): string {
  return `/uploads/${subdirectory}/${filename}`;
}

/**
 * Delete an uploaded file.
 */
export function deleteFile(filepath: string): void {
  const fullPath = path.resolve(filepath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
