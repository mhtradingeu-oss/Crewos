"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

const BRAND_OPTIONS = [
  { value: "hairoticmen", label: "HAIROTICMEN" },
  { value: "orbit-phase", label: "ORBIT PHASE" },
  { value: "nova-stack", label: "NOVA STACK" },
];

type TopbarProps = {};

export function Topbar({}: TopbarProps) {
  const defaultBrand = BRAND_OPTIONS[0]?.value ?? "";
  const [brand, setBrand] = useState(defaultBrand);

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="space-y-1 text-xs uppercase tracking-[0.4em] text-slate-500">
          <p>Brand</p>
          <p className="text-2xl font-semibold tracking-[0.2em] text-white">
            {BRAND_OPTIONS.find((b) => b.value === brand)?.label}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <Select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="min-w-[9rem] bg-transparent text-sm font-semibold uppercase text-white"
          >
            {BRAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="hidden text-xs text-slate-400 sm:block">Global OS · International HQ</div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" className="flex items-center gap-2 text-xs uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          AI Dock
        </Button>
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-xs font-semibold uppercase text-white">
            NH
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">Nora Hariri</p>
            <p className="text-xs text-slate-400">Lead Architect</p>
          </div>
        </div>
      </div>
    </div>
  );
}
