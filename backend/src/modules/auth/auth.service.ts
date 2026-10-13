import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { queueService } from '../../config/queue.js';
import { supabaseAdmin, isSupabaseConfigured, supabaseAnon } from '../../config/supabase.js';
import { usernameBloomFilter } from '../../utils/bloomFilter.js';
import { mockProfiles } from '../profiles/profiles.service.js';
import { DEFAULT_AVATAR } from '../../utils/avatar.js';
const registeredUsers = new Map<string, { email: string; passwordHash: string; userId: string; username: string }>();

// Preload test admin/demo credentials: asad@yapr.app / password123
const demoPassHash = crypto.createHash('sha256').update('password123').digest('hex');
registeredUsers.set('asad@yapr.app', {
  email: 'asad@yapr.app',
  passwordHash: demoPassHash,
  userId: 'a1111111-1111-1111-1111-111111111111',
  username: 'asadahmad',
});

export function validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    throw new Error('Password must contain at least one special character (!@#$%^&* etc.)');
  }
}

export class AuthService {
  /**
   * Request OTP for email signup / login
   */
  async requestEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
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

    console.log(`[Yapr OTP] Generated code for ${cleanEmail}: ${otp}`);

    return {
      success: true,
      message: 'Verification code sent to your email.',
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
    const isDevMockBypass = !isSupabaseConfigured && env.NODE_ENV === 'development' && code === '123456';
    const isValid = (storedHash && storedHash === inputHash) || isDevMockBypass;

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
        avatar_url: DEFAULT_AVATAR,
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
      };
      mockProfiles.set(userId, profile);
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

    if (!cleanEmail) {
      throw new Error('Valid email address is required');
    }
    validatePasswordStrength(params.password);

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    const passwordHash = crypto.createHash('sha256').update(params.password).digest('hex');
    let userId = '';
    let profile: any = null;

    if (isSupabaseConfigured) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === cleanEmail);

      if (existing) {
        userId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: params.password,
          email_confirm: true,
          user_metadata: {
            username: cleanUsername,
            display_name: params.displayName || cleanUsername,
            country_code: params.countryCode || 'PK',
          },
        });
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          username: cleanUsername,
          display_name: params.displayName || cleanUsername,
          country_code: params.countryCode || 'PK',
          avatar_url: DEFAULT_AVATAR,
        });
        const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
        profile = p;
      } else {
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: params.password,
          email_confirm: true,
          user_metadata: {
            username: cleanUsername,
            display_name: params.displayName || cleanUsername,
            country_code: params.countryCode || 'PK',
          },
        });
        if (error) throw error;
        userId = newUser.user.id;
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          username: cleanUsername,
          display_name: params.displayName || cleanUsername,
          country_code: params.countryCode || 'PK',
          avatar_url: DEFAULT_AVATAR,
        });
        const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
        profile = p;
      }
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
        avatar_url: DEFAULT_AVATAR,
        country_code: params.countryCode || 'PK',
        follower_count: 0,
        following_count: 0,
      };
      mockProfiles.set(userId, profile);
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
      user: { id: userId, email: cleanEmail, ...profile, is_new_user: true, onboarding_completed: false },
    };
  }

  /**
   * Login with Email & Password
   */
  async loginWithPassword(identifier: string, password: string): Promise<{ token: string; user: any }> {
    let cleanEmail = identifier.toLowerCase().trim();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // If identifier doesn't have '@', resolve username to email
    if (!cleanEmail.includes('@')) {
      if (isSupabaseConfigured) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .ilike('username', cleanEmail)
          .maybeSingle();
        if (userProfile?.id) {
          const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userProfile.id);
          if (authUserData?.user?.email) {
            cleanEmail = authUserData.user.email.toLowerCase().trim();
          }
        }
      } else {
        for (const [em, rec] of registeredUsers.entries()) {
          if (rec.username.toLowerCase() === cleanEmail) {
            cleanEmail = em;
            break;
          }
        }
      }
    }

    let userId = '';
    let profile: any = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw new Error(error.message || 'Invalid email or password');
      userId = data.user?.id || '';
      const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      profile = p;

      // Auto-reactivate account if it was previously deactivated
      if (profile?.is_deactivated) {
        await supabaseAdmin.from('profiles').update({
          is_deactivated: false,
          deactivated_until: null,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
        profile.is_deactivated = false;
        profile.deactivated_until = null;
      }
    } else {
      const record = registeredUsers.get(cleanEmail);
      if (!record || record.passwordHash !== passwordHash) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      userId = record.userId;
      const mockP = mockProfiles.get(userId);
      if (mockP?.is_deactivated) {
        mockP.is_deactivated = false;
        mockP.deactivated_until = null;
      }
      profile = mockP || {
        id: userId,
        username: record.username,
        display_name: record.username,
        avatar_url: DEFAULT_AVATAR,
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
      };
      mockProfiles.set(userId, profile);
    }

    // Clear deactivation cache
    await cacheClient.del(`yapr:deactivated:${userId}`).catch(() => {});

    const token = jwt.sign(
      { sub: userId, email: cleanEmail, role: 'authenticated' },
      env.SUPABASE_JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isOnboarded = !!profile?.onboarding_completed || !!(await cacheClient.get(`yapr:onboarded:${userId}`).catch(() => null));

    return {
      token,
      user: { id: userId, email: cleanEmail, ...profile, onboarding_completed: isOnboarded, is_new_user: !isOnboarded },
    };
  }

  /**
   * Request password reset code
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Valid email address is required');
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = crypto.createHash('sha256').update(resetOtp).digest('hex');

    // 10 minutes TTL
    await cacheClient.set(`yapr:reset-otp:${cleanEmail}`, hash, 600);

    // Queue email job via LavinMQ
    await queueService.publish(env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp', {
      id: `reset_${cleanEmail}_${Date.now()}`,
      name: 'send_password_reset_otp',
      payload: {
        to: cleanEmail,
        code: resetOtp,
      },
    });

    console.log(`[Yapr Reset OTP] Generated code for ${cleanEmail}: ${resetOtp}`);

    return {
      message: 'Password reset code has been sent to your email.',
    };
  }

  /**
   * Reset password with verification code
   */
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    validatePasswordStrength(newPassword);

    const cacheKey = `yapr:reset-otp:${cleanEmail}`;
    const storedHash = await cacheClient.get(cacheKey);
    const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    const isDevMockBypass = !isSupabaseConfigured && env.NODE_ENV === 'development' && code === '123456';
    const isValid = (storedHash && storedHash === inputHash) || isDevMockBypass;

    if (!isValid) {
      throw new Error('Invalid or expired reset code');
    }

    await cacheClient.del(cacheKey);

    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    if (isSupabaseConfigured) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const found = users?.users?.find((u) => u.email === cleanEmail);
      if (!found) {
        throw new Error('No account found with this email address');
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: newPassword,
      });
      if (error) throw error;
    } else {
      const record = registeredUsers.get(cleanEmail);
      if (record) {
        record.passwordHash = newPasswordHash;
      } else {
        const userId = crypto.createHash('md5').update(cleanEmail).digest('hex');
        registeredUsers.set(cleanEmail, {
          email: cleanEmail,
          passwordHash: newPasswordHash,
          userId: `${userId.slice(0, 8)}-${userId.slice(8, 12)}-4${userId.slice(13, 16)}-8${userId.slice(17, 20)}-${userId.slice(20, 32)}`,
          username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, ''),
        });
      }
    }

    return {
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.',
    };
  }

  /**
   * Change password for logged in user (Current Password + New Password)
   */
  async changePassword(params: {
    userId: string;
    email?: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const { userId, email, currentPassword, newPassword } = params;

    if (!currentPassword) {
      throw new Error('Current password is required');
    }
    validatePasswordStrength(newPassword);

    if (isSupabaseConfigured) {
      if (email) {
        const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password: currentPassword,
        });
        if (signInErr) {
          throw new Error('Current password is incorrect. Please try again.');
        }
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) throw error;
    } else {
      for (const record of registeredUsers.values()) {
        if (record.userId === userId || (email && record.email === email.toLowerCase().trim())) {
          const curHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
          if (record.passwordHash && record.passwordHash !== curHash) {
            throw new Error('Current password is incorrect. Please try again.');
          }
          record.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
          break;
        }
      }
    }

    return {
      success: true,
      message: 'Password changed successfully!',
    };
  }

  /**
   * Get full user profile for authenticated session
   */
  async getMeProfile(userId: string, email?: string): Promise<any> {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (isSupabaseConfigured) {
      let { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();

      // If not found by userId, check if another profile exists with the same email
      if (!p && cleanEmail) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const match = list?.users?.find((u) => u.email === cleanEmail && u.id !== userId);
        if (match) {
          const { data: matchedProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', match.id).maybeSingle();
          if (matchedProfile) {
            p = { ...matchedProfile, id: userId };
          }
        }
      }

      let socialLinks: any[] = [];
      try {
        const raw = await cacheClient.get(`yapr:social:${userId}`);
        if (raw) socialLinks = JSON.parse(raw);
      } catch {}

      if (p) {
        return { ...p, email: cleanEmail || p.email, id: userId, social_links: socialLinks };
      }
    }

    let socialLinks: any[] = [];
    try {
      const raw = await cacheClient.get(`yapr:social:${userId}`);
      if (raw) socialLinks = JSON.parse(raw);
    } catch {}

    for (const record of registeredUsers.values()) {
      if (record.userId === userId || (cleanEmail && record.email === cleanEmail)) {
        return {
          id: userId,
          email: record.email,
          username: record.username,
          display_name: record.username,
          avatar_url: DEFAULT_AVATAR,
          country_code: 'PK',
          follower_count: 0,
          following_count: 0,
          social_links: socialLinks,
        };
      }
    }

    return {
      id: userId,
      email: cleanEmail,
      username: cleanEmail ? cleanEmail.split('@')[0] : 'yapr',
      display_name: cleanEmail ? cleanEmail.split('@')[0] : 'Yapr User',
      avatar_url: DEFAULT_AVATAR,
      country_code: 'PK',
      follower_count: 0,
      following_count: 0,
      social_links: socialLinks,
    };
  }

  /**
   * Sync OAuth Login User while PRESERVING custom profile info (PFP, username, display name)
   */
  async syncOAuthUser(userId: string, email: string, rawMetadata: any): Promise<any> {
    const cleanEmail = (email || '').toLowerCase().trim();

    if (isSupabaseConfigured) {
      // 1. Check if user already has an existing profile in public.profiles
      let { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();

      // 2. If no profile exists for this userId, check if another profile exists with the exact same email
      if (!p && cleanEmail) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === cleanEmail && u.id !== userId);
        if (existing) {
          const { data: matchedProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', existing.id).maybeSingle();
          if (matchedProfile) {
            // Replicate existing custom profile so this OAuth identity shares the same username/PFP
            await supabaseAdmin.from('profiles').upsert({
              id: userId,
              username: matchedProfile.username,
              display_name: matchedProfile.display_name,
              avatar_url: matchedProfile.avatar_url,
              bio: matchedProfile.bio || '',
              country_code: matchedProfile.country_code || 'PK',
            });
            p = { ...matchedProfile, id: userId };
          }
        }
      }

      let isNewUser = false;
      // 3. If user is brand new (no previous profile anywhere)
      if (!p) {
        isNewUser = true;
        const baseUsername = (rawMetadata?.user_name || rawMetadata?.username || cleanEmail.split('@')[0] || `user_${userId.slice(0, 6)}`)
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 20) || `user_${userId.slice(0, 6)}`;
        const displayName = rawMetadata?.full_name || rawMetadata?.name || cleanEmail.split('@')[0] || 'Yapr User';
        const avatarUrl = rawMetadata?.avatar_url || rawMetadata?.picture || DEFAULT_AVATAR;

        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          username: baseUsername,
          display_name: displayName,
          avatar_url: avatarUrl,
          country_code: 'PK',
        });

        const { data: created } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
        p = created;
      }

      // Return profile - Note: We DO NOT overwrite p.avatar_url or p.display_name with Google/FB metadata!
      const isOnboarded = !!p?.onboarding_completed || !!(await cacheClient.get(`yapr:onboarded:${userId}`).catch(() => null));
      return {
        ...p,
        email: cleanEmail,
        id: userId,
        onboarding_completed: isOnboarded,
        is_new_user: !isOnboarded || isNewUser || !p?.username || p.username.startsWith('user_'),
      };
    }

    // Dev mock fallback
    const existing = registeredUsers.get(cleanEmail);
    if (existing) {
      const mockP = mockProfiles.get(userId);
      const isOnboarded = !!mockP?.onboarding_completed || !!(await cacheClient.get(`yapr:onboarded:${userId}`).catch(() => null));
      return {
        id: userId,
        email: cleanEmail,
        username: existing.username,
        display_name: mockP?.display_name || existing.username,
        avatar_url: mockP?.avatar_url || DEFAULT_AVATAR,
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
        onboarding_completed: isOnboarded,
        is_new_user: !isOnboarded,
      };
    }

    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${userId.slice(0, 6)}`;
    const mockCreated = {
      id: userId,
      email: cleanEmail,
      username: baseUsername,
      display_name: rawMetadata?.full_name || cleanEmail.split('@')[0] || 'Yapr User',
      avatar_url: rawMetadata?.avatar_url || rawMetadata?.picture || DEFAULT_AVATAR,
      country_code: 'PK',
      follower_count: 0,
      following_count: 0,
      onboarding_completed: false,
      is_new_user: true,
    };
    mockProfiles.set(userId, mockCreated);
    return mockCreated;
  }

  /**
   * Deactivate account temporarily (Instagram style with 1-7 days or manual reactivate)
   */
  async deactivateAccount(params: {
    userId: string;
    email?: string;
    password?: string;
    autoReactivateDays?: number;
  }): Promise<{ success: boolean; message: string }> {
    const { userId, email, password, autoReactivateDays } = params;

    // If password provided and Supabase is configured, verify password
    if (password && isSupabaseConfigured && email) {
      const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (signInErr) {
        throw new Error('Current password is incorrect. Deactivation failed.');
      }
    } else if (password && !isSupabaseConfigured && email) {
      const record = registeredUsers.get(email.toLowerCase().trim());
      if (record && record.passwordHash) {
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        if (record.passwordHash !== inputHash) {
          throw new Error('Current password is incorrect. Deactivation failed.');
        }
      }
    }

    const deactivatedUntil = autoReactivateDays && autoReactivateDays > 0
      ? new Date(Date.now() + autoReactivateDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    if (isSupabaseConfigured) {
      await supabaseAdmin.from('profiles').update({
        is_deactivated: true,
        deactivated_until: deactivatedUntil,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      const p = mockProfiles.get(userId);
      if (p) {
        p.is_deactivated = true;
        p.deactivated_until = deactivatedUntil;
      }
    }

    // Cache deactivation state in Redis
    await cacheClient.set(
      `yapr:deactivated:${userId}`,
      JSON.stringify({ is_deactivated: true, deactivated_until: deactivatedUntil }),
      autoReactivateDays && autoReactivateDays > 0 ? autoReactivateDays * 86400 : 31536000
    ).catch(() => {});

    return {
      success: true,
      message: 'Account has been temporarily deactivated. Log back in with your password anytime to reactivate.',
    };
  }

  /**
   * Permanently delete account, wiping all yaps, interactions, and auth records
   */
  async deleteAccount(params: {
    userId: string;
    email?: string;
    password?: string;
    confirmationText: string;
  }): Promise<{ success: boolean; message: string }> {
    const { userId, email, password, confirmationText } = params;

    if (confirmationText.trim().toUpperCase() !== 'CONFIRM DELETE') {
      throw new Error('Please type "CONFIRM DELETE" exactly to confirm account deletion.');
    }

    // Verify password if provided / standard email user
    if (password && isSupabaseConfigured && email) {
      const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (signInErr) {
        throw new Error('Current password is incorrect. Account deletion cancelled.');
      }
    } else if (password && !isSupabaseConfigured && email) {
      const record = registeredUsers.get(email.toLowerCase().trim());
      if (record && record.passwordHash) {
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        if (record.passwordHash !== inputHash) {
          throw new Error('Current password is incorrect. Account deletion cancelled.');
        }
      }
    }

    if (isSupabaseConfigured) {
      // 1. Delete notifications
      await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
      // 2. Delete likes
      await supabaseAdmin.from('likes').delete().eq('user_id', userId);
      // 3. Delete bookmarks
      await supabaseAdmin.from('bookmarks').delete().eq('user_id', userId);
      // 4. Delete follows
      await supabaseAdmin.from('follows').delete().or(`follower_id.eq.${userId},followee_id.eq.${userId}`);
      // 5. Delete user yaps
      await supabaseAdmin.from('yaps').delete().eq('author_id', userId);
      // 6. Delete profile
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      // 7. Delete Supabase Auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } else {
      mockProfiles.delete(userId);
      if (email) registeredUsers.delete(email.toLowerCase().trim());
    }

    // Clear user's Redis keys
    await cacheClient.del(`yapr:privacy:${userId}`).catch(() => {});
    await cacheClient.del(`yapr:social:${userId}`).catch(() => {});
    await cacheClient.del(`yapr:push_subs:${userId}`).catch(() => {});
    await cacheClient.del(`yapr:deactivated:${userId}`).catch(() => {});

    return {
      success: true,
      message: 'Account permanently deleted.',
    };
  }
}

export const authService = new AuthService();
