import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const logoSizes = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20'
};

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const logoSrc = '/logo.png';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${logoSizes[size]} rounded-2xl overflow-hidden bg-brand-secondary/10 border border-brand-border`}>
        <img
          src={logoSrc}
          alt="DigiMarket RD Logo"
          className="h-full w-full object-contain"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';
            const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="logo-fallback hidden h-full w-full items-center justify-center bg-brand-card text-brand-cyan text-xs font-bold uppercase tracking-[0.2em]">
          DM
        </div>
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="text-lg font-black tracking-tight text-brand-cyan">DigiMarket <span className="text-brand-secondary">RD</span></div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-brand-muted">Diseño Web · Redes Sociales · Diseño Gráfico</div>
        </div>
      )}
    </div>
  );
};

export default Logo;
