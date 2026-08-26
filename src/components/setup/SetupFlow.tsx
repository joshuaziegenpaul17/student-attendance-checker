'use client';

import React, { useState, useMemo } from 'react';
import { StudentProfile, Subject, MonthlyAttendance } from '@/types/attendance';
import { ArrowRight, Upload } from 'lucide-react';
import ScreenshotImport from '@/components/screens/ScreenshotImport';

interface SetupFlowProps {
  onComplete: (profile: StudentProfile, sheetName?: string, initialSubjects?: any[], initialMonthly?: MonthlyAttendance[]) => void;
  onLoadDemo: () => void;
  onShowSheets?: () => void;
  hasExistingSheets?: boolean;
}

const UG_PROGRAMMES = ['B.Sc.', 'B.Com.', 'BCA', 'BBA', 'Other'] as const;
const PG_PROGRAMMES = ['M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'Other'] as const;

function getYearsForLevel(level: 'UG' | 'PG'): string[] {
  return level === 'UG' ? ['I', 'II', 'III'] : ['I', 'II'];
}

function getSemestersForYear(year: string, level: 'UG' | 'PG'): string[] {
  if (!year) return [];
  const yearNum = year === 'I' ? 1 : year === 'II' ? 2 : year === 'III' ? 3 : 0;
  if (level === 'UG') {
    if (yearNum === 1) return ['I', 'II'];
    if (yearNum === 2) return ['III', 'IV'];
    if (yearNum === 3) return ['V', 'VI'];
  } else {
    if (yearNum === 1) return ['I', 'II'];
    if (yearNum === 2) return ['III', 'IV'];
  }
  return [];
}

function generateSheetName(profile: StudentProfile): string {
  const parts = [profile.level, profile.year ? `Year ${profile.year}` : null, profile.semester ? `Semester ${profile.semester}` : null, profile.academicYear].filter(Boolean);
  return parts.join(' · ') || 'New Sheet';
}

export default function SetupFlow({ onComplete, onLoadDemo, onShowSheets, hasExistingSheets }: SetupFlowProps) {
  const [phase, setPhase] = useState<'landing' | 'form' | 'screenshot'>('landing');
  const [sheetName, setSheetName] = useState('');
  const [profile, setProfile] = useState<StudentProfile>({
    college: 'Loyola College, Chennai',
    level: undefined,
    academicYear: '2026–27',
    programme: '',
    department: '',
    year: '',
    semester: '',
  });
  const [programmeOther, setProgrammeOther] = useState('');

  const years = useMemo(() => profile.level ? getYearsForLevel(profile.level) : [], [profile.level]);
  const semesters = useMemo(() => profile.year && profile.level ? getSemestersForYear(profile.year, profile.level) : [], [profile.year, profile.level]);
  const programmes = useMemo(() => profile.level ? (profile.level === 'UG' ? [...UG_PROGRAMMES] : [...PG_PROGRAMMES]) : [], [profile.level]);

  const autoName = useMemo(() => sheetName.trim() ? '' : generateSheetName(profile), [profile, sheetName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'level') setProfile(prev => ({ ...prev, level: value as 'UG' | 'PG', year: '', semester: '', programme: '' }));
    else if (name === 'year') setProfile(prev => ({ ...prev, year: value, semester: '' }));
    else if (name === 'programme') setProfile(prev => ({ ...prev, programme: value === 'Other' ? programmeOther : value }));
    else setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(profile, sheetName.trim() || autoName, []);
  };

  const handleScreenshotImport = (subjects: Subject[], monthly: MonthlyAttendance[]) => {
    onComplete(profile, sheetName.trim() || autoName, subjects, monthly);
  };

  const inputClass = "w-full bg-[#111111] border border-[#2A2A2C] focus:border-[#555] focus:ring-1 focus:ring-[#444] rounded-[10px] px-4 py-3 text-[#FFFFFF] text-[15px] outline-none transition-smooth placeholder:text-[#555]";
  const labelClass = "block text-[13px] font-medium text-[#949494] mb-2";

  // Landing
  if (phase === 'landing') {
    return (
      <div className="min-h-screen flex flex-col relative z-10">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-lg text-center animate-fade-in">
            <h1 className="font-[family-name:var(--font-newsreader)] text-5xl md:text-6xl font-light text-[#FFFFFF] tracking-tight leading-[1.1] mb-6">
              Attendance<br />Checker
            </h1>
            <p className="text-[17px] text-[#949494] leading-relaxed mb-2">
              Know where you stand.<br />Plan your semester.
            </p>
            <p className="text-[13px] text-[#666] mb-12">
              A personal student tool for tracking attendance,<br />academic performance and GPA/CGPA.
            </p>

            <div className="space-y-3">
              <button onClick={() => setPhase('form')}
                className="w-full bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000000] font-semibold py-3.5 px-6 rounded-full text-[15px] transition-smooth flex items-center justify-center gap-2">
                Get Started <ArrowRight size={16} />
              </button>
              <button onClick={() => setPhase('screenshot')}
                className="w-full bg-[#18181A] hover:bg-[#222224] text-[#FFFFFF] font-medium py-3.5 px-6 rounded-full text-[15px] border border-[#2A2A2C] transition-smooth flex items-center justify-center gap-2">
                <Upload size={16} /> Upload Screenshot
              </button>
              <button onClick={onLoadDemo}
                className="w-full bg-[#18181A] hover:bg-[#222224] text-[#FFFFFF] font-medium py-3.5 px-6 rounded-full text-[15px] border border-[#2A2A2C] transition-smooth">
                Try Sample Data
              </button>
              {hasExistingSheets && onShowSheets && (
                <button onClick={onShowSheets}
                  className="w-full bg-transparent hover:bg-[#111] text-[#949494] font-medium py-3 px-6 rounded-full text-[14px] border border-[#2A2A2C] transition-smooth">
                  View My Sheets
                </button>
              )}
            </div>

            <p className="text-[12px] text-[#555] mt-12">
              All data stays in your browser. Nothing is sent anywhere.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Screenshot import
  if (phase === 'screenshot') {
    return (
      <div className="min-h-screen flex flex-col relative z-10">
        <div className="flex-1 flex items-start justify-center pt-12 md:pt-24 px-6">
          <div className="w-full max-w-lg">
            <ScreenshotImport
              onImport={(subjects, monthly) => handleScreenshotImport(subjects, monthly)}
              onCancel={() => setPhase('form')}
            />
            <div className="text-center mt-6">
              <button onClick={() => setPhase('form')}
                className="text-[13px] text-[#666] hover:text-[#B0B0B0] transition-smooth">
                ← Enter details manually instead
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <div className="flex-1 flex items-start justify-center pt-12 md:pt-24 px-6">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl font-light text-[#FFFFFF] mb-3">
              New Attendance Sheet
            </h2>
            <p className="text-[15px] text-[#949494]">
              Enter your academic details to start tracking.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
            {/* Sheet Name */}
            <div>
              <label className={labelClass}>Sheet Name</label>
              <input type="text" value={sheetName} onChange={e => setSheetName(e.target.value)} placeholder={autoName} className={inputClass} />
              <p className="text-[11px] text-[#555] mt-1.5">
                {sheetName.trim() ? `Will save as: ${sheetName.trim()}` : `Auto: ${autoName}`}
              </p>
            </div>

            {/* College */}
            <div>
              <label className={labelClass}>College</label>
              <input type="text" value="Loyola College, Chennai" disabled
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-[10px] px-4 py-3 text-[#666] text-[15px] cursor-not-allowed" />
            </div>

            {/* Level */}
            <div>
              <label className={labelClass}>Programme Level</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleChange({ target: { name: 'level', value: 'UG' } } as any)}
                  className={`py-3 rounded-full text-[15px] font-medium transition-smooth border ${
                    profile.level === 'UG' ? 'bg-[#FFFFFF] text-[#000] border-[#FFFFFF]' : 'bg-[#111] text-[#949494] border-[#2A2A2C] hover:border-[#555]'
                  }`}>UG</button>
                <button type="button" onClick={() => handleChange({ target: { name: 'level', value: 'PG' } } as any)}
                  className={`py-3 rounded-full text-[15px] font-medium transition-smooth border ${
                    profile.level === 'PG' ? 'bg-[#FFFFFF] text-[#000] border-[#FFFFFF]' : 'bg-[#111] text-[#949494] border-[#2A2A2C] hover:border-[#555]'
                  }`}>PG</button>
              </div>
            </div>

            {/* Academic Year */}
            <div>
              <label className={labelClass}>Academic Year</label>
              <input type="text" name="academicYear" value={profile.academicYear} onChange={handleChange} placeholder="2026–27" className={inputClass} />
            </div>

            {/* Year */}
            <div>
              <label className={labelClass}>Year</label>
              <select name="year" value={profile.year} onChange={handleChange} disabled={!profile.level}
                className={`${inputClass} ${!profile.level ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="">{profile.level ? 'Select year' : 'Select level first'}</option>
                {years.map(y => <option key={y} value={y}>{y} Year</option>)}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className={labelClass}>Semester</label>
              <select name="semester" value={profile.semester} onChange={handleChange} disabled={!profile.year}
                className={`${inputClass} ${!profile.year ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="">{profile.year ? 'Select semester' : 'Select year first'}</option>
                {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {/* Programme */}
            <div>
              <label className={labelClass}>Programme</label>
              <select name="programme"
                value={profile.programme && programmes.includes(profile.programme as any) ? profile.programme : profile.programme ? 'Other' : ''}
                onChange={handleChange} disabled={!profile.level}
                className={`${inputClass} ${!profile.level ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="">{profile.level ? 'Select programme' : 'Select level first'}</option>
                {programmes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {profile.programme && !programmes.includes(profile.programme as any) && profile.programme !== '' && (
                <input type="text" value={programmeOther || profile.programme}
                  onChange={e => { setProgrammeOther(e.target.value); setProfile(prev => ({ ...prev, programme: e.target.value })); }}
                  placeholder="Enter your programme" className={`${inputClass} mt-2`} />
              )}
            </div>

            {/* Department */}
            <div>
              <label className={labelClass}>Department</label>
              <input type="text" name="department" value={profile.department} onChange={handleChange}
                placeholder="e.g. Statistics, Computer Science" className={inputClass} />
            </div>

            <button type="submit"
              className="w-full bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-3.5 rounded-full text-[15px] transition-smooth flex items-center justify-center gap-2 mt-4">
              Continue <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-center text-[12px] text-[#555] mt-6 mb-8">
            You can edit these details later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
