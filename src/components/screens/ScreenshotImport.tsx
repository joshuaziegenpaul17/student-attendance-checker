'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { Subject, MonthlyAttendance } from '@/types/attendance';
import type { GroqSubjectRow, GroqMonthRow, GroqParseResult } from '@/lib/attendance/groqTypes';
import { calcOverallPct, calcSubjectPct, validateRow, crossCheck } from '@/lib/attendance/attendanceCalc';
import { Upload, Check, AlertTriangle, Trash2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';

interface ScreenshotImportProps {
  onImport: (subjects: Subject[], monthly: MonthlyAttendance[]) => void;
  onCancel: () => void;
  onExit?: () => void;
}

type Stage = 'upload' | 'preview' | 'analyzing' | 'results' | 'error';

interface AnalysisStep { label: string; done: boolean; active: boolean }

export default function ScreenshotImport({ onImport, onExit }: ScreenshotImportProps) {
  const [stage, setStage]           = useState<Stage>('upload');
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setPreview]  = useState<string | null>(null);
  const [subjects, setSubjects]     = useState<GroqSubjectRow[]>([]);
  const [monthly, setMonthly]       = useState<GroqMonthRow[]>([]);
  const [reportedTotal, setRep]     = useState<GroqParseResult['attendanceDetails']['reportedTotal']>(null);
  const [error, setError]           = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [editIdx, setEditIdx]       = useState<number | null>(null);
  const [showHowTo, setShowHowTo]   = useState(false);
  const [isDragOver, setDragOver]   = useState(false);
  const [isAnalyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const resetToUpload = () => {
    setStage('upload'); setImageFile(null); setPreview(null);
    setSubjects([]); setMonthly([]); setRep(null);
    setError(''); setActiveStep(0); setEditIdx(null);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Please upload a JPG, PNG, or WEBP image.'); return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image too large — please use an image under 20 MB.'); return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setStage('preview');
    setError('');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true);  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);

  // ── Groq analysis ────────────────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!imageFile || isAnalyzing) return;
    setAnalyzing(true);
    setStage('analyzing');
    setActiveStep(0);

    const steps = [
      'Reading attendance table…',
      'Checking subject rows…',
      'Verifying totals…',
      'Ready for review',
    ];

    // Fake step progression while waiting for API
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 2);
      setActiveStep(stepIdx);
    }, 1800);

    try {
      const form = new FormData();
      form.append('image', imageFile);

      const res = await fetch('/api/attendance/parse', { method: 'POST', body: form });
      clearInterval(stepTimer);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error ?? 'Extraction failed');
      }

      const data = (await res.json()) as GroqParseResult;
      setSubjects(data.attendanceDetails.subjects);
      setMonthly(data.cumulativeAttendance.months);
      setRep(data.attendanceDetails.reportedTotal ?? null);
      setActiveStep(steps.length - 1);

      await new Promise(r => setTimeout(r, 600));
      setStage('results');
    } catch (err: unknown) {
      clearInterval(stepTimer);
      const msg = err instanceof Error ? err.message : 'AI extraction failed.';
      setError(msg);
      setStage('error');
    } finally {
      setAnalyzing(false);
    }
  }, [imageFile, isAnalyzing]);

  // ── Subject editing ──────────────────────────────────────────────────────────
  const updateSubject = (idx: number, patch: Partial<GroqSubjectRow>) => {
    setSubjects(prev => {
      const next = [...prev];
      const updated = { ...next[idx], ...patch };
      // recalculate percentage from raw values
      updated.displayedAttendancePercentage = updated.totalHours > 0
        ? Math.round(calcSubjectPct(updated.present, updated.totalHours) * 100) / 100
        : 0;
      next[idx] = updated;
      return next;
    });
  };

  const deleteSubject = (idx: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  const addSubject = () => {
    const newRow: GroqSubjectRow = {
      subjectCode: '', subjectDescription: 'New Subject',
      totalHours: 0, absent: 0, present: 0, cl: 0,
      displayedAttendancePercentage: 0,
    };
    setSubjects(prev => [...prev, newRow]);
    setEditIdx(subjects.length);
  };

  const updateMonthly = (idx: number, patch: Partial<GroqMonthRow>) => {
    setMonthly(prev => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });
  };

  // ── Import ────────────────────────────────────────────────────────────────────
  const handleImport = () => {
    const mappedSubjects: Subject[] = subjects
      .filter(s => s.subjectCode || s.subjectDescription)
      .map((s, i) => ({
        id: `imp-${i}-${Date.now()}`,
        code: s.subjectCode,
        name: s.subjectDescription,
        totalHours: s.totalHours,
        presentHours: s.present,
        absentHours: s.absent,
        clHours: s.cl,
      }));

    const mappedMonthly: MonthlyAttendance[] = monthly.map((m, i) => ({
      id: `mon-${i}-${Date.now()}`,
      month: `${m.month}-${m.year}`,
      absent: m.absent,
      present: m.present,
      cl: m.cl,
    }));

    onImport(mappedSubjects, mappedMonthly);
  };

  // ── UPLOAD STAGE ─────────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <div className="animate-slide-up">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">
              Upload Attendance Screenshot
            </h2>
            <p className="text-[13px] text-[#555]">
              Upload a clear screenshot of your Attendance Details page. We&apos;ll extract the attendance automatically.
            </p>
          </div>
          {onExit && (
            <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">
              Exit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT — dropzone */}
          <div className="flex flex-col gap-4">
            <div
              ref={dropRef}
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'flex flex-col items-center justify-center text-center min-h-[260px]',
                'rounded-2xl cursor-pointer border border-dashed transition-all duration-150 bg-[rgba(8,8,10,0.35)]',
                isDragOver ? 'border-[#4A90D9] bg-[rgba(74,144,217,0.04)]' : 'border-[#252528] hover:border-[#3A3A3E]',
              ].join(' ')}
            >
              <div className="flex flex-col items-center gap-4 px-8 py-10">
                <div className={['w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150', isDragOver ? 'bg-[#4A90D9]/15 text-[#4A90D9]' : 'bg-[#0E0E12] text-[#484850]'].join(' ')}>
                  <Upload size={19} />
                </div>
                <div>
                  <div className="text-[14px] text-[#B0B0B0] font-medium mb-1">Select Attendance Screenshot</div>
                  <div className="text-[12px] text-[#484850]">Drag &amp; drop or click to choose</div>
                </div>
                <div className="text-[10px] text-[#333336] tracking-widest uppercase">PNG &middot; JPG &middot; JPEG &middot; WEBP</div>
              </div>
              {/* NO capture attribute — opens Photos/Files on mobile, not camera */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-[#120606] border border-[#7F1D1D]/35 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-[#F87171] shrink-0" />
                <span className="text-[12px] text-[#F87171]">{error}</span>
              </div>
            )}

            <p className="text-[12px] text-[#3E3E46] leading-relaxed">
              Use a full or high-resolution screenshot where the table text is clearly readable.
            </p>

            <div className="space-y-1.5 text-[12px] text-[#484850]">
              {[
                '✓  Attendance Details table required',
                '✓  Cumulative Attendance table recommended',
                '✓  Keep subject rows fully visible',
                '✓  Avoid blurry or cropped screenshots',
              ].map((t, i) => <div key={i}>{t}</div>)}
            </div>
          </div>

          {/* RIGHT — info panel */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="text-[11px] text-[#444] uppercase tracking-[0.09em] font-semibold">What we&apos;ll extract</div>
              <div className="space-y-4">
                <div>
                  <div className="text-[13px] text-[#AAAAAA] font-medium mb-1">Attendance Details</div>
                  <div className="text-[12px] text-[#484850] pl-3 border-l border-[#1E1E22]">Subject-wise: Total Hours &middot; Absent &middot; Present &middot; CL &middot; Attendance %</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#AAAAAA] font-medium mb-1">Cumulative Attendance</div>
                  <div className="text-[12px] text-[#484850] pl-3 border-l border-[#1E1E22]">Month-wise: Present &middot; Absent &middot; CL</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#AAAAAA] font-medium mb-1">Review &amp; Edit</div>
                  <div className="text-[12px] text-[#484850] pl-3 border-l border-[#1E1E22]">Check and correct any detected values before importing.</div>
                </div>
              </div>
            </div>

            {/* Example table mockup */}
            <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(5,5,7,0.6)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#141418]">
                <span className="text-[9px] text-[#3A3A42] uppercase tracking-widest font-bold">Example &mdash; what to upload</span>
              </div>
              <div className="p-3 font-mono overflow-hidden">
                <div className="text-[8px] text-[#3b82f6] font-bold uppercase tracking-wider mb-2 opacity-70">Attendance Details</div>
                <div className="space-y-1.5 mb-3">
                  {[['PST3MC01','Multivariate Analysis','38','9','29','0','76.32%'],
                    ['PST3MC02','Stochastic Processes', '45','9','36','0','80.00%'],
                    ['PST3MC03','Statistical Computing','40','5','35','0','87.50%'],
                  ].map(([code,name,total,ab,pr,cl,pct]) => (
                    <div key={code} className="flex gap-2 text-[9px] text-[#2E2E36]">
                      <span className="text-[#3A3A46] w-16 shrink-0">{code}</span>
                      <span className="flex-1 truncate">{name}</span>
                      <span className="w-5 text-right">{total}</span>
                      <span className="w-4 text-right">{ab}</span>
                      <span className="w-4 text-right">{pr}</span>
                      <span className="w-4 text-right">{cl}</span>
                      <span className="w-12 text-right">{pct}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[8px] text-[#3b82f6] font-bold uppercase tracking-wider mb-2 opacity-70">Cumulative Attendance</div>
                <div className="space-y-1">
                  {[['Jun-2026','7','29'],['Jul-2026','12','71']].map(([m,ab,pr]) => (
                    <div key={m} className="flex gap-3 text-[9px] text-[#2E2E36]">
                      <span className="text-[#3A3A46] w-16">{m}</span>
                      <span>A {ab}</span><span>P {pr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <button onClick={() => setShowHowTo(!showHowTo)} className="flex items-center gap-2 text-[11px] text-[#444] hover:text-[#777] transition-all duration-150">
                {showHowTo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                How do I find this screenshot?
              </button>
              {showHowTo && (
                <div className="mt-3 pl-4 space-y-1.5 text-[12px] text-[#484850]">
                  {['Log in to your college student portal.','Go to the Attendance section.','Open Attendance Details.','Take a full-screen screenshot.','Upload it here.'].map((s,i) => (
                    <div key={i} className="flex gap-2.5"><span className="text-[#2E2E36] shrink-0">{i+1}.</span><span>{s}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PREVIEW STAGE ────────────────────────────────────────────────────────────
  if (stage === 'preview') {
    return (
      <div className="animate-slide-up space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Preview Screenshot</h2>
            <p className="text-[13px] text-[#555]">Review your image before analysis.</p>
          </div>
          {onExit && <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>}
        </div>
        <div className="rounded-2xl overflow-hidden border border-[#1A1A1E] bg-[rgba(8,8,10,0.4)]">
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Attendance screenshot preview" className="w-full max-h-[420px] object-contain" />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={resetToUpload} className="flex-1 bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#666] hover:text-[#AAA] font-medium py-3 rounded-full text-[14px] transition-all duration-150">Change Image</button>
          <button onClick={analyze} disabled={isAnalyzing} className="flex-1 bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
            Analyze Screenshot
          </button>
        </div>
      </div>
    );
  }

  // ── ANALYZING STAGE ──────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    const steps: AnalysisStep[] = [
      'Reading attendance table…',
      'Checking subject rows…',
      'Verifying totals…',
      'Ready for review',
    ].map((label, i) => ({
      label,
      done: i < activeStep,
      active: i === activeStep,
    }));

    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Reading your attendance&hellip;</h2>
            <p className="text-[13px] text-[#555]">AI is analysing the screenshot. This takes a few seconds.</p>
          </div>
          {onExit && <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>}
        </div>
        <div className="rounded-2xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.35)] p-6 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={['w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200', s.done ? 'bg-[#4ADE80]/15 text-[#4ADE80]' : s.active ? 'bg-[#4A90D9]/15 text-[#4A90D9]' : 'bg-[#0E0E12]'].join(' ')}>
                {s.done ? <Check size={11} /> : s.active ? <div className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#222226]" />}
              </div>
              <span className={['text-[13px] transition-all duration-200', s.done ? 'text-[#666]' : s.active ? 'text-[#DDDDDD]' : 'text-[#2E2E36]'].join(' ')}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-[#0A0A0E] h-[3px] rounded-full overflow-hidden">
          <div className="h-full bg-[#4A90D9] rounded-full transition-all duration-700" style={{ width: `${Math.min((activeStep / 3) * 100, 90)}%` }} />
        </div>
      </div>
    );
  }

  // ── ERROR STAGE ──────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#FFFFFF] font-light mb-1">Couldn&apos;t read screenshot</h2>
            <p className="text-[13px] text-[#555]">{error}</p>
          </div>
          {onExit && <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] border border-[#2A2A2C] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>}
        </div>
        <div className="rounded-2xl border border-[#2A1010] bg-[rgba(18,5,5,0.3)] p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-11 h-11 rounded-full bg-[#1A0505] border border-[#7F1D1D]/35 flex items-center justify-center">
            <AlertTriangle size={18} className="text-[#F87171]" />
          </div>
          <div>
            <div className="text-[14px] text-[#CCCCCC] font-medium mb-1">Analysis failed</div>
            <div className="text-[12px] text-[#555] max-w-xs mx-auto">Try a clearer, full-screen screenshot with all table rows visible and readable text.</div>
          </div>
        </div>
        <button onClick={resetToUpload} className="w-full bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#666] hover:text-[#AAA] font-medium py-3 rounded-full text-[14px] transition-all duration-150">
          Try Another Image
        </button>
      </div>
    );
  }

  // ── RESULTS STAGE ─────────────────────────────────────────────────────────────
  const overallPct   = calcOverallPct(subjects);
  const totalP       = subjects.reduce((s, r) => s + r.present,    0);
  const totalA       = subjects.reduce((s, r) => s + r.absent,     0);
  const totalCL      = subjects.reduce((s, r) => s + r.cl,         0);
  const totalH       = subjects.reduce((s, r) => s + r.totalHours, 0);
  const rowVals      = subjects.map(validateRow);
  const allRowsValid = rowVals.every(v => v.valid);
  const check        = crossCheck(subjects, monthly, reportedTotal ?? null);
  const canImport    = subjects.length > 0 && allRowsValid && check.subjectsMatchMonthly;

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start pb-5 border-b border-[#141418]">
        <div>
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Attendance Found</h2>
          <p className="text-[13px] text-[#555]">Review and correct the extracted values before importing.</p>
        </div>
        {onExit && <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-5 rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.4)] divide-x divide-[#1A1A1E]">
        {[
          { label: 'Subjects', value: subjects.length,   color: undefined },
          { label: 'Present',  value: totalP,            color: undefined },
          { label: 'Absent',   value: totalA,            color: undefined },
          { label: 'CL',       value: totalCL,           color: undefined },
          { label: 'Overall',  value: `${overallPct.toFixed(2)}%`,
            color: overallPct >= 75 ? '#4ADE80' : overallPct >= 60 ? '#FBBF24' : '#F87171' },
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <span className="text-[9px] text-[#444] uppercase tracking-[0.09em] font-semibold mb-1">{item.label}</span>
            <span className="font-[family-name:var(--font-newsreader)] text-[18px] md:text-[20px] font-normal leading-none" style={{ color: item.color ?? '#FFFFFF' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Attendance Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] text-[#CCCCCC] font-medium">Attendance Details</h3>
            <p className="text-[12px] text-[#444] mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} detected</p>
          </div>
          <button onClick={addSubject} className="text-[12px] text-[#4A90D9] hover:text-[#7AB8F5] transition-all duration-150 font-medium">+ Add Subject</button>
        </div>

        <div className="space-y-2">
          {subjects.map((sub, i) => {
            const isEditing = editIdx === i;
            const val = rowVals[i];
            const pct = calcSubjectPct(sub.present, sub.totalHours);

            if (!isEditing) {
              return (
                <div key={i} className={['rounded-xl border transition-all duration-150', val.valid ? 'border-[#1A1A1E] bg-[rgba(8,8,10,0.35)] hover:border-[#26262C]' : 'border-[#78350F]/40 bg-[rgba(24,12,0,0.3)]'].join(' ')}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className={['w-1.5 h-1.5 rounded-full shrink-0', val.valid ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]'].join(' ')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-[#DDDDDD] font-medium truncate leading-snug">{sub.subjectDescription || 'Unknown Subject'}</div>
                      <div className="text-[11px] text-[#484850] font-mono mt-0.5">
                        {sub.subjectCode || '—'} &middot; {sub.present}P &middot; {sub.absent}A &middot; {sub.cl > 0 ? `${sub.cl} CL &middot; ` : ''}{sub.totalHours} Total
                      </div>
                      {!val.valid && <div className="text-[11px] text-[#FBBF24] mt-0.5">&#9888; {val.issue}</div>}
                    </div>
                    <div className={['text-[13px] font-semibold tabular-nums shrink-0', pct >= 75 ? 'text-[#4ADE80]' : pct >= 60 ? 'text-[#FBBF24]' : 'text-[#F87171]'].join(' ')}>
                      {pct.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditIdx(i)} className="flex items-center gap-1.5 text-[12px] text-[#555] hover:text-[#4A90D9] border border-[#222226] hover:border-[#4A90D9]/40 px-3 py-1 rounded-full transition-all duration-150">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => deleteSubject(i)} className="p-1.5 text-[#3A3A3E] hover:text-[#F87171] transition-all duration-150">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Editing card
            return (
              <div key={i} className="rounded-xl border border-[#4A90D9]/30 bg-[rgba(8,8,12,0.5)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1E]">
                  <span className="text-[11px] text-[#4A90D9] font-semibold uppercase tracking-wider">Editing</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditIdx(null)} className="flex items-center gap-1.5 text-[12px] bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000] font-semibold px-4 py-1 rounded-full transition-all duration-150">
                      <Check size={12} /> Done
                    </button>
                    <button onClick={() => { setEditIdx(null); deleteSubject(i); }} className="p-1.5 text-[#3A3A3E] hover:text-[#F87171] transition-all duration-150">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Code</label>
                      <input value={sub.subjectCode} onChange={e => updateSubject(i, { subjectCode: e.target.value })}
                        className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150 font-mono" />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Subject Name</label>
                      <input value={sub.subjectDescription} onChange={e => updateSubject(i, { subjectDescription: e.target.value })}
                        className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { label: 'Total',   key: 'totalHours' as const },
                      { label: 'Present', key: 'present'    as const },
                      { label: 'Absent',  key: 'absent'     as const },
                      { label: 'CL',      key: 'cl'         as const },
                    ] as { label: string; key: keyof Pick<GroqSubjectRow, 'totalHours'|'present'|'absent'|'cl'> }[]).map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-[#444] uppercase tracking-[0.08em] font-semibold mb-1.5 block">{f.label}</label>
                        <input type="number" min="0" value={sub[f.key] as number}
                          onChange={e => { const v = parseInt(e.target.value); updateSubject(i, { [f.key]: isNaN(v) ? 0 : v }); }}
                          className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150 tabular-nums" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[12px] bg-[#06060A] rounded-lg px-3 py-2 border border-[#141418]">
                    <span className="text-[#444]">Attendance</span>
                    <span className={['font-semibold tabular-nums', calcSubjectPct(sub.present,sub.totalHours) >= 75 ? 'text-[#4ADE80]' : 'text-[#FBBF24]'].join(' ')}>
                      {calcSubjectPct(sub.present, sub.totalHours).toFixed(2)}%
                    </span>
                  </div>
                  {rowVals[i] && !rowVals[i].valid && (
                    <div className="text-[11px] text-[#FBBF24] bg-[#78350F]/10 border border-[#78350F]/25 px-3 py-2 rounded-lg">
                      &#9888; {rowVals[i].issue}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {subjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#222226] bg-[rgba(8,8,10,0.2)] p-8 text-center">
            <p className="text-[13px] text-[#444]">No subjects detected. You can add them manually.</p>
          </div>
        )}
      </div>

      {/* Cumulative Attendance */}
      {monthly.length > 0 && (
        <div className="space-y-3 pt-5 border-t border-[#141418]">
          <div>
            <h3 className="text-[15px] text-[#CCCCCC] font-medium">Cumulative Attendance</h3>
            <p className="text-[12px] text-[#444] mt-0.5">Monthly breakdown &mdash; edit if incorrect</p>
          </div>
          <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.35)] divide-y divide-[#111115]">
            {monthly.map((m, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="text-[13px] text-[#777] font-medium w-24 shrink-0">{m.month} {m.year}</span>
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {([
                    { label: 'A', field: 'absent'  as const, cls: 'text-[#F87171]' },
                    { label: 'P', field: 'present' as const, cls: 'text-[#B0B0B0]' },
                    { label: 'CL', field: 'cl'     as const, cls: 'text-[#555]' },
                  ]).map(({ label, field, cls }) => (
                    <div key={field} className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase ${cls}`}>{label}</span>
                      <input type="number" min="0" value={m[field]}
                        onChange={e => { const v = parseInt(e.target.value); updateMonthly(i, { [field]: isNaN(v) ? 0 : v }); }}
                        className="w-11 bg-[#06060A] border border-[#1E1E22] focus:border-[#4A90D9]/40 rounded px-1.5 py-0.5 text-[12px] text-[#FFF] text-center outline-none transition-all duration-150" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* Monthly totals */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[rgba(255,255,255,0.02)]">
              <span className="text-[12px] text-[#666] font-semibold w-24 shrink-0">Total</span>
              <div className="flex gap-5 text-[12px]">
                <span className="text-[#F87171]">A {check.monthlyTotals.absent}</span>
                <span className="text-[#B0B0B0]">P {check.monthlyTotals.present}</span>
                {check.monthlyTotals.cl > 0 && <span className="text-[#555]">CL {check.monthlyTotals.cl}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation */}
      <div className="space-y-2 pt-1">
        {!allRowsValid && (
          <div className="flex items-start gap-3 bg-[#100A04] border border-[#78350F]/40 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-[#FBBF24] shrink-0 mt-0.5" />
            <div>
              <span className="text-[13px] text-[#FBBF24] font-medium block">Some values need review before import.</span>
              <span className="text-[11px] text-[#7A5C30]">Fix the highlighted rows above, then import.</span>
            </div>
          </div>
        )}
        {allRowsValid && !check.subjectsMatchMonthly && monthly.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-start gap-3 bg-[#100A04] border border-[#78350F]/40 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-[#FBBF24] shrink-0 mt-0.5" />
              <span className="text-[13px] text-[#FBBF24] font-medium">Subject totals and monthly totals don&apos;t match.</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] px-1">
              <div><div className="text-[10px] text-[#444] uppercase tracking-[0.08em] mb-1">Subject totals</div>
                <div className="text-[#666]">P {check.subjectTotals.present} &middot; A {check.subjectTotals.absent} &middot; CL {check.subjectTotals.cl}</div></div>
              <div><div className="text-[10px] text-[#444] uppercase tracking-[0.08em] mb-1">Monthly totals</div>
                <div className="text-[#666]">P {check.monthlyTotals.present} &middot; A {check.monthlyTotals.absent} &middot; CL {check.monthlyTotals.cl}</div></div>
            </div>
          </div>
        )}
        {canImport && (
          <div className="flex items-center gap-3 bg-[#071510] border border-[#14532D]/40 rounded-xl px-4 py-3">
            <Check size={15} className="text-[#4ADE80] shrink-0" />
            <span className="text-[13px] text-[#4ADE80] font-medium">Attendance totals match &mdash; ready to import.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-2 border-t border-[#141418]">
        <button onClick={resetToUpload} className="flex-1 bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#666] hover:text-[#AAA] font-medium py-3 rounded-full text-[14px] transition-all duration-150">
          Back
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <button onClick={handleImport} disabled={!canImport}
            className={['w-full font-semibold py-3 rounded-full text-[14px] transition-all duration-150', canImport ? 'bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000]' : 'bg-[#111114] text-[#333] cursor-not-allowed'].join(' ')}>
            Import Attendance
          </button>
          {!canImport && (
            <p className="text-[11px] text-[#444] text-center">Review the highlighted rows before importing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
