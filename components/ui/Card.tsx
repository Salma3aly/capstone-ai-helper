import Link from 'next/link';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'a' | typeof Link;
  href?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = true, as: Tag = 'div', href, onClick }: CardProps) {
  const base = 'bg-white border border-gray-200 rounded-2xl shadow-sm';
  const hoverStyles = hover ? 'hover:shadow-lg hover:border-transparent transition-all duration-200' : '';
  const cls = `${base} ${hoverStyles} ${className}`;

  if (Tag === 'a' && href) {
    return <a href={href} className={cls} onClick={onClick}>{children}</a>;
  }
  if (Tag === Link && href) {
    return <Link href={href} className={cls} onClick={onClick}>{children}</Link>;
  }
  return <div className={cls} onClick={onClick}>{children}</div>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`px-5 py-3 border-b border-gray-100 ${className}`}>{children}</div>;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

interface CardGradientBarProps {
  gradient?: string;
}

export function CardGradientBar({ gradient = 'from-[#ec4899] to-[#3b82f6]' }: CardGradientBarProps) {
  return <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-60`} />;
}
