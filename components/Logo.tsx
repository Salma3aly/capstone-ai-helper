interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export function Logo({ size = 32, showText = true, textSize = "text-lg" }: LogoProps) {
  const gradientId = "logo-grad";
  const s = size;

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Capstone pyramid */}
        <path d="M32 6 L54 50 L10 50 Z" fill={`url(#${gradientId})`} opacity="0.9" />

        {/* Circuit trace on the pyramid */}
        <path d="M32 18 L32 36" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <circle cx="32" cy="18" r="3" fill="#fff" opacity="0.7" />
        <circle cx="32" cy="36" r="2" fill="#fff" opacity="0.5" />
        <path d="M24 42 L32 36 L40 42" stroke="#fff" strokeWidth="1.5" opacity="0.4" fill="none" />

        {/* Base circuit nodes */}
        <circle cx="18" cy="46" r="2.5" fill="#ec4899" />
        <circle cx="46" cy="46" r="2.5" fill="#3b82f6" />
        <path d="M18 46 L32 40 L46 46" stroke="#94a3b8" strokeWidth="1.5" fill="none" />

        {/* Subtle glow */}
        <circle cx="32" cy="50" r="20" fill={`url(#${gradientId})`} opacity="0.08" />
      </svg>

      {showText && (
        <span className={`font-bold ${textSize} bg-gradient-to-r from-[#ec4899] to-[#3b82f6] bg-clip-text text-transparent`}>
          Capstone
        </span>
      )}
    </div>
  );
}
