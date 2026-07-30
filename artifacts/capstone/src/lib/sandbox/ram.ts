import type { Component } from "./types";

export interface RamProduct {
  name: string;
  category: string;
  price: string;
  url: string;
}

let cache: RamProduct[] | null = null;

export async function loadRamComponents(): Promise<RamProduct[]> {
  if (cache) return cache;
  const res = await fetch('/api/ram-components');
  const data = await res.json();
  cache = data;
  return data;
}

export async function searchRamComponents(q: string, cat?: string): Promise<RamProduct[]> {
  const all = await loadRamComponents();
  let filtered = all;
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(lower));
  }
  if (cat) {
    filtered = filtered.filter((p) => p.category === cat);
  }
  return filtered;
}

export async function getRamCategories(): Promise<string[]> {
  const all = await loadRamComponents();
  return [...new Set(all.map((p) => p.category))].sort() as Component["category"][];
}

export function ramProductToComponent(p: RamProduct): Component {
  return {
    id: `ram-${simpleSlug(p.name)}`,
    name: p.name,
    desc: `منتجات رام - الكترونية - ${p.category}`,
    category: mapCategory(p.category),
    icon: defaultIcon(p.category),
    lang: "cpp",
    interface: guessInterface(p.category),
    pinsRequired: guessPins(p.category),
    voltage: guessVoltage(p.category),
    currentDrawMa: guessCurrent(p.category),
  };
}

function guessInterface(cat: string): Component["interface"] {
  const c = cat.toLowerCase();
  if (c.includes("i2c") || c.includes("lcd")) return "i2c";
  if (c.includes("spi") || c.includes("tft")) return "spi";
  if (c.includes("pwm") || c.includes("servo")) return "pwm";
  if (c.includes("uart") || c.includes("serial") || c.includes("gps")) return "uart";
  if (c.includes("analog") || c.includes("potentiometer") || c.includes("gas") || c.includes("mq-")) return "analog";
  return "digital";
}

function guessPins(cat: string): number {
  const c = cat.toLowerCase();
  if (c.includes("display") || c.includes("lcd") || c.includes("oled")) return 4;
  if (c.includes("motor") || c.includes("stepper")) return 4;
  if (c.includes("i2c") || c.includes("tft")) return 2;
  if (c.includes("servo")) return 1;
  if (c.includes("switch") || c.includes("button")) return 1;
  if (c.includes("camera")) return 6;
  return 2;
}

function guessVoltage(cat: string): Component["voltage"] {
  const c = cat.toLowerCase();
  if (c.includes("5v") || c.includes("relay") || c.includes("motor") || c.includes("servo")) return 5;
  if (c.includes("3.3") || c.includes("3v3") || c.includes("esp")) return 3.3;
  return "3.3-5";
}

function guessCurrent(cat: string): number {
  const c = cat.toLowerCase();
  if (c.includes("motor") || c.includes("stepper")) return 250;
  if (c.includes("servo")) return 150;
  if (c.includes("display") || c.includes("lcd") || c.includes("oled") || c.includes("tft")) return 60;
  if (c.includes("sensor")) return 15;
  if (c.includes("led")) return 20;
  if (c.includes("relay")) return 70;
  if (c.includes("camera")) return 100;
  return 30;
}

function simpleSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function mapCategory(ramCat: string): Component["category"] {
  const c = ramCat.toLowerCase();
  if (c.includes("arduino") || c.includes("esp") || c.includes("raspberry") || c.includes("stm") || c.includes("fpga") || c.includes("arm") || c.includes("texas")) return "Board";
  if (c.includes("sensor") || c.includes("environment") || c.includes("weather")) return "Environmental";
  if (c.includes("motor") || c.includes("servo") || c.includes("stepper") || c.includes("driver")) return "Output & Display";
  if (c.includes("display") || c.includes("lcd") || c.includes("oled") || c.includes("led") || c.includes("segment") || c.includes("tft")) return "Output & Display";
  if (c.includes("switch") || c.includes("keypad") || c.includes("button") || c.includes("rfid") || c.includes("joystick") || c.includes("audio") || c.includes("camera")) return "Input & User";
  if (c.includes("bluetooth") || c.includes("wifi") || c.includes("lora") || c.includes("gsm") || c.includes("gps") || c.includes("iot") || c.includes("rf")) return "Connectivity";
  if (c.includes("battery") || c.includes("power") || c.includes("relay") || c.includes("solar") || c.includes("charger") || c.includes("converter") || c.includes("inverter") || c.includes("smps") || c.includes("dc")) return "Power & Control";
  return "Environmental";
}

function defaultIcon(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("arduino") || c.includes("board") || c.includes("esp") || c.includes("raspberry") || c.includes("stm")) return "Cpu";
  if (c.includes("sensor")) return "Activity";
  if (c.includes("motor") || c.includes("driver")) return "Zap";
  if (c.includes("display") || c.includes("lcd") || c.includes("oled") || c.includes("led")) return "Monitor";
  if (c.includes("battery") || c.includes("power") || c.includes("charger")) return "BatteryCharging";
  if (c.includes("switch") || c.includes("keypad") || c.includes("button")) return "Circle";
  if (c.includes("relay")) return "ToggleLeft";
  if (c.includes("wifi") || c.includes("bluetooth") || c.includes("rf")) return "Wifi";
  if (c.includes("camera") || c.includes("audio")) return "Mic";
  return "Package";
}
