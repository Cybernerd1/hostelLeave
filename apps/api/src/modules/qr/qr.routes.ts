/**
 * QR Routes
 */

import { Router } from 'express';

import * as qrController from './qr.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get QR code image for a leave request
router.get('/:id/qr', qrController.getQRCode);

export default router;
