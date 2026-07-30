import { useState, useEffect } from "react";

const slides = [
  { id: "team", label: "Teamwork", src: "/hero-1.jpg", alt: "Students collaborating on a robotics project" },
  { id: "learning", label: "Learning", src: "/hero-2.jpg", alt: "Children learning electronics hands-on" },
  { id: "student", label: "Focused", src: "/hero-3.jpg", alt: "Student building electronic project" },
  { id: "build", label: "Building", src: "/hero-4.jpg", alt: "Arduino project on workbench" },
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[idx];

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={s.src}
            alt={s.alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/800x600/ec4899/ffffff?text=${s.label}`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
            {s.label}
          </span>
        </div>
      ))}
      <div className="absolute bottom-4 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
