'use client';

import React, { useState } from 'react';
import { OverallAttendance } from '@/types/attendance';
import { calculateFutureAttendance } from '@/lib/attendance/calculations';
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber';
import { ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface WhatIfScreenProps { stats: OverallAttendance; target: number; }

function AnimatedPct({ value, className }: { value: number; className?: string }) {
  const anim = useAnimatedNumber(value, 400, 0);
  return (
    <span className={`tabular-nums ${className || ''}`}>
      {anim.toFixed(2)}%
    </span>
  );
}

export default function WhatIfScreen({ stats, target }: WhatIfScreenProps) {
  const { totalPresent, totalConduct, percentage } = stats;
  const [hours, setHours] = useState(5);

  const attendResult = calculateFutureAttendance(totalPresent, totalConduct, hours, 'attend');
  const missResult = calculateFutureAttendance(totalPresent, totalConduct, hours, 'miss');
  const attendChange = attendResult - percentage;
  const missChange = missResult - percentage;

  const attendFormula = `(${totalPresent} + ${hours}) / (${totalConduct} + ${hours})`;
  const missFormula = `${totalPresent} / (${totalConduct} + ${hours})`;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="animate-slide-up stagger-1">
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFFFFF] font-light mb-2">What if?</h1>
        <p className="text-[14px] text-[#949494]">See how future attendance affects your percentage.</p>
      </div>

      {/* Hours selector */}
      <div className="card p-6 animate-slide-up stagger-2">
        <label className="text-[11px] text-[#555] uppercase tracking-[0.12em] mb-3 block">Number of hours</label>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setHours(Math.max(0, hours - 1))}
            className="btn-press w-12 h-12 bg-[#18181A] border border-[#2A2A2C] hover:border-[#555] rounded-full text-[#B0B0B0] text-xl font-light transition-smooth flex items-center justify-center">−</button>
          <input type="number" min="0" value={hours}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) setHours(v); else if (e.target.value === '') setHours(0); }}
            className="flex-1 bg-[#111] border border-[#2A2A2C] rounded-[10px] px-4 py-3 text-center text-[#FFFFFF] text-[22px] font-[family-name:var(--font-newsreader)] outline-none focus:border-[#555] transition-smooth" />
          <button onClick={() => setHours(hours + 1)}
            className="btn-press w-12 h-12 bg-[#18181A] border border-[#2A2A2C] hover:border-[#555] rounded-full text-[#B0B0B0] text-xl font-light transition-smooth flex items-center justify-center">+</button>
        </div>
        <div className="flex gap-2">
          {[1, 3, 5, 10, 20].map(n => (
            <button key={n} onClick={() => setHours(n)}
              className={`btn-press flex-1 py-2 rounded-full text-[13px] font-medium transition-smooth border ${
                hours === n ? 'bg-[#FFF] text-[#000] border-[#FFF]' : 'bg-[#111] text-[#666] border-[#2A2A2C] hover:border-[#555]'
              }`}>{n}</button>
          ))}
        </div>
      </div>

      {/* Three-point comparison */}
      {totalConduct > 0 && (
        <div className="animate-slide-up stagger-3">
          {/* 80% target line */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#2A2A2C]" />
            <span className="text-[11px] text-[#666] uppercase tracking-[0.12em] font-medium">{target}% Target</span>
            <div className="h-px flex-1 bg-[#2A2A2C]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CURRENT */}
            <div className="card p-5 text-center">
              <div className="text-[10px] text-[#555] uppercase tracking-[0.12em] mb-3">Current</div>
              <div className="font-[family-name:var(--font-newsreader)] text-4xl font-light text-[#FFFFFF] tabular-nums mb-1">
                {percentage.toFixed(2)}%
              </div>
              <div className="text-[13px] text-[#666]">{totalPresent}/{totalConduct}</div>
            </div>

            {/* ATTEND */}
            <div className="card p-5 text-center border-[#1A2A1A]">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <ArrowUp size={12} className="text-[#4ADE80]" />
                <span className="text-[10px] text-[#4ADE80] uppercase tracking-[0.12em] font-medium">Attend {hours} hours</span>
              </div>
              <div className="font-[family-name:var(--font-newsreader)] text-4xl font-light text-[#4ADE80] tabular-nums mb-1">
                <AnimatedPct value={attendResult} className="text-[#4ADE80]" />
              </div>
              <div className="text-[13px] text-[#666]">{totalPresent + hours}/{totalConduct + hours}</div>
              <div className="text-[12px] text-[#4ADE80] mt-1 font-medium">
                +{attendChange.toFixed(2)}%
              </div>
            </div>

            {/* MISS */}
            <div className="card p-5 text-center border-[#2A1A1A]">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <ArrowDown size={12} className="text-[#F87171]" />
                <span className="text-[10px] text-[#F87171] uppercase tracking-[0.12em] font-medium">Miss {hours} hours</span>
              </div>
              <div className="font-[family-name:var(--font-newsreader)] text-4xl font-light text-[#F87171] tabular-nums mb-1">
                <AnimatedPct value={missResult} className="text-[#F87171]" />
              </div>
              <div className="text-[13px] text-[#666]">{totalPresent}/{totalConduct + hours}</div>
              <div className="text-[12px] text-[#F87171] mt-1 font-medium">
                {missChange.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Visual comparison bar */}
          <div className="card p-5 mt-3">
            <div className="space-y-3">
              {/* 80% target line */}
              <div className="relative h-6">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-[#333]" />
                <div className="absolute text-[10px] text-[#555] -top-0.5" style={{ left: `${Math.min(target, 100)}%`, transform: 'translateX(-50%)' }}>
                  {target}%
                </div>
              </div>

              {/* Current bar */}
              <div className="relative h-8 flex items-center">
                <div className="absolute left-0 top-0 bottom-0 bg-[#222] rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }} />
                <div className="absolute left-0 top-0 bottom-0 bg-[#FFF] rounded-full opacity-20" style={{ width: `${Math.min(percentage, 100)}%` }} />
                <span className="relative z-10 text-[11px] text-[#B0B0B0] font-medium pl-3">Current {percentage.toFixed(2)}%</span>
              </div>

              {/* Attend bar */}
              <div className="relative h-8 flex items-center">
                <div className="absolute left-0 top-0 bottom-0 bg-[#0A2A1A] rounded-full" style={{ width: `${Math.min(attendResult, 100)}%` }} />
                <div className="absolute left-0 top-0 bottom-0 bg-[#4ADE80] rounded-full opacity-20" style={{ width: `${Math.min(attendResult, 100)}%` }} />
                <span className="relative z-10 text-[11px] text-[#4ADE80] font-medium pl-3">Attend {hours} → {attendResult.toFixed(2)}%</span>
              </div>

              {/* Miss bar */}
              <div className="relative h-8 flex items-center">
                <div className="absolute left-0 top-0 bottom-0 bg-[#2A0A0A] rounded-full" style={{ width: `${Math.min(missResult, 100)}%` }} />
                <div className="absolute left-0 top-0 bottom-0 bg-[#F87171] rounded-full opacity-20" style={{ width: `${Math.min(missResult, 100)}%` }} />
                <span className="relative z-10 text-[11px] text-[#F87171] font-medium pl-3">Miss {hours} → {missResult.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Formula display */}
          <div className="card p-5 mt-3">
            <div className="text-[11px] text-[#555] uppercase tracking-[0.12em] mb-3">Calculation</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[13px] text-[#949494] mb-1">If you attend {hours} hours:</div>
                <div className="font-[family-name:var(--font-mono)] text-[13px] text-[#B0B0B0]">
                  {attendFormula} = <span className="text-[#4ADE80]">{attendResult.toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <div className="text-[13px] text-[#949494] mb-1">If you miss {hours} hours:</div>
                <div className="font-[family-name:var(--font-mono)] text-[13px] text-[#B0B0B0]">
                  {missFormula} = <span className="text-[#F87171]">{missResult.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
