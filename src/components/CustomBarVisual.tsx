/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CustomBarVisualProps {
  base: "Dark 75%" | "Milk Velvet" | "White Silk";
  inclusions: string[];
  wrapperMessage: string;
  customName: string;
}

// Pseudo-random static offsets so elements don't shift on every re-render
const PARTICLE_OFFSETS = [
  { top: "15%", left: "20%", rotate: "12deg" },
  { top: "25%", left: "75%", rotate: "-35deg" },
  { top: "45%", left: "30%", rotate: "45deg" },
  { top: "55%", left: "65%", rotate: "15deg" },
  { top: "75%", left: "15%", rotate: "-18deg" },
  { top: "82%", left: "80%", rotate: "70deg" },
  { top: "35%", left: "45%", rotate: "-10deg" },
  { top: "65%", left: "40%", rotate: "28deg" },
  { top: "10%", left: "60%", rotate: "50deg" },
  { top: "88%", left: "48%", rotate: "-45deg" },
  { top: "28%", left: "10%", rotate: "85deg" },
  { top: "72%", left: "85%", rotate: "-60deg" }
];

export default function CustomBarVisual({
  base,
  inclusions,
  wrapperMessage,
  customName
}: CustomBarVisualProps) {
  // Determine bar colors and specs
  let barBg = "bg-[#230801]"; // Dark 75%
  let barInnerGlow = "shadow-[inset_0_4px_30px_rgba(255,255,255,0.06)]";
  let barTypeLabel = "Dark Chocolate Base";

  if (base === "Milk Velvet") {
    barBg = "bg-[#5c3a21]";
    barTypeLabel = "Milk Chocolate Base";
  } else if (base === "White Silk") {
    barBg = "bg-[#fbf4eb]";
    barInnerGlow = "shadow-[inset_0_4px_30px_rgba(0,0,0,0.03)]";
    barTypeLabel = "White Chocolate Base";
  }

  // Get matching styles for each inclusion type
  const renderInclusionParticles = (inc: string, index: number) => {
    let colorClass = "bg-amber-400";
    let shapeClass = "rounded-full w-2 h-2";
    let label = "";

    if (inc.includes("Gold")) {
      colorClass = "bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-500 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]";
      shapeClass = "w-2 h-2 rotate-45 transform";
      label = "🌟";
    } else if (inc.includes("Fleur")) {
      colorClass = "bg-slate-100/90 border border-slate-300/40 shadow-sm";
      shapeClass = "w-2.5 h-2.5 rounded-sm";
      label = "▫️";
    } else if (inc.includes("Hazelnut")) {
      colorClass = "bg-[#8c6239] border border-[#6b4724]";
      shapeClass = "w-4 h-3.5 rounded-full";
      label = "🌰";
    } else if (inc.includes("Raspberries")) {
      colorClass = "bg-rose-600 shadow-[0_2px_4px_rgba(225,29,72,0.4)]";
      shapeClass = "w-3 h-3 rounded-md transform rotate-12";
      label = "🍓";
    } else if (inc.includes("Pistachios")) {
      colorClass = "bg-[#8ea654] border border-[#6b8235]";
      shapeClass = "w-3 h-2 rounded-lg transform -rotate-12";
      label = "🥑";
    } else if (inc.includes("Chili")) {
      colorClass = "bg-red-600";
      shapeClass = "w-3.5 h-1.5 rounded-sm transform rotate-45";
      label = "🌶️";
    }

    // Distribute particles using pseudo-random deterministic index shifts
    const particles = PARTICLE_OFFSETS.slice(index * 4, (index + 1) * 4);

    return particles.map((pos, pIndex) => (
      <div
        key={`${inc}-${pIndex}`}
        className={`absolute ${colorClass} ${shapeClass} transition-all duration-500`}
        style={{
          top: pos.top,
          left: pos.left,
          transform: `rotate(${pos.rotate}) scale(${0.8 + (pIndex % 3) * 0.15})`,
          zIndex: 10
        }}
      />
    ));
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Wrapper envelope containing the bar */}
      <div className="relative w-64 h-[420px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 hover:scale-105 group border border-[#ffe9e2]/20">
        
        {/* The Chocolate Bar Inside (peeks from the top) */}
        <div className={`absolute top-0 inset-x-0 h-[80px] ${barBg} ${barInnerGlow} transition-transform duration-700 group-hover:-translate-y-2 flex flex-col justify-end p-2 relative`}>
          {/* Blocks indent lines to simulate bar segments */}
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-1 gap-1.5 p-1.5 opacity-20">
            <div className="border-r border-b border-white rounded-sm" />
            <div className="border-r border-b border-white rounded-sm" />
            <div className="border-r border-b border-white rounded-sm" />
            <div className="border-b border-white rounded-sm" />
          </div>

          {/* Render Active Inclusions Scatter inside the peek area */}
          {inclusions.map((inc, index) => renderInclusionParticles(inc, index))}
        </div>

        {/* Outer Premium Gold & Paper Wrapper Envelope */}
        <div className="absolute top-[80px] bottom-0 inset-x-0 bg-[#2c160c] text-[#fff8f6] flex flex-col justify-between p-6 border-t border-amber-800/20 gloss-effect">
          
          {/* Backside foil shadow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-b from-black/40 to-transparent" />

          {/* Gold Foil Top Border Ornament */}
          <div className="flex flex-col items-center space-y-1">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-amber-300">
              Bespoke Craft Edition
            </span>
          </div>

          {/* Wrapper Message Panel (Styled like gold leaf labels) */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            {wrapperMessage ? (
              <div className="px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-950/40 max-w-full">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 block mb-1 font-mono">
                  Personal Inscription
                </span>
                <p className="font-serif italic text-base text-amber-100 break-words max-h-24 overflow-y-auto px-1 leading-relaxed">
                  "{wrapperMessage}"
                </p>
              </div>
            ) : (
              <div className="px-4 py-2 opacity-30 text-center">
                <p className="font-sans text-xs italic text-[#d6c2bd]">
                  Your custom message will be embossed here
                </p>
              </div>
            )}
          </div>

          {/* Golden Bottom Baseplate for Custom Name & Logo */}
          <div className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 p-4 rounded-xl text-[#2c160c] shadow-lg border border-amber-600/30 flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold font-sans text-amber-900 mb-1">
              {barTypeLabel}
            </span>
            <h4 className="font-serif text-lg font-bold text-[#230801] truncate max-w-full tracking-tight">
              {customName || "Bespoke Creation"}
            </h4>
            <div className="w-12 h-[1px] bg-amber-800/30 my-2" />
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-900">
              LUXE COCOA
            </span>
          </div>
        </div>
      </div>
      
      {/* Mini status helper under bar image */}
      <div className="mt-4 flex flex-wrap gap-1.5 justify-center max-w-xs">
        {inclusions.length === 0 ? (
          <span className="text-xs px-2.5 py-1 bg-surface-container rounded-full text-on-surface-variant italic">
            Add up to 3 toppings to visualize
          </span>
        ) : (
          inclusions.map((inc) => (
            <span
              key={inc}
              className="text-[11px] px-2.5 py-0.5 bg-amber-950 text-amber-300 rounded-full font-sans font-medium border border-amber-700/20"
            >
              {inc.replace(" (+$", " ($")}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
