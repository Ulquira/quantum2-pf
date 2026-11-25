// Etiqueta: Logotipo corporativo indivisible PeruFibra (Isotipo 5 fibras + Logotipo horizontal)
import React from 'react';

interface Props {
  variant?: 'on-white' | 'on-red';
  className?: string;
}

export const PeruFibraLogo: React.FC<Props> = ({
  variant = 'on-white',
  className = 'h-8',
}) => {
  const colorPrimario = variant === 'on-red' ? '#FFFFFF' : '#D80319';
  const colorAcento = '#F4BA00';

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}
      aria-label="PerúFibra"
    >
      {/* Isotipo oficial: conector optico de 5 fibras */}
      <svg
        viewBox="0 0 44 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto shrink-0"
      >
        {/* Base del conector */}
        <path
          d="M12 45V33C12 31.3431 13.3431 30 15 30H29C30.6569 30 32 31.3431 32 33V45"
          stroke={colorPrimario}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* 5 fibras opticas */}
        <path d="M22 30V8" stroke={colorPrimario} strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M19 30C18.5 23 15.5 17.5 11.5 13.5"
          stroke={colorPrimario}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M25 30C25.5 23 28.5 17.5 32.5 13.5"
          stroke={colorPrimario}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M16.5 30C15.5 25.5 12 22 7.5 20"
          stroke={colorPrimario}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M27.5 30C28.5 25.5 32 22 36.5 20"
          stroke={colorPrimario}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* Nodos opticos superiores */}
        <circle cx="22" cy="5.5" r="2.6" stroke={colorPrimario} strokeWidth="2.3" />
        <circle cx="9.8" cy="11.5" r="2.5" stroke={colorPrimario} strokeWidth="2.3" />
        <circle cx="34.2" cy="11.5" r="2.5" stroke={colorPrimario} strokeWidth="2.3" />
        <circle cx="5.5" cy="19" r="2.5" stroke={colorPrimario} strokeWidth="2.3" />
        <circle cx="38.5" cy="19" r="2.5" stroke={colorPrimario} strokeWidth="2.3" />
      </svg>

      {/* Construccion tipografica Helvetica Bold indivisible */}
      <span
        className="font-bold tracking-tight leading-none text-[1.35rem]"
        style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <span style={{ color: colorPrimario }}>Perú</span>
        <span style={{ color: colorAcento }}>Fibra</span>
      </span>
    </div>
  );
};