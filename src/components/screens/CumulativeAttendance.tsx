'use client';

import React, { useState } from 'react';
import { MonthlyAttendance, Subject } from '@/types/attendance';
import { calculateCumulativeTotals, calculateMonthlyPercentage, calculateOverallAttendance, crossCheckAttendance } from '@/lib/attendance/calculations';
import { Plus, Trash2, CheckCircle, AlertTriangle, TrendingDown, Info } from 'lucide-react';

interface CumulativeAttendanceProps {
  monthly: MonthlyAttendance[];
  subjects: Subject[];
  onMonthlyChange: (monthly: MonthlyAttendance[]) => void;
}

export default function CumulativeAttendance({ monthly, subjects, onMonthlyChange }: CumulativeAttendanceProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [formMonth, setFormMonth] = useState('');
  const [formA, setFormA] = useState<number | ''>('');
  const [formP, setFormP] = useState<number | ''>('');
  const [formCL, setFormCL] = useState<number | ''>('');
  const [formError, setFormError] = useState('');

  const cumulative = calculateCumulativeTotals(monthly);
  const overall = calculateOverallAttendance(subjects);
  const crossCheck = crossCheckAttendance(
    { present: overall.totalPresent, absent: overall.totalAbsent, cl: overall.totalCL, total: overall.totalConduct },
    { present: cumulative.totalPresent, absent: cumulative.totalAbsent, cl: cumulative.totalCL, total: cumulative.totalHours }
  );

  const sortedMonthly = [...monthly].sort((a, b) => {
    const parse = (m: string) => { const [mon, year] = m.split('-'); const months: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }; return (parseInt(year)||0)*12+(months[mon]||0); };
    return parse(a.month) - parse(b.month);
  });

  const resetForm = () => { setFormMonth(''); setFormA(''); setFormP(''); setFormCL(''); setFormError(''); setEditingId(null); setShowAddForm(false); };

  const handleEdit = (m: MonthlyAttendance) => { setEditingId(m.id); setFormMonth(m.month); setFormA(m.absent); setFormP(m.present); setFormCL(m.cl); setFormError(''); setShowAddForm(true); };

  const handleSave = () => {
    const p = typeof formP === 'number' ? formP : 0;
    const a = typeof formA === 'number' ? formA : 0;
    const cl = typeof formCL === 'number' ? formCL : 0;
    if (!formMonth.trim()) { setFormError('Month is required.'); return; }
    if (p + a + cl === 0) { setFormError('Total hours must be greater than zero.'); return; }
    if (editingId) { onMonthlyChange(monthly.map(m => m.id === editingId ? { ...m, month: formMonth.trim(), absent: a, present: p, cl } : m)); }
    else { onMonthlyChange([...monthly, { id: Math.random().toString(36).substring(2, 9), month: formMonth.trim(), absent: a, present: p, cl }]); }
    resetForm();
  };

  const inputClass = "w-full bg-[#111111] border border-[#2A2A2C] focus:border-[#555] focus:ring-1 focus:ring-[#444] rounded-[10px] px-3 py-2.5 text-[#FFFFFF] text-[15px] outline-none transition-smooth placeholder:text-[#555]";
  const labelClass = "block text-[12px] font-medium text-[#949494] mb-1.5";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFFFFF] font-light mb-2">Monthly Attendance</h1>
        <p className="text-[14px] text-[#666]">Based on the Cumulative Attendance section of the college portal.</p>
      </div>

      {/* Help */}
      <button onClick={() => setShowHelp(!showHelp)} className="w-full flex items-center gap-3 p-4 bg-[#111] border border-[#1A1A1A] rounded-2xl text-left transition-smooth hover:border-[#2A2A2C]">
        <Info size={16} className="text-[#666] shrink-0" />
        <div className="flex-1">
          <div className="text-[14px] text-[#B0B0B0]">Where do I find these numbers?</div>
          {!showHelp && <div className="text-[12px] text-[#555]">Learn how to locate the data in your portal</div>}
        </div>
        <span className="text-[12px] text-[#555]">{showHelp ? 'Hide' : 'Show'}</span>
      </button>
      {showHelp && (
        <div className="card p-5 text-[14px] text-[#949494] leading-relaxed space-y-2">
          <p>1. Open the <strong className="text-[#B0B0B0]">Attendance Details</strong> page in your college portal.</p>
          <p>2. The <strong className="text-[#B0B0B0]">subject-wise table</strong> appears at the top — that is for Subject Attendance.</p>
          <p>3. <strong className="text-[#B0B0B0]">Scroll down</strong> to find the box titled <strong className="text-[#B0B0B0]">Cumulative Attendance</strong>.</p>
          <p>4. Enter the monthly A, P and CL values shown there.</p>
          <p className="text-[12px] text-[#555] pt-2">These are two different views of your attendance. The app can compare them to help catch entry mistakes.</p>
        </div>
      )}

      {/* Cross-check */}
      {subjects.length > 0 && monthly.length > 0 && (
        <div className={`card p-4 flex items-start gap-3 ${crossCheck.matches ? 'border-[#22543D]' : 'border-[#78350F]'}`}>
          {crossCheck.matches ? <CheckCircle size={18} className="text-[#4ADE80] shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-[#FBBF24] shrink-0 mt-0.5" />}
          <div>
            <div className="text-[14px] text-[#E5E5E5]">{crossCheck.matches ? '✓ Attendance data matches' : 'Attendance totals don\'t match'}</div>
            {!crossCheck.matches && (
              <div className="text-[12px] text-[#949494] mt-1 space-y-0.5">
                <div>Subject: P {crossCheck.subjectTotals.present} · A {crossCheck.subjectTotals.absent} · CL {crossCheck.subjectTotals.cl}</div>
                <div>Cumulative: P {crossCheck.cumulativeTotals.present} · A {crossCheck.cumulativeTotals.absent} · CL {crossCheck.cumulativeTotals.cl}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cumulative summary */}
      {monthly.length > 0 && (
        <div className="card p-6">
          <div className="text-[11px] text-[#555] uppercase tracking-[0.12em] mb-3">Cumulative Total</div>
          <div className="font-[family-name:var(--font-newsreader)] text-4xl font-light text-[#FFFFFF] mb-4">{cumulative.percentage.toFixed(2)}%</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Present', value: cumulative.totalPresent, color: '#FFFFFF' },
              { label: 'Absent', value: cumulative.totalAbsent, color: '#949494' },
              { label: 'CL', value: cumulative.totalCL, color: '#666' },
              { label: 'Total', value: cumulative.totalHours, color: '#FFFFFF' },
            ].map(m => (
              <div key={m.label} className="text-center py-3 bg-[#0A0A0A] rounded-xl">
                <div className="text-lg font-[family-name:var(--font-newsreader)] tabular-nums" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend */}
      {sortedMonthly.length > 1 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-[#666]" />
            <h3 className="font-[family-name:var(--font-newsreader)] text-lg text-[#B0B0B0]">Trend</h3>
          </div>
          <div className="flex items-end gap-4 h-28">
            {sortedMonthly.map(m => {
              const pct = calculateMonthlyPercentage(m);
              const h = Math.max(12, (pct / 100) * 100);
              return (
                <div key={m.id} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-[#949494] tabular-nums">{pct.toFixed(1)}%</span>
                  <div className="w-full max-w-[36px] bg-[#0A0A0A] rounded-md overflow-hidden" style={{ height: `${h}%` }}>
                    <div className="w-full bg-[#333] rounded-md" style={{ height: '100%' }} />
                  </div>
                  <span className="text-[10px] text-[#555]">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#1A1A1A]">
          <h3 className="font-[family-name:var(--font-newsreader)] text-lg text-[#B0B0B0]">Monthly Entries</h3>
          <button onClick={() => { resetForm(); setShowAddForm(true); }} className="flex items-center gap-1.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold text-[12px] px-4 py-2 rounded-full transition-smooth">
            <Plus size={12} /> Add Month
          </button>
        </div>

        {showAddForm && (
          <div className="p-5 bg-[#0A0A0A] border-b border-[#1A1A1A]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div><label className={labelClass}>Month/Year</label><input type="text" placeholder="Jun-2026" value={formMonth} onChange={e => setFormMonth(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Present</label><input type="number" min="0" placeholder="0" value={formP} onChange={e => setFormP(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} /></div>
              <div><label className={labelClass}>Absent</label><input type="number" min="0" placeholder="0" value={formA} onChange={e => setFormA(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} /></div>
              <div><label className={labelClass}>CL</label><input type="number" min="0" placeholder="0" value={formCL} onChange={e => setFormCL(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} /></div>
            </div>
            {formError && <div className="text-[12px] text-[#F87171] mb-2">{formError}</div>}
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-[13px] text-[#666] hover:text-[#FFF] font-medium transition-smooth">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] text-[13px] font-semibold rounded-full transition-smooth">{editingId ? 'Save' : 'Add'}</button>
            </div>
          </div>
        )}

        {sortedMonthly.length === 0 && !showAddForm ? (
          <div className="p-8 text-center text-[14px] text-[#555]">No monthly data yet.</div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]">
            {sortedMonthly.map(m => {
              const pct = calculateMonthlyPercentage(m);
              const total = m.present + m.absent + m.cl;
              return (
                <div key={m.id} className="p-4 hover:bg-[#0A0A0A] transition-smooth">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] text-[#E5E5E5]">{m.month}</span>
                      <span className={`text-[14px] font-[family-name:var(--font-newsreader)] tabular-nums ${pct >= 80 ? 'text-[#4ADE80]' : pct >= 65 ? 'text-[#949494]' : 'text-[#F87171]'}`}>{pct.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(m)} className="px-2 py-1 text-[12px] text-[#666] hover:text-[#FFF] font-medium rounded transition-smooth">Edit</button>
                      <button onClick={() => onMonthlyChange(monthly.filter(x => x.id !== m.id))} className="p-1 text-[#444] hover:text-[#F87171] rounded transition-smooth"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[12px] text-[#666] mb-2">
                    <span>P: <strong className="text-[#B0B0B0]">{m.present}</strong></span>
                    <span>A: <strong className="text-[#B0B0B0]">{m.absent}</strong></span>
                    <span>CL: <strong className="text-[#B0B0B0]">{m.cl}</strong></span>
                    <span>Total: <strong className="text-[#B0B0B0]">{total}</strong></span>
                  </div>
                  <div className="w-full bg-[#0A0A0A] h-1 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-[#4ADE80]' : pct >= 65 ? 'bg-[#666]' : 'bg-[#F87171]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
