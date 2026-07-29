'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Cpu, Rocket, ArrowRight, ArrowLeft, X, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'capstone-onboarded';

const STEPS = [
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: 'Explore Project Ideas',
    description: 'Browse 15+ ready-made project ideas with recommended components, difficulty levels, and estimated build time.',
    action: 'View Project Ideas',
    href: '/examples',
    color: 'from-[#ec4899] to-[#3b82f6]',
  },
  {
    icon: <Cpu className="w-12 h-12" />,
    title: 'Build in the Sandbox',
    description: 'Use the AI-powered Sandbox wizard to get component recommendations, wiring diagrams, and Arduino code for your project.',
    action: 'Open Sandbox',
    href: '/sandbox',
    color: 'from-[#a855f7] to-[#ec4899]',
  },
  {
    icon: <Rocket className="w-12 h-12" />,
    title: 'Research & Cite Everything',
    description: 'Use the Research Assistant to summarize academic papers and the Citation Builder to generate APA/IEEE/MLA references for your portfolio.',
    action: 'Start Building',
    href: '/dashboard',
    color: 'from-blue-500 to-indigo-500',
  },
];

export default function OnboardingWalkthrough() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onboarded = localStorage.getItem(STORAGE_KEY);
    if (!onboarded) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Close */}
        <div className="flex justify-end p-3">
          <button onClick={dismiss} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-2 text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white`}>
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{current.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 my-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === step ? 'bg-[#ec4899] w-6' : 'bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 pb-6">
          <div>
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button onClick={dismiss} className="text-sm text-gray-400 hover:text-gray-600 transition">
                Skip tour
              </button>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 bg-[#ec4899] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] transition shadow-sm"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link href={current.href} onClick={dismiss}
              className="flex items-center gap-2 bg-[#ec4899] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] transition shadow-sm"
            >
              <CheckCircle className="w-4 h-4" /> {current.action}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
