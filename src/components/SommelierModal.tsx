/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Sparkles, Coffee, Award, Feather, Flame, Info } from "lucide-react";
import { SommelierResponse } from "../types";

interface SommelierModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  title: string;
  subtitle: string;
  response: SommelierResponse | null;
}

export default function SommelierModal({
  isOpen,
  onClose,
  isLoading,
  title,
  subtitle,
  response
}: SommelierModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Container */}
      <div 
        className="relative w-full max-w-2xl bg-[#fff8f6] text-[#2c160c] rounded-2xl shadow-2xl border border-[#ffe9e2] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Border */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Container */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {isLoading ? (
            /* Immersive Sensory Loading Suite */
            <div className="flex flex-col items-center justify-center py-16 space-y-8 text-center">
              <div className="relative flex items-center justify-center">
                {/* Spinning concentric loading rings */}
                <div className="absolute w-24 h-24 border-4 border-[#3d1c10]/20 border-t-[#735c00] rounded-full animate-spin" />
                <div className="absolute w-16 h-16 border-4 border-amber-600/20 border-b-amber-500 rounded-full animate-spin [animation-direction:reverse]" />
                <Sparkles className="w-8 h-8 text-amber-500 animate-bounce" />
              </div>
              <div className="space-y-3">
                <h3 className="font-serif text-2xl font-bold text-primary">Sommelier Suite Analysis</h3>
                <p className="text-on-surface-variant text-sm max-w-xs mx-auto animate-pulse">
                  Analyzing molecular flavor structures, assessing acidity levels, and consulting our cocoa sommelier archives...
                </p>
              </div>
              {/* Fake progress ticker lines for premium feedback */}
              <div className="w-64 h-1 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full animate-[shimmer_2s_infinite]" 
                     style={{ width: "70%", backgroundSize: "200% 100%" }} />
              </div>
            </div>
          ) : response ? (
            /* Completed Exquisite Sommelier Report */
            <div className="space-y-8">
              {/* Header Title */}
              <div className="text-center space-y-2 pb-6 border-b border-outline-variant/30">
                <div className="inline-flex items-center gap-1 bg-[#3d1c10]/10 px-3 py-1 rounded-full text-[11px] font-semibold text-[#735c00] uppercase tracking-widest mb-1">
                  <Award className="w-3.5 h-3.5" />
                  Grand Cru Pairing Suite
                </div>
                <h3 className="font-serif text-3xl font-bold text-primary tracking-tight">{title}</h3>
                <p className="text-sm font-sans font-medium text-on-surface-variant italic">{subtitle}</p>
              </div>

              {/* Exquisite Poem Banner */}
              <div className="bg-amber-950/5 border border-amber-500/10 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                <div className="absolute -top-3 -left-3 text-amber-400/10 font-serif text-7xl select-none">“</div>
                <p className="font-serif italic text-lg text-primary leading-relaxed whitespace-pre-line relative z-10 px-4">
                  {response.poem}
                </p>
                <div className="absolute -bottom-10 -right-3 text-amber-400/10 font-serif text-7xl select-none">”</div>
              </div>

              {/* Sensory Profiles Sections */}
              <div className="space-y-6">
                <h4 className="font-serif text-lg font-bold text-primary border-b border-[#ffe2d8] pb-1.5 flex items-center gap-2">
                  <Feather className="w-4 h-4 text-[#735c00]" />
                  Sensory Characteristics
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Aroma */}
                  <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 hover:shadow-md transition-shadow">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans block">
                      👃 Aroma Bouquet
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed font-sans">
                      {response.aroma}
                    </p>
                  </div>

                  {/* Palate */}
                  <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 hover:shadow-md transition-shadow">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans block">
                      👅 Palate Notes
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed font-sans">
                      {response.palate}
                    </p>
                  </div>

                  {/* Mouthfeel */}
                  <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 hover:shadow-md transition-shadow">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans block">
                      ✨ Texture & Melt
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed font-sans">
                      {response.mouthfeel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Master Sommelier Beverage Pairing Card */}
              <div className="bg-[#2c160c] text-[#fff8f6] rounded-2xl p-6 shadow-xl border border-amber-600/10 relative overflow-hidden">
                {/* Decorative gold circular orb */}
                <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300">
                    <Coffee className="w-6 h-6" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-amber-300 block">
                      Sommelier Choice Beverage Pairing
                    </span>
                    <h5 className="font-serif text-xl font-bold text-amber-100">
                      Liquid Enhancement
                    </h5>
                    <p className="text-sm text-[#d6c2bd] leading-relaxed font-sans">
                      {response.pairingNotes}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Sourcing & Ethics Footer */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg">
                <Info className="w-4 h-4 text-[#735c00] flex-shrink-0" />
                <span>All ingredients analyzed above are 100% ethically sourced from cooperative smallholder farms, utilizing regenerative farming methodologies.</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-[#2c160c]">No report available.</p>
          )}
        </div>

        {/* Modal Action Footer */}
        {!isLoading && (
          <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#2c160c] text-white px-6 py-2.5 rounded-lg font-sans text-sm font-semibold uppercase tracking-widest hover:bg-[#3d1c10] active:scale-95 transition-all shadow-md cursor-pointer"
            >
              Close Sommelier Card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
