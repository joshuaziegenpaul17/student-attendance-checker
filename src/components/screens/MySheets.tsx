'use client';

import React, { useState } from 'react';
import { AttendanceSheet } from '@/types/attendance';
import { calculateOverallAttendance } from '@/lib/attendance/calculations';
import { Plus, Trash2, LogIn, Calendar, GraduationCap } from 'lucide-react';

interface MySheetsProps {
  sheets: AttendanceSheet[];
  currentSheetId: string | null;
  onOpenSheet: (id: string) => void;
  onNewSheet: () => void;
  onDeleteSheet: (id: string) => void;
}

export default function MySheets({ sheets, currentSheetId, onOpenSheet, onNewSheet, onDeleteSheet }: MySheetsProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...sheets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFFFFF] font-light mb-2">My Sheets</h1>
        <p className="text-[14px] text-[#666]">Switch between semesters or start a new record.</p>
      </div>

      <button onClick={onNewSheet}
        className="w-full card p-5 flex items-center gap-4 border-dashed border-2 border-[#2A2A2C] hover:border-[#555] transition-smooth">
        <div className="w-10 h-10 bg-[#18181A] rounded-full flex items-center justify-center shrink-0">
          <Plus size={18} className="text-[#949494]" />
        </div>
        <div className="text-left">
          <div className="text-[15px] text-[#E5E5E5]">New Attendance Sheet</div>
          <div className="text-[12px] text-[#666]">Start a new semester/attendance record</div>
        </div>
      </button>

      {sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={32} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#B0B0B0] mb-2">No sheets yet</h3>
          <p className="text-[14px] text-[#666]">Create your first attendance sheet to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(sheet => {
            const stats = calculateOverallAttendance(sheet.subjects);
            const isCurrent = sheet.id === currentSheetId;
            return (
              <div key={sheet.id} className={`card p-5 transition-smooth ${isCurrent ? 'border-[#444]' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#FFFFFF]' : 'bg-[#18181A]'}`}>
                    <GraduationCap size={16} className={isCurrent ? 'text-[#000]' : 'text-[#666]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[15px] text-[#E5E5E5] truncate">{sheet.name}</h4>
                      {isCurrent && <span className="text-[9px] font-semibold text-[#FFF] bg-[#333] px-2 py-0.5 rounded-full shrink-0">Current</span>}
                    </div>
                    {stats.totalConduct > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className={`font-[family-name:var(--font-newsreader)] text-xl tabular-nums ${stats.percentage >= 80 ? 'text-[#4ADE80]' : stats.percentage >= 65 ? 'text-[#949494]' : 'text-[#F87171]'}`}>
                          {stats.percentage.toFixed(2)}%
                        </span>
                        <span className="text-[12px] text-[#555]">{stats.totalPresent}/{stats.totalConduct} hrs</span>
                      </div>
                    ) : <div className="text-[12px] text-[#555]">No attendance data</div>}
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#555]">
                      <Calendar size={10} /><span>Updated {fmt(sheet.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-[#1A1A1A]">
                  <button onClick={() => onOpenSheet(sheet.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium transition-smooth ${
                      isCurrent ? 'bg-[#FFFFFF] text-[#000]' : 'bg-[#18181A] text-[#B0B0B0] hover:bg-[#222] border border-[#2A2A2C]'
                    }`}>
                    <LogIn size={13} /> {isCurrent ? 'Continue' : 'Open'}
                  </button>
                  <button onClick={() => { if (confirmDelete === sheet.id) { onDeleteSheet(sheet.id); setConfirmDelete(null); } else { setConfirmDelete(sheet.id); setTimeout(() => setConfirmDelete(null), 5000); } }}
                    className={`px-4 py-2.5 rounded-full text-[13px] transition-smooth ${confirmDelete === sheet.id ? 'bg-[#2A0A0A] text-[#F87171] border border-[#F87171]/20' : 'text-[#555] hover:text-[#F87171]'}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {confirmDelete === sheet.id && <div className="mt-2 text-[11px] text-[#F87171]">Click delete again to confirm.</div>}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12px] text-[#555]">Each sheet stores its own subjects, attendance, and CGPA data separately. All data stays in your browser.</p>
    </div>
  );
}
