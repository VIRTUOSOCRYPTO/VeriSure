import React from 'react';
import { Type } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

const FontSizeControl = () => {
  const { fontSize, setFontSize } = useAccessibility();

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm px-3 py-2" data-testid="font-size-control">
      <Type className="w-4 h-4 text-slate-600" />
      <div className="flex gap-1">
        <button
          onClick={() => setFontSize('normal')}
          className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${
            fontSize === 'normal'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          data-testid="font-normal"
          aria-label="Normal font size"
        >
          A
        </button>
        <button
          onClick={() => setFontSize('large')}
          className={`px-3 py-1 text-sm font-mono rounded-sm transition-all ${
            fontSize === 'large'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          data-testid="font-large"
          aria-label="Large font size"
        >
          A
        </button>
        <button
          onClick={() => setFontSize('xlarge')}
          className={`px-3 py-1 text-lg font-mono rounded-sm transition-all ${
            fontSize === 'xlarge'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          data-testid="font-xlarge"
          aria-label="Extra large font size"
        >
          A
        </button>
      </div>
    </div>
  );
};

export default FontSizeControl;
