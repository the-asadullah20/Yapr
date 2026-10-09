import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import crypto from 'crypto';
import path from 'path';

export class MediaService {
  /**
   * Upload user profile avatar to Supabase S3 'avatars' bucket
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filePath = `${userId}/${Date.now()}_avatar${ext}`;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        console.error('Supabase avatar upload error:', error);
        throw new Error(`Failed to upload avatar: ${error.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Update avatar_url in profiles table
      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      return { url: avatarUrl };
    }

    const mockUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`;
    return { url: mockUrl };
  }

  /**
   * Upload post/yap attachment to Supabase S3 'media' bucket
   */
  async uploadPostMedia(userId: string, file: Express.Multer.File): Promise<{ url: string; mimetype: string; size: number }> {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const random = crypto.randomBytes(6).toString('hex');
    const filePath = `${userId}/${Date.now()}_${random}${ext}`;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase media upload error:', error);
        throw new Error(`Failed to upload media: ${error.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
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
