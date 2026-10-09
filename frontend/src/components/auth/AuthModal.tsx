import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithPassword, registerWithPassword, loginWithOtp } = useAuth();

  // Mode: 'signin' | 'signup' | 'forgot_password'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  // Signup step: 1 (credentials) -> 2 (otp) -> 3 (choose username)
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  // Forgot password step: 1 (email) -> 2 (otp + new password)
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  // Forgot password specific states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Username step states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('PK');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string } | null>(null);

  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [useOtpLogin, setUseOtpLogin] = useState(false);

  // Debounced real-time username availability check (Google / top-tier UX)
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus(null);
      setCheckingUsername(false);
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus({ available: false, message: 'Must be at least 3 characters' });
      setCheckingUsername(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus({ available: false, message: 'Only letters, numbers, and underscores allowed' });
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setUsernameStatus({ available: true, message: 'Available' });
        } else {
          setUsernameStatus({ available: false, message: 'This username is taken. Try some other.' });
        }
      } catch {
        setUsernameStatus({ available: false, message: 'Error checking availability' });
      } finally {
        setCheckingUsername(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [username]);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
    setOtpCode('');
    setPreviewCode(null);
    setUsernameStatus(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setPreviewCode(res.previewCode || '123456');
      setForgotStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.resetPassword({
        email,
        code: otpCode,
        newPassword,
      });
      setSuccessMessage(res.message || 'Password reset successfully! Please sign in with your new password.');
      setMode('signin');
      setForgotStep(1);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setPreviewCode(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);

    try {
      if (useOtpLogin) {
        // Request OTP
        const res = await api.requestOtp(email);
        setPreviewCode(res.previewCode || '123456');
        setSignupStep(2);
      } else {
        await loginWithPassword(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Send verification code to email
      const res = await api.requestOtp(email);
      setPreviewCode(res.previewCode || '123456');
      setSignupStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        // Direct OTP login
        await loginWithOtp(email, otpCode);
        onClose();
      } else {
        // Real backend verification against Upstash Redis
        await api.verifyOtp(email, otpCode);
        // Move to Step 3: Choose Username!
        setSignupStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !usernameStatus?.available) return;
    setError(null);
    setLoading(true);

    try {
      await registerWithPassword({
        email,
        password,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim() || username.trim(),
        countryCode,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-6 bg-blue-600 dark:bg-blue-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-1">
            <img src="/logo.png" alt="Yapr" className="w-7 h-7 object-contain rounded bg-white shadow-sm" />
            <h2 className="text-xl font-bold tracking-tight">
              {mode === 'forgot_password'
                ? 'Reset Password'
                : mode === 'signin'
                ? 'Sign In to Yapr'
                : 'Create Yapr Account'}
            </h2>
          </div>
          <p className="text-xs text-blue-100">
            {mode === 'forgot_password'
              ? forgotStep === 1
                ? 'Enter your email to receive a password reset code.'
                : 'Enter the 6-digit code and create your new password.'
              : mode === 'signin'
              ? 'Welcome back! Enter your details to continue.'
              : signupStep === 3
              ? 'Step 3 of 3: Choose your unique @username'
              : signupStep === 2
              ? 'Step 2 of 3: Verify your email address'
              : 'Step 1 of 3: Enter your email and secure password'}
          </p>

          {/* Mode Switcher Tabs (Only visible when not deep in signup steps and not in forgot password) */}
          {signupStep === 1 && mode !== 'forgot_password' && (
            <div className="flex gap-2 mt-4 bg-black/20 p-1 rounded-xl w-full">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetState();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetState();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE: SIGN IN */}
          {/* ========================================================================= */}
          {mode === 'signin' && signupStep === 1 && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Mail className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {!useOtpLogin && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setForgotStep(1);
                          resetState();
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                      <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() => setUseOtpLogin(true)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Use OTP instead
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                    <Lock className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {useOtpLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setUseOtpLogin(false)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Use Password instead
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{useOtpLogin ? 'Send Login Code' : 'Sign In'}</span>
              </button>

              {/* OAuth Buttons with Original Colored Logos */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500 font-bold">
                    Or sign in with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Official Google Box */}
                <button
                  type="button"
                  onClick={() => alert('Supabase Google OAuth initiated')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Official Facebook Box */}
                <button
                  type="button"
                  onClick={() => alert('Supabase Facebook OAuth initiated')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] border border-[#1877F2] rounded-xl text-xs font-semibold text-white shadow-sm transition-all"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      resetState();
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* MODE: FORGOT PASSWORD */}
          {/* ========================================================================= */}
          {mode === 'forgot_password' && forgotStep === 1 && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Mail className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Send Reset Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetState();
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {mode === 'forgot_password' && forgotStep === 2 && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300">
                We sent a 6-digit reset code to:
                <p className="font-semibold text-blue-950 dark:text-white mt-0.5">{email}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Please check your inbox to reset your password.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 6-Digit Reset Code
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <KeyRound className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full text-sm font-mono tracking-widest bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password (min. 6 characters)
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Lock className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Lock className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Reset Password</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setForgotStep(1)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to previous step</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* MODE: SIGN UP - STEP 1 (Credentials) */}
          {/* ========================================================================= */}
          {mode === 'signup' && signupStep === 1 && (
            <form onSubmit={handleSignupStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Mail className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Choose Password (min. 6 characters)
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <Lock className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    minLength={6}
                    required
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Continue to Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500 font-bold">
                    Or sign up with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('Supabase Google OAuth initiated')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Supabase Facebook OAuth initiated')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] border border-[#1877F2] rounded-xl text-xs font-semibold text-white shadow-sm transition-all"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      resetState();
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: EMAIL OTP VERIFICATION */}
          {/* ========================================================================= */}
          {signupStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300">
                We sent a 6-digit confirmation code to:
                <p className="font-semibold text-blue-950 dark:text-white mt-0.5">{email}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Please check your inbox to verify your account.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <div className="flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                  <KeyRound className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full text-sm font-mono tracking-widest bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{mode === 'signin' ? 'Verify & Sign In' : 'Verify & Choose Username'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to previous step</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: GOOGLE-STYLE REAL-TIME USERNAME SELECTION */}
          {/* ========================================================================= */}
          {mode === 'signup' && signupStep === 3 && (
            <form onSubmit={handleCompleteSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Choose your unique Username
                </label>
                <div
                  className={`flex items-center px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border transition-all ${
                    usernameStatus?.available === true
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : usernameStatus?.available === false
                      ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-700 focus-within:border-blue-500'
                  }`}
                >
                  <span className="text-slate-400 font-bold text-sm mr-1">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="e.g. al, ali, asad20"
                    maxLength={25}
                    required
                    className="w-full text-xs font-medium bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                  {checkingUsername && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                  {!checkingUsername && usernameStatus?.available === true && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Available
                    </span>
                  )}
                  {!checkingUsername && usernameStatus?.available === false && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
                      <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      Taken
                    </span>
                  )}
                </div>

                {/* Status Message Line */}
                {usernameStatus && (
                  <p
                    className={`text-[11px] mt-1.5 font-medium flex items-center gap-1.5 ${
                      usernameStatus.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {usernameStatus.available ? (
                      <span>✓ @{username} is free to claim!</span>
                    ) : (
                      <span>✕ {usernameStatus.message}</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name (optional)
                </label>
                <div className="flex items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500">
                  <User className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={username || 'Your Name'}
                    className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-slate-100"
                >
                  <option value="PK">PK · Pakistan</option>
                  <option value="US">US · United States</option>
                  <option value="SG">SG · Singapore</option>
                  <option value="GB">GB · United Kingdom</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !usernameStatus?.available}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Complete Setup & Enter Yapr</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
