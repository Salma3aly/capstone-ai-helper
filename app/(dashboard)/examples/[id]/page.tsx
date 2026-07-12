'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cpu, Wifi, Code, Table, AlertTriangle } from 'lucide-react';
import { EXAMPLES } from '@/lib/examples/data';
import { BreadboardSimulator } from '@/components/sandbox/BreadboardSimulator';

export default function ExampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = EXAMPLES.find((p) => p.id === id);
  const [hoveredConnection, setHoveredConnection] = useState<{ component: string; connectionIndex: number } | null>(null);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-bold text-lg text-[#0f172a]">Project not found</h2>
        <p className="text-sm text-[#64748b] mt-1">This project idea doesn&apos;t exist.</p>
        <Link href="/examples" className="inline-block mt-4 text-sm text-[#ec4899] hover:underline">&larr; Back to project ideas</Link>
      </div>
    );
  }

  const diffColor = project.difficulty === 'Beginner' ? 'text-green-700 bg-green-100'
    : project.difficulty === 'Intermediate' ? 'text-yellow-700 bg-yellow-100'
    : 'text-red-700 bg-red-100';

  // Normalize connection strings for the simulator (uses → not ->)
  const normalizedWiring = project.connections.map((c) => ({
    ...c,
    connections: c.connections.map((conn) => conn.replace(/ -> /g, " → ")),
  }));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Back + header */}
      <div>
        <Link href="/examples" className="text-xs text-[#64748b] hover:text-[#ec4899] transition flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to project ideas
        </Link>
        <div className="flex items-start gap-4">
          <span className="text-4xl mt-1">{project.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0f172a]">{project.title}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColor}`}>{project.difficulty}</span>
              <span className="text-[10px] bg-[#f1f5f9] text-[#64748b] px-2 py-0.5 rounded-full">{project.category}</span>
            </div>
            <p className="text-sm text-[#64748b] mt-1">{project.tagline}</p>
            <p className="text-sm text-[#475569] mt-3 max-w-2xl leading-relaxed">{project.description}</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-5 h-5 text-[#ec4899]" />
          <h2 className="font-bold text-sm text-[#0f172a]">Recommended Board</h2>
        </div>
        <p className="text-sm font-semibold text-[#0f172a]">{project.board}</p>
        <p className="text-xs text-[#64748b] mt-0.5">Estimated build time: {project.estimatedHours} hours</p>
      </div>

      {/* Sensors */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-[#ec4899]" />
          <h2 className="font-bold text-sm text-[#0f172a]">Components & Sensors</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {project.sensors.map((s, i) => (
            <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
              <p className="font-semibold text-xs text-[#0f172a]">{s.name}</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">{s.purpose}</p>
              <p className="text-[9px] text-[#94a3b8] mt-1 font-mono">Pins: {s.pins}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wiring Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Table className="w-5 h-5 text-[#ec4899]" />
          <h2 className="font-bold text-sm text-[#0f172a]">Wiring Connections</h2>
        </div>
        <div className="space-y-3">
          {project.connections.map((item, i) => (
            <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
              <p className="font-semibold text-xs text-[#0f172a] mb-1.5">{item.component}</p>
              <div className="space-y-1">
                {item.connections.map((conn, j) => {
                  const parts = conn.split(" -> ");
                  return (
                    <div key={j} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-[#ec4899]">{parts[0]}</span>
                      <span className="text-[#94a3b8]">&rarr;</span>
                      <span className="font-mono text-[#64748b]">{parts[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wiring Diagram (BreadboardSimulator) */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <BreadboardSimulator
          boardName={project.board}
          sensors={project.sensors.map((s) => s.name)}
          wiring={normalizedWiring}
          hoveredConnection={hoveredConnection}
          onHoverConnection={setHoveredConnection}
        />
      </div>

      {/* Code */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-[#ec4899]" />
          <h2 className="font-bold text-sm text-[#0f172a]">Arduino Code</h2>
        </div>
        <pre className="bg-[#0f172a] text-emerald-400 p-4 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono"><code>{project.code}</code></pre>
      </div>
    </div>
  );
}
