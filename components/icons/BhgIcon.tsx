import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
}

export const BghIcon: React.FC<IconProps> = ({ title, ...props }) => (
    <svg viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg" {...props}>
        {title ? <title>{title}</title> : <title>Bogerhaus Engineering Logo</title>}
        <style>{`
            .bogerhaus-main { font: bold 80px 'Arial Black', sans-serif; }
            .bogerhaus-sub { font: bold 20px Arial, sans-serif; letter-spacing: 0.5px; }
        `}</style>
        
        <text className="bogerhaus-main" y="90">
            <tspan x="20">B</tspan>
            <tspan x="170">gerhaus</tspan>
        </text>

        {/* Gear */}
        <g transform="translate(125, 65) scale(0.35)">
            <path fill="#fdb913" d="M100 0 L115.45 25 H84.55 L100 0 M100 200 L84.55 175 H115.45 L100 200 M25 84.55 L0 100 L25 115.45 V84.55 M175 84.55 V115.45 L200 100 L175 84.55 M50 50 L29.29 29.29 L50 8.58 L70.71 29.29 L50 50 M150 50 L129.29 29.29 L150 8.58 L170.71 29.29 L150 50 M50 150 L29.29 170.71 L50 191.42 L70.71 170.71 L50 150 M150 150 L129.29 170.71 L150 191.42 L170.71 170.71 L150 150" />
            <circle cx="100" cy="100" r="35" fill="black" />
            <circle cx="100" cy="100" r="20" fill="#fdb913" />
        </g>

        {/* Engineering Box */}
        <g transform="translate(255, 100)">
            <rect x="0" y="-22" width="225" height="28" fill="black" />
            <text className="bogerhaus-sub" fill="white" x="10" y="0">ENGINEERING LTD.</text>
        </g>
        
        {/* Line */}
        <line x1="10" y1="115" x2="490" y2="115" stroke="black" strokeWidth="3" />
    </svg>
);