"use client";

import { useState } from "react";

export function AboutPhoto() {
  const [error, setError] = useState(false);

  return (
    <div className="relative h-56 w-56 rounded-full border-4 border-[#2EBD6B] bg-[#0c0c1c] flex items-center justify-center overflow-hidden">
      {!error ? (
        <img
          src="/alton.jpg"
          alt="Alton Guyton"
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="text-5xl font-bold text-[#2EBD6B]">AG</span>
      )}
    </div>
  );
}
