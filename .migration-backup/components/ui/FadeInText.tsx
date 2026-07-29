'use client';

export function FadeInText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`animate-blur-in ${className}`}>
      {children}
    </span>
  );
}

export function FadeInLines({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
