import nodemailer from 'nodemailer';
import { queueService, QueueJob } from '../config/queue.js';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

if (isSmtpConfigured()) {
  const isSecure = env.SMTP_PORT === 465;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST.trim(),
    port: env.SMTP_PORT || 587,
    secure: isSecure,
    auth: {
      user: env.SMTP_USER.trim(),
      pass: env.SMTP_PASS.trim(),
    },
    tls: {
      rejectUnauthorized: false, // Prevents certificate rejection on containerized hosts like Render
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  transporter.verify((error) => {
    if (error) {
      console.warn(`⚠️ [Email Worker] SMTP verification warning (${env.SMTP_HOST}:${env.SMTP_PORT}):`, error.message);
    } else {
      console.log(`✅ [Email Worker] SMTP transporter connected successfully to ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    }
  });
}

export function registerEmailWorker(): void {
  queueService.subscribe(env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp', async (job: QueueJob) => {
    const { to, code } = job.payload;
    console.log(`📧 [Email Worker] Processing OTP for ${to}...`);

    if (transporter) {
      const fromAddress = env.SMTP_FROM && !env.SMTP_FROM.includes('@yapr.app')
        ? env.SMTP_FROM
        : (env.SMTP_USER && env.SMTP_USER.includes('@') ? `"Yapr" <${env.SMTP_USER.trim()}>` : env.SMTP_FROM || '"Yapr" <no-reply@theyapr.vercel.app>');

      try {
        await transporter.sendMail({
          from: fromAddress,
          to,
          subject: 'Your Yapr Verification Code',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #2563EB; margin-top: 0;">Welcome to Yapr!</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your one-time authentication code is:</p>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; background: #eff6ff; padding: 16px; text-align: center; border-radius: 12px; border: 1px dashed #bfdbfe; margin: 16px 0;">${code}</div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.4;">This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
            </div>
          `,
        });
        console.log(`✅ [Email Worker] Email delivered to ${to}`);
      } catch (err: any) {
        console.error(`❌ [Email Worker] Delivery failed for ${to}:`, err.message || err);
      }
    } else {
      console.log(`ℹ️ [Email Worker:Mock] SMTP not configured. OTP for ${to} is: ${code}`);
    }
  });
}
