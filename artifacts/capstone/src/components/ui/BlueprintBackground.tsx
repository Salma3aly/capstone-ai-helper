export function BlueprintBackground({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Grid + circuit layer — always behind content */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 blueprint-grid" />

        {/* Circuit traces */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
          {/* Horizontal traces */}
          <path className="circuit-path" d="M 0 120 L 200 120 L 250 180 L 400 180" fill="none" stroke="#a855f7" strokeWidth="1" />
          <path className="circuit-path" d="M 600 80 L 750 80 L 800 140 L 1000 140" fill="none" stroke="#ec4899" strokeWidth="0.8" />
          <path className="circuit-path" d="M 300 500 L 500 500 L 550 550 L 700 550" fill="none" stroke="#8b5cf6" strokeWidth="0.8" />
          <path className="circuit-path" d="M 200 650 L 400 650 L 450 700 L 600 700" fill="none" stroke="#a855f7" strokeWidth="0.7" />
          <path className="circuit-path" d="M 800 400 L 950 400 L 1000 450 L 1150 450" fill="none" stroke="#3b82f6" strokeWidth="0.8" />
          <path className="circuit-path" d="M 100 350 L 250 350 L 300 400 L 450 400" fill="none" stroke="#ec4899" strokeWidth="0.7" />
          {/* Vertical traces */}
          <path className="circuit-path" d="M 150 250 L 150 400 L 200 450 L 200 550" fill="none" stroke="#8b5cf6" strokeWidth="0.8" />
          <path className="circuit-path" d="M 700 200 L 700 350 L 750 400 L 750 500" fill="none" stroke="#a855f7" strokeWidth="0.7" />
          <path className="circuit-path" d="M 1000 300 L 1000 450 L 1050 500 L 1050 650" fill="none" stroke="#3b82f6" strokeWidth="0.8" />
          {/* Diagonal connection */}
          <path className="circuit-path" d="M 450 400 L 500 450 L 600 450 L 650 500" fill="none" stroke="#ec4899" strokeWidth="0.6" />

          {/* Glowing dots at trace corners */}
          <circle className="circuit-dot" cx="200" cy="120" r="2" fill="#a855f7" />
          <circle className="circuit-dot" cx="250" cy="180" r="1.5" fill="#a855f7" />
          <circle className="circuit-dot" cx="750" cy="80" r="2" fill="#ec4899" />
          <circle className="circuit-dot" cx="800" cy="140" r="1.5" fill="#ec4899" />
          <circle className="circuit-dot" cx="500" cy="500" r="2" fill="#8b5cf6" />
          <circle className="circuit-dot" cx="550" cy="550" r="1.5" fill="#8b5cf6" />
          <circle className="circuit-dot" cx="400" cy="650" r="1.5" fill="#a855f7" />
          <circle className="circuit-dot" cx="950" cy="400" r="2" fill="#3b82f6" />
          <circle className="circuit-dot" cx="1000" cy="450" r="1.5" fill="#3b82f6" />
          <circle className="circuit-dot" cx="250" cy="350" r="1.5" fill="#ec4899" />
          <circle className="circuit-dot" cx="150" cy="400" r="1.5" fill="#8b5cf6" />
          <circle className="circuit-dot" cx="700" cy="350" r="1.5" fill="#a855f7" />
          <circle className="circuit-dot" cx="1000" cy="450" r="1.5" fill="#3b82f6" />
        </svg>
      </div>

      {children}
    </div>
  );
}
