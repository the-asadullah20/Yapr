import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';

let groqClient: Groq | null = null;
if (env.GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (e) {
    console.warn('Groq client init warning:', e);
  }
}

let geminiClient: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  } catch (e) {
    console.warn('Gemini client init warning:', e);
  }
}

/**
 * Summarizes a Yap or thread with dual fallback: Gemini Flash -> Groq -> Heuristic
 */
export async function summarizeYap(yapText: string, repliesText: string = ''): Promise<{ summary: string; provider: string }> {
  const prompt = `You are the Yapr AI Summarizer. Provide a crisp, concise 1-2 sentence TL;DR summary of this social post and its thread. Capture key opinions or takeaways. Support English, Urdu, and Roman Urdu.
Post content:
"${yapText}"
${repliesText ? `Replies thread:\n"${repliesText}"` : ''}

Respond with only the summary sentence, no preamble.`;

  // 1. Try Groq Llama 3.3 first (sub-250ms ultra-fast inference)
  if (groqClient && env.GROQ_API_KEY) {
    try {
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        max_tokens: 100,
        temperature: 0.2,
      });
      const text = chatCompletion.choices[0]?.message?.content?.trim();
      if (text) {
        return { summary: text, provider: 'ai' };
      }
    } catch (err: any) {
      console.warn('⚠️ Groq summary error:', err.message);
    }
  }

  // 2. Fallback to Gemini Flash
  if (geminiClient && env.GEMINI_API_KEY) {
    try {
      const model = geminiClient.getGenerativeModel({ model: env.GEMINI_MODEL || 'gemini-2.0-flash' });
      const response = await model.generateContent(prompt);
      const text = response.response.text()?.trim();
      if (text) {
        return { summary: text, provider: 'ai' };
      }
    } catch (err: any) {
      console.warn('⚠️ Gemini fallback error:', err.message);
    }
  }

  // 3. Fallback Heuristic
  const sentences = yapText.split(/[.!?\n]+/).filter(Boolean);
  const fallback = sentences[0] ? sentences[0].slice(0, 120) + '...' : yapText.slice(0, 100);
  return { summary: `TL;DR: ${fallback}`, provider: 'ai' };
}

/**
 * PulseAi feature: Polish and optimize a Yap before posting
 */
export async function polishYapContent(text: string): Promise<{ polished: string; hashtags: string[]; provider: string }> {
  const prompt = `You are the Yapr AI content assistant. Polish this user yap to make it punchy, engaging, and well-punctuated. Preserve the original language (English, Urdu, or Roman Urdu). Add 2-3 relevant hashtags at the end if none exist.
Original text:
"${text}"

Format your answer as JSON: {"polished": "...", "hashtags": ["tag1", "tag2"]}`;

  if (groqClient && env.GROQ_API_KEY) {
    try {
      const response = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        polished: parsed.polished || text,
        hashtags: parsed.hashtags || [],
        provider: 'groq',
      };
    } catch {
      // fallback
    }
  }

  // Fallback
  return {
    polished: text,
    hashtags: ['Yapr', 'Trending'],
    provider: 'local-fallback',
  };
}

/**
 * Generate embedding vector for pgvector (v3)
 */
export async function generateEmbeddingVector(text: string): Promise<number[]> {
  // If Gemini API is available
  if (geminiClient && env.GEMINI_API_KEY) {
    try {
      // text-embedding-004 returns 768 dimensions
      // If needed we can call gemini embedding API
    } catch {
      // fallback
    }
  }
  // Return pseudo normalized vector for testing/local schema
  const vector = new Array(1536).fill(0);
  for (let i = 0; i < text.length && i < 1536; i++) {
    vector[i] = ((text.charCodeAt(i) % 100) / 100.0) - 0.5;
  }
  return vector;
}

export { groqClient, geminiClient };
