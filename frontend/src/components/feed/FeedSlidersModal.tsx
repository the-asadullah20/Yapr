import React from 'react';
import { X, Sliders, RotateCcw, Check, Info } from 'lucide-react';
import { FeedSliderSettings } from '../../types';

interface FeedSlidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FeedSliderSettings;
  onSave: (settings: FeedSliderSettings) => void;
}

export const FeedSlidersModal: React.FC<FeedSlidersModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = React.useState<FeedSliderSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleReset = () => {
    setLocalSettings({
      followingWeight: 1.5,
      viralWeight: 1.0,
      recencyHours: 12.0,
    });
  };

  const handleApply = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Feed Algorithm Sliders</h3>
              <p className="text-[11px] text-slate-500">Fine-tune your Stage 1 ranking formula</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders Body */}
        <div className="p-5 space-y-6">
          {/* Formula formula preview box */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Stage 1 Ranking Formula:</p>
              <code className="text-[10px] font-mono bg-white/80 px-2 py-1 rounded block text-blue-800">
                score = (likes×1 + replies×3 + reyaps×2) × decay + (following × {localSettings.followingWeight})
              </code>
            </div>
          </div>

          {/* Slider 1: Following Weight */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">More From People I Follow</span>
              <span className="text-blue-600 font-mono">{localSettings.followingWeight}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={localSettings.followingWeight}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, followingWeight: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Balanced (0.5x)</span>
              <span>Heavy Follower Bias (4.0x)</span>
            </div>
          </div>

          {/* Slider 2: Viral Weight */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">Viral Content Multiplier</span>
              <span className="text-blue-600 font-mono">{localSettings.viralWeight}x</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.2"
              value={localSettings.viralWeight}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, viralWeight: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Zero Viral (0.0x)</span>
              <span>Maximum Viral (3.0x)</span>
            </div>
          </div>

          {/* Slider 3: Recency Half-Life */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">Recency Half-Life Decay</span>
              <span className="text-blue-600 font-mono">{localSettings.recencyHours} hours</span>
            </div>
            <input
              type="range"
              min="2"
              max="48"
              step="2"
              value={localSettings.recencyHours}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, recencyHours: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Ultra-Fresh (2h)</span>
              <span>Long Shelf-Life (48h)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Sliders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
