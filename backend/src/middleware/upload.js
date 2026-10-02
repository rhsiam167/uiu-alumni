import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();
const maxBytes = (env.MAX_CV_MB || 5) * 1024 * 1024;

export const uploadCvMiddleware = multer({
  storage,
  limits: { fileSize: maxBytes }
}).single('cv');

export function validateCvFile(req, res, next) {
  if (!req.file) {
    return next(new ApiError(400, 'CV_REQUIRED', 'CV file (PDF) is required'));
  }

  // 1. Check declared mimetype
  if (req.file.mimetype !== 'application/pdf') {
    return next(new ApiError(400, 'INVALID_FILE_TYPE', 'Only PDF files are allowed for CV upload'));
  }

  // 2. Check magic bytes (%PDF- -> 0x25 0x50 0x44 0x46 0x2D)
  const buffer = req.file.buffer;
  if (!buffer || buffer.length < 5) {
    return next(new ApiError(400, 'INVALID_FILE_FORMAT', 'Uploaded file is corrupted or empty'));
  }

  const magic = buffer.slice(0, 5).toString('utf8');
  if (magic !== '%PDF-') {
    return next(new ApiError(400, 'INVALID_FILE_FORMAT', 'File is not a valid PDF (invalid magic bytes)'));
  }

  // Save to disk with random filename
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storedFilename = `${crypto.randomUUID()}.pdf`;
  const targetPath = path.join(uploadDir, storedFilename);
  fs.writeFileSync(targetPath, buffer);

  req.storedCvName = storedFilename;
  // Sanitize original filename (strip path characters)
  req.originalCvName = path.basename(req.file.originalname).replace(/[\/\\]/g, '_');

  next();
}
