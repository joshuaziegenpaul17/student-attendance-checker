'use client';

import React, { useState, useMemo } from 'react';
import { CGPAData, CGPASemester, CGPACategory, CGPASubject, SubjectCategory, SUBJECT_CATEGORIES } from '@/types/attendance';
import { calculateSemesterGPA, calculateCGPA, getGradeFromMarks, getCategoryTotalCredits, countCategorySubjects } from '@/lib/attendance/calculations';
import { Plus, Trash2, ChevronDown, ChevronRight, Calculator, GraduationCap, Edit3, Award } from 'lucide-react';

interface CGPAScreenProps { cgpaData: CGPAData; onCGPAChange: (data: CGPAData) => void; }

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export default function CGPAScreen({ cgpaData, onCGPAChange }: CGPAScreenProps) {
  const [activeSemId, setActiveSemId] = useState<string | null>(cgpaData.semesters.length > 0 ? cgpaData.semesters[0].id : null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);

  const [fName, setFName] = useState(''); const [fCode, setFCode] = useState('');
  const [fCredits, setFCredits] = useState<number | ''>('');
  const [fMarks, setFMarks] = useState<number | ''>('');
  const [fCat, setFCat] = useState<SubjectCategory>('Major Core');
  const [fError, setFError] = useState('');

  const cgpaResult = useMemo(() => calculateCGPA(cgpaData.semesters, true), [cgpaData]);
  const activeSem = cgpaData.semesters.find(s => s.id === activeSemId) || null;

  const toggleCat = (id: string) => setExpandedCats(prev => {
    const n = new Set(prev);
    if (n.has(id)) {
      n.delete(id);
    } else {
      n.add(id);
    }
    return n;
  });
  const resetForm = () => { setFName(''); setFCode(''); setFCredits(''); setFMarks(''); setFError(''); setEditingSub(null); setShowAddSub(null); };

  const addSem = () => {
    const n = cgpaData.semesters.length + 1;
    const y = Math.ceil(n / 2); const ry = y === 1 ? 'I' : y === 2 ? 'II' : String(y);
    const sem: CGPASemester = { id: generateId('sem'), label: `Semester ${n}`, year: `Year ${ry}`, categories: [] };
    onCGPAChange({ semesters: [...cgpaData.semesters, sem] }); setActiveSemId(sem.id);
  };

  const addCatWithName = (name: SubjectCategory) => {
    if (!activeSem) return;
    const cat: CGPACategory = { id: generateId('cat'), name, includeInGPA: true, includeInCGPA: true, subjects: [] };
    onCGPAChange({ semesters: cgpaData.semesters.map(s => s.id === activeSemId ? { ...s, categories: [...s.categories, cat] } : s) });
    setExpandedCats(prev => new Set(prev).add(cat.id)); setShowAddCat(false);
  };

  const delCat = (cid: string) => { if (!activeSem) return; onCGPAChange({ semesters: cgpaData.semesters.map(s => s.id === activeSemId ? { ...s, categories: s.categories.filter(c => c.id !== cid) } : s) }); };
  const toggleIncl = (cid: string, f: 'includeInGPA' | 'includeInCGPA') => { if (!activeSem) return; onCGPAChange({ semesters: cgpaData.semesters.map(s => s.id === activeSemId ? { ...s, categories: s.categories.map(c => c.id === cid ? { ...c, [f]: !c[f] } : c) } : s) }); };

  const saveSub = (cid: string) => {
    if (!activeSem || !fName.trim()) { setFError('Name required.'); return; }
    if (fCredits === '' || Number(fCredits) <= 0) { setFError('Credits > 0.'); return; }
    if (fMarks === '' || Number(fMarks) < 0 || Number(fMarks) > 100) { setFError('Marks 0–100.'); return; }
    const gp = getGradeFromMarks(Number(fMarks));
    const sub: CGPASubject = { id: editingSub || generateId('sub'), name: fName.trim(), code: fCode.trim().toUpperCase(), credits: Number(fCredits), marks: Number(fMarks), gradePoint: gp.gradePoint, letterGrade: gp.letterGrade };
    onCGPAChange({ semesters: cgpaData.semesters.map(s => s.id === activeSemId ? { ...s, categories: s.categories.map(c => c.id === cid ? { ...c, subjects: editingSub ? c.subjects.map(x => x.id === editingSub ? sub : x) : [...c.subjects, sub] } : c) } : s) });
    resetForm();
  };

  const startEdit = (sub: CGPASubject) => { setEditingSub(sub.id); setFName(sub.name); setFCode(sub.code); setFCredits(sub.credits); setFMarks(sub.marks); setShowAddSub(null); };
  const delSub = (cid: string, sid: string) => { if (!activeSem) return; onCGPAChange({ semesters: cgpaData.semesters.map(s => s.id === activeSemId ? { ...s, categories: s.categories.map(c => c.id === cid ? { ...c, subjects: c.subjects.filter(x => x.id !== sid) } : c) } : s) }); };
  const delSem = (sid: string) => { const u = cgpaData.semesters.filter(s => s.id !== sid); onCGPAChange({ semesters: u }); if (activeSemId === sid) setActiveSemId(u.length > 0 ? u[0].id : null); };

  const availCats = activeSem ? SUBJECT_CATEGORIES.filter(c => !activeSem.categories.some(ec => ec.name === c)) : [];
  const inputCls = "w-full bg-[#0A0A0A] border border-[#2A2A2C] focus:border-[#555] rounded-[10px] px-3 py-2 text-[#FFF] text-[14px] outline-none transition-smooth placeholder:text-[#444]";
  const lblCls = "block text-[11px] text-[#666] mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFF] font-light mb-2">Academic Performance</h1><p className="text-[14px] text-[#666]">GPA / CGPA calculator.</p></div>

      {/* CGPA Card */}
      <div className="p-6 rounded-2xl border border-[#1A1A1A] bg-gradient-to-br from-[#111] to-[#0A0A0A]">
        <div className="flex items-center gap-3 mb-3">
          <Award size={20} className="text-[#666]" />
          <div className="text-[12px] text-[#666] uppercase tracking-[0.12em]">Cumulative GPA</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-newsreader)] text-5xl font-light text-[#FFF] tabular-nums">{cgpaResult.cgpa > 0 ? cgpaResult.cgpa.toFixed(2) : '—'}</span>
          <span className="text-[16px] text-[#555]">/ 10</span>
        </div>
        {cgpaResult.totalCredits > 0 && <div className="flex gap-4 text-[13px] text-[#666] mt-2"><span>Credits: {cgpaResult.totalCredits}</span><span>Semesters: {cgpaData.semesters.length}</span></div>}
      </div>

      {/* Semester tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cgpaData.semesters.map(sem => { const g = calculateSemesterGPA(sem.categories, true); return (
          <button key={sem.id} onClick={() => { setActiveSemId(sem.id); resetForm(); }}
            className={`shrink-0 px-4 py-2.5 rounded-full text-[13px] font-medium transition-smooth border ${activeSemId === sem.id ? 'bg-[#FFF] text-[#000] border-[#FFF]' : 'bg-[#111] text-[#949494] border-[#2A2A2C] hover:border-[#555]'}`}>
            <div>{sem.label}</div>
            {g.gpa > 0 && <div className={`text-[10px] ${activeSemId === sem.id ? 'text-[#666]' : 'text-[#555]'}`}>GPA {g.gpa.toFixed(2)}</div>}
          </button>
        ); })}
        <button onClick={addSem} className="shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-full text-[13px] text-[#666] hover:text-[#FFF] border border-dashed border-[#333] hover:border-[#555] transition-smooth">
          <Plus size={14} /> Add
        </button>
      </div>

      {activeSem ? (
        <div className="space-y-4">
          {(() => { const g = calculateSemesterGPA(activeSem.categories, true); return g.totalCredits > 0 ? (
            <div className="card p-4"><div className="text-[11px] text-[#4ADE80] uppercase tracking-[0.12em] mb-1">Semester GPA</div>
              <div className="flex items-baseline justify-between"><span className="font-[family-name:var(--font-newsreader)] text-3xl text-[#FFF] tabular-nums">{g.gpa.toFixed(2)}</span>
                <div className="text-right text-[13px] text-[#666]"><div>{g.totalCredits} credits</div><div className="text-[11px] text-[#555]">Σ(C×G) = {g.weightedPoints.toFixed(1)}</div></div></div></div>
          ) : null; })()}

          {activeSem.categories.map(cat => {
            const exp = expandedCats.has(cat.id);
            const cnt = countCategorySubjects(cat); const cr = getCategoryTotalCredits(cat);
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-3 flex-1 text-left -mx-1 px-1 py-1 rounded-lg hover:bg-[#1A1A1A] transition-smooth">
                    <span className="text-[#555]">{exp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] text-[#E5E5E5]">{cat.name}</span>
                        {!cat.includeInGPA && <span className="text-[9px] text-[#555] bg-[#1A1A1A] px-2 py-0.5 rounded-full">Excluded</span>}
                      </div>
                      <div className="text-[11px] text-[#555] mt-0.5">{cnt} {cnt === 1 ? 'subject' : 'subjects'}{cr > 0 && ` · ${cr} credits`}</div>
                    </div>
                  </button>
                  <button onClick={() => delCat(cat.id)} className="p-1.5 text-[#333] hover:text-[#F87171] rounded-full transition-smooth"><Trash2 size={13} /></button>
                </div>
                {exp && (
                  <div className="border-t border-[#1A1A1A]">
                    <div className="flex gap-2 px-4 py-2 bg-[#0A0A0A] border-b border-[#1A1A1A]">
                      <button onClick={() => toggleIncl(cat.id, 'includeInGPA')} className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-smooth ${cat.includeInGPA ? 'bg-[#0A2A1A] text-[#4ADE80]' : 'text-[#555]'}`}>{cat.includeInGPA ? '✓' : '✗'} GPA</button>
                      <button onClick={() => toggleIncl(cat.id, 'includeInCGPA')} className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-smooth ${cat.includeInCGPA ? 'bg-[#0A2A1A] text-[#4ADE80]' : 'text-[#555]'}`}>{cat.includeInCGPA ? '✓' : '✗'} CGPA</button>
                    </div>
                    {cat.subjects.length === 0 && showAddSub !== cat.id ? (
                      <div className="px-4 py-4 text-center text-[12px] text-[#555]">No subjects added</div>
                    ) : (
                      <div className="divide-y divide-[#1A1A1A]">
                        {cat.subjects.map(sub => {
                          if (editingSub === sub.id) return (
                            <div key={sub.id} className="p-3 bg-[#0A0A0A]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                <div><label className={lblCls}>Name</label><input type="text" value={fName} onChange={e => setFName(e.target.value)} className={inputCls} /></div>
                                <div><label className={lblCls}>Code</label><input type="text" value={fCode} onChange={e => setFCode(e.target.value)} className={inputCls} /></div>
                                <div><label className={lblCls}>Credits</label><input type="number" min="0" step="0.5" value={fCredits} onChange={e => setFCredits(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} className={inputCls} /></div>
                                <div><label className={lblCls}>Marks</label><input type="number" min="0" max="100" value={fMarks} onChange={e => setFMarks(e.target.value === '' ? '' : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className={inputCls} /></div>
                              </div>
                              {fMarks !== '' && <div className="text-[11px] text-[#666] mb-2">Grade: <strong className="text-[#B0B0B0]">{getGradeFromMarks(Number(fMarks)).letterGrade}</strong> ({getGradeFromMarks(Number(fMarks)).gradePoint})</div>}
                              {fError && <div className="text-[11px] text-[#F87171] mb-2">{fError}</div>}
                              <div className="flex gap-2"><button onClick={resetForm} className="px-3 py-1.5 text-[12px] text-[#666] font-medium">Cancel</button><button onClick={() => saveSub(cat.id)} className="px-4 py-1.5 bg-[#FFF] text-[#000] text-[12px] font-semibold rounded-full">Save</button></div>
                            </div>
                          );
                          return (
                            <div key={sub.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[#0A0A0A] transition-smooth">
                              <div className="flex-1 min-w-0"><div className="text-[14px] text-[#E5E5E5] truncate">{sub.name}</div><div className="text-[11px] text-[#555]">{sub.code || '—'} · {sub.credits} cr</div></div>
                              <div className="text-right shrink-0"><div className="text-[14px] text-[#B0B0B0] tabular-nums">{sub.marks}%</div><div className="text-[10px] text-[#555]">{sub.letterGrade} · {sub.gradePoint.toFixed(1)}</div></div>
                              <div className="flex gap-1 shrink-0"><button onClick={() => startEdit(sub)} className="p-1 text-[#444] hover:text-[#B0B0B0] rounded"><Edit3 size={12} /></button><button onClick={() => delSub(cat.id, sub.id)} className="p-1 text-[#444] hover:text-[#F87171] rounded"><Trash2 size={12} /></button></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {showAddSub === cat.id ? (
                      <div className="p-3 border-t border-[#1A1A1A] bg-[#0A0A0A]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          <div><label className={lblCls}>Name *</label><input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="Subject name" className={inputCls} /></div>
                          <div><label className={lblCls}>Code</label><input type="text" value={fCode} onChange={e => setFCode(e.target.value)} placeholder="ST3MC01" className={inputCls} /></div>
                          <div><label className={lblCls}>Credits</label><input type="number" min="0" step="0.5" value={fCredits} onChange={e => setFCredits(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} placeholder="4" className={inputCls} /></div>
                          <div><label className={lblCls}>Marks (0–100)</label><input type="number" min="0" max="100" value={fMarks} onChange={e => setFMarks(e.target.value === '' ? '' : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} placeholder="85" className={inputCls} /></div>
                        </div>
                        {fMarks !== '' && <div className="text-[11px] text-[#666] mb-2">→ {getGradeFromMarks(Number(fMarks)).letterGrade} ({getGradeFromMarks(Number(fMarks)).gradePoint})</div>}
                        {fError && <div className="text-[11px] text-[#F87171] mb-2">{fError}</div>}
                        <div className="flex gap-2"><button onClick={resetForm} className="px-3 py-1.5 text-[12px] text-[#666] font-medium">Cancel</button><button onClick={() => saveSub(cat.id)} className="px-4 py-1.5 bg-[#FFF] text-[#000] text-[12px] font-semibold rounded-full">Add</button></div>
                      </div>
                    ) : (
                      <button onClick={() => { resetForm(); setShowAddSub(cat.id); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] text-[#666] hover:text-[#FFF] transition-smooth"><Plus size={13} /> Add Subject</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {showAddCat ? (
            <div className="card p-4"><div className="text-[12px] text-[#666] mb-2">Select category:</div>
              <div className="flex flex-wrap gap-2 mb-3">{availCats.map(c => <button key={c} onClick={() => addCatWithName(c)} className="px-3 py-1.5 bg-[#18181A] border border-[#2A2A2C] hover:border-[#555] rounded-full text-[12px] text-[#B0B0B0] transition-smooth">{c}</button>)}{availCats.length === 0 && <span className="text-[12px] text-[#555]">All added</span>}</div>
              <button onClick={() => setShowAddCat(false)} className="text-[12px] text-[#666]">Cancel</button>
            </div>
          ) : availCats.length > 0 && (
            <button onClick={() => setShowAddCat(true)} className="w-full card p-3 flex items-center justify-center gap-2 text-[12px] text-[#666] hover:text-[#FFF] border-dashed border-[#2A2A2C] hover:border-[#555] transition-smooth">
              <Plus size={13} /> Add Category
            </button>
          )}

          <button onClick={() => delSem(activeSemId!)} className="text-[12px] text-[#444] hover:text-[#F87171] transition-smooth">Delete this semester</button>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <GraduationCap size={32} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#B0B0B0] mb-2">No semesters yet</h3>
          <p className="text-[14px] text-[#666] mb-6">Add semesters and subjects to calculate GPA/CGPA.</p>
          <button onClick={addSem} className="bg-[#FFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 px-8 rounded-full text-[14px] transition-smooth">Add First Semester</button>
        </div>
      )}

      <div className="card p-4"><p className="text-[12px] text-[#555] leading-relaxed"><strong className="text-[#949494]">Grade Scale:</strong> O(10) · A+(9) · A(8) · B+(7) · B(6) · C(5) · D(4) · E(3) · F(0). Categories with <strong className="text-[#949494]">includeInGPA</strong> unchecked are excluded from calculation.</p></div>
    </div>
  );
}
