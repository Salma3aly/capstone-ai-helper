interface AiAvatarProps {
  size?: number;
  className?: string;
}

export function AiAvatar({ size = 40, className = "" }: AiAvatarProps) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Glow behind head */}
      <circle cx="32" cy="32" r="30" fill="#8f1bdc" opacity="0.08" />

      {/* Head */}
      <circle cx="32" cy="30" r="18" fill="#faf5ff" stroke="#8f1bdc" strokeWidth="2" />

      {/* Eyes */}
      <ellipse cx="25" cy="28" rx="3" ry="3.5" fill="#2b044d" />
      <ellipse cx="39" cy="28" rx="3" ry="3.5" fill="#2b044d" />

      {/* Eye shine */}
      <circle cx="26" cy="26.5" r="1" fill="white" />
      <circle cx="40" cy="26.5" r="1" fill="white" />

      {/* Smile */}
      <path d="M25 35 Q32 41 39 35" stroke="#8f1bdc" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Graduation cap */}
      <path d="M32 12 L18 18 L32 24 L46 18 Z" fill="#8f1bdc" />
      <rect x="29" y="24" width="6" height="4" rx="1" fill="#8f1bdc" />
      {/* Tassel */}
      <circle cx="46" cy="18" r="2" fill="#f9218d" />
      <path d="M46 18 Q50 22 48 26" stroke="#f9218d" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Ears / side nodes */}
      <circle cx="14" cy="30" r="3" fill="#faf5ff" stroke="#8f1bdc" strokeWidth="1.5" />
      <circle cx="50" cy="30" r="3" fill="#faf5ff" stroke="#8f1bdc" strokeWidth="1.5" />
      <circle cx="14" cy="30" r="1.5" fill="#8f1bdc" />
      <circle cx="50" cy="30" r="1.5" fill="#8f1bdc" />

      {/* Body / neck */}
      <rect x="26" y="44" width="12" height="6" rx="2" fill="#faf5ff" stroke="#8f1bdc" strokeWidth="1.5" />

      {/* Chest light */}
      <circle cx="32" cy="47" r="2" fill="#f9218d" opacity="0.8" />
    </svg>
  );
}
