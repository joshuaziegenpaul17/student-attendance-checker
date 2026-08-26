'use client';

import React, { useState, useMemo } from 'react';
import { Subject } from '@/types/attendance';
import { calculateAttendance, getAttendanceStatus } from '@/lib/attendance/calculations';
import { Plus, BookOpen } from 'lucide-react';

interface SubjectsScreenProps {
  subjects: Subject[];
  target: number;
  onAddClick: () => void;
  onSubjectClick: (subject: Subject) => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
}

export default function SubjectsScreen({ subjects, target, onAddClick, onSubjectClick }: SubjectsScreenProps) {
  const [sortBy, setSortBy] = useState<'risk' | 'alpha'>('risk');

  const sortedSubjects = useMemo(() => {
    return [...subjects].map(s => ({ ...s, pct: calculateAttendance(s.presentHours, s.totalHours) })).sort((a, b) => {
      if (sortBy === 'risk') {
        const rank = (s: number) => s >= target ? 4 : s >= 65 ? 3 : s >= 50 ? 2 : 1;
        const rA = rank(a.pct), rB = rank(b.pct);
        return rA !== rB ? rA - rB : a.pct - b.pct;
      }
      return a.name.localeCompare(b.name);
    });
  }, [subjects, sortBy, target]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFFFFF] font-light mb-2">Subjects</h1>
          <p className="text-[14px] text-[#666]">Enter values from the Attendance Details table of your college portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111] border border-[#2A2A2C] rounded-full p-0.5">
            <button onClick={() => setSortBy('risk')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-smooth ${sortBy === 'risk' ? 'bg-[#222] text-[#FFF]' : 'text-[#666]'}`}>Risk</button>
            <button onClick={() => setSortBy('alpha')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-smooth ${sortBy === 'alpha' ? 'bg-[#222] text-[#FFF]' : 'text-[#666]'}`}>A–Z</button>
          </div>
          <button onClick={onAddClick} className="flex items-center gap-1.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold text-[13px] px-4 py-2 rounded-full transition-smooth">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={32} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#B0B0B0] mb-2">No subjects yet</h3>
          <p className="text-[14px] text-[#666] mb-6">Add the subjects from your attendance report to start tracking.</p>
          <button onClick={onAddClick} className="bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 px-8 rounded-full text-[14px] transition-smooth">
            Add Your First Subject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSubjects.map(sub => {
            const pct = sub.pct;
            const status = getAttendanceStatus(pct, target);
            const statusLabel = status === 'ON_TRACK' ? 'On Track' : status === 'BELOW_TARGET' ? 'Below' : status === 'HIGH_RISK' ? 'Risk' : 'Critical';
            return (
              <button key={sub.id} onClick={() => onSubjectClick(sub)}
                className="w-full flex items-center gap-4 p-4 bg-[#111] hover:bg-[#161616] border border-[#1A1A1A] hover:border-[#2A2A2C] rounded-2xl transition-smooth text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-[#555] uppercase tracking-wider">{sub.code || '—'}</span>
                    {sub.category && sub.category !== 'Other' && (
                      <span className="text-[9px] text-[#666] bg-[#1A1A1A] px-2 py-0.5 rounded-full">{sub.category}</span>
                    )}
                  </div>
                  <div className="text-[15px] text-[#E5E5E5] truncate">{sub.name}</div>
                  <div className="text-[12px] text-[#555] mt-0.5">{sub.presentHours}/{sub.totalHours} hours</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-[family-name:var(--font-newsreader)] text-xl tabular-nums ${
                    pct >= target ? 'text-[#4ADE80]' : pct >= 65 ? 'text-[#949494]' : 'text-[#F87171]'
                  }`}>{pct.toFixed(2)}%</div>
                  <div className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${
                    status === 'ON_TRACK' ? 'text-[#4ADE80]' : status === 'BELOW_TARGET' ? 'text-[#949494]' : 'text-[#F87171]'
                  }`}>{statusLabel}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
