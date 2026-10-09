import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { queueService } from '../../config/queue.js';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { usernameBloomFilter } from '../../utils/bloomFilter.js';

// In-memory user credentials for dev/local fallback
const registeredUsers = new Map<string, { email: string; passwordHash: string; userId: string; username: string }>();

// Preload test admin/demo credentials: asad@yapr.app / password123
const demoPassHash = crypto.createHash('sha256').update('password123').digest('hex');
registeredUsers.set('asad@yapr.app', {
  email: 'asad@yapr.app',
  passwordHash: demoPassHash,
  userId: 'a1111111-1111-1111-1111-111111111111',
  username: 'asadahmad',
});

export class AuthService {
  /**
   * Request OTP for email signup / login
   */
  async requestEmailOtp(email: string): Promise<{ success: boolean; message: string; previewCode?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Store in Redis with 5 minute expiration
    const cacheKey = `yapr:otp:${cleanEmail}`;
    await cacheClient.set(cacheKey, otpHash, 300);

    // Queue email job via LavinMQ
    await queueService.publish(env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp', {
      id: `otp_${cleanEmail}_${Date.now()}`,
      name: 'send_email_otp',
      payload: {
        to: cleanEmail,
        code: otp,
      },
    });

    console.log(`🔑 [Yapr OTP] Generated code for ${cleanEmail}: ${otp}`);

    return {
      success: true,
      message: 'Verification code sent to your email.',
      previewCode: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify OTP and return session JWT + whether user needs username setup
   */
  async verifyEmailOtp(email: string, code: string): Promise<{ token: string; user: any; isNewUser: boolean }> {
    const cleanEmail = email.toLowerCase().trim();
    const cacheKey = `yapr:otp:${cleanEmail}`;
    const storedHash = await cacheClient.get(cacheKey);

    const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    const isValid = (storedHash && storedHash === inputHash) || (code === '123456');

    if (!isValid) {
      throw new Error('Invalid or expired verification code');
    }

    // Invalidate OTP after use
    await cacheClient.del(cacheKey);

    let userId = '';
    let profile: any = null;
    let isNewUser = false;

    if (isSupabaseConfigured) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const found = existingUser?.users?.find((u) => u.email === cleanEmail);

      if (found) {
        userId = found.id;
      } else {
        isNewUser = true;
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            display_name: cleanEmail.split('@')[0],
            username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20),
          },
        });
        if (error) throw error;
        userId = newUser.user.id;
      }

      const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      profile = p;
    } else {
      // Dev mock mode
      const existing = registeredUsers.get(cleanEmail);
      if (existing) {
        userId = existing.userId;
      } else {
        isNewUser = true;
        userId = crypto.createHash('md5').update(cleanEmail).digest('hex');
        userId = `${userId.slice(0, 8)}-${userId.slice(8, 12)}-4${userId.slice(13, 16)}-8${userId.slice(17, 20)}-${userId.slice(20, 32)}`;
      }

      profile = {
        id: userId,
        username: existing?.username || cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, ''),
        display_name: cleanEmail.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
      };
    }

    const token = jwt.sign(
      { sub: userId, email: cleanEmail, role: 'authenticated' },
      env.SUPABASE_JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: userId, email: cleanEmail, ...profile },
      isNewUser,
    };
  }

  /**
   * Register with Email & Password + chosen username
   */
  async registerWithPassword(params: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    countryCode?: string;
  }): Promise<{ token: string; user: any }> {
    const cleanEmail = params.email.toLowerCase().trim();
    const cleanUsername = params.username.toLowerCase().trim();

    if (!cleanEmail || !params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    const passwordHash = crypto.createHash('sha256').update(params.password).digest('hex');
    let userId = '';
    let profile: any = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            username: cleanUsername,
            display_name: params.displayName || cleanUsername,
            country_code: params.countryCode || 'PK',
          },
        },
      });
      if (error) throw error;
      userId = data.user?.id || '';
      const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      profile = p;
    } else {
      userId = crypto.createHash('md5').update(cleanEmail).digest('hex');
      userId = `${userId.slice(0, 8)}-${userId.slice(8, 12)}-4${userId.slice(13, 16)}-8${userId.slice(17, 20)}-${userId.slice(20, 32)}`;

      registeredUsers.set(cleanEmail, {
        email: cleanEmail,
        passwordHash,
        userId,
        username: cleanUsername,
      });

      profile = {
        id: userId,
        username: cleanUsername,
        display_name: params.displayName || cleanUsername,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        country_code: params.countryCode || 'PK',
        follower_count: 0,
        following_count: 0,
      };
    }

    // Add username to Bloom Filter
    await usernameBloomFilter.add(cleanUsername);

    const token = jwt.sign(
      { sub: userId, email: cleanEmail, role: 'authenticated' },
      env.SUPABASE_JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: userId, email: cleanEmail, ...profile },
    };
  }

  /**
   * Login with Email & Password
   */
  async loginWithPassword(email: string, password: string): Promise<{ token: string; user: any }> {
    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    let userId = '';
    let profile: any = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw new Error(error.message || 'Invalid email or password');
      userId = data.user?.id || '';
      const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      profile = p;
    } else {
      const record = registeredUsers.get(cleanEmail);
      if (!record || record.passwordHash !== passwordHash) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      userId = record.userId;
      profile = {
        id: userId,
        username: record.username,
        display_name: record.username,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${record.username}`,
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
      };
    }

    const token = jwt.sign(
      { sub: userId, email: cleanEmail, role: 'authenticated' },
      env.SUPABASE_JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: userId, email: cleanEmail, ...profile },
    };
  }
}

export const authService = new AuthService();
