import React, { useState, useEffect, useRef } from 'react';
import { AtSign, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../api/apiClient';

interface SelectUsernameModalProps {
  isOpen: boolean;
  initialUsername?: string;
  onComplete: (chosenUsername: string) => void;
}

export const SelectUsernameModal: React.FC<SelectUsernameModalProps> = ({
  isOpen,
  initialUsername = '',
  onComplete,
}) => {
  const [username, setUsername] = useState(
    initialUsername.startsWith('user_') ? '' : initialUsername
  );
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialUsername && !initialUsername.startsWith('user_')) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  const validateAndCheck = (val: string) => {
    const clean = val.toLowerCase().trim();

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!clean) {
      setStatus('idle');
      setStatusMsg('');
      return;
    }

    if (clean.length < 3) {
      setStatus('invalid');
      setStatusMsg('Username must be at least 3 characters');
      return;
    }

    if (clean.length > 20) {
      setStatus('invalid');
      setStatusMsg('Username must be 20 characters or fewer');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setStatus('invalid');
      setStatusMsg('Only letters, numbers, and underscores are allowed');
      return;
    }

    setStatus('checking');
    setStatusMsg('Checking availability...');

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setStatus('available');
          setStatusMsg(`@${clean} is available!`);
        } else {
          setStatus('taken');
          setStatusMsg(`@${clean} is already taken`);
        }
      } catch {
        // Fallback: allow proceed if network check fails
        setStatus('available');
        setStatusMsg(`@${clean} looks good`);
      }
    }, 350);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(val);
    validateAndCheck(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.toLowerCase().trim();
    if (!clean || clean.length < 3 || status === 'taken' || status === 'invalid') return;

    setIsSubmitting(true);
    try {
      await api.updateProfile({ username: clean });
      onComplete(clean);
    } catch (err: any) {
      setStatus('taken');
      setStatusMsg(err.message || 'Failed to set username. Please try another.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose your username</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Pick a unique handle for your Yapr profile
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={handleInputChange}
                placeholder="yourhandle"
                maxLength={20}
                autoFocus
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {status === 'available' && <Check className="w-4 h-4 text-emerald-500" />}
                {(status === 'taken' || status === 'invalid') && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>

            {statusMsg && (
              <p
                className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
                  status === 'available'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : status === 'checking'
                    ? 'text-blue-500'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {statusMsg}
              </p>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              3-20 characters, lowercase letters, numbers, and underscores only.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              username.length < 3 ||
              status === 'taken' ||
              status === 'invalid' ||
              status === 'checking'
            }
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting username...
              </>
            ) : (
              'Confirm & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
