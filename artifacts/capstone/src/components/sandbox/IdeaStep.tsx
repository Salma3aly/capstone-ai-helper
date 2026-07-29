"use client";
import { Lightbulb, ArrowRight, Loader2, Sprout, Thermometer, Shield, Droplets, Lightbulb as LightbulbIcon, Lock, Wifi, Heart, BookOpen, Award, Swords } from "lucide-react";
import type { ProjectTrack } from "@/lib/sandbox/types";

interface Props {
  idea: string;
  track: ProjectTrack;
  hypothesis: string;
  loading: boolean;
  onChange: (val: string) => void;
  onTrackChange: (val: ProjectTrack) => void;
  onHypothesisChange: (val: string) => void;
  onSubmit: () => void;
}

const TRACK_OPTIONS: { value: ProjectTrack; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: "exploring", label: "Exploring", desc: "Just getting started — no rubric, just build", icon: BookOpen },
  { value: "classroom", label: "Classroom", desc: "Standard rubric, 6-8 week project", icon: BookOpen },
  { value: "school-fair", label: "School Fair", desc: "Presentation-ready with poster & data logs", icon: Award },
  { value: "competition", label: "Competition", desc: "Full ISEF-style rubric, data logging, advanced validation", icon: Swords },
];

const GALLERY = [
  {
    icon: Sprout,
    title: "Smart Garden",
    desc: "Auto-water plants when soil is dry",
    idea: "An automatic plant watering system that checks soil moisture with a sensor and activates a water pump when the soil is too dry, displaying status on an LCD screen.",
  },
  {
    icon: Thermometer,
    title: "Weather Station",
    desc: "Measure temp, humidity & pressure",
    idea: "A weather station that measures temperature, humidity, and atmospheric pressure using DHT11 and BMP180 sensors, displaying data on an LCD screen and sending logs via Wi-Fi.",
  },
  {
    icon: Droplets,
    title: "Smart Water Meter",
    desc: "Track water usage & detect leaks",
    idea: "A water flow monitoring system that tracks household water consumption using a flow sensor, displays real-time usage on an OLED screen, and alerts when abnormal flow (leak) is detected.",
  },
  {
    icon: Shield,
    title: "Home Security",
    desc: "Motion alerts & door monitoring",
    idea: "A home security system using a PIR motion sensor and magnetic door sensor that triggers a buzzer alarm and sends a notification when unauthorized entry is detected.",
  },
  {
    icon: LightbulbIcon,
    title: "Smart Lighting",
    desc: "Auto lights that save energy",
    idea: "A smart lighting system that uses an LDR to detect ambient light and a PIR sensor to detect presence, automatically turning lights on/off to save energy when no one is in the room.",
  },
  {
    icon: Heart,
    title: "Health Monitor",
    desc: "Track heart rate & temperature",
    idea: "A wearable health monitoring device using MAX30102 pulse oximeter and DS18B20 temperature sensor that measures heart rate and body temperature, displaying results on an OLED screen.",
  },
  {
    icon: Lock,
    title: "RFID Door Lock",
    desc: "Card-based access control",
    idea: "An RFID-based door lock system using an RC522 reader that grants access only to authorized cards, logs entries with timestamps, and includes a manual override keypad.",
  },
  {
    icon: Wifi,
    title: "IoT Dashboard",
    desc: "Control devices from your phone",
    idea: "An IoT control system using ESP32 that connects sensors and relays to a web dashboard, allowing you to monitor temperature, control lights, and view sensor data remotely from any phone.",
  },
];

export function IdeaStep({ idea, track, hypothesis, loading, onChange, onTrackChange, onHypothesisChange, onSubmit }: Props) {
  return (
    <div className="space-y-5">
      {/* Track selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Project Track</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TRACK_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = track === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTrackChange(opt.value)}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-all duration-200 ${
                  selected
                    ? "border-[#ec4899] bg-[#fdf2f8] shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  selected ? "bg-[#fce7f3] text-[#ec4899]" : "bg-gray-100 text-gray-500"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className={`text-xs font-semibold ${selected ? "text-[#db2777]" : "text-gray-700"}`}>{opt.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="idea" className="block text-sm font-semibold text-gray-700 mb-1.5">
          Describe your project idea
        </label>

        <textarea
          id="idea"
          value={idea}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. I want to build a weather station that measures temperature, humidity, and displays data on an LCD screen..."
          rows={3}
          maxLength={500}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent resize-none text-black placeholder-gray-400"
        />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">{idea.length}/500</p>
          <button
            onClick={onSubmit}
            disabled={loading || idea.trim().length === 0}
            className="flex items-center gap-2 bg-[#ec4899] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                Analyse idea
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hypothesis (shown for competition track) */}
      {track === "competition" && (
        <div>
          <label htmlFor="hypothesis" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Research Hypothesis <span className="text-xs font-normal text-gray-400">(required for ISEF rubric)</span>
          </label>
          <textarea
            id="hypothesis"
            value={hypothesis}
            onChange={(e) => onHypothesisChange(e.target.value)}
            placeholder="e.g. If soil moisture drops below 30%, then the pump will activate and restore moisture to 60% within 10 seconds..."
            rows={2}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent resize-none text-black placeholder-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">{hypothesis.length}/500</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Need inspiration? Try one of these</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {GALLERY.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(item.idea)}
                className="group flex flex-col items-start gap-1.5 bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-[#fbcfe8] hover:shadow-sm transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 text-[#ec4899]" />
                </div>
                <p className="font-semibold text-gray-800 text-xs group-hover:text-[#ec4899] transition-colors">{item.title}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
