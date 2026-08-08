import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.EMAIL_PROVIDER === 'smtp') {
      if (!env.SMTP_HOST || !env.SMTP_PORT) {
        logger.warn('[EmailService] SMTP_HOST or SMTP_PORT is missing — transporter NOT created.');
      } else {
        logger.info(`[EmailService] Creating SMTP transporter → ${env.SMTP_HOST}:${env.SMTP_PORT} secure=${env.SMTP_SECURE}`);
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: env.SMTP_USER && env.SMTP_PASS ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          } : undefined,
        });

        // Verify SMTP connection on startup
        this.transporter.verify((error) => {
          if (error) {
            logger.error('[EmailService] SMTP connection FAILED', { error: (error as Error).message });
          } else {
            logger.info('[EmailService] SMTP connected successfully — ready to send mail.');
          }
        });
      }
    } else {
      logger.info('[EmailService] Using AWS SES / Stub Console Email service (no SMTP transporter created).');
    }
  }

  private async sendMail(options: { to: string; subject: string; html: string; text?: string }) {
    const from = `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`;

    logger.debug(`[EmailService] sendMail called → to=${options.to} subject="${options.subject}"`);

    if (this.transporter) {
      console.log("========== EMAIL DEBUG ==========");
      console.log("TO:", options.to);
      console.log("FROM:", from);
      console.log("SUBJECT:", options.subject);
      console.log("================================");
      logger.debug('[EmailService] SMTP transporter present — calling transporter.sendMail()');
      try {
        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        });
        logger.info(`[EmailService] Email sent successfully to ${options.to} | messageId=${info.messageId}`);
      } catch (error: any) {
        logger.error(`[EmailService] SMTP sendMail FAILED for ${options.to}`, { error: error.message });
        throw new Error(`Unable to send OTP email: ${error.message}`);
      }
    } else {
      logger.warn('[EmailService] No transporter configured — email NOT sent. Printing to console.');
      logger.info(`[EMAIL STUB]
        From   : ${from}
        To     : ${options.to}
        Subject: ${options.subject}
        Content: ${options.html}
      `);
    }
  }

  // ── Public Email Methods ───────────────────────────────────────────────────

  async sendVerificationOtp(to: string, name: string, code: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Verify Your Account</h2>
        <p>Dear ${name || 'User'},</p>
        <p>Thank you for registering. Please enter the following 6-digit confirmation code code to verify your email address:</p>
        <div style="text-align: center; margin: 300px 0; margin-top: 30px; margin-bottom: 30px;">
          <span style="background-color: #f5f5f5; border: 1px dashed #cccccc; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px;">${code}</span>
        </div>
        <p>This OTP session is valid for 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777;">If you did not request this verification code, please ignore this email.</p>
      </div>
    `;
    await this.sendMail({ to, subject: 'Verify Your NAVISH ARC Account', html });
  }

  async sendPasswordResetOtp(to: string, name: string, code: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Reset Your Password</h2>
        <p>Dear ${name || 'User'},</p>
        <p>We received a password reset request. Please enter the following 6-digit verification code to complete your password reset:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f5f5f5; border: 1px dashed #cccccc; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px;">${code}</span>
        </div>
        <p>This verification is valid for 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `;
    await this.sendMail({ to, subject: 'NAVISH ARC — Password Reset Verification Code', html });
  }

  async sendVerificationLink(to: string, name: string, token: string) {
    const verificationUrl = `${env.EMAIL_VERIFY_URL}?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Verify Your Account</h2>
        <p>Dear ${name},</p>
        <p>Thank you for choosing NAVISH ARC. Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Account</a>
        </div>
        <p>This verification link will expire in 24 hours.</p>
        <p>Or copy this link to your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777;">If you did not request this, please ignore this email.</p>
      </div>
    `;
    await this.sendMail({ to, subject: 'Verify Your NAVISH ARC Account', html });
  }

  async sendPasswordResetLink(to: string, name: string, token: string) {
    const resetUrl = `${env.PASSWORD_RESET_URL}?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Reset Your Password</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link is only valid for 1 hour.</p>
        <p>Or copy this link to your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `;
    await this.sendMail({ to, subject: 'NAVISH ARC — Password Reset Request', html });
  }
}

export const emailService = new EmailService();
export default emailService;
