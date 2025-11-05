import React from "react";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="relative inline-block">
        {/* Skilled - purple cursive with glow */}
        <span 
          className="text-orange-600 dark:text-orange-400 italic text-2xl sm:text-3xl font-normal"
          style={{
            fontFamily: "var(--font-dancing-script), 'Dancing Script', 'Brush Script MT', cursive",
            textShadow: "0 0 10px rgba(71, 85, 105, 0.5), 0 0 20px rgba(71, 85, 105, 0.3)",
            filter: "drop-shadow(0 0 8px rgba(71, 85, 105, 0.4))"
          }}
        >
          Skilled
        </span>
        {/* U - bold dark gray */}
        <span 
          className="text-gray-800 dark:text-gray-200 font-bold text-2xl sm:text-3xl ml-1"
          style={{
            fontFamily: "var(--font-lora), 'Lora', serif",
            fontWeight: 700,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          U
        </span>
      </span>
    </div>
  );
}

