"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const slides = [
  { id: "team", label: "Teamwork", src: "/hero-1.jpg", alt: "Students collaborating on a robotics project" },
  { id: "learning", label: "Learning", src: "/hero-2.jpg", alt: "Children learning electronics hands-on" },
  { id: "student", label: "Focused", src: "/hero-3.jpg", alt: "Student building electronic project" },
  { id: "build", label: "Building", src: "/hero-4.jpg", alt: "Arduino project on workbench" },
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-all duration-700"
          style={{
            opacity: i === idx ? 1 : 0,
            transform: `scale(${i === idx ? 1 : 1.05})`,
          }}
        >
          <Image
            src={s.src}
            alt={s.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={i === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className="absolute bottom-4 left-4 text-white text-xs font-medium bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
            {s.label}
          </span>
        </div>
      ))}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "bg-white w-4" : "bg-white/50 w-1.5"
            }`}
            aria-label={s.label}
          />
        ))}
      </div>
    </div>
  );
}
