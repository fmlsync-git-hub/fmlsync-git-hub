
import React from 'react';

export const LoadingSpinner: React.FC<{ fullScreen?: boolean, style?: 'pulse' | 'dots' | 'ring', color?: string }> = ({ fullScreen = false, style = 'pulse', color }) => {
  const containerClasses = fullScreen 
    ? "fixed inset-0 flex items-center justify-center bg-background z-50"
    : "flex items-center justify-center p-10";

  // If color is provided, we use inline styles. Otherwise fallback to Tailwind classes.
  const colorStyle = color ? { backgroundColor: color } : {};
  const borderStyle = color ? { borderTopColor: color, borderColor: 'rgba(0,0,0,0.1)' } : {};

  const renderSpinner = () => {
    switch (style) {
      case 'dots':
        return (
          <div className="flex items-center justify-center space-x-1.5">
            <div className={`h-3 w-3 rounded-full animate-bounce [animation-delay:-0.3s] ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
            <div className={`h-3 w-3 rounded-full animate-bounce [animation-delay:-0.15s] ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
            <div className={`h-3 w-3 rounded-full animate-bounce ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
          </div>
        );
      case 'ring':
        return (
          <div className={`h-8 w-8 rounded-full border-4 animate-spin ${!color ? 'border-surface-soft border-t-primary' : ''}`} style={borderStyle}></div>
        );
      case 'pulse':
      default:
        return (
          <div className="flex items-center justify-center space-x-2">
            <div className={`h-4 w-4 rounded-full animate-pulse [animation-delay:-0.3s] ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
            <div className={`h-4 w-4 rounded-full animate-pulse [animation-delay:-0.15s] ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
            <div className={`h-4 w-4 rounded-full animate-pulse ${!color ? 'bg-primary' : ''}`} style={colorStyle}></div>
          </div>
        );
    }
  };

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        {renderSpinner()}
        <p className="text-sm text-text-secondary" style={color ? { color: color, opacity: 0.8 } : {}}>Loading...</p>
      </div>
    </div>
  );
};
