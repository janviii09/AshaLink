"use client";
import React, { useState, useEffect } from 'react';

const images = [
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1505751172107-573220a96500?auto=format&fit=crop&q=80&w=2000",
];

export default function Slideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-8 py-12">
      <div className="relative h-[400px] w-full overflow-hidden rounded-[40px] shadow-2xl shadow-blue-100">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === current ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-transparent flex items-center px-16">
              <h2 className="text-white text-4xl font-bold max-w-md leading-tight">
                Empowering your health through <span className="text-blue-300">Data Science.</span>
              </h2>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}