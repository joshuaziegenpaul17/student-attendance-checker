'use client';

import React from 'react';
import { Subject } from '@/types/attendance';
import { calculateAttendance, calculateHoursRequiredToReachTarget, calculateHoursCanMiss, calculateFutureAttendance } from '@/lib/attendance/calculations';
import { X, Target, TrendingUp, TrendingDown } from 'lucide-react';

interface SubjectDetailsProps { subject: Subject; target: number; onClose: () => void; onEdit: (subject: Subject) => void; }

export default function SubjectDetails({ subject, target, onClose, onEdit }: SubjectDetailsProps) {
  const pct = calculateAttendance(subject.presentHours, subject.totalHours);
  const isBelow = pct < target;
  const hoursReq = calculateHoursRequiredToReachTarget(subject.presentHours, subject.totalHours, target / 100);
  const hoursMiss = calculateHoursCanMiss(subject.presentHours, subject.totalHours, target / 100);
  const ifMiss1 = calculateFutureAttendance(subject.presentHours, subject.totalHours, 1, 'miss');
  const ifAttend5 = calculateFutureAttendance(subject.presentHours, subject.totalHours, 5, 'attend');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#111111] border border-[#2A2A2C] w-full max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col animate-fade-in-scale">
        <div className="p-5 border-b border-[#1A1A1A] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#FFFFFF] truncate">{subject.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[12px] text-[#666]">{subject.code || '—'}</p>
              {subject.category && <span className="text-[9px] text-[#666] bg-[#1A1A1A] px-2 py-0.5 rounded-full">{subject.category}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#666] hover:text-[#FFF] hover:bg-[#222] rounded-full transition-smooth shrink-0 ml-2"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center gap-4">
            <span className={`font-[family-name:var(--font-newsreader)] text-4xl font-light tabular-nums ${pct >= target ? 'text-[#4ADE80]' : pct >= 65 ? 'text-[#949494]' : 'text-[#F87171]'}`}>{pct.toFixed(2)}%</span>
            <div className="w-px h-8 bg-[#222]" />
            <span className="font-[family-name:var(--font-newsreader)] text-2xl text-[#B0B0B0] tabular-nums">{subject.totalHours}</span>
            <span className="text-[12px] text-[#666]">total hours</span>
          </div>

          <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= target ? 'bg-[#4ADE80]' : pct >= 65 ? 'bg-[#666]' : 'bg-[#F87171]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Present', value: subject.presentHours, color: '#FFFFFF' },
              { label: 'Absent', value: subject.absentHours, color: '#949494' },
              { label: 'CL', value: subject.clHours, color: '#666' },
            ].map(m => (
              <div key={m.label} className="text-center py-3 bg-[#0A0A0A] rounded-xl">
                <div className="text-lg font-[family-name:var(--font-newsreader)] tabular-nums" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {subject.totalHours > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] text-[#555] uppercase tracking-[0.12em]">Recovery</h4>
              {isBelow ? (
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-start gap-2">
                    <Target size={15} className="text-[#949494] shrink-0 mt-0.5" />
                    <div className="text-[14px] text-[#B0B0B0]">
                      Attend next <strong className="text-[#FFF]">{hoursReq}</strong> hours to reach {target}%.
                      <div className="text-[12px] text-[#666] mt-1">→ {subject.presentHours + hoursReq}/{subject.totalHours + hoursReq} = {((subject.presentHours + hoursReq) / (subject.totalHours + hoursReq) * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-start gap-2">
                    <Target size={15} className="text-[#4ADE80] shrink-0 mt-0.5" />
                    <div className="text-[14px] text-[#B0B0B0]">
                      Can miss up to <strong className="text-[#FFF]">{hoursMiss}</strong> hours and stay above {target}%.
                      <div className="text-[12px] text-[#666] mt-1">→ {subject.presentHours}/{subject.totalHours + hoursMiss} = {(subject.presentHours / (subject.totalHours + hoursMiss) * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {subject.totalHours > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] text-[#555] uppercase tracking-[0.12em]">Quick What-If</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-[#555] mb-1"><TrendingDown size={11} /> Miss 1</div>
                  <div className="text-[16px] font-[family-name:var(--font-newsreader)] text-[#F87171] tabular-nums">{ifMiss1.toFixed(2)}%</div>
                </div>
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-[#555] mb-1"><TrendingUp size={11} /> Attend 5</div>
                  <div className="text-[16px] font-[family-name:var(--font-newsreader)] text-[#4ADE80] tabular-nums">{ifAttend5.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#1A1A1A] flex gap-2 shrink-0">
          <button onClick={() => onEdit(subject)} className="flex-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-smooth">Edit Subject</button>
          <button onClick={onClose} className="bg-[#18181A] hover:bg-[#222] text-[#B0B0B0] font-medium py-3 px-5 rounded-full text-[14px] transition-smooth">Close</button>
        </div>
      </div>
    </div>
  );
}
