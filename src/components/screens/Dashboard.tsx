'use client';

import React from 'react';
import { Page, StudentProfile, Subject, OverallAttendance, MonthlyAttendance } from '@/types/attendance';
import {
  calculateAttendance, calculateHoursRequiredToReachTarget, calculateHoursCanMiss,
  calculateCumulativeTotals, calculateMonthlyPercentage,
} from '@/lib/attendance/calculations';
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber';
import { ArrowRight, BookOpen, Calendar, TrendingUp, TrendingDown, LogOut, Plus, AlertTriangle, Target } from 'lucide-react';

interface DashboardProps {
  profile: StudentProfile;
  stats: OverallAttendance;
  subjects: Subject[];
  monthly: MonthlyAttendance[];
  target: number;
  onViewSubject: (subject: Subject) => void;
  onNavigate: (page: Page) => void;
  onNewSheet?: () => void;
  onExitSheet?: () => void;
  sheetName?: string;
}

export default function Dashboard({ profile, stats, subjects, monthly, target, onViewSubject, onNavigate, onNewSheet, onExitSheet, sheetName }: DashboardProps) {
  const { percentage, totalPresent, totalConduct, totalAbsent, totalCL, status } = stats;
  const targetPct = target;
  const isBelowTarget = percentage < targetPct;
  const hoursRequired = calculateHoursRequiredToReachTarget(totalPresent, totalConduct, targetPct / 100);
  const hoursCanMiss = calculateHoursCanMiss(totalPresent, totalConduct, targetPct / 100);

  const getGreeting = () => { const hr = new Date().getHours(); if (hr < 12) return 'Good morning'; if (hr < 17) return 'Good afternoon'; return 'Good evening'; };

  // Animated values
  const animatedPct = useAnimatedNumber(percentage, 1200, 200);
  const animPresent = useAnimatedNumber(totalPresent, 800, 400);
  const animAbsent = useAnimatedNumber(totalAbsent, 800, 500);
  const animCL = useAnimatedNumber(totalCL, 800, 600);
  const animTotal = useAnimatedNumber(totalConduct, 800, 700);

  // Animated progress ring
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const animRingPct = useAnimatedNumber(Math.min(percentage, 100), 1200, 200);
  const offset = circumference - (animRingPct / 100) * circumference;

  const statusLabel = status === 'ON_TRACK' ? 'On Track' : status === 'BELOW_TARGET' ? 'Below Target' : status === 'HIGH_RISK' ? 'High Risk' : 'Critical';

  const sortedSubjects = [...subjects].map(s => ({ ...s, pct: calculateAttendance(s.presentHours, s.totalHours) })).sort((a, b) => a.pct - b.pct);

  const presentPct = totalConduct > 0 ? (totalPresent / totalConduct) * 100 : 0;
  const absentPct = totalConduct > 0 ? (totalAbsent / totalConduct) * 100 : 0;
  const clPct = totalConduct > 0 ? (totalCL / totalConduct) * 100 : 0;

  const sortedMonthly = [...monthly].sort((a, b) => {
    const parse = (m: string) => { const [mon, year] = m.split('-'); const months: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }; return (parseInt(year)||0)*12+(months[mon]||0); };
    return parse(a.month) - parse(b.month);
  });

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center pt-4 animate-slide-up stagger-1">
        <p className="text-[14px] text-[#949494] mb-1">{getGreeting()}</p>
        {sheetName && <p className="text-[13px] text-[#666]">{sheetName}</p>}

        {/* Circular progress with animation */}
        <div className="relative inline-block my-6 sm:my-8">
          <svg className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50%" cy="50%" r={radius} stroke="#1A1A1A" strokeWidth="6" fill="transparent" />
            <circle cx="50%" cy="50%" r={radius}
              stroke={status === 'ON_TRACK' ? '#4ADE80' : status === 'BELOW_TARGET' ? '#949494' : '#F87171'}
              strokeWidth="6" fill="transparent"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-[family-name:var(--font-newsreader)] text-4xl sm:text-5xl md:text-6xl font-light text-[#FFFFFF] tabular-nums">
              {animatedPct.toFixed(2)}<span className="text-2xl sm:text-3xl">%</span>
            </span>
            <span className="text-[11px] text-[#666] font-medium uppercase tracking-[0.15em] mt-1">Attendance</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-3 mb-2 animate-fade-in stagger-2">
          <span className="text-[13px] text-[#949494]">Target {targetPct}%</span>
          <span className="w-1 h-1 rounded-full bg-[#333]" />
          <span className={`text-[13px] font-medium ${
            status === 'ON_TRACK' ? 'text-[#4ADE80]' : status === 'BELOW_TARGET' ? 'text-[#949494]' : 'text-[#F87171]'
          }`}>{statusLabel}</span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 animate-fade-in stagger-3">
          {onNewSheet && (
            <button onClick={onNewSheet} className="btn-press flex items-center gap-1.5 px-4 py-2 bg-[#18181A] border border-[#2A2A2C] hover:border-[#444] rounded-full text-[12px] text-[#949494] transition-smooth">
              <Plus size={12} /> New Sheet
            </button>
          )}
          {onExitSheet && (
            <button onClick={onExitSheet} className="btn-press flex items-center gap-1.5 px-4 py-2 bg-[#18181A] border border-[#2A2A2C] hover:border-[#444] rounded-full text-[12px] text-[#949494] transition-smooth">
              <LogOut size={12} /> My Sheets
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {subjects.length === 0 && (
        <div className="card p-10 text-center animate-slide-up stagger-3">
          <BookOpen size={32} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#B0B0B0] mb-2">No subjects yet</h3>
          <p className="text-[14px] text-[#666] mb-6">Add your subjects to see your attendance dashboard.</p>
          <button onClick={() => onNavigate('subjects')}
            className="btn-press bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 px-8 rounded-full text-[14px] transition-smooth">
            Add Subjects
          </button>
        </div>
      )}

      {subjects.length > 0 && (
        <>
          {/* Attendance Statistics */}
          <div className="space-y-4 animate-slide-up stagger-3">
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0]">Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Present', value: Math.round(animPresent), color: '#FFFFFF' },
                { label: 'Absent', value: Math.round(animAbsent), color: '#949494' },
                { label: 'CL', value: Math.round(animCL), color: '#666' },
                { label: 'Total', value: Math.round(animTotal), color: '#FFFFFF' },
              ].map(m => (
                <div key={m.label} className="text-center py-4">
                  <div className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl font-light tabular-nums" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[11px] text-[#555] font-medium uppercase tracking-[0.12em] mt-1">{m.label}</div>
                </div>
              ))}
            </div>
            {/* Stacked bar */}
            {totalConduct > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden flex">
                  {totalPresent > 0 && <div className="h-full bg-[#FFFFFF] transition-all duration-1000 ease-out" style={{ width: `${presentPct}%` }} />}
                  {totalCL > 0 && <div className="h-full bg-[#555] transition-all duration-1000 ease-out" style={{ width: `${clPct}%` }} />}
                  {totalAbsent > 0 && <div className="h-full bg-[#333] transition-all duration-1000 ease-out" style={{ width: `${absentPct}%` }} />}
                </div>
                <div className="flex gap-4 text-[12px] text-[#666]">
                  <span>P {presentPct.toFixed(1)}%</span>
                  {totalCL > 0 && <span>CL {clPct.toFixed(1)}%</span>}
                  {totalAbsent > 0 && <span>A {absentPct.toFixed(1)}%</span>}
                </div>
              </div>
            )}
          </div>

          {/* Attendance Trend */}
          {sortedMonthly.length > 1 && (
            <div className="space-y-4 animate-slide-up stagger-4">
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0]">Attendance Trend</h2>
                <button onClick={() => onNavigate('cumulative')} className="text-[13px] text-[#666] hover:text-[#FFF] transition-smooth">View All →</button>
              </div>
              <div className="flex items-end gap-4 h-32">
                {sortedMonthly.map((m, i) => {
                  const pct = calculateMonthlyPercentage(m);
                  const barHeight = Math.max(12, (pct / 100) * 100);
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: `${400 + i * 100}ms` }}>
                      <span className="text-[11px] text-[#949494] tabular-nums">{pct.toFixed(1)}%</span>
                      <div className="w-full max-w-[36px] bg-[#111] rounded-md overflow-hidden" style={{ height: `${barHeight}%` }}>
                        <div className="w-full bg-[#333] rounded-md transition-all duration-1000 ease-out" style={{ height: '100%' }} />
                      </div>
                      <span className="text-[10px] text-[#555]">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prediction */}
          {isBelowTarget && totalConduct > 0 && (
            <div className="card p-6 md:p-8 border-[#2A2A2C] animate-slide-up stagger-5">
              <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0] mb-6">Your path to {targetPct}%</h2>
              <div className="grid grid-cols-3 gap-4 items-center mb-6">
                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-[0.12em] mb-1">Current</div>
                  <div className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0] tabular-nums">{totalPresent}/{totalConduct}</div>
                  <div className="text-[13px] text-[#666]">{percentage.toFixed(2)}%</div>
                </div>
                <div className="flex items-center justify-center"><ArrowRight size={16} className="text-[#333]" /></div>
                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-[0.12em] mb-1">After {hoursRequired} attended</div>
                  <div className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0] tabular-nums">{totalPresent + hoursRequired}/{totalConduct + hoursRequired}</div>
                  <div className="text-[13px] text-[#4ADE80]">{((totalPresent + hoursRequired)/(totalConduct + hoursRequired)*100).toFixed(2)}%</div>
                </div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl px-5 py-4 flex items-center gap-3">
                <AlertTriangle size={16} className="text-[#FBBF24] shrink-0" />
                <span className="text-[14px] text-[#B0B0B0]">
                  Attend your next <strong className="text-[#FFFFFF]">{hoursRequired}</strong> hours consecutively
                </span>
              </div>
            </div>
          )}

          {/* Subject Risk */}
          <div className="space-y-4 animate-slide-up stagger-5">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0]">Subjects</h2>
              <button onClick={() => onNavigate('subjects')} className="text-[13px] text-[#666] hover:text-[#FFF] transition-smooth">View All →</button>
            </div>
            <div className="space-y-2">
              {sortedSubjects.slice(0, 6).map((sub, i) => {
                const pct = calculateAttendance(sub.presentHours, sub.totalHours);
                return (
                  <button key={sub.id} onClick={() => onViewSubject(sub)}
                    className="w-full flex items-center gap-4 p-4 bg-[#111] hover:bg-[#161616] border border-[#1A1A1A] hover:border-[#2A2A2C] rounded-2xl transition-smooth text-left animate-fade-in"
                    style={{ animationDelay: `${500 + i * 60}ms` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] text-[#E5E5E5] truncate">{sub.name}</div>
                      <div className="text-[12px] text-[#555] mt-0.5">{sub.presentHours}/{sub.totalHours} hours</div>
                    </div>
                    <span className={`text-[15px] font-[family-name:var(--font-newsreader)] tabular-nums shrink-0 ${
                      pct >= targetPct ? 'text-[#4ADE80]' : pct >= 65 ? 'text-[#949494]' : 'text-[#F87171]'
                    }`}>{pct.toFixed(2)}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-3 animate-slide-up stagger-6">
            <button onClick={() => onNavigate('whatif')}
              className="btn-press flex-1 flex items-center gap-3 p-4 bg-[#111] border border-[#1A1A1A] hover:border-[#2A2A2C] rounded-2xl transition-smooth text-left">
              <TrendingUp size={18} className="text-[#666]" />
              <div>
                <div className="text-[14px] text-[#B0B0B0]">What-If</div>
                <div className="text-[11px] text-[#555]">Simulate attendance</div>
              </div>
              <ArrowRight size={14} className="text-[#333] ml-auto" />
            </button>
            <button onClick={() => onNavigate('cumulative')}
              className="btn-press flex-1 flex items-center gap-3 p-4 bg-[#111] border border-[#1A1A1A] hover:border-[#2A2A2C] rounded-2xl transition-smooth text-left">
              <Calendar size={18} className="text-[#666]" />
              <div>
                <div className="text-[14px] text-[#B0B0B0]">Monthly</div>
                <div className="text-[11px] text-[#555]">{monthly.length > 0 ? `${monthly.length} months · ${calculateCumulativeTotals(monthly).percentage.toFixed(2)}%` : 'Enter monthly data'}</div>
              </div>
              <ArrowRight size={14} className="text-[#333] ml-auto" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
