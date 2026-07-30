interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  type?: 'button' | 'submit';
}

export function GradientButton({
  children, onClick, disabled, loading, loadingText, className = '', type = 'button',
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`bg-[#ec4899] text-white font-semibold rounded-lg hover:bg-[#db2777] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md ${className}`}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

interface OutlineButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function OutlineButton({ children, onClick, disabled, className = '' }: OutlineButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'gray' | 'amber';
  className?: string;
  onClick?: () => void;
}

const BADGE_COLORS = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function Badge({ children, color = 'gray', className = '', onClick }: BadgeProps) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag onClick={onClick} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium ${BADGE_COLORS[color]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

interface IconBadgeProps {
  icon: string;
  gradient?: string;
  size?: 'sm' | 'md';
}

export function IconBadge({ icon, gradient = 'from-[#ec4899] to-[#3b82f6]', size = 'md' }: IconBadgeProps) {
  const s = size === 'md' ? 'w-12 h-12 text-xl' : 'w-8 h-8 text-sm';
  return (
    <div className={`${s} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
      <span className="text-white">{icon}</span>
    </div>
  );
}
