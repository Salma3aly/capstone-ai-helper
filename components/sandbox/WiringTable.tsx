import type { WiringItem } from "@/lib/sandbox/types";

interface Props {
  wiring: WiringItem[];
  hoveredConnection: { component: string; connectionIndex: number } | null;
  onHoverConnection: (hc: { component: string; connectionIndex: number } | null) => void;
}

function pinClass(conn: string): string {
  const lower = conn.toLowerCase();
  if (lower.includes("vcc") || lower.includes("5v") || lower.includes("3.3v") || lower.includes("vin")) return "text-[#ec4899] font-medium";
  if (lower.includes("gnd")) return "text-[#64748b] font-medium";
  if (lower.includes("sda") || lower.includes("scl") || lower.includes("tx") || lower.includes("rx") || lower.includes("mosi") || lower.includes("miso") || lower.includes("sck")) return "text-[#a855f7] font-medium";
  return "text-[#0f172a] font-medium";
}

export function WiringTable({ wiring, hoveredConnection, onHoverConnection }: Props) {
  if (!wiring || wiring.length === 0) {
    return <p className="text-xs text-[#64748b] italic">No wiring data available.</p>;
  }

  return (
    <div className="space-y-3">
      {wiring.map((item, idx) => (
        <div key={idx}>
          <h4 className="text-xs font-bold text-[#0f172a] mb-1">{item.component}</h4>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="text-left px-2 py-1 border border-[#e2e8f0] font-medium text-[#64748b]">Component Pin</th>
                <th className="text-left px-2 py-1 border border-[#e2e8f0] font-medium text-[#64748b]">Connect To</th>
              </tr>
            </thead>
            <tbody>
              {item.connections.map((conn, ci) => {
                const [pin, ...rest] = conn.split("→").map((s) => s.trim());
                const isHovered = hoveredConnection?.component === item.component && hoveredConnection?.connectionIndex === ci;
                return (
                  <tr
                    key={ci}
                    className={`transition-colors cursor-pointer ${
                      isHovered ? "bg-[#fdf2f8] text-[#db2777]" : "hover:bg-[#f8fafc]"
                    }`}
                    onMouseEnter={() => onHoverConnection({ component: item.component, connectionIndex: ci })}
                    onMouseLeave={() => onHoverConnection(null)}
                  >
                    <td className={`px-2 py-1 border border-[#e2e8f0] font-mono ${pinClass(pin)}`}>{pin}</td>
                    <td className="px-2 py-1 border border-[#e2e8f0] font-mono text-[#64748b]">{rest.join("→").trim() || conn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div className="flex gap-3 text-[9px] text-[#64748b]">
        <span className="text-[#ec4899]">● Power</span>
        <span className="text-[#64748b]">● Ground</span>
        <span className="text-[#a855f7]">● Data</span>
        <span className="text-[#0f172a]">● Signal</span>
      </div>
    </div>
  );
}
