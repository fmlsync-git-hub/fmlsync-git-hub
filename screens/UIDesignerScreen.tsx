
import React, { useState } from 'react';
import { LayoutName, useLayout } from '../context/LayoutContext';
import { CheckCircleIcon, PowerIcon, SwatchIcon, XMarkIcon } from '../components/icons';
import { THEMES } from '../themes';
import { UserRole } from '../types';
import { applyLayoutToRoles } from '../services/firebase';

interface Sample {
  id: string;
  name: string;
  description: string;
  preview: React.FC<{ theme: typeof THEMES[string] }>;
  theme: keyof typeof THEMES;
  layout: LayoutName;
}

const PreviewWrapper: React.FC<{ theme: typeof THEMES[string], children: React.ReactNode, className?: string }> = ({ theme, children, className }) => {
  const style = {
    '--bg': `rgb(${theme.colors['--color-background']})`,
    '--surface': `rgb(${theme.colors['--color-surface']})`,
    '--surface-soft': `rgb(${theme.colors['--color-surface-soft']})`,
    '--primary': `rgb(${theme.colors['--color-primary']})`,
    '--on-primary': `rgb(${theme.colors['--color-on-primary']})`,
    '--text': `rgb(${theme.colors['--color-on-background']})`,
    '--text-secondary': `rgb(${theme.colors['--color-text-secondary']})`,
  } as React.CSSProperties;
  return <div className={`w-full h-full p-2 rounded-lg ${className || ''}`} style={style}>{children}</div>;
}

const DefaultPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)]">
        <div className="flex w-full h-full gap-1">
            <div className="w-1/4 bg-[var(--surface)] rounded-l-md p-1 space-y-1">
                <div className="h-3 w-3/4 rounded-full bg-[var(--surface-soft)]"></div>
                <div className="h-3 w-1/2 rounded-full bg-[var(--primary)]"></div>
            </div>
            <div className="flex-1 bg-[var(--bg)] rounded-r-md p-1 space-y-1">
                <div className="h-4 bg-[var(--surface)] rounded-sm"></div>
                <div className="h-full bg-[var(--surface)] rounded-sm"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const MobileBookingPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-[var(--bg)] flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-4 bg-[var(--primary)] rounded-t-sm"></div>
            <div className="flex-1 bg-white rounded-b-sm p-1 space-y-1">
                <div className="h-3 w-3/4 rounded-full bg-[var(--surface-soft)]"></div>
                <div className="h-3 w-1/2 rounded-full bg-[var(--surface-soft)]"></div>
            </div>
            <div className="h-6 bg-white rounded-sm mt-auto flex justify-around items-center border-t border-gray-200">
                <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const NeonDarkPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
     <PreviewWrapper theme={theme} className="bg-[var(--bg)]">
        <div className="flex w-full h-full gap-1">
            <div className="w-1/4 bg-[var(--surface)]/50 border border-[var(--primary)]/20 backdrop-blur-sm rounded-l-md p-1 space-y-1">
                <div className="h-3 w-3/4 rounded-full bg-[var(--surface-soft)]"></div>
                <div className="h-3 w-1/2 rounded-full bg-[var(--primary)]/50"></div>
            </div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-4 bg-[var(--surface)]/50 border border-[var(--primary)]/20 backdrop-blur-sm rounded-sm"></div>
                <div className="h-full bg-[var(--surface)]/50 border border-[var(--primary)]/20 backdrop-blur-sm rounded-sm"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const VibrantChatPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-[var(--primary)]/30 rounded-full filter blur-3xl"></div>
        </div>
        <div className="relative w-full h-full flex gap-1">
            <div className="w-1/4 bg-[var(--surface)]/80 backdrop-blur-sm rounded-lg border border-[var(--border-default)]"></div>
            <div className="flex-1 flex flex-col gap-1">
                <div className="h-4 bg-[var(--surface)]/80 backdrop-blur-sm rounded-md border border-[var(--border-default)]"></div>
                <div className="flex-1 bg-[var(--surface)]/80 backdrop-blur-sm rounded-lg border border-[var(--border-default)]"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const WellnessPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center">
        <div className="w-full h-5/6 bg-white flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-5 bg-white rounded-t-sm p-1 border-b border-[var(--border-default)]"><div className="h-2 w-1/3 bg-[var(--surface-soft)] rounded-full"></div></div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-6 w-full rounded-lg bg-[var(--surface-soft)] border border-[var(--border-default)]"></div>
                <div className="h-6 w-full rounded-lg bg-[var(--surface-soft)] border border-[var(--border-default)]"></div>
            </div>
            <div className="h-6 bg-white rounded-sm mt-auto flex justify-around items-center border-t border-[var(--border-default)]">
                 <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full"></div>
                 <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const GlassmorphismPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
     <PreviewWrapper theme={theme} className="bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[10%] left-[10%] w-1/2 h-1/2 bg-[var(--primary)]/15 rounded-full filter blur-3xl"></div>
        </div>
        <div className="w-full h-full flex flex-col p-1 justify-end">
            <div className="h-1/2 w-full bg-[var(--surface)]/60 backdrop-blur-lg rounded-t-xl border-t border-l border-r border-[var(--border-default)]/30 p-1 space-y-1">
                <div className="h-3 w-1/2 rounded-full bg-[var(--surface-soft)]/70"></div>
                <div className="h-3 w-1/3 rounded-full bg-[var(--surface-soft)]/70"></div>
            </div>
            <div className="h-6 w-3/4 mx-auto bg-[var(--surface)]/80 backdrop-blur-lg rounded-2xl border border-[var(--border-default)]/50 flex justify-around items-center">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)]"></div>
                <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const TravelAppPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-[var(--bg)] flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-4 bg-[#1B7548] rounded-t-sm"></div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-6 w-full rounded-2xl bg-white shadow-sm"></div>
                <div className="h-6 w-full rounded-2xl bg-white shadow-sm"></div>
            </div>
            <div className="h-6 bg-white mt-auto flex justify-around items-center border-t border-gray-200">
                <div className="w-2.5 h-2.5 bg-[#FFD233] rounded-full"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const FinanceAppPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-[var(--bg)] flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-8 bg-[var(--primary)] rounded-b-xl p-1 shadow-lg z-10">
                <div className="h-2 w-1/3 bg-white/80 rounded-full"></div>
            </div>
            <div className="flex-1 p-1 space-y-1 -mt-2">
                <div className="h-6 w-full rounded-xl bg-white shadow-md"></div>
            </div>
             <div className="h-6 bg-white mt-auto flex justify-around items-center border-t border-gray-200">
                <div className="w-1 h-1 bg-[var(--primary)] rounded-full"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const HealthAppPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-white flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-5 bg-white rounded-t-sm p-1 border-b border-[var(--border-default)]"><div className="h-2 w-1/3 bg-[var(--surface-soft)] rounded-full"></div></div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-8 w-full rounded-lg bg-[var(--primary)]/10 text-center py-1"><div className="h-2 w-1/2 mx-auto bg-[var(--primary)]/50 rounded-full"></div></div>
                <div className="h-6 w-full rounded-lg bg-[var(--surface-soft)]"></div>
            </div>
            <div className="h-6 bg-white mt-auto flex justify-around items-center border-t border-[var(--border-default)]">
                <div className="w-5 h-4 bg-[var(--primary)]/20 rounded"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const MindfulnessAppPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-[var(--bg)] flex flex-col p-1 rounded-md border-2 border-[var(--text-secondary)]/50 shadow-lg">
            <div className="h-6 p-1"><div className="h-3 w-1/3 bg-[var(--surface)] rounded-full"></div></div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-8 w-full rounded-3xl bg-white shadow-md"></div>
                <div className="h-8 w-full rounded-3xl bg-white shadow-md"></div>
            </div>
            <div className="h-6 bg-white mt-auto flex justify-around items-center border-t border-gray-100 shadow-[0_-2px_10px_-5px_rgba(0,0,0,0.05)]">
                 <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full"></div>
            </div>
        </div>
    </PreviewWrapper>
);

const ClassicDarkPreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)] flex items-center justify-center p-2">
        <div className="w-full h-5/6 bg-[var(--bg)] flex flex-col p-1 rounded-md border-2 border-[var(--border-default)] shadow-lg">
            <div className="h-5 bg-[var(--surface)] p-1 border-b border-[var(--border-default)]"></div>
            <div className="flex-1 p-1 space-y-1">
                <div className="h-6 w-full rounded-md bg-[var(--surface)] border border-[var(--border-default)]"></div>
            </div>
            <div className="h-6 bg-[var(--surface)] mt-auto flex justify-around items-center border-t border-[var(--border-default)]">
                 <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full shadow-[0_0_4px_theme(colors.cyan.400)]"></div>
            </div>
        </div>
    </PreviewWrapper>
);


const SAMPLES: Sample[] = [
  {
    id: 'royalIndigo',
    name: 'Default Desktop Layout',
    description: 'A professional, sidebar-based interface optimized for desktop and tablet use.',
    preview: DefaultPreview,
    theme: 'royalIndigo',
    layout: 'default',
  },
  {
    id: 'bookingBlue',
    name: 'Responsive Booking App',
    description: 'A responsive interface with bottom navigation on mobile and a sidebar on desktop, inspired by modern travel apps.',
    preview: MobileBookingPreview,
    theme: 'bookingBlue',
    layout: 'mobile_booking',
  },
  {
    id: 'neonPurple',
    name: 'Neon Dark Mode',
    description: 'A futuristic, dark-mode theme with vibrant purple accents, perfect for modern applications.',
    preview: NeonDarkPreview,
    theme: 'neonPurple',
    layout: 'neon',
  },
  {
    id: 'vibrantChat',
    name: 'Vibrant Chat UI',
    description: 'A stylish, high-contrast dark theme inspired by modern messaging apps, featuring vibrant color accents.',
    preview: VibrantChatPreview,
    theme: 'vibrantChat',
    layout: 'vibrantChat',
  },
  {
    id: 'wellness',
    name: 'Wellness App UI',
    description: 'A clean, light, and calming interface inspired by modern wellness and mindfulness applications.',
    preview: WellnessPreview,
    theme: 'wellness',
    layout: 'wellness',
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism UI',
    description: 'A sleek, futuristic dark theme featuring frosted-glass effects and vibrant orange accents.',
    preview: GlassmorphismPreview,
    theme: 'glassmorphism',
    layout: 'glassmorphism',
  },
  {
    id: 'travelApp',
    name: 'Travel App UI',
    description: 'A fresh and energetic interface with a green and yellow color palette, inspired by travel booking apps.',
    preview: TravelAppPreview,
    theme: 'travelApp',
    layout: 'travelApp',
  },
  {
    id: 'financeApp',
    name: 'Finance App UI',
    description: 'A sleek and modern interface with a deep purple theme, inspired by fintech and banking applications.',
    preview: FinanceAppPreview,
    theme: 'financeApp',
    layout: 'financeApp',
  },
  {
    id: 'healthApp',
    name: 'Health App UI',
    description: 'A clean, professional interface with a calming blue palette, inspired by modern medical and health apps.',
    preview: HealthAppPreview,
    theme: 'healthApp',
    layout: 'healthApp',
  },
  {
    id: 'mindfulnessApp',
    name: 'Mindfulness App UI',
    description: 'A bright, playful, and welcoming interface with a vibrant orange/yellow palette.',
    preview: MindfulnessAppPreview,
    theme: 'mindfulnessApp',
    layout: 'mindfulnessApp',
  },
  {
    id: 'classicDark',
    name: 'Classic Dark UI',
    description: 'A minimalist, high-contrast dark theme with a single bright cyan accent for a sleek, focused experience.',
    preview: ClassicDarkPreview,
    theme: 'classicDark',
    layout: 'classicDark',
  },
];

interface ApplyThemeModalProps {
    sample: Sample;
    onClose: () => void;
    onApply: (roles: UserRole[]) => void;
}

const ALL_ROLES: UserRole[] = ['developer', 'app_manager', 'admin', 'officer', 'client', 'designer'];

const ApplyThemeModal: React.FC<ApplyThemeModalProps> = ({ sample, onClose, onApply }) => {
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleRoleToggle = (role: UserRole) => {
        setSelectedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        setSelectedRoles(isChecked ? ALL_ROLES : []);
    };
    
    const isAllSelected = selectedRoles.length === ALL_ROLES.length;

    const handleConfirm = async () => {
        if (selectedRoles.length === 0) {
            setError('Please select at least one user role to apply the UI to.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            await applyLayoutToRoles(selectedRoles, {
                layout: sample.layout,
            });
            onApply(selectedRoles);
            onClose();
        } catch (err) {
            console.error("Failed to apply layout:", err);
            setError("An error occurred while applying the settings.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">Apply UI: {sample.name}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-text-secondary">Select which user roles should have this UI layout applied to their experience.</p>
                    {error && <p className="text-sm text-danger text-center bg-danger/10 p-2 rounded-md">{error}</p>}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-2 bg-surface-soft rounded-md cursor-pointer hover:bg-border-default/50 transition-colors">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded bg-surface border-border-default text-primary focus:ring-primary"
                                checked={isAllSelected}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                            <span className="font-semibold text-text-primary">All Users</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-border-default">
                             {ALL_ROLES.map(role => (
                                <label key={role} className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-surface-soft transition-colors">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded bg-surface border-border-default text-primary focus:ring-primary"
                                        checked={selectedRoles.includes(role)}
                                        onChange={() => handleRoleToggle(role)}
                                    />
                                    <span className="text-text-primary capitalize">{role.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                    <button onClick={handleConfirm} disabled={isSaving || selectedRoles.length === 0} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {isSaving ? 'Applying...' : `Apply to ${selectedRoles.length} Role(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};


interface UIDesignerScreenProps {
  onLogout: () => void;
}

const UIDesignerScreen: React.FC<UIDesignerScreenProps> = ({ onLogout }) => {
    const { layout: activeLayoutName } = useLayout();
    const [applyingSample, setApplyingSample] = useState<Sample | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleApply = (sample: Sample) => {
      setApplyingSample(sample);
    };
    
    return (
        <div className="bg-background text-text-primary min-h-screen relative p-6 sm:p-8 space-y-6">
             {successMessage && (
                <div className="fixed top-24 right-6 bg-success text-white p-3 rounded-lg shadow-lg animate-slideIn z-50 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5"/>
                    <span>{successMessage}</span>
                </div>
            )}
            <div>
                <h2 className="text-4xl font-bold tracking-tight">Web App Builder</h2>
                <p className="mt-2 text-lg text-text-secondary">Select a sample to instantly apply a new layout to the application.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {SAMPLES.map(sample => {
                    const isActive = activeLayoutName === sample.layout;
                    const PreviewComponent = sample.preview;
                    return (
                        <div key={sample.id} className={`bg-surface rounded-xl overflow-hidden flex flex-col border-2 transition-all duration-200 ${isActive ? 'border-primary' : 'border-border-default'}`}>
                           <div className="p-6">
                                <h3 className="font-bold text-xl flex items-center justify-between">
                                    <span>{sample.name}</span>
                                    {isActive && <CheckCircleIcon className="h-6 w-6 text-primary" />}
                                </h3>
                                <p className="text-sm text-text-secondary h-10 mt-1">{sample.description}</p>
                           </div>
                           <div className="px-6 pb-6 h-48">
                                <PreviewComponent theme={THEMES[sample.theme]} />
                           </div>
                           <div className="p-6 bg-surface-soft mt-auto">
                                <button 
                                    onClick={() => handleApply(sample)}
                                    className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    Apply UI...
                                </button>
                           </div>
                        </div>
                    );
                })}
            </div>

            {applyingSample && (
                <ApplyThemeModal
                    sample={applyingSample}
                    onClose={() => setApplyingSample(null)}
                    onApply={(roles) => {
                        setSuccessMessage(`Applied UI to ${roles.length} role(s).`);
                        setTimeout(() => setSuccessMessage(''), 4000);
                    }}
                />
            )}
        </div>
    );
};

export default UIDesignerScreen;
