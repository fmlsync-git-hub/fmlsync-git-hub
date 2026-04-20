import React from 'react';
import { ChevronDownIcon } from './icons';

// A simplified version of the Card component for internal use, avoiding circular dependencies.
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default transition-all duration-300 ${className || ''}`}>
        {children}
    </div>
);


interface CollapsibleCardProps {
  title: React.ReactNode;
  icon?: React.ElementType;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  headerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  icon: Icon,
  children,
  isExpanded,
  onToggle,
  headerClassName = "p-4 sm:p-6",
  contentClassName = "p-4 sm:p-6",
}) => {
  return (
    <Card className="p-0">
      <div
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        className={`w-full text-left flex justify-between items-center hover:bg-surface-soft/50 transition-colors cursor-pointer ${headerClassName}`}
        aria-expanded={isExpanded}
      >
        <div className="text-lg font-semibold text-on-surface flex items-center gap-3 flex-grow min-w-0">
          {Icon && <Icon className="h-6 w-6 text-text-secondary flex-shrink-0" />}
          <div className="flex-grow min-w-0">{title}</div>
        </div>
        <ChevronDownIcon className={`h-6 w-6 text-text-secondary transition-transform duration-300 flex-shrink-0 ml-4 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      {isExpanded && (
        <div className={`${contentClassName} border-t border-border-default`}>
          {children}
        </div>
      )}
    </Card>
  );
};