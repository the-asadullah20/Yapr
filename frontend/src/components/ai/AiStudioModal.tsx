import React, { useState } from 'react';
import { X, Sparkles, Send, Copy, Check, Zap, Cpu } from 'lucide-react';
import { api } from '../../api/apiClient';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseGeneratedYap?: (text: string) => void;
}

export const AiStudioModal: React.FC<AiStudioModalProps> = ({
  isOpen,
  onClose,
  onUseGeneratedYap,
}) => {
  const [tab, setTab] = useState<'polish' | 'summarize'>('polish');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');
    setProvider(null);

    try {
      if (tab === 'polish') {
        const res = await api.polishYap(inputText);
        setOutputText(res.polished);
        setProvider(res.provider);
      } else {
        const res = await api.summarizeYap('', inputText);
        setOutputText(res.summary);
        setProvider(res.provider);
      }
    } catch {
      setOutputText('Failed to process with AI. Please verify API keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoComposer = () => {
    onUseGeneratedYap?.(outputText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* PulseAi Header Banner */}
        <div className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              PulseAi Intelligence Studio
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>

          <h2 className="text-xl font-black tracking-tight">Generate Viral Social Content</h2>
          <p className="text-xs text-blue-100 mt-1">
            Harness Groq Llama 3.3 and Google Gemini Flash to polish, summarize, and amplify your Yaps.
          </p>

          {/* Mode Switcher */}
          <div className="flex gap-2 mt-4 bg-black/20 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setTab('polish'); setOutputText(''); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'polish' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100'
              }`}
            >
              Post Polish & Optimizer
            </button>
            <button
              onClick={() => { setTab('summarize'); setOutputText(''); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'summarize' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100'
              }`}
            >
              Thread Summarizer (TL;DR)
            </button>
          </div>
        </div>

        {/* Studio Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {tab === 'polish' ? 'Draft Yap or Idea' : 'Long Post or Conversation Text'}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                tab === 'polish'
                  ? 'e.g. karachi weather is awesome and yapr stage 1 feed is live...'
                  : 'Paste long thread text to generate a 1-sentence TL;DR...'
              }
              rows={4}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!inputText.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Processing through AI pipeline...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>{tab === 'polish' ? 'Polish with AI' : 'Summarize Thread'}</span>
              </>
            )}
          </button>

          {/* Generated Result */}
          {outputText && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  AI Generated Result {provider && `(${provider})`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-mono bg-white p-3 rounded-xl border border-slate-100">
                {outputText}
              </p>

              {onUseGeneratedYap && (
                <button
                  onClick={handleInsertIntoComposer}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Insert into Composer →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
