import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';

export interface InteractionEvent {
  yap_id: string;
  type: 'view' | 'like' | 'reply' | 'skip' | 'dwell';
  dwell_ms?: number;
}

export class InteractionsService {
  async batchLogInteractions(userId: string, events: InteractionEvent[]): Promise<number> {
    if (!events || events.length === 0) return 0;

    const rows = events.map((e) => ({
      user_id: userId,
      yap_id: e.yap_id,
      type: e.type,
      dwell_ms: e.dwell_ms || 0,
      created_at: new Date().toISOString(),
    }));

    if (isSupabaseConfigured) {
      const { error } = await supabaseAdmin.from('interactions').insert(rows);
      if (error) console.error('Failed to write interactions batch:', error);
    } else {
      console.log(`[Interactions] Batch logged ${rows.length} interaction events for user ${userId}`);
    }

    return rows.length;
  }
}

export const interactionsService = new InteractionsService();
