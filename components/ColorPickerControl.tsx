
import React, { useState, useEffect, useRef } from 'react';

// Helper to get RGB string from hex
const hexToRgbString = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0 0';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

interface ColorPickerControlProps {
  label: string;
  bgVariable: string;
  textVariable?: string;
  secondaryTextVariable?: string;
  opacityVariable?: string;
  initialBgColor: string; // Hex
  initialTextColor?: string; // Hex
  initialSecondaryTextColor?: string; // Hex
  initialOpacity?: string; // 0-1 string
  onSave: (updates: { [key: string]: string }) => void;
}

export const ColorPickerControl: React.FC<ColorPickerControlProps> = ({
  label,
  bgVariable,
  textVariable,
  secondaryTextVariable,
  opacityVariable,
  initialBgColor,
  initialTextColor,
  initialSecondaryTextColor,
  initialOpacity,
  onSave,
}) => {
  const [localBg, setLocalBg] = useState(initialBgColor);
  const [localText, setLocalText] = useState(initialTextColor || '#000000');
  const [localSecondaryText, setLocalSecondaryText] = useState(initialSecondaryTextColor || '#000000');
  const [localOpacity, setLocalOpacity] = useState(initialOpacity ? Math.round(parseFloat(initialOpacity) * 100) : 100);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external changes
  useEffect(() => {
    setLocalBg(initialBgColor);
    if (initialTextColor) setLocalText(initialTextColor);
    if (initialSecondaryTextColor) setLocalSecondaryText(initialSecondaryTextColor);
    if (initialOpacity) setLocalOpacity(Math.round(parseFloat(initialOpacity) * 100));
  }, [initialBgColor, initialTextColor, initialSecondaryTextColor, initialOpacity]);

  const handleUpdate = (type: 'bg' | 'text' | 'secondaryText' | 'opacity', value: string | number) => {
    // 1. Update Local State
    if (type === 'bg') setLocalBg(value as string);
    if (type === 'text') setLocalText(value as string);
    if (type === 'secondaryText') setLocalSecondaryText(value as string);
    if (type === 'opacity') setLocalOpacity(value as number);

    // 2. Update DOM immediately for preview
    const root = document.documentElement;
    if (type === 'bg') {
        root.style.setProperty(bgVariable, hexToRgbString(value as string));
    } else if (type === 'text' && textVariable) {
        root.style.setProperty(textVariable, hexToRgbString(value as string));
    } else if (type === 'secondaryText' && secondaryTextVariable) {
        root.style.setProperty(secondaryTextVariable, hexToRgbString(value as string));
    } else if (type === 'opacity' && opacityVariable) {
        root.style.setProperty(opacityVariable, String((value as number) / 100));
    }

    // 3. Debounce Save
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const updates: { [key: string]: string } = {};
      
      const finalBg = type === 'bg' ? value as string : localBg;
      const finalText = type === 'text' ? value as string : localText;
      const finalSecondaryText = type === 'secondaryText' ? value as string : localSecondaryText;
      const finalOp = type === 'opacity' ? value as number : localOpacity;

      updates[bgVariable] = hexToRgbString(finalBg);
      if (textVariable) updates[textVariable] = hexToRgbString(finalText);
      if (secondaryTextVariable) updates[secondaryTextVariable] = hexToRgbString(finalSecondaryText);
      if (opacityVariable) updates[opacityVariable] = String(finalOp / 100);

      onSave(updates);
    }, 800);
  };

  return (
    <div className="bg-surface-soft p-4 rounded-lg border border-border-default space-y-4">
      <h4 className="text-sm font-bold text-text-primary border-b border-border-default pb-2">{label}</h4>

      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-secondary">Background</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={localBg}
            onChange={(e) => handleUpdate('bg', e.target.value)}
            className="p-0.5 h-8 w-8 bg-transparent border border-border-default rounded cursor-pointer"
          />
        </div>
      </div>

      {textVariable && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Main Text</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localText}
              onChange={(e) => handleUpdate('text', e.target.value)}
              className="p-0.5 h-8 w-8 bg-transparent border border-border-default rounded cursor-pointer"
            />
          </div>
        </div>
      )}
      
      {secondaryTextVariable && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Secondary Text</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localSecondaryText}
              onChange={(e) => handleUpdate('secondaryText', e.target.value)}
              className="p-0.5 h-8 w-8 bg-transparent border border-border-default rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {opacityVariable && (
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Opacity</span>
            <span>{localOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={localOpacity}
            onChange={(e) => handleUpdate('opacity', parseInt(e.target.value))}
            className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      )}
    </div>
  );
};
