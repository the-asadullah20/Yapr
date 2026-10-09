import nodemailer from 'nodemailer';
import { queueService, QueueJob } from '../config/queue.js';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export function registerEmailWorker(): void {
  queueService.subscribe(env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp', async (job: QueueJob) => {
    const { to, code } = job.payload;
    console.log(`📧 [Email Worker] Processing OTP for ${to}...`);

    if (transporter) {
      try {
        await transporter.sendMail({
          from: env.SMTP_FROM,
          to,
          subject: 'Your Yapr Verification Code',
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #2563EB;">Welcome to Yapr! 🚀</h2>
              <p>Your one-time authentication code is:</p>
              <h1 style="font-size: 32px; letter-spacing: 4px; color: #1e293b; background: #eff6ff; padding: 12px; text-align: center; border-radius: 8px;">${code}</h1>
              <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Do not share this code with anyone.</p>
            </div>
          `,
        });
        console.log(`✅ [Email Worker] Email delivered to ${to}`);
      } catch (err) {
        console.error(`❌ [Email Worker] Delivery failed for ${to}:`, err);
        throw err; // triggers retry
      }
    } else {
      console.log(`ℹ️ [Email Worker:Mock] SMTP not configured. OTP for ${to} is: ${code}`);
    }
  });
}
