import React from 'react';
import { ShieldCheckIcon, ArrowTopRightOnSquareIcon } from '../../components/icons';

// Reusable components to avoid imports from outside root folder
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>{children}</div>
);

interface SecurityStepAction {
    text: string;
    url: string;
}

const SecurityStep: React.FC<{ title: string; description: React.ReactNode; actions: SecurityStepAction[]; status: 'critical' | 'recommended' | 'optional' }> = ({ title, description, actions, status }) => {
    const statusStyles = {
        critical: { border: 'border-danger', text: 'text-danger' },
        recommended: { border: 'border-warning', text: 'text-warning' },
        optional: { border: 'border-info', text: 'text-info' },
    };

    return (
        <div className={`p-4 bg-surface-soft rounded-lg border-l-4 ${statusStyles[status].border}`}>
            <h4 className={`font-bold text-text-primary flex items-center gap-2`}>
                <ShieldCheckIcon className={`h-5 w-5 ${statusStyles[status].text}`} />
                {title}
            </h4>
            <div className="mt-1 mb-3">
                {description}
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
                {actions.map((action, index) => (
                    <a key={index} href={action.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                        <span>{action.text}</span>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                ))}
            </div>
        </div>
    );
}


const SecurityScreen: React.FC = () => {
    const currentOrigin = window.location.origin;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">Backend Security Guide</h2>
                <p className="mt-1 text-text-secondary">A guide to securing your application and preventing unauthorized access.</p>
            </div>
            
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Why Frontend Security Isn't Enough</h3>
                    <p className="text-sm text-text-secondary">
                        A true "firewall" must live on the server, not in the application code that runs in the browser. Any security in the browser can be bypassed.
                        The steps below guide you through general security best practices to protect your data.
                    </p>
                </div>
            </Card>

            <div className="space-y-6">
                <SecurityStep
                    title="1. Configure Authorized Domains"
                    status="critical"
                    description={
                        <p className="text-sm text-text-secondary">This is your first line of defense. It creates a whitelist of domains that are allowed to interact with your backend. This prevents malicious websites from using your backend services.</p>
                    }
                    actions={[
                        { text: "Learn about CORS", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS" }
                    ]}
                />

                <SecurityStep
                    title="2. Enforce API Security"
                    status="critical"
                    description={
                        <>
                            <p className="text-sm text-text-secondary mb-3">
                                Ensure your API endpoints are protected with authentication and authorization checks.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2 pl-2">
                                <li>Use secure tokens (like JWT) for authentication.</li>
                                <li>Implement role-based access control (RBAC).</li>
                                <li>Validate all incoming data on the server.</li>
                            </ol>
                        </>
                    }
                    actions={[
                        { text: "OWASP API Security Top 10", url: "https://owasp.org/www-project-api-security/" }
                    ]}
                />

                <SecurityStep
                    title="3. Data Encryption"
                    status="recommended"
                    description={
                       <p className="text-sm text-text-secondary">Always use HTTPS to encrypt data in transit. For sensitive data, consider encryption at rest in your database.</p>
                    }
                    actions={[
                        { text: "About HTTPS", url: "https://en.wikipedia.org/wiki/HTTPS" }
                    ]}
                />
            </div>

             <Card>
                <div className="p-6">
                    <h3 className="font-semibold text-text-primary mb-2">Your Current Application Domain</h3>
                    <div className="bg-success/10 text-success p-3 rounded-md text-sm font-medium flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5"/>
                        <span className="font-mono">{currentOrigin}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Ensure this domain is whitelisted in your backend configuration.</p>
                </div>
            </Card>
        </div>
    );
};

export default SecurityScreen;