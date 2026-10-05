/** Logotipo del Visor PET: barras ascendentes con tendencia y escudo de verificación. */
export function LogoVisor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="4" y="20" width="6" height="16" rx="1" fill="var(--navy)" />
      <rect x="13" y="14" width="6" height="22" rx="1" fill="var(--navy-2)" />
      <rect x="22" y="22" width="5" height="14" rx="1" fill="var(--serie-2)" />
      <path
        d="M4 15 L13 8 L20 12 L33 3"
        fill="none"
        stroke="var(--verde-solido)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 3 H34 V9"
        fill="none"
        stroke="var(--verde-solido)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M31 18 L38 21 V27 C38 32 35 35 31 37 C27 35 24 32 24 27 V21 Z" fill="var(--navy)" />
      <path
        d="M27.5 27 L30.2 29.6 L34.6 25"
        fill="none"
        stroke="var(--banner-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
