"use client";
import { Cpu, Wifi, Monitor, Thermometer, Gauge, Droplets, Flame, Wind, Droplet, CloudRain, Sun, Ruler, Footprints, AlertTriangle, Radar, RefreshCw, Move3d, Compass, Lightbulb, Palette, Grid3x3, Volume2, Rotate3d, RotateCw, Zap, ToggleLeft, Circle, Gamepad2, Hand, CreditCard, Radio, Mic, Bluetooth, Smartphone, MapPin, Clock, Save, Database, BatteryCharging, ArrowDownCircle, Activity, ArrowUpCircle, Lock, Package, type LucideIcon } from "lucide-react";
import type { Component } from "@/lib/sandbox/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Cpu, Wifi, Monitor, Thermometer, Gauge, Droplets, Flame, Wind, Droplet, CloudRain, Sun,
  Ruler, Footprints, AlertTriangle, Radar, RefreshCw, Move3d, Compass,
  Lightbulb, Palette, Grid3x3, Volume2, Rotate3d, RotateCw, Zap, ToggleLeft,
  Circle, Gamepad2, Hand, CreditCard, Radio, Mic, Bluetooth, Smartphone, MapPin,
  Clock, Save, Database, BatteryCharging, ArrowDownCircle, Activity, ArrowUpCircle, Lock, Package,
};

interface Props {
  component: Component;
  selected: boolean;
  recommended?: boolean;
  onToggle: (id: string) => void;
}

export function ComponentCard({ component, selected, recommended, onToggle }: Props) {
  const Icon = ICON_MAP[component.icon] || Cpu;

  return (
    <button
      type="button"
      onClick={() => onToggle(component.id)}
      className={`relative flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all text-center ${
        selected
          ? "bg-[#ec4899] text-white border-[#ec4899] shadow-sm"
          : "bg-white text-[#0f172a] border-[#e2e8f0] hover:border-[#fbcfe8] hover:shadow-sm"
      }`}
    >
      {recommended && !selected && (
        <span className="absolute -top-1.5 -right-1.5 bg-[#ec4899] text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-sm">
          ★
        </span>
      )}
      <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#64748b]"}`} />
      <span className="text-[10px] leading-tight">{component.name}</span>
    </button>
  );
}
