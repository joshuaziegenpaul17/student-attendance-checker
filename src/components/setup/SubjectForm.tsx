'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Subject, SubjectCategory, SUBJECT_CATEGORIES } from '@/types/attendance';
import { calculateAttendance, validateSubjectHours } from '@/lib/attendance/calculations';
import { X, Trash2, Check } from 'lucide-react';

interface SubjectFormProps {
  subject?: Subject;
  onSave: (subject: Subject) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function SubjectForm({ subject, onSave, onCancel, onDelete }: SubjectFormProps) {
  const [code, setCode] = useState(subject ? subject.code : '');
  const [name, setName] = useState(subject ? subject.name : '');
  const [category, setCategory] = useState<SubjectCategory>(subject ? subject.category || 'Other' : 'Other');
  const [totalHours, setTotalHours] = useState<number | ''>(subject ? subject.totalHours : '');
  const [presentHours, setPresentHours] = useState<number | ''>(subject ? subject.presentHours : '');
  const [absentHours, setAbsentHours] = useState<number | ''>(subject ? subject.absentHours : '');
  const [clHours, setClHours] = useState<number | ''>(subject ? subject.clHours : '');

  const t = totalHours === '' ? 0 : Number(totalHours);
  const p = presentHours === '' ? 0 : Number(presentHours);
  const a = absentHours === '' ? 0 : Number(absentHours);
  const c = clHours === '' ? 0 : Number(clHours);
  const sum = p + a + c;

  const validation = useMemo(() => {
    if (totalHours === '' && presentHours === '' && absentHours === '' && clHours === '') return { isValid: false, isComplete: false };
    if (t <= 0) return { isValid: false, isComplete: true, error: 'Total hours must be greater than zero.' };
    return { ...validateSubjectHours({ totalHours: t, presentHours: p, absentHours: a, clHours: c }), isComplete: true };
  }, [totalHours, presentHours, absentHours, clHours, t, p, a, c]);

  const percentage = useMemo(() => t > 0 ? calculateAttendance(p, t) : null, [p, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid || !name.trim()) return;
    onSave({ id: subject?.id || Math.random().toString(36).substring(2, 9), code: code.trim().toUpperCase(), name: name.trim(), category, totalHours: t, presentHours: p, absentHours: a, clHours: c });
  };

  const inputClass = "w-full bg-[#111111] border border-[#2A2A2C] focus:border-[#555] focus:ring-1 focus:ring-[#444] rounded-[10px] px-3 py-2.5 text-[#FFFFFF] text-[15px] outline-none transition-smooth placeholder:text-[#555]";
  const labelClass = "block text-[12px] font-medium text-[#949494] mb-1.5";

  return (
    <div className="bg-[#111111] border border-[#2A2A2C] rounded-2xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col animate-fade-in-scale">
      <div className="flex items-center justify-between p-5 border-b border-[#2A2A2C] shrink-0">
        <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#FFFFFF]">{subject ? 'Edit Subject' : 'Add Subject'}</h3>
        <button onClick={onCancel} className="p-2 text-[#666] hover:text-[#FFF] hover:bg-[#222] rounded-full transition-smooth"><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <label className={labelClass}>Code</label>
            <input type="text" placeholder="ST401" value={code} onChange={e => setCode(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>Subject Name *</label>
            <input type="text" placeholder="e.g. Multivariate Analysis" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as SubjectCategory)} className={inputClass}>
            {SUBJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Present</label>
            <input type="number" min="0" placeholder="0" value={presentHours}
              onChange={e => setPresentHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Absent</label>
            <input type="number" min="0" placeholder="0" value={absentHours}
              onChange={e => setAbsentHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CL</label>
            <input type="number" min="0" placeholder="0" value={clHours}
              onChange={e => setClHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className={labelClass}>Total</label>
              <button type="button" onClick={() => setTotalHours(sum)} className="text-[10px] text-[#666] hover:text-[#FFF] font-medium">Auto</button>
            </div>
            <input type="number" min="0" placeholder="0" value={totalHours}
              onChange={e => setTotalHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
          </div>
        </div>
        {validation.isComplete && (
          <div className={`flex items-center gap-2 text-[13px] px-4 py-2.5 rounded-full ${
            validation.isValid ? 'bg-[#0A2A1A] text-[#4ADE80]' : 'bg-[#2A0A0A] text-[#F87171]'
          }`}>
            {validation.isValid ? (
              <><Check size={14} className="shrink-0" /><span className="font-medium">{p} + {a} + {c} = {t}</span>
              {percentage !== null && <span className="ml-auto font-semibold">{percentage.toFixed(2)}%</span>}</>
            ) : <span className="font-medium">{validation.error}</span>}
          </div>
        )}
        <div className="flex gap-2 pt-3 border-t border-[#2A2A2C]">
          {subject && onDelete && (
            <button type="button" onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2.5 text-[#F87171] hover:bg-[#2A0A0A] rounded-full text-[14px] font-medium transition-smooth">
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" onClick={onCancel}
            className="flex-1 bg-[#18181A] hover:bg-[#222] text-[#B0B0B0] font-medium py-2.5 rounded-full text-[14px] transition-smooth">Cancel</button>
          <button type="submit" disabled={!validation.isValid || !name.trim()}
            className={`flex-1 font-semibold py-2.5 rounded-full text-[14px] transition-smooth ${
              validation.isValid && name.trim() ? 'bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000]' : 'bg-[#222] text-[#555] cursor-not-allowed'
            }`}>{subject ? 'Save Changes' : 'Add Subject'}</button>
        </div>
      </form>
    </div>
  );
}
