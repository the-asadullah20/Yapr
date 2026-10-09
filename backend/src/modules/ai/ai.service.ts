import { summarizeYap, translateYap, polishYapContent, generateEmbeddingVector } from '../../config/ai.js';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';

export class AiService {
  async summarize(yapId: string, text: string, threadText?: string): Promise<{ summary: string; provider: string }> {
    const result = await summarizeYap(text, threadText);

    // Save summary back to Yap so it is generated only once
    if (yapId && isSupabaseConfigured) {
      await supabaseAdmin
        .from('yaps')
        .update({ summary: result.summary })
        .eq('id', yapId);
    }

    return result;
  }

  async translate(text: string, targetLanguage: string): Promise<{ translation: string; targetLanguage: string; provider: string }> {
    return await translateYap(text, targetLanguage);
  }

  async polish(text: string): Promise<{ polished: string; hashtags: string[]; provider: string }> {
    return await polishYapContent(text);
  }

  async getEmbedding(text: string): Promise<number[]> {
    return await generateEmbeddingVector(text);
  }
}

export const aiService = new AiService();
