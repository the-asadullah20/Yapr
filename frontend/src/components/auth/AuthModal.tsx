import React, { useState } from 'react';
import { X, Mail, KeyRound, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username bloom filter check
  const [testUsername, setTestUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; method?: string } | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOtp(email);
      setPreviewCode(res.previewCode || '123456');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithOtp(email, code);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUsername = async () => {
    if (!testUsername) return;
    const res = await api.checkUsername(testUsername);
    setUsernameStatus(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black">Welcome to Yapr</h2>
          <p className="text-xs text-blue-100 mt-1">Sign in with Email OTP or test Bloom Filter availability</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:bg-white">
                  <Mail className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
              >
                {loading ? 'Sending code...' : 'Send Verification OTP'}
              </button>

              {/* OAuth Buttons (v1) */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alert('Supabase Google OAuth initiated')}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <span className="text-base font-bold">G</span> Google
                </button>
                <button
                  type="button"
                  onClick={() => alert('Supabase Facebook OAuth initiated')}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <span className="text-base font-bold text-blue-600">f</span> Facebook
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900">
                We sent a 6-digit code to <strong>{email}</strong>
                {previewCode && (
                  <p className="mt-1 font-mono text-blue-700 font-bold">
                    Dev preview code: <span className="bg-white px-2 py-0.5 rounded border border-blue-200">{previewCode}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">6-Digit Code</label>
                <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:bg-white">
                  <KeyRound className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full text-sm font-mono tracking-widest bg-transparent outline-none text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Yapr'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
              >
                ← Back to email
              </button>
            </form>
          )}

          {/* Bonus: Bloom Filter Username Pre-check tester */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Bloom Filter Username Availability Test
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder="Try: asadahmad or newuser"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
              <button
                type="button"
                onClick={handleCheckUsername}
                className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Check
              </button>
            </div>
            {usernameStatus && (
              <p className={`text-[11px] mt-1.5 font-medium ${usernameStatus.available ? 'text-emerald-600' : 'text-rose-600'}`}>
                {usernameStatus.available ? '✅ Available' : '❌ Taken'} ({usernameStatus.method})
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
