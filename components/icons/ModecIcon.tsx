import React from 'react';

export const ModecIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>MODEC Logo</title>
    <style>{`.modec-text { font-family: 'Arial', sans-serif; font-weight: bold; letter-spacing: 2px; }`}</style>
    <path d="M40,30 Q60,0 80,30 T120,30" fill="#E30613" stroke="none" />
    <text x="50%" y="70%" dy=".3em" textAnchor="middle" fontSize="36" fill="#003DA5" className="modec-text">
      MODEC
    </text>
  </svg>
);