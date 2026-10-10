import nodemailer from 'nodemailer';
import { queueService, QueueJob } from '../config/queue.js';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY || env.BREVO_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS));
}

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  const isGmail = env.SMTP_HOST.includes('gmail');
  const isSecure = env.SMTP_PORT === 465;

  const transportConfig: any = isGmail
    ? {
        service: 'gmail',
        auth: {
          user: env.SMTP_USER.trim(),
          pass: env.SMTP_PASS.trim(),
        },
      }
    : {
        host: env.SMTP_HOST.trim(),
        port: env.SMTP_PORT || 587,
        secure: isSecure,
        auth: {
          user: env.SMTP_USER.trim(),
          pass: env.SMTP_PASS.trim(),
        },
        tls: {
          rejectUnauthorized: false,
        },
      };

  transportConfig.connectionTimeout = 5000;
  transportConfig.greetingTimeout = 5000;
  transportConfig.socketTimeout = 8000;

  transporter = nodemailer.createTransport(transportConfig);

  transporter.verify((error) => {
    if (error) {
      console.warn(`⚠️ [Email Worker] SMTP note: Render free tier blocks outbound SMTP ports (25, 465, 587). Error:`, error.message);
    } else {
      console.log(`✅ [Email Worker] SMTP transporter connected successfully to ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    }
  });
}

async function sendViaResend(to: string, code: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Yapr <onboarding@resend.dev>',
        to: [to],
        subject: 'Your Yapr Verification Code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #2563EB; margin-top: 0;">Welcome to Yapr!</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your one-time authentication code is:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; background: #eff6ff; padding: 16px; text-align: center; border-radius: 12px; border: 1px dashed #bfdbfe; margin: 16px 0;">${code}</div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.4;">This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });
    if (res.ok) {
      console.log(`✅ [Email Worker:Resend] Email delivered to ${to}`);
      return true;
    }
    const errData = await res.json().catch(() => ({}));
    console.error(`❌ [Email Worker:Resend] Delivery failed:`, errData);
    return false;
  } catch (err: any) {
    console.error(`❌ [Email Worker:Resend] Request failed:`, err.message || err);
    return false;
  }
}

async function sendViaBrevo(to: string, code: string): Promise<boolean> {
  try {
    const fromEmail = env.SMTP_USER || 'no-reply@theyapr.vercel.app';
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Yapr', email: fromEmail },
        to: [{ email: to }],
        subject: 'Your Yapr Verification Code',
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #2563EB; margin-top: 0;">Welcome to Yapr!</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your one-time authentication code is:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; background: #eff6ff; padding: 16px; text-align: center; border-radius: 12px; border: 1px dashed #bfdbfe; margin: 16px 0;">${code}</div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.4;">This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });
    if (res.ok) {
      console.log(`✅ [Email Worker:Brevo] Email delivered to ${to}`);
      return true;
    }
    const errData = await res.json().catch(() => ({}));
    console.error(`❌ [Email Worker:Brevo] Delivery failed:`, errData);
    return false;
  } catch (err: any) {
    console.error(`❌ [Email Worker:Brevo] Request failed:`, err.message || err);
    return false;
  }
}

export function registerEmailWorker(): void {
  queueService.subscribe(env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp', async (job: QueueJob) => {
    const { to, code } = job.payload;
    console.log(`📧 [Email Worker] Processing OTP for ${to}...`);

    // 1. Try Resend HTTP API (Never blocked on Render)
    if (env.RESEND_API_KEY) {
      const sent = await sendViaResend(to, code);
      if (sent) return;
    }

    // 2. Try Brevo HTTP API (Never blocked on Render)
    if (env.BREVO_API_KEY) {
      const sent = await sendViaBrevo(to, code);
      if (sent) return;
    }

    // 3. Try Nodemailer SMTP
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
        console.log(`✅ [Email Worker:SMTP] Email delivered to ${to}`);
      } catch (err: any) {
        console.error(`❌ [Email Worker:SMTP] Delivery failed for ${to} (Note: Render free tier blocks outbound SMTP ports 25, 465, 587):`, err.message || err);
      }
    } else {
      console.log(`ℹ️ [Email Worker:Mock] SMTP/HTTP not configured. OTP for ${to} is: ${code}`);
    }
  });
}
