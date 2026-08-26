'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Subject, MonthlyAttendance } from '@/types/attendance';
import { performOCR, OCRProgress } from '@/lib/attendance/ocrService';
import { parseOCRText, parsedSubjectsToSubjects, parsedMonthlyToMonthly, ParsedSubject, ParsedMonthly, ParseResult } from '@/lib/attendance/tableParser';
import { Upload, Check, AlertTriangle, Edit3, Trash2, Plus, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface ScreenshotImportProps {
  onImport: (subjects: Subject[], monthly: MonthlyAttendance[]) => void;
  onCancel: () => void;
}

type ImportStage = 'upload' | 'preview' | 'analyzing' | 'results' | 'error';

export default function ScreenshotImport({ onImport, onCancel }: ScreenshotImportProps) {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<OCRProgress>({ stage: 'reading', message: '', progress: 0 });
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editSubjects, setEditSubjects] = useState<ParsedSubject[]>([]);
  const [editMonthly, setEditMonthly] = useState<ParsedMonthly[]>([]);
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image is too large. Please upload an image under 20MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStage('preview');
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setStage('analyzing');

    try {
      const ocrResult = await performOCR(imageFile, setProgress);
      const parsed = parseOCRText(ocrResult.text, ocrResult.lines, ocrResult.words);
      setParseResult(parsed);
      setEditSubjects([...parsed.subjects]);
      setEditMonthly([...parsed.monthly]);
      setStage('results');
    } catch (err) {
      setError('Failed to analyze the image. Please try another screenshot or enter data manually.');
      setStage('error');
    }
  }, [imageFile]);

  const updateSubject = (index: number, field: keyof ParsedSubject, value: string | number) => {
    setEditSubjects(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Recalculate validation
      const s = next[index];
      const sum = s.presentHours + s.absentHours + s.clHours;
      const pct = s.totalHours > 0 ? (s.presentHours / s.totalHours) * 100 : 0;
      next[index] = {
        ...s,
        attendancePercentage: Math.round(pct * 100) / 100,
        issues: Math.abs(sum - s.totalHours) > 2 ? [`Values sum to ${sum}, expected ${s.totalHours}`] : [],
        confidence: Math.abs(sum - s.totalHours) <= 2 ? 'high' : Math.abs(sum - s.totalHours) <= 5 ? 'medium' : 'low',
      };
      return next;
    });
  };

  const deleteSubject = (index: number) => {
    setEditSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const addSubject = () => {
    setEditSubjects(prev => [...prev, {
      subjectCode: '',
      subjectName: '',
      totalHours: 0,
      presentHours: 0,
      absentHours: 0,
      clHours: 0,
      attendancePercentage: 0,
      confidence: 'low',
      issues: [],
    }]);
  };

  const handleImport = () => {
    const subjects = parsedSubjectsToSubjects(editSubjects.filter(s => s.subjectCode || s.subjectName));
    const monthly = parsedMonthlyToMonthly(editMonthly);
    onImport(subjects, monthly);
  };

  // ─── Upload Stage ─────────────────────────────────
  if (stage === 'upload') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl text-[#FFFFFF] font-light mb-2">
            Upload Attendance Screenshot
          </h2>
          <p className="text-[14px] text-[#949494]">
            Don&apos;t want to enter subjects manually? Upload a screenshot of your Attendance Details table.
          </p>
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2A2A2C] hover:border-[#555] rounded-2xl p-10 text-center cursor-pointer transition-smooth group"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#111] border border-[#2A2A2C] flex items-center justify-center group-hover:border-[#555] transition-smooth">
              <Upload size={24} className="text-[#666] group-hover:text-[#B0B0B0] transition-smooth" />
            </div>
            <div>
              <div className="text-[16px] text-[#B0B0B0] font-medium mb-1">Upload Attendance Screenshot</div>
              <div className="text-[13px] text-[#666]">Drag & drop or click to choose</div>
            </div>
            <div className="text-[12px] text-[#555]">PNG • JPG • JPEG • WEBP</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-[#2A0A0A] border border-[#7F1D1D] rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-[#F87171] shrink-0" />
            <span className="text-[13px] text-[#F87171]">{error}</span>
          </div>
        )}

        {/* Help section */}
        <div className="card p-5">
          <button onClick={() => setShowHelp(!showHelp)} className="flex items-center justify-between w-full text-left">
            <span className="text-[14px] text-[#B0B0B0] font-medium">Where do I find this screenshot?</span>
            {showHelp ? <ChevronUp size={16} className="text-[#666]" /> : <ChevronDown size={16} className="text-[#666]" />}
          </button>
          {showHelp && (
            <div className="mt-4 space-y-3">
              {[
                { step: '1', text: 'Log in to your college student ERP.' },
                { step: '2', text: 'Open the Attendance section.' },
                { step: '3', text: 'Select Attendance Details.' },
                { step: '4', text: 'Take a screenshot showing the subject attendance table.' },
                { step: '5', text: 'Upload that screenshot here.' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#18181A] border border-[#2A2A2C] flex items-center justify-center text-[11px] text-[#949494] font-medium shrink-0">{s.step}</span>
                  <span className="text-[13px] text-[#949494]">{s.text}</span>
                </div>
              ))}
              <div className="mt-3 text-[12px] text-[#555]">
                Your screenshot should show: Subject Code, Subject Name, Total Hours, A, P, CL, and Attendance %.
                If the table also includes a Cumulative Attendance section, we&apos;ll read that too.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Preview Stage ─────────────────────────────────
  if (stage === 'preview') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl text-[#FFFFFF] font-light mb-2">Preview Screenshot</h2>
          <p className="text-[14px] text-[#949494]">Review your image before we analyze it.</p>
        </div>

        <div className="card p-3 overflow-hidden rounded-2xl">
          {imagePreview && (
            <img src={imagePreview} alt="Attendance screenshot" className="w-full rounded-xl max-h-[400px] object-contain" />
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setStage('upload'); setImageFile(null); setImagePreview(null); }}
            className="btn-press flex-1 bg-[#18181A] border border-[#2A2A2C] hover:border-[#444] text-[#B0B0B0] font-semibold py-3 rounded-full text-[14px] transition-smooth">
            Change Image
          </button>
          <button onClick={analyzeImage}
            className="btn-press flex-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-smooth">
            Analyze Screenshot
          </button>
        </div>
      </div>
    );
  }

  // ─── Analyzing Stage ───────────────────────────────
  if (stage === 'analyzing') {
    const stages = [
      { key: 'reading', label: 'Scanning image', threshold: 5 },
      { key: 'detecting', label: 'Detecting table', threshold: 15 },
      { key: 'extracting', label: 'Reading subjects', threshold: 40 },
      { key: 'validating', label: 'Checking values', threshold: 85 },
      { key: 'calculating', label: 'Calculating attendance', threshold: 92 },
    ];

    const currentStageIdx = stages.findIndex(s => {
      const stageOrder = ['reading', 'detecting', 'extracting', 'validating', 'calculating', 'done'];
      return stageOrder.indexOf(progress.stage) <= stageOrder.indexOf(s.key);
    });

    return (
      <div className="space-y-8 animate-slide-up">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl text-[#FFFFFF] font-light mb-2">Reading your attendance…</h2>
        </div>

        <div className="card p-6 space-y-4">
          {stages.map((s, i) => {
            const isComplete = progress.progress >= s.threshold;
            const isCurrent = i === currentStageIdx && !isComplete;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-smooth ${
                  isComplete ? 'bg-[#4ADE80]/20 text-[#4ADE80]' :
                  isCurrent ? 'bg-[#60A5FA]/20 text-[#60A5FA]' :
                  'bg-[#1A1A1A] text-[#333]'
                }`}>
                  {isComplete ? <Check size={14} /> : (
                    isCurrent ? <div className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-[#333]" />
                  )}
                </div>
                <span className={`text-[14px] transition-smooth ${isComplete ? 'text-[#B0B0B0]' : isCurrent ? 'text-[#FFFFFF]' : 'text-[#444]'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-[#60A5FA] rounded-full transition-all duration-300" style={{ width: `${progress.progress}%` }} />
        </div>
      </div>
    );
  }

  // ─── Error Stage ───────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="space-y-6 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-[#2A0A0A] border border-[#7F1D1D] flex items-center justify-center mx-auto">
          <AlertTriangle size={24} className="text-[#F87171]" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#FFFFFF] font-light mb-2">Couldn&apos;t read screenshot</h2>
          <p className="text-[14px] text-[#949494]">{error}</p>
        </div>
        <div className="flex gap-3 max-w-sm mx-auto">
          <button onClick={() => { setStage('upload'); setImageFile(null); setImagePreview(null); setError(''); }}
            className="btn-press flex-1 bg-[#18181A] border border-[#2A2A2C] text-[#B0B0B0] font-semibold py-3 rounded-full text-[14px] transition-smooth">
            Try Another Image
          </button>
          <button onClick={onCancel}
            className="btn-press flex-1 bg-[#FFFFFF] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-smooth">
            Enter Manually
          </button>
        </div>
      </div>
    );
  }

  // ─── Results Stage ─────────────────────────────────
  const totalP = editSubjects.reduce((s, sub) => s + sub.presentHours, 0);
  const totalA = editSubjects.reduce((s, sub) => s + sub.absentHours, 0);
  const totalCL = editSubjects.reduce((s, sub) => s + sub.clHours, 0);
  const totalH = editSubjects.reduce((s, sub) => s + sub.totalHours, 0);
  const overallPct = totalH > 0 ? Math.round((totalP / totalH) * 10000) / 100 : 0;

  // Check for cross-match with monthly data (completely separate calculation)
  const monthlyP = editMonthly.reduce((s, m) => s + m.present, 0);
  const monthlyA = editMonthly.reduce((s, m) => s + m.absent, 0);
  const monthlyCL = editMonthly.reduce((s, m) => s + m.cl, 0);
  const hasMonthly = editMonthly.length > 0;
  const hasSubjects = editSubjects.length > 0;
  const crossMatch = hasMonthly && hasSubjects && totalP === monthlyP && totalA === monthlyA && totalCL === monthlyCL;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-3xl text-[#FFFFFF] font-light mb-2">
          Attendance Found
        </h2>
        <p className="text-[14px] text-[#949494]">
          {hasSubjects ? `${editSubjects.length} subject${editSubjects.length !== 1 ? 's' : ''}` : 'No subjects'}
          {hasMonthly ? ` • ${editMonthly.length} month${editMonthly.length !== 1 ? 's' : ''}` : ''}
          {' '}detected. Review before importing.
        </p>
      </div>

      {/* ── SECTION 1: SUBJECT ATTENDANCE ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] text-[#FFFFFF] font-[family-name:var(--font-newsreader)]">Subject Attendance</h3>
            <p className="text-[12px] text-[#555]">From Attendance Details table</p>
          </div>
          <button onClick={addSubject} className="text-[13px] text-[#60A5FA] hover:text-[#93C5FD] transition-smooth">+ Add Subject</button>
        </div>

        {/* Subject summary */}
        {hasSubjects && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Present', value: totalP, color: '#FFFFFF' },
              { label: 'Absent', value: totalA, color: '#949494' },
              { label: 'CL', value: totalCL, color: '#666' },
              { label: 'Overall', value: `${overallPct}%`, color: overallPct >= 80 ? '#4ADE80' : '#F87171' },
            ].map(m => (
              <div key={m.label} className="card p-3 text-center">
                <div className="text-[10px] text-[#555] uppercase tracking-[0.1em] mb-1">{m.label}</div>
                <div className="font-[family-name:var(--font-newsreader)] text-lg" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Subject rows */}
        {editSubjects.map((sub, i) => {
          const isExpanded = expandedSubject === i;
          const sum = sub.presentHours + sub.absentHours + sub.clHours;
          const isValid = Math.abs(sum - sub.totalHours) <= 2;

          return (
            <div key={i} className="card overflow-hidden">
              <button onClick={() => setExpandedSubject(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left transition-smooth hover:bg-[#161616]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  sub.confidence === 'high' ? 'bg-[#4ADE80]/20 text-[#4ADE80]' :
                  sub.confidence === 'medium' ? 'bg-[#FBBF24]/20 text-[#FBBF24]' :
                  'bg-[#F87171]/20 text-[#F87171]'
                }`}>
                  {sub.confidence === 'high' ? <Check size={12} /> : <AlertTriangle size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#E5E5E5] truncate">{sub.subjectName || 'Unknown'}</div>
                  <div className="text-[12px] text-[#555]">{sub.subjectCode} • {sub.presentHours}/{sub.totalHours} • {sub.attendancePercentage}%</div>
                </div>
                <div className="flex items-center gap-2">
                  {!isValid && <span className="text-[11px] text-[#FBBF24]">⚠</span>}
                  <button onClick={(e) => { e.stopPropagation(); deleteSubject(i); }} className="p-1 text-[#555] hover:text-[#F87171] transition-smooth">
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#1A1A1A] pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#555] uppercase tracking-[0.1em] mb-1 block">Code</label>
                      <input value={sub.subjectCode} onChange={e => updateSubject(i, 'subjectCode', e.target.value)}
                        className="w-full bg-[#111] border border-[#2A2A2C] rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none focus:border-[#555] transition-smooth" />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#555] uppercase tracking-[0.1em] mb-1 block">Name</label>
                      <input value={sub.subjectName} onChange={e => updateSubject(i, 'subjectName', e.target.value)}
                        className="w-full bg-[#111] border border-[#2A2A2C] rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none focus:border-[#555] transition-smooth" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Total', field: 'totalHours' },
                      { label: 'Present', field: 'presentHours' },
                      { label: 'Absent', field: 'absentHours' },
                      { label: 'CL', field: 'clHours' },
                    ].map(f => (
                      <div key={f.field}>
                        <label className="text-[11px] text-[#555] uppercase tracking-[0.1em] mb-1 block">{f.label}</label>
                        <input type="number" min="0" value={(sub as any)[f.field]}
                          onChange={e => { const v = parseInt(e.target.value); updateSubject(i, f.field as any, isNaN(v) ? 0 : v); }}
                          className="w-full bg-[#111] border border-[#2A2A2C] rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none focus:border-[#555] transition-smooth" />
                      </div>
                    ))}
                  </div>
                  {sub.issues.length > 0 && (
                    <div className="text-[12px] text-[#FBBF24]">
                      {sub.issues.map((issue, j) => <div key={j}>⚠ {issue}</div>)}
                    </div>
                  )}
                  <div className="text-[13px] text-[#949494]">
                    Calculated: {sub.attendancePercentage}% • P+A+CL = {sum} {isValid ? '✓' : `≠ ${sub.totalHours}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!hasSubjects && (
          <div className="card p-6 text-center">
            <p className="text-[14px] text-[#666]">No subjects detected. You can add them manually.</p>
          </div>
        )}
      </div>

      {/* ── SECTION 2: CUMULATIVE ATTENDANCE ── */}
      {hasMonthly && (
        <div className="space-y-3 pt-2 border-t border-[#1A1A1A]">
          <div>
            <h3 className="text-[16px] text-[#FFFFFF] font-[family-name:var(--font-newsreader)]">Cumulative Attendance</h3>
            <p className="text-[12px] text-[#555]">From Cumulative Attendance table</p>
          </div>

          {/* Monthly summary */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Present', value: monthlyP, color: '#FFFFFF' },
              { label: 'Absent', value: monthlyA, color: '#949494' },
              { label: 'CL', value: monthlyCL, color: '#666' },
              { label: 'Overall', value: `${monthlyP + monthlyA + monthlyCL > 0 ? ((monthlyP / (monthlyP + monthlyA + monthlyCL)) * 100).toFixed(1) : '—'}%`, color: '#B0B0B0' },
            ].map(m => (
              <div key={m.label} className="card p-3 text-center">
                <div className="text-[10px] text-[#555] uppercase tracking-[0.1em] mb-1">{m.label}</div>
                <div className="font-[family-name:var(--font-newsreader)] text-lg" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly rows */}
          {editMonthly.map((m, i) => (
            <div key={i} className="card p-3 flex items-center gap-4">
              <span className="text-[13px] text-[#949494] w-24 shrink-0 font-medium">{m.month}</span>
              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-[#F87171]">A: {m.absent}</span>
                <span className="text-[#B0B0B0]">P: {m.present}</span>
                <span className="text-[#666]">CL: {m.cl}</span>
                <span className="text-[#FFF] font-medium">
                  {m.present + m.absent + m.cl > 0 ? `${((m.present / (m.present + m.absent + m.cl)) * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 3: VERIFICATION ── */}
      {hasSubjects && hasMonthly && (
        <div className="space-y-3 pt-2 border-t border-[#1A1A1A]">
          <h3 className="text-[16px] text-[#FFFFFF] font-[family-name:var(--font-newsreader)]">Verification</h3>

          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              {crossMatch ? <Check size={18} className="text-[#4ADE80] shrink-0" /> : <AlertTriangle size={18} className="text-[#FBBF24] shrink-0" />}
              <span className="text-[14px] font-medium" style={{ color: crossMatch ? '#4ADE80' : '#FBBF24' }}>
                {crossMatch ? '✓ Attendance verified' : '⚠ Totals differ — please review'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <div className="text-[11px] text-[#555] uppercase tracking-[0.1em] mb-1">Subject totals</div>
                <div className="text-[#B0B0B0]">P: {totalP} &nbsp; A: {totalA} &nbsp; CL: {totalCL}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#555] uppercase tracking-[0.1em] mb-1">Monthly totals</div>
                <div className="text-[#B0B0B0]">P: {monthlyP} &nbsp; A: {monthlyA} &nbsp; CL: {monthlyCL}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import button */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => { setStage('upload'); setImageFile(null); setImagePreview(null); }}
          className="btn-press flex-1 bg-[#18181A] border border-[#2A2A2C] text-[#B0B0B0] font-semibold py-3 rounded-full text-[14px] transition-smooth">
          Back
        </button>
        <button onClick={handleImport}
          className="btn-press flex-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-smooth">
          Import Attendance
        </button>
      </div>
    </div>
  );
}
