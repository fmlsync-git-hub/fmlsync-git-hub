
import React, { useEffect } from 'react';
import { XMarkIcon } from './icons/index';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};


interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  confirmVariant?: ButtonVariant;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
  confirmVariant = 'danger',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-border-default p-4 flex-none">
          <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 text-text-secondary flex-1 overflow-y-auto">
          {children}
        </div>
        <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default rounded-b-lg flex-none">
          <Button onClick={onClose} variant="secondary">{cancelText}</Button>
          <Button onClick={onConfirm} variant={confirmVariant} disabled={isConfirming}>
            {isConfirming ? 'Confirming...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
