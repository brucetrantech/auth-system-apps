import nodemailer, { type Transporter } from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { EmailOptions } from '@/types';

class EmailService {
  private transporter?: Transporter;
  private sesClient?: SESClient;

  constructor() {
    if (config.email.provider === 'smtp') {
      this.initSMTP();
    } else {
      this.initSES();
    }
  }

  /**
   * Initialize SMTP transporter
   */
  private initSMTP(): void {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.password,
      },
    });

    logger.info('Email service initialized with SMTP');
  }

  /**
   * Initialize AWS SES client
   */
  private initSES(): void {
    this.sesClient = new SESClient({
      region: config.email.aws.region,
      credentials: {
        accessKeyId: config.email.aws.accessKeyId,
        secretAccessKey: config.email.aws.secretAccessKey,
      },
    });

    logger.info('Email service initialized with AWS SES');
  }

  /**
   * Send email using SMTP
   */
  private async sendViaSMTP(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    await this.transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  /**
   * Send email using AWS SES
   */
  private async sendViaSES(options: EmailOptions): Promise<void> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const command = new SendEmailCommand({
      Source: config.email.from,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
        },
        Body: {
          Html: {
            Data: options.html,
          },
          ...(options.text && {
            Text: {
              Data: options.text,
            },
          }),
        },
      },
    });

    await this.sesClient.send(command);
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (config.email.provider === 'smtp') {
        await this.sendViaSMTP(options);
      } else {
        await this.sendViaSES(options);
      }

      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.urls.backend}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Auth System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.urls.frontend}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Auth System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome! 🎉</h1>
            </div>
            <div class="content">
              <p>Hello ${displayName || 'there'},</p>
              <p>Welcome to our platform! Your email has been verified successfully.</p>
              <p>You can now enjoy all the features of your account.</p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Auth System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Auth System!',
      html,
      text: `Welcome ${displayName || 'there'}! Your email has been verified successfully.`,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
