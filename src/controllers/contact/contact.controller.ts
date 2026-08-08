import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { emailService } from '../../services/email/email.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { env } from '../../config/env';

export class ContactController {
  submitContactInquiry = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, projectType, message } = req.body;

    // 1. Find Admin Email
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    const adminEmail = adminUser?.email || env.EMAIL_FROM || 'admin@navish.com';

    // 2. Dispatch Email to Admin
    try {
      await emailService.sendContactInquiryToAdmin(adminEmail, {
        name,
        email,
        projectType,
        message,
      });
    } catch (err) {
      console.error('[ContactController] Failed to deliver admin email:', err);
    }

    // 3. Dispatch Automated Confirmation Email to Client ("We will contact you sooner!")
    try {
      await emailService.sendContactConfirmationToClient(email, name);
    } catch (err) {
      console.error('[ContactController] Failed to deliver client confirmation email:', err);
    }

    return ApiResponse.success(
      res,
      { status: 'received' },
      'Thank you for reaching out. We will contact you sooner!',
    );
  });
}

export const contactController = new ContactController();
