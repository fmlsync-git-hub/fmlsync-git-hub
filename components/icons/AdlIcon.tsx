import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
}

export const DslIcon: React.FC<IconProps> = ({ title, ...props }) => (
    <svg viewBox="0 0 450 200" xmlns="http://www.w3.org/2000/svg" {...props}>
        {title ? <title>{title}</title> : <title>Dos Santos Limited Logo</title>}
        <style>{`
            .dos-santos-main { font: 400 36px 'Inter', sans-serif; letter-spacing: 5px; text-transform: uppercase; }
            .dos-santos-sub { font: 300 18px 'Inter', sans-serif; letter-spacing: 11px; text-transform: uppercase; }
        `}</style>
        
        {/* Wave Graphics */}
        <g transform="translate(25, 0)">
            <path d="M50 80 Q150 20 250 80 T450 80" stroke="#f39c12" strokeWidth="20" fill="none" strokeLinecap="round" />
            <path d="M40 100 Q150 40 250 100 T460 100" stroke="#3498db" strokeWidth="20" fill="none" strokeLinecap="round" />
            <path d="M30 120 Q150 60 250 120 T470 120" stroke="#34495e" strokeWidth="20" fill="none" strokeLinecap="round" />
        </g>

        {/* Text */}
        <text className="dos-santos-main" x="225" y="155" textAnchor="middle" fill="#34495e">
            DOS SΛNTOS
        </text>
        {/* We add a small offset to the 'LIMITED' text to account for the letter spacing pushing it left */}
        <text className="dos-santos-sub" x="231" y="185" textAnchor="middle" fill="#34495e">
            LIMITED
        </text>
    </svg>
);