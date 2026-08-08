import { createQueue, QueueNames } from '../config/redis';
import { emailService } from '../services/email/email.service';
import { logger } from '../config/logger';

export const initEmailWorker = () => {
  const queue = createQueue(QueueNames.EMAIL);

  queue.process('send-notification-email', async (job) => {
    const { to, firstName, title, body, actionUrl } = job.data;
    logger.info(`Worker sending notification email to ${to}`);

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h3 style="color: #333333;">${title}</h3>
          <p>Hi ${firstName},</p>
          <p>${body}</p>
          ${
            actionUrl
              ? `<div style="margin: 20px 0;"><a href="${actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a></div>`
              : ''
          }
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777777;">NAVISH ARC — Automated VR Platform notifications</p>
        </div>
      `;

      // Use shared console/SMTP email service
      const nodemailer = await import('nodemailer'); // Make sure dynamic importing works
      // We can invoke direct helper
      await (emailService as any).sendMail({
        to,
        subject: title,
        html,
      });

      return { success: true };
    } catch (error: any) {
      logger.error(`Failed to send background email to ${to}`, { error: error.message });
      throw error;
    }
  });

  return queue;
};
