interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export function Logo({ size = 32, showText = true, textSize = "text-lg" }: LogoProps) {
  const gradientId = "logo-grad";
  const glowId = "logo-glow";
  const s = size;

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="32" cy="32" r="28" fill={`url(#${glowId})`} />

        {/* Faceted capstone diamond */}
        <path d="M32 4 L54 22 L32 58 L10 22 Z" fill={`url(#${gradientId})`} opacity="0.92" />

        {/* Left facet */}
        <path d="M32 4 L10 22 L32 36 Z" fill="white" opacity="0.08" />

        {/* Right facet */}
        <path d="M32 4 L54 22 L32 36 Z" fill="white" opacity="0.14" />

        {/* Top edge highlight */}
        <path d="M32 4 L54 22" stroke="white" strokeWidth="1.5" opacity="0.3" />
        <path d="M32 4 L10 22" stroke="white" strokeWidth="1.5" opacity="0.2" />

        {/* AI sparkle at apex */}
        <g transform="translate(32, 6)">
          <path d="M0 -6 L1.5 -2 L6 0 L1.5 2 L0 6 L-1.5 2 L-6 0 L-1.5 -2 Z" fill="white" opacity="0.9" />
        </g>

        {/* Circuit traces across the diamond */}
        <path d="M18 30 L22 26 L30 26 L34 22" stroke="white" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" fill="none" />
        <path d="M46 30 L42 26 L34 26 L30 22" stroke="white" strokeWidth="1.2" opacity="0.3" strokeLinecap="round" fill="none" />
        <path d="M22 34 L28 40 L40 40 L44 34" stroke="white" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" fill="none" />

        {/* Circuit nodes */}
        <circle cx="18" cy="30" r="2" fill="white" opacity="0.6" />
        <circle cx="46" cy="30" r="2" fill="white" opacity="0.5" />
        <circle cx="22" cy="34" r="1.5" fill="white" opacity="0.5" />
        <circle cx="44" cy="34" r="1.5" fill="white" opacity="0.5" />
        <circle cx="34" cy="22" r="1.5" fill="white" opacity="0.6" />

        {/* Graduation tassel from the bottom */}
        <path d="M32 58 Q32 62 36 62" stroke="white" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" fill="none" />
        <circle cx="36" cy="62" r="1.5" fill="#ec4899" opacity="0.7" />

        {/* Dot at center */}
        <circle cx="32" cy="36" r="2.5" fill="white" opacity="0.3" />
      </svg>

      {showText && (
        <span className={`font-bold ${textSize} bg-gradient-to-r from-[#ec4899] via-[#a855f7] to-[#3b82f6] bg-clip-text text-transparent`}>
          Capstone
        </span>
      )}
    </div>
  );
}
