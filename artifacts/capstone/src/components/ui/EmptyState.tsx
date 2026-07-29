'use client';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-enter bg-white border border-[#e2e8f0] rounded-lg p-6 text-center">
      <div className="animate-float inline-flex mb-3 text-[#ec4899]">{icon}</div>
      <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
      <p className="text-xs text-[#64748b] mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
