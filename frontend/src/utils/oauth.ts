/**
 * OAuth provider redirects for Google and Facebook login with dynamic origin return
 */
export function initiateGoogleOAuth() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('mock-')) {
    alert('Google OAuth: In production, redirects to accounts.google.com via Supabase Auth.');
    return;
  }
  const redirectUri = encodeURIComponent(window.location.origin);
  window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectUri}`;
}

export function initiateFacebookOAuth() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('mock-')) {
    alert('Facebook OAuth: In production, redirects to facebook.com/v18.0/dialog/oauth via Supabase Auth.');
    return;
  }
  const redirectUri = encodeURIComponent(window.location.origin);
  window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=facebook&redirect_to=${redirectUri}`;
}
