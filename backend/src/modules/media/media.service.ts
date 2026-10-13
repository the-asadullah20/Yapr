import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { isSupabaseConfigured } from '../../config/supabase.js';
import crypto from 'crypto';
import path from 'path';
import { DEFAULT_AVATAR } from '../../utils/avatar.js';

// Dedicated storage admin client guaranteed to run with service_role privilege
// completely immune to user sessions or client-level RLS restrictions
const storageAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  }
);

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.webm'];

function getSafeExtension(originalname: string, mimetype: string): string {
  const ext = path.extname(originalname).toLowerCase();
  if (mimetype.startsWith('video/')) {
    return ALLOWED_VIDEO_EXTS.includes(ext) ? ext : '.mp4';
  }
  return ALLOWED_IMAGE_EXTS.includes(ext) ? ext : '.png';
}

export class MediaService {
  /**
   * Upload user profile avatar to Supabase S3 'avatars' bucket
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const ext = getSafeExtension(file.originalname, file.mimetype);
    const filePath = `${userId}/${Date.now()}_avatar${ext}`;

    if (isSupabaseConfigured) {
      const { data, error } = await storageAdmin.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        console.error('Supabase avatar upload error:', error);
        throw new Error(`Failed to upload avatar: ${error.message}`);
      }

      const { data: publicUrlData } = storageAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Update avatar_url in profiles table
      await storageAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      return { url: avatarUrl };
    }

    const mockUrl = DEFAULT_AVATAR;
    return { url: mockUrl };
  }

  /**
   * Upload post/yap attachment to Supabase S3 'media' bucket
   */
  async uploadPostMedia(userId: string, file: Express.Multer.File): Promise<{ url: string; mimetype: string; size: number }> {
    const ext = getSafeExtension(file.originalname, file.mimetype);
    const random = crypto.randomBytes(6).toString('hex');
    const filePath = `${userId}/${Date.now()}_${random}${ext}`;

    if (isSupabaseConfigured) {
      const { data, error } = await storageAdmin.storage
        .from('media')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase media upload error:', error);
        throw new Error(`Failed to upload media: ${error.message}`);
      }

      const { data: publicUrlData } = storageAdmin.storage
        .from('media')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        mimetype: file.mimetype,
        size: file.size,
      };
    }

    return {
      url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600`,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}

export const mediaService = new MediaService();
