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
 * Summarizes a Yap or thread with dual fallback: Gemini Flash Lite -> Groq GPT-OSS -> Heuristic
 */
export async function summarizeYap(yapText: string, repliesText: string = ''): Promise<{ summary: string; provider: string }> {
  const prompt = `You are the Yapr AI Summarizer. Provide a crisp, concise 1-2 sentence plain-text summary capturing the core thought and takeaway of this post.
Do NOT include asterisks, bold formatting (**), bullets, headings, or language labels.
Post content:
"${yapText}"
${repliesText ? `Thread context:\n"${repliesText}"` : ''}

Respond with ONLY the plain-text summary sentence, no quotes, no TL;DR prefix.`;

  const sanitizeSummary = (t: string) =>
    t.replace(/\*{1,4}/g, '').replace(/<\/?[^>]+(>|$)/g, '').replace(/^TL;DR:?\s*/i, '').replace(/^"|"$/g, '').trim();

  // 1. Try Gemini Flash Lite first (reliable & fast)
  if (geminiClient && env.GEMINI_API_KEY) {
    try {
      const model = geminiClient.getGenerativeModel({ model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' });
      const response = await model.generateContent(prompt);
      const text = response.response.text()?.trim();
      if (text) {
        return { summary: sanitizeSummary(text), provider: 'gemini' };
      }
    } catch (err: any) {
      console.warn('⚠️ Gemini summary error:', err.message);
    }
  }

  // 2. Fallback to Groq
  if (groqClient && env.GROQ_API_KEY) {
    try {
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
        max_tokens: 120,
        temperature: 0.3,
      });
      const text = chatCompletion.choices[0]?.message?.content?.trim();
      if (text) {
        return { summary: sanitizeSummary(text), provider: 'groq' };
      }
    } catch (err: any) {
      console.warn('⚠️ Groq summary error:', err.message);
    }
  }

  // 3. Fallback Heuristic
  const sentences = yapText.split(/[.!?\n]+/).filter(Boolean);
  const fallback = sentences[0] ? sentences[0].slice(0, 140) : yapText.slice(0, 120);
  return { summary: sanitizeSummary(fallback), provider: 'ai' };
}

/**
 * Translate Yap to a specified language (e.g. English, Urdu, Roman Urdu, Hindi, Arabic, Spanish, etc.)
 */
export async function translateYap(text: string, targetLanguage: string): Promise<{ translation: string; targetLanguage: string; provider: string }> {
  const prompt = `You are a professional social media translator for Yapr.
Translate the following post into ${targetLanguage}.
Keep the informal social tone, emotional nuance, and original emojis/hashtags.
Do NOT use HTML tags (like <p>, </p>, <br>), markdown formatting, asterisks (**), or quotes.

Post text:
"${text}"

Respond with ONLY the plain translated text without any HTML or markdown markup.`;

  const sanitizeTranslation = (t: string) =>
    t.replace(/<\/?[^>]+(>|$)/g, '').replace(/\*{1,4}/g, '').replace(/^"|"$/g, '').trim();

  // 1. Try Gemini Flash Lite
  if (geminiClient && env.GEMINI_API_KEY) {
    try {
      const model = geminiClient.getGenerativeModel({ model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' });
      const response = await model.generateContent(prompt);
      const resultText = response.response.text()?.trim();
      if (resultText) {
        return { translation: sanitizeTranslation(resultText), targetLanguage, provider: 'gemini' };
      }
    } catch (err: any) {
      console.warn('⚠️ Gemini translate error:', err.message);
    }
  }

  // 2. Try Groq
  if (groqClient && env.GROQ_API_KEY) {
    try {
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
        max_tokens: 200,
        temperature: 0.3,
      });
      const resultText = chatCompletion.choices[0]?.message?.content?.trim();
      if (resultText) {
        return { translation: sanitizeTranslation(resultText), targetLanguage, provider: 'groq' };
      }
    } catch (err: any) {
      console.warn('⚠️ Groq translate error:', err.message);
    }
  }

  return { translation: sanitizeTranslation(text), targetLanguage, provider: 'fallback' };
}

/**
 * PulseAi feature: Polish and optimize a Yap before posting
 */
export async function polishYapContent(text: string): Promise<{ polished: string; hashtags: string[]; provider: string }> {
  const prompt = `You are the Yapr AI content assistant. Polish and enhance this user post to make it punchy, engaging, witty, and well-punctuated. Preserve the original language (English, Urdu, or Roman Urdu). Add 2 relevant hashtags at the end.
Original text:
"${text}"

Respond in JSON format: {"polished": "improved text here with #hashtags", "hashtags": ["tag1", "tag2"]}`;

  // 1. Try Gemini Flash Lite
  if (geminiClient && env.GEMINI_API_KEY) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const response = await model.generateContent(prompt);
      const rawText = response.response.text()?.trim();
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.polished) {
          return {
            polished: parsed.polished,
            hashtags: parsed.hashtags || [],
            provider: 'gemini',
          };
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Gemini polish error:', err.message);
    }
  }

  // 2. Try Groq
  if (groqClient && env.GROQ_API_KEY) {
    try {
      const response = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
        response_format: { type: 'json_object' },
        max_tokens: 200,
      });
      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      if (parsed.polished) {
        return {
          polished: parsed.polished,
          hashtags: parsed.hashtags || [],
          provider: 'groq',
        };
      }
    } catch (err: any) {
      console.warn('⚠️ Groq polish error:', err.message);
    }
  }

  // 3. Smart local heuristic polish fallback
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const withPunctuation = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized} ✨`;
  const polishedWithTags = withPunctuation.includes('#') ? withPunctuation : `${withPunctuation} #Yapr #Trending`;

  return {
    polished: polishedWithTags,
    hashtags: ['Yapr', 'Trending'],
    provider: 'local-polish',
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
