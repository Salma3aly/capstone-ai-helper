import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`shimmer-btn px-8 py-3 rounded-lg text-sm font-bold text-white shadow-sm ${className}`}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';
