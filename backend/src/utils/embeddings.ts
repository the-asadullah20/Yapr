/**
 * PGVector embedding generation utility for Stage 3 taste matching
 */
export async function computeContentVector(text: string): Promise<number[]> {
  // Deterministic 1536-dimensional vector generator for pgvector
  const dimensions = 1536;
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const idx = (normalized.charCodeAt(i) * 31 + i) % dimensions;
    vector[idx] = (vector[idx] + 0.1) % 1.0;
  }

  // Normalize L2 norm
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1.0;
  return vector.map((v) => parseFloat((v / norm).toFixed(6)));
}
