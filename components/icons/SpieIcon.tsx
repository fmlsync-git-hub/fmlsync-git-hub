import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
}

export const SpieIcon: React.FC<IconProps> = ({ title, ...props }) => (
    <svg viewBox="0 0 380 150" xmlns="http://www.w3.org/2000/svg" {...props}>
        {title ? <title>{title}</title> : <title>SPIE Logo</title>}
        
        {/* Red Circle with white arcs */}
        <g>
            <circle cx="270" cy="40" r="30" fill="#d90023"/>
            <path d="M248,50 a30,30 0 0,1 44,0" stroke="white" strokeWidth="5" fill="none"/>
            <path d="M252,42 a30,30 0 0,1 36,0" stroke="white" strokeWidth="5" fill="none"/>
            <path d="M256,34 a30,30 0 0,1 28,0" stroke="white" strokeWidth="5" fill="none"/>
            <path d="M260,26 a30,30 0 0,1 20,0" stroke="white" strokeWidth="5" fill="none"/>
        </g>

        {/* Text */}
        <text y="120" fontFamily="'Arial Black', 'Impact', sans-serif" fontSize="85" fontWeight="900" fill="#003569">
            <tspan x="10">S</tspan>
            <tspan x="85">P</tspan>
            <tspan x="160">I</tspan>
            <tspan x="220" fontSize="90">Є</tspan>
        </text>
    </svg>
);