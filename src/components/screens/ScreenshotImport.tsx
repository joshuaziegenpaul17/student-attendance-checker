'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Subject, MonthlyAttendance } from '@/types/attendance';
import { performOCR, OCRProgress } from '@/lib/attendance/ocrService';
import { parseOCRText, parsedSubjectsToSubjects, parsedMonthlyToMonthly, ParsedSubject, ParsedMonthly } from '@/lib/attendance/tableParser';
import { Upload, Check, AlertTriangle, Trash2, ChevronDown, ChevronUp, Pencil, X, Info } from 'lucide-react';

interface ScreenshotImportProps {
  onImport: (subjects: Subject[], monthly: MonthlyAttendance[]) => void;
  onCancel: () => void;
  onExit?: () => void;
}

type ImportStage = 'upload' | 'preview' | 'analyzing' | 'results' | 'error';

export default function ScreenshotImport({ onImport, onExit }: ScreenshotImportProps) {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<OCRProgress>({ stage: 'reading', message: '', progress: 0 });
  const [editSubjects, setEditSubjects] = useState<ParsedSubject[]>([]);
  const [editMonthly, setEditMonthly] = useState<ParsedMonthly[]>([]);
  const [error, setError] = useState<string>('');
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputId = 'screenshot-file-input';

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image is too large. Please use an image under 20MB.');
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
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const resetToUpload = () => {
    setStage('upload');
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setExpandedSubject(null);
    setEditSubjects([]);
    setEditMonthly([]);
  };

  const analyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setStage('analyzing');
    try {
      const ocrResult = await performOCR(imageFile, setProgress);
      const parsed = parseOCRText(ocrResult.text, ocrResult.lines, ocrResult.words);
      setEditSubjects([...parsed.subjects]);
      setEditMonthly([...parsed.monthly]);
      setStage('results');
    } catch {
      setError('Failed to analyze the image. Please try a clearer screenshot or enter data manually.');
      setStage('error');
    }
  }, [imageFile]);

  const updateSubject = (index: number, field: keyof ParsedSubject, value: string | number) => {
    setEditSubjects(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
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
    if (expandedSubject === index) setExpandedSubject(null);
  };

  const addSubject = () => {
    const newIndex = editSubjects.length;
    setEditSubjects(prev => [...prev, {
      subjectCode: '',
      subjectName: 'New Subject',
      totalHours: 0,
      presentHours: 0,
      absentHours: 0,
      clHours: 0,
      attendancePercentage: 0,
      confidence: 'low',
      issues: [],
    }]);
    setExpandedSubject(newIndex);
  };

  const handleImport = () => {
    const subjects = parsedSubjectsToSubjects(editSubjects.filter(s => s.subjectCode || s.subjectName));
    const monthly = parsedMonthlyToMonthly(editMonthly);
    onImport(subjects, monthly);
  };

  // ─── VALIDATION STATE ─────────────────────────────────────────────────────
  const totalP   = editSubjects.reduce((s, sub) => s + sub.presentHours, 0);
  const totalA   = editSubjects.reduce((s, sub) => s + sub.absentHours, 0);
  const totalCL  = editSubjects.reduce((s, sub) => s + sub.clHours, 0);
  const totalH   = editSubjects.reduce((s, sub) => s + sub.totalHours, 0);
  const overallPct = totalH > 0 ? Math.round((totalP / totalH) * 10000) / 100 : 0;
  const hasSubjects = editSubjects.length > 0;
  // All subjects are valid if P+A+CL = Total for each
  const allRowsValid = editSubjects.every(sub => Math.abs(sub.presentHours + sub.absentHours + sub.clHours - sub.totalHours) <= 1);
  const canImport = hasSubjects && allRowsValid;
  const hasInvalidRows = editSubjects.some(sub => Math.abs(sub.presentHours + sub.absentHours + sub.clHours - sub.totalHours) > 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'upload') {
    return (
      <div className="animate-slide-up space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-2">
              Upload Attendance Screenshot
            </h2>
            <p className="text-[14px] text-[#949494] max-w-md leading-relaxed">
              Upload a clear screenshot of the Attendance Details page. We&apos;ll read the subject-wise attendance for you.
            </p>
          </div>
          {onExit && (
            <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">
              Exit
            </button>
          )}
        </div>

        {/* Upload area */}
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          className={[
            'flex flex-col items-center justify-center text-center min-h-[220px]',
            'rounded-2xl cursor-pointer border border-dashed transition-all duration-200',
            isDragOver ? 'border-[#4A90D9] bg-[rgba(74,144,217,0.06)]' : 'border-[#252528] bg-[rgba(8,8,10,0.35)] hover:border-[#3A3A3E] hover:bg-[rgba(8,8,10,0.45)]',
          ].join(' ')}
        >
          <div className="flex flex-col items-center gap-4 px-8 py-10">
            <div className={['w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200', isDragOver ? 'bg-[#4A90D9]/15 text-[#4A90D9]' : 'bg-[#141418] text-[#555]'].join(' ')}>
              <Upload size={22} />
            </div>
            <div>
              <div className="text-[15px] text-[#CCCCCC] font-medium mb-1.5">Choose Screenshot</div>
              <div className="text-[13px] text-[#666]">Drag &amp; drop on desktop or tap to choose from Photos / Gallery / Files</div>
            </div>
            <div className="text-[11px] text-[#444] tracking-wide">PNG &middot; JPG &middot; JPEG &middot; WEBP</div>
          </div>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-[#120606] border border-[#7F1D1D]/35 rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="text-[#F87171] shrink-0" />
            <span className="text-[13px] text-[#F87171]">{error}</span>
          </div>
        )}

        {/* For best results */}
        <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.3)] p-5">
          <div className="text-[11px] text-[#555] uppercase tracking-[0.09em] font-semibold mb-3">For best results</div>
          <div className="space-y-2">
            {[
              'Upload the full Attendance Details table',
              'Keep Subject Code, Subject Description, Total Hrs., A, P and CL visible',
              'Make sure the text is sharp and readable',
              'Don\u2019t crop individual rows',
              'PNG/JPG screenshot recommended',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-[#949494]">
                <Check size={13} className="text-[#4ADE80] shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Need an example? */}
        <div>
          <button onClick={() => setShowHowTo(!showHowTo)} className="flex items-center gap-2 text-[13px] text-[#666] hover:text-[#999] transition-all duration-150">
            {showHowTo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Need an example?
          </button>
          {showHowTo && (
            <div className="mt-4 space-y-4">
              {/* Example table */}
              <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(5,5,7,0.6)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[#141418]">
                  <span className="text-[10px] text-[#444] uppercase tracking-widest font-bold">Example &mdash; Screenshot to Upload</span>
                </div>
                <div className="p-4 font-mono">
                  <div className="text-[10px] text-[#3b82f6] font-bold uppercase tracking-wider mb-2">Attendance Details</div>
                  <div className="space-y-1.5 mb-3">
                    {[
                      ['ST301', 'Multivariate Analysis', '38', '9', '29', '0', '76.32%'],
                      ['ST302', 'Stochastic Processes',  '45', '9', '36', '0', '80.00%'],
                      ['ST303', 'Statistical Computing', '40', '5', '33', '2', '82.50%'],
                      ['ST304', 'Data Science Lab',     '28', '3', '24', '1', '85.71%'],
                    ].map(([code, name, total, ab, pr, cl, pct]) => (
                      <div key={code} className="flex gap-2 text-[10px] text-[#484850]">
                        <span className="text-[#555] w-10 shrink-0">{code}</span>
                        <span className="flex-1 truncate">{name}</span>
                        <span className="w-6 text-right">{total}</span>
                        <span className="w-5 text-right">{ab}</span>
                        <span className="w-5 text-right">{pr}</span>
                        <span className="w-5 text-right">{cl}</span>
                        <span className="w-12 text-right">{pct}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-[#3b82f6] font-bold uppercase tracking-wider mb-2">Cumulative Attendance</div>
                  <div className="space-y-1">
                    {[['Jun-2026', '7', '56', '0'], ['Jul-2026', '25', '88', '0']].map(([month, ab, pr, cl]) => (
                      <div key={month} className="flex gap-3 text-[10px] text-[#484850]">
                        <span className="text-[#555] w-16">{month}</span>
                        <span>A {ab}</span>
                        <span>P {pr}</span>
                        <span>CL {cl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loyola-specific help */}
              <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.3)] p-5">
                <div className="text-[11px] text-[#555] uppercase tracking-[0.09em] font-semibold mb-3">Where do I find this?</div>
                <div className="space-y-2 text-[13px] text-[#949494]">
                  <p><span className="text-[#CCCCCC] font-medium">For Loyola College students:</span></p>
                  <div className="pl-4 space-y-1.5">
                    <div className="flex gap-2.5"><span className="text-[#666]">1.</span><span>Loyola College Portal &rarr; Attendance Details</span></div>
                    <div className="flex gap-2.5"><span className="text-[#666]">2.</span><span>Take a screenshot of the Attendance Details table</span></div>
                    <div className="flex gap-2.5"><span className="text-[#666]">3.</span><span>Upload it here</span></div>
                  </div>
                  <p className="mt-3 text-[12px] text-[#666] leading-relaxed">
                    If available, the screenshot may also include <span className="text-[#949494]">Cumulative Attendance</span>. The Cumulative section is optional &mdash; the important section is <span className="text-[#949494]">Attendance Details</span>.
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-[#3A3A3E] leading-relaxed">
                This tool is an unofficial student utility. It is designed around the attendance format used by Loyola College and is not affiliated with or endorsed by the college.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIEW STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'preview') {
    return (
      <div className="animate-slide-up space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Preview Screenshot</h2>
            <p className="text-[13px] text-[#949494]">Review your image before we analyze it.</p>
          </div>
          {onExit && (
            <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden border border-[#1A1A1E] bg-[rgba(8,8,10,0.4)]">
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Attendance screenshot preview" className="w-full max-h-[420px] object-contain" />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={resetToUpload} className="flex-1 bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#949494] hover:text-[#CCC] font-medium py-3 rounded-full text-[14px] transition-all duration-150">Change Image</button>
          <button onClick={analyzeImage} className="flex-1 bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000] font-semibold py-3 rounded-full text-[14px] transition-all duration-150">Analyze Screenshot</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZING STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'analyzing') {
    const analysisSteps = [
      { key: 'reading',     label: 'Scanning image',        threshold: 5  },
      { key: 'detecting',   label: 'Detecting table layout', threshold: 15 },
      { key: 'extracting',  label: 'Reading subject rows',   threshold: 50 },
      { key: 'validating',  label: 'Checking values',        threshold: 85 },
      { key: 'calculating', label: 'Calculating totals',     threshold: 95 },
    ];
    const stageOrder = ['reading', 'detecting', 'extracting', 'validating', 'calculating', 'done'];
    const currentIdx = analysisSteps.findIndex(s => stageOrder.indexOf(progress.stage) <= stageOrder.indexOf(s.key));
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Reading your attendance&hellip;</h2>
            <p className="text-[13px] text-[#949494]">This usually takes a few seconds.</p>
          </div>
          {onExit && (
            <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>
          )}
        </div>
        <div className="rounded-2xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.35)] p-6 space-y-4">
          {analysisSteps.map((s, i) => {
            const done   = progress.progress >= s.threshold;
            const active = i === currentIdx && !done;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={['w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200', done ? 'bg-[#4ADE80]/15 text-[#4ADE80]' : active ? 'bg-[#4A90D9]/15 text-[#4A90D9]' : 'bg-[#0E0E12] text-[#2A2A2E]'].join(' ')}>
                  {done ? <Check size={11} /> : active ? <div className="w-1.5 h-1.5 rounded-full bg-[#4A90D9]" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#222226]" />}
                </div>
                <span className={['text-[13px] transition-all duration-200', done ? 'text-[#666]' : active ? 'text-[#DDDDDD]' : 'text-[#2E2E36]'].join(' ')}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-[#0A0A0E] h-[3px] rounded-full overflow-hidden">
          <div className="h-full bg-[#4A90D9] rounded-full transition-all duration-500" style={{ width: `${progress.progress}%` }} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'error') {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#FFFFFF] font-light mb-1">Couldn&apos;t read screenshot</h2>
            <p className="text-[13px] text-[#949494]">{error}</p>
          </div>
          {onExit && (
            <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>
          )}
        </div>
        <div className="rounded-2xl border border-[#2A1010] bg-[rgba(18,5,5,0.3)] p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-11 h-11 rounded-full bg-[#1A0505] border border-[#7F1D1D]/35 flex items-center justify-center">
            <AlertTriangle size={18} className="text-[#F87171]" />
          </div>
          <div>
            <div className="text-[14px] text-[#CCCCCC] font-medium mb-1">Analysis failed</div>
            <div className="text-[12px] text-[#666] max-w-xs mx-auto">Try a clearer, full-screen screenshot with all table rows visible and readable text.</div>
          </div>
        </div>
        <button onClick={resetToUpload} className="w-full bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#949494] hover:text-[#CCC] font-medium py-3 rounded-full text-[14px] transition-all duration-150">
          Try Another Image
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start pb-5 border-b border-[#141418]">
        <div>
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl md:text-[28px] text-[#FFFFFF] font-light leading-tight mb-1">Attendance Found</h2>
          <p className="text-[13px] text-[#949494]">
            {editSubjects.length} subject{editSubjects.length !== 1 ? 's' : ''} detected. Review the extracted values before importing.
          </p>
        </div>
        {onExit && (
          <button onClick={onExit} className="ml-6 shrink-0 text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] hover:border-[#555] px-4 py-1.5 rounded-full transition-all duration-150 font-medium">Exit</button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.4)] divide-x divide-[#1A1A1E]">
        {[
          { label: 'Subjects', value: editSubjects.length, color: undefined },
          { label: 'Present',  value: totalP,              color: undefined },
          { label: 'Absent',   value: totalA,              color: undefined },
          { label: 'CL',       value: totalCL,             color: undefined },
          { label: 'Overall',  value: `${overallPct.toFixed(2)}%`, color: overallPct >= 75 ? '#4ADE80' : overallPct >= 60 ? '#FBBF24' : '#F87171' },
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <span className="text-[9px] text-[#555] uppercase tracking-[0.09em] font-semibold mb-1">{item.label}</span>
            <span className="font-[family-name:var(--font-newsreader)] text-[18px] md:text-[20px] font-normal leading-none" style={{ color: item.color ?? '#FFFFFF' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Import warning — shown when rows are invalid */}
      {hasInvalidRows && (
        <div className="space-y-2">
          <div className="flex items-start gap-3 bg-[#100A04] border border-[#78350F]/40 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-[#FBBF24] shrink-0 mt-0.5" />
            <div className="text-[13px] text-[#FBBF24]">
              <div className="font-medium mb-1">Review required</div>
              <div className="text-[12px] text-[#999] leading-relaxed">
                Some values could not be confidently verified. Edit the highlighted subjects below. Import will become available once all rows are valid.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success validation */}
      {hasSubjects && allRowsValid && (
        <div className="flex items-center gap-3 bg-[#071510] border border-[#14532D]/40 rounded-xl px-4 py-3">
          <Check size={15} className="text-[#4ADE80] shrink-0" />
          <span className="text-[13px] text-[#4ADE80] font-medium">All rows validated &mdash; ready to import.</span>
        </div>
      )}

      {/* Attendance Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] text-[#CCCCCC] font-medium">Attendance Details</h3>
            <p className="text-[12px] text-[#555] mt-0.5">{editSubjects.length} subject{editSubjects.length !== 1 ? 's' : ''} detected</p>
          </div>
          <button onClick={addSubject} className="text-[12px] text-[#4A90D9] hover:text-[#7AB8F5] transition-all duration-150 font-medium">+ Add Subject</button>
        </div>

        <div className="space-y-2">
          {editSubjects.map((sub, i) => {
            const isEditing = expandedSubject === i;
            const sum = sub.presentHours + sub.absentHours + sub.clHours;
            const isValid = Math.abs(sum - sub.totalHours) <= 1;
            const livePct = sub.totalHours > 0
              ? Math.round((sub.presentHours / sub.totalHours) * 10000) / 100
              : 0;

            if (!isEditing) {
              return (
                <div key={sub.subjectCode + '-' + i} className={`rounded-xl border bg-[rgba(8,8,10,0.35)] transition-all duration-150 ${isValid ? 'border-[#1A1A1E] hover:border-[#26262C]' : 'border-[#78350F]/30'}`}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className={['w-1.5 h-1.5 rounded-full shrink-0', !isValid ? 'bg-[#FBBF24]' : sub.confidence === 'high' ? 'bg-[#4ADE80]' : sub.confidence === 'medium' ? 'bg-[#FBBF24]' : 'bg-[#F87171]'].join(' ')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-[#DDDDDD] font-medium truncate leading-snug">{sub.subjectName || 'Unknown Subject'}</div>
                      <div className="text-[11px] text-[#555] font-mono mt-0.5">
                        {sub.subjectCode || '\u2014'} &middot; P {sub.presentHours} &middot; A {sub.absentHours} &middot; CL {sub.clHours} &middot; Total {sub.totalHours}
                      </div>
                    </div>
                    <div className={['text-[13px] font-semibold tabular-nums shrink-0', livePct >= 75 ? 'text-[#4ADE80]' : livePct >= 60 ? 'text-[#FBBF24]' : 'text-[#F87171]'].join(' ')}>
                      {livePct.toFixed(2)}%
                    </div>
                    {!isValid && <span className="text-[10px] text-[#FBBF24] bg-[#78350F]/20 border border-[#78350F]/30 px-2 py-0.5 rounded font-medium shrink-0">Review</span>}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setExpandedSubject(i)} className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#4A90D9] border border-[#222226] hover:border-[#4A90D9]/40 px-3 py-1 rounded-full transition-all duration-150">
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

            return (
              <div key={sub.subjectCode + '-edit-' + i} className="rounded-xl border border-[#4A90D9]/30 bg-[rgba(8,8,12,0.5)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1E]">
                  <span className="text-[11px] text-[#4A90D9] font-semibold uppercase tracking-wider">Editing &mdash; {sub.subjectName || 'Subject'}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedSubject(null)} className="flex items-center gap-1.5 text-[12px] bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000] font-semibold px-4 py-1 rounded-full transition-all duration-150">
                      <Check size={12} /> Done
                    </button>
                    <button onClick={() => { setExpandedSubject(null); deleteSubject(i); }} className="p-1.5 text-[#3A3A3E] hover:text-[#F87171] transition-all duration-150">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-[#555] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Code</label>
                      <input value={sub.subjectCode} onChange={e => updateSubject(i, 'subjectCode', e.target.value)} placeholder="e.g. ST301"
                        className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150 font-mono" />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-[#555] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Subject Name</label>
                      <input value={sub.subjectName} onChange={e => updateSubject(i, 'subjectName', e.target.value)} placeholder="e.g. Multivariate Analysis"
                        className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { label: 'Total', field: 'totalHours' },
                      { label: 'Present', field: 'presentHours' },
                      { label: 'Absent', field: 'absentHours' },
                      { label: 'CL', field: 'clHours' },
                    ] as const).map(f => (
                      <div key={f.field}>
                        <label className="text-[10px] text-[#555] uppercase tracking-[0.08em] font-semibold mb-1.5 block">{f.label}</label>
                        <input type="number" min="0" value={sub[f.field]}
                          onChange={e => { const v = parseInt(e.target.value); updateSubject(i, f.field, isNaN(v) ? 0 : v); }}
                          className="w-full bg-[#0A0A0D] border border-[#222226] focus:border-[#4A90D9]/50 rounded-lg px-3 py-2 text-[13px] text-[#FFF] outline-none transition-all duration-150 tabular-nums" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[12px] bg-[#06060A] rounded-lg px-3 py-2 border border-[#141418]">
                    <span className="text-[#666]">Attendance</span>
                    <span className={['font-semibold tabular-nums', livePct >= 75 ? 'text-[#4ADE80]' : livePct >= 60 ? 'text-[#FBBF24]' : 'text-[#F87171]'].join(' ')}>
                      {livePct.toFixed(2)}%
                    </span>
                  </div>
                  {sub.issues.length > 0 && (
                    <div className="text-[11px] text-[#FBBF24] bg-[#78350F]/10 border border-[#78350F]/25 px-3 py-2 rounded-lg">
                      {sub.issues.map((iss, j) => <div key={j}>&#9888; {iss}</div>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!hasSubjects && (
          <div className="rounded-xl border border-dashed border-[#222226] bg-[rgba(8,8,10,0.2)] p-8 text-center">
            <p className="text-[13px] text-[#666]">No subjects detected. You can add them manually.</p>
          </div>
        )}
      </div>

      {/* Cumulative Attendance */}
      {editMonthly.length > 0 && (
        <div className="space-y-3 pt-5 border-t border-[#141418]">
          <div>
            <h3 className="text-[15px] text-[#CCCCCC] font-medium">Cumulative Attendance</h3>
            <p className="text-[12px] text-[#555] mt-0.5">Monthly breakdown &mdash; edit values if incorrect</p>
          </div>
          <div className="rounded-xl border border-[#1A1A1E] bg-[rgba(8,8,10,0.35)] divide-y divide-[#111115]">
            {editMonthly.map((m, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="text-[13px] text-[#999] font-medium w-20 shrink-0">{m.month}</span>
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {([
                    { label: 'A', field: 'absent'  as const, cls: 'text-[#F87171]' },
                    { label: 'P', field: 'present' as const, cls: 'text-[#CCC]' },
                    { label: 'CL', field: 'cl'     as const, cls: 'text-[#777]' },
                  ]).map(({ label, field, cls }) => (
                    <div key={field} className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase ${cls}`}>{label}</span>
                      <input type="number" min="0" value={m[field]}
                        onChange={e => {
                          const v = parseInt(e.target.value);
                          const updated = [...editMonthly];
                          updated[i] = { ...m, [field]: isNaN(v) ? 0 : v };
                          setEditMonthly(updated);
                        }}
                        className="w-11 bg-[#06060A] border border-[#1E1E22] focus:border-[#4A90D9]/40 rounded px-1.5 py-0.5 text-[12px] text-[#FFF] text-center outline-none transition-all duration-150" />
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-[#555] tabular-nums shrink-0">
                  {m.present + m.absent + m.cl > 0 ? `${((m.present / (m.present + m.absent + m.cl)) * 100).toFixed(1)}%` : '\u2014'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-4 px-4 py-3 bg-[rgba(255,255,255,0.02)]">
              <span className="text-[12px] text-[#777] font-semibold w-20 shrink-0">Total</span>
              <div className="flex gap-5 text-[12px]">
                <span className="text-[#F87171]">A {totalA}</span>
                <span className="text-[#CCC]">P {totalP}</span>
                {totalCL > 0 && <span className="text-[#777]">CL {totalCL}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit guidance */}
      <div className="flex items-start gap-2.5 text-[12px] text-[#555] leading-relaxed">
        <Info size={13} className="text-[#444] shrink-0 mt-0.5" />
        <span>You can edit any detected value before importing. Your changes will be recalculated automatically.</span>
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-2 border-t border-[#141418]">
        <button onClick={resetToUpload} className="flex-1 bg-transparent border border-[#222226] hover:border-[#3A3A3E] text-[#949494] hover:text-[#CCC] font-medium py-3 rounded-full text-[14px] transition-all duration-150">
          Back
        </button>
        <button onClick={handleImport} disabled={!canImport}
          className={['flex-1 font-semibold py-3 rounded-full text-[14px] transition-all duration-150', canImport ? 'bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#000]' : 'bg-[#111114] text-[#444] cursor-not-allowed border border-[#222226]'].join(' ')}>
          Import Attendance
        </button>
      </div>
    </div>
  );
}
