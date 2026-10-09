/**
 * Roman Urdu normalization and alias dictionary.
 * Maps common Roman Urdu variations to canonical terms.
 */
export const ROMAN_URDU_ALIASES: Record<string, string[]> = {
  khabar: ['khabr', 'khabrain', 'khabre', 'news'],
  acha: ['achha', 'achaah', 'accha', 'theek'],
  bhai: ['bhaiya', 'bro', 'veer', 'bhaii'],
  kya: ['kia', 'kay', 'kea'],
  mujhe: ['mujhay', 'mjhe', 'mjhy'],
  tujhe: ['tujhay', 'tjhe'],
  shukriya: ['shukria', 'dhanyawad', 'thanks'],
  kese: ['kaisay', 'kaise', 'kesay'],
  wahan: ['wahaan', 'whan'],
  yahan: ['yahaan', 'yhn'],
  zaroori: ['zaruri', 'zrori'],
  mausam: ['mosam', 'weather'],
  karachi: ['khi', 'karachiites'],
  lahore: ['lhr', 'lahoris'],
  islamabad: ['isb'],
};

export function normalizeRomanUrduWord(word: string): string {
  const clean = word.toLowerCase().trim();
  for (const [canonical, variants] of Object.entries(ROMAN_URDU_ALIASES)) {
    if (canonical === clean || variants.includes(clean)) {
      return canonical;
    }
  }
  return clean;
}

export function expandSearchTermsWithRomanUrdu(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded: Set<string> = new Set(terms);

  for (const term of terms) {
    for (const [canonical, variants] of Object.entries(ROMAN_URDU_ALIASES)) {
      if (canonical === term || variants.includes(term)) {
        expanded.add(canonical);
        variants.forEach((v) => expanded.add(v));
      }
    }
  }

  return Array.from(expanded);
}
