/**
 * OAuth provider redirects for Google and Facebook login
 */
export function initiateGoogleOAuth() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('mock-')) {
    alert('Google OAuth: In production, redirects to accounts.google.com via Supabase Auth.');
    return;
  }
  window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google`;
}

export function initiateFacebookOAuth() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('mock-')) {
    alert('Facebook OAuth: In production, redirects to facebook.com/v18.0/dialog/oauth via Supabase Auth.');
    return;
  }
  window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=facebook`;
}
