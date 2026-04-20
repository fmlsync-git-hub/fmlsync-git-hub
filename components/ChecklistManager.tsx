
import React, { useEffect } from 'react';
import { Checklist, PassengerCategory } from '../types';
import { listenToChecklists, addChecklist, deleteChecklist } from '../services/firebase';
import { XMarkIcon, TrashIcon } from './icons/index';
import { ConfirmationModal } from './ConfirmationModal';

// Re-defining components here to avoid circular dependencies or overly complex file structures for this request.
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default p-4 ${className || ''}`}>
        {children}
    </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabledClasses}`}>{children}</button>;
};

const COMMON_DOCUMENTS = [
  'Passport',
  'Visa',
  'Work Permit',
  'Residential Permit',
  'Ghana Card',
  'Flight Ticket',
  'Hotel Reservation',
  'Invitation Letter',
  'Yellow Fever Card',
  'COVID-19 Vaccination Card'
];


interface ChecklistManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({ isOpen, onClose }) => {
  const [checklists, setChecklists] = React.useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Deletion state
  const [checklistToDelete, setChecklistToDelete] = React.useState<Checklist | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Form state
  const [activityName, setActivityName] = React.useState('');
  const [requiredDocs, setRequiredDocs] = React.useState<string[]>([]);
  const [currentDoc, setCurrentDoc] = React.useState('');
  const [category, setCategory] = React.useState<PassengerCategory | 'All'>('All');

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      const unsubscribe = listenToChecklists((data) => {
        setChecklists(data);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  const handleAddDoc = () => {
    const trimmedDoc = currentDoc.trim();
    if (trimmedDoc && !requiredDocs.find(d => d.toLowerCase() === trimmedDoc.toLowerCase())) {
      setRequiredDocs([...requiredDocs, trimmedDoc]);
      setCurrentDoc('');
    }
  };
  
  const handleAddSuggestedDoc = (docToAdd: string) => {
    if (!requiredDocs.find(d => d.toLowerCase() === docToAdd.toLowerCase())) {
        setRequiredDocs([...requiredDocs, docToAdd]);
    }
  };

  const handleRemoveDoc = (docToRemove: string) => {
    setRequiredDocs(requiredDocs.filter(doc => doc !== docToRemove));
  };
  
  const handleDocInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddDoc();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim() || requiredDocs.length === 0) {
      setError("Activity Name and at least one Required Document are necessary.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await addChecklist({ activityName: activityName.trim(), requiredDocuments: requiredDocs, category });
      setActivityName('');
      setRequiredDocs([]);
      setCurrentDoc('');
      setCategory('All');
    } catch (err) {
      setError("Failed to save the checklist. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!checklistToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
        await deleteChecklist(checklistToDelete.id);
        setChecklistToDelete(null);
    } catch (err) {
        setError("Failed to delete the checklist. Please try again.");
        console.error(err);
    } finally {
        setIsDeleting(false);
    }
  };
  
  const getCategoryBadgeStyles = (category?: PassengerCategory | 'All') => {
      switch(category) {
          case PassengerCategory.Expatriate:
              return 'bg-indigo-500/20 text-indigo-300';
          case PassengerCategory.Local:
              return 'bg-teal-500/20 text-teal-300';
          case PassengerCategory.WalkIn:
              return 'bg-orange-500/20 text-orange-300';
          default:
              return 'bg-surface text-text-secondary';
      }
  }

  const suggestedDocs = React.useMemo(() => {
    let baseDocs = [...COMMON_DOCUMENTS];
    if (category === PassengerCategory.Local) {
        baseDocs = ['Ghana Card', ...COMMON_DOCUMENTS.filter(d => d !== 'Ghana Card')];
    } else if (category === PassengerCategory.Expatriate) {
        baseDocs = ['Passport', 'Visa', 'Work Permit', 'Residential Permit', ...COMMON_DOCUMENTS.filter(d => !['Passport', 'Visa', 'Work Permit', 'Residential Permit', 'Ghana Card'].includes(d))];
    } else if (category === PassengerCategory.WalkIn) {
        baseDocs = ['Passport', ...COMMON_DOCUMENTS.filter(d => d !== 'Passport')];
    }
    return baseDocs.filter(
      doc => !requiredDocs.find(d => d.toLowerCase() === doc.toLowerCase())
    );
  }, [requiredDocs, category]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Activity Checklists">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Column 1: Existing Checklists */}
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border-default">Existing Checklists</h3>
          {isLoading ? <Spinner /> : error ? <p className="text-danger">{error}</p> : (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {checklists.length > 0 ? checklists.map(cl => (
                <div key={cl.id} className="bg-surface-soft p-4 rounded-lg border border-border-default">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-primary-dark break-words pr-2 flex-grow">{cl.activityName}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getCategoryBadgeStyles(cl.category)}`}>
                            {cl.category || 'All'}
                        </span>
                        <button
                            onClick={() => setChecklistToDelete(cl)}
                            className="text-text-secondary hover:text-danger"
                            title={`Delete checklist`}
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                  </div>
                  <ul className="list-disc list-inside text-sm text-text-secondary mt-2 pl-2">
                    {cl.requiredDocuments.map(doc => <li key={doc}>{doc}</li>)}
                  </ul>
                </div>
              )) : (
                <p className="text-text-secondary text-center py-10">No checklists have been created yet. Use the form to add one.</p>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Create New Checklist Form */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border-default">Create New Checklist</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="activityName" className="block text-sm font-medium text-text-secondary mb-1">Activity Name</label>
              <input
                id="activityName"
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="e.g., Domestic Travel, Expatriate Entry"
                className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Applies To</label>
              <div className="flex items-center gap-4 flex-wrap">
                  {(['All', PassengerCategory.Expatriate, PassengerCategory.Local, PassengerCategory.WalkIn] as const).map(cat => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                          <input
                              type="radio"
                              name="category"
                              value={cat}
                              checked={category === cat}
                              onChange={(e) => setCategory(e.target.value as PassengerCategory | 'All')}
                              className="h-4 w-4 text-primary bg-surface border-border-default focus:ring-primary"
                          />
                          {cat}
                      </label>
                  ))}
              </div>
            </div>

            <div>
              <label htmlFor="requiredDoc" className="block text-sm font-medium text-text-secondary mb-1">Required Documents</label>
              <div className="flex gap-2">
                <input
                  id="requiredDoc"
                  type="text"
                  value={currentDoc}
                  onChange={(e) => setCurrentDoc(e.target.value)}
                  onKeyDown={handleDocInputKey}
                  placeholder="Add custom document..."
                  className="flex-grow px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="button" onClick={handleAddDoc} variant="secondary" className="flex-shrink-0">Add</Button>
              </div>
              
              {suggestedDocs.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-text-secondary mb-2">Suggestions</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestedDocs.map(doc => (
                      <button
                        key={doc}
                        type="button"
                        onClick={() => handleAddSuggestedDoc(doc)}
                        className="px-2.5 py-1 text-sm bg-surface hover:bg-border-default text-text-primary rounded-full transition-colors"
                      >
                        + {doc}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {requiredDocs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border-default space-y-2">
                  <h4 className="text-sm font-semibold text-text-primary">Selected Documents:</h4>
                  {requiredDocs.map(doc => (
                    <div key={doc} className="flex justify-between items-center bg-surface-soft p-2 rounded-md text-sm">
                      <span className="text-text-primary">{doc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc)}
                        className="text-danger hover:text-red-700 font-bold"
                        title={`Remove ${doc}`}
                      >
                         <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-danger text-sm text-center">{error}</p>}
            
            <div className="pt-2">
                <Button type="submit" disabled={isSubmitting || requiredDocs.length === 0 || !activityName.trim()} className="w-full">
                {isSubmitting ? 'Saving...' : 'Save Checklist'}
                </Button>
            </div>
          </form>
        </div>
      </div>

       <ConfirmationModal
        isOpen={!!checklistToDelete}
        onClose={() => setChecklistToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        confirmText="Delete"
        isConfirming={isDeleting}
      >
        <p>
          Are you sure you want to delete the checklist <strong className="text-text-primary">"{checklistToDelete?.activityName}"</strong>?
        </p>
        <p className="mt-2 text-sm">This action is permanent and cannot be undone.</p>
      </ConfirmationModal>
    </Modal>
  );
};
