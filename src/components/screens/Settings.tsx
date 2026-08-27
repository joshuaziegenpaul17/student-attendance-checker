'use client';

import React, { useState, useMemo } from 'react';
import { StudentProfile } from '@/types/attendance';
import { Info } from 'lucide-react';

interface SettingsScreenProps {
  profile: StudentProfile;
  target: number;
  onProfileUpdate: (profile: StudentProfile) => void;
  onTargetChange: (target: number) => void;
  onReset: () => void;
  onClearAll: () => void;
}

const UG_PROGRAMMES = ['B.Sc.', 'B.Com.', 'BCA', 'BBA', 'Other'] as const;
const PG_PROGRAMMES = ['M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'Other'] as const;

function getYearsForLevel(level?: 'UG' | 'PG'): string[] {
  if (!level) return [];
  return level === 'UG' ? ['I', 'II', 'III'] : ['I', 'II'];
}

function getSemestersForYear(year: string, level?: 'UG' | 'PG'): string[] {
  if (!year || !level) return [];
  const y = year === 'I' ? 1 : year === 'II' ? 2 : year === 'III' ? 3 : 0;
  if (level === 'UG') { if (y === 1) return ['I', 'II']; if (y === 2) return ['III', 'IV']; if (y === 3) return ['V', 'VI']; }
  else { if (y === 1) return ['I', 'II']; if (y === 2) return ['III', 'IV']; }
  return [];
}

export default function SettingsScreen({ profile, target, onProfileUpdate }: Pick<SettingsScreenProps, 'profile' | 'target' | 'onProfileUpdate'>) {
  const [editProfile, setEditProfile] = useState({ ...profile });
  const [isEditing, setIsEditing] = useState(false);

  const years = useMemo(() => getYearsForLevel(editProfile.level), [editProfile.level]);
  const semesters = useMemo(() => getSemestersForYear(editProfile.year || '', editProfile.level), [editProfile.year, editProfile.level]);
  const programmes = useMemo(() => editProfile.level ? (editProfile.level === 'UG' ? [...UG_PROGRAMMES] : [...PG_PROGRAMMES]) : [], [editProfile.level]);

  const handleProfileSave = () => { onProfileUpdate(editProfile); setIsEditing(false); };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'level') setEditProfile(prev => ({ ...prev, level: value as 'UG' | 'PG', year: '', semester: '', programme: '' }));
    else if (name === 'year') setEditProfile(prev => ({ ...prev, year: value, semester: '' }));
    else setEditProfile(prev => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full bg-[#111111] border border-[#2A2A2C] focus:border-[#555] focus:ring-1 focus:ring-[#444] rounded-[10px] px-3 py-2.5 text-[#FFFFFF] text-[15px] outline-none transition-smooth";
  const labelClass = "block text-[12px] font-medium text-[#949494] mb-1.5";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl text-[#FFFFFF] font-light mb-2">Settings</h1>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-newsreader)] text-lg text-[#B0B0B0]">Student Information</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="text-[13px] text-[#666] hover:text-[#FFF] font-medium transition-smooth">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setIsEditing(false); setEditProfile({ ...profile }); }} className="text-[13px] text-[#666] hover:text-[#FFF] font-medium transition-smooth">Cancel</button>
              <button onClick={handleProfileSave} className="text-[13px] bg-[#FFF] hover:bg-[#E5E5E5] text-[#000] font-semibold px-4 py-1.5 rounded-full transition-smooth">Save</button>
            </div>
          )}
        </div>
        {!isEditing ? (
          <div className="space-y-3 text-[14px]">
            {([
              ['College', profile.college],
              profile.level ? ['Level', profile.level] : null,
              profile.academicYear ? ['Academic Year', profile.academicYear] : null,
              profile.programme ? ['Programme', profile.programme] : null,
              profile.department ? ['Department', profile.department] : null,
              profile.year ? ['Year', `${profile.year} Year`] : null,
              profile.semester ? ['Semester', `Semester ${profile.semester}`] : null,
            ] as [string, string][]).filter(Boolean).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-[#666]">{label}</span>
                <span className="text-[#B0B0B0]">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Level</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditProfile(prev => ({ ...prev, level: 'UG', year: '', semester: '', programme: '' }))}
                  className={`py-2.5 rounded-full text-[14px] font-medium transition-smooth border ${editProfile.level === 'UG' ? 'bg-[#FFF] text-[#000] border-[#FFF]' : 'bg-[#111] text-[#949494] border-[#2A2A2C]'}`}>UG</button>
                <button type="button" onClick={() => setEditProfile(prev => ({ ...prev, level: 'PG', year: '', semester: '', programme: '' }))}
                  className={`py-2.5 rounded-full text-[14px] font-medium transition-smooth border ${editProfile.level === 'PG' ? 'bg-[#FFF] text-[#000] border-[#FFF]' : 'bg-[#111] text-[#949494] border-[#2A2A2C]'}`}>PG</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Academic Year</label><input type="text" value={editProfile.academicYear || ''} onChange={e => setEditProfile(p => ({ ...p, academicYear: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Programme</label>
                <select name="programme" value={editProfile.programme && (programmes as readonly string[]).includes(editProfile.programme) ? editProfile.programme : ''} onChange={handleEditChange} disabled={!editProfile.level} className={inputClass}>
                  <option value="">Select</option>{programmes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelClass}>Department</label><input type="text" value={editProfile.department || ''} onChange={e => setEditProfile(p => ({ ...p, department: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Year</label>
                <select name="year" value={editProfile.year || ''} onChange={handleEditChange} disabled={!editProfile.level} className={inputClass}>
                  <option value="">—</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Semester</label>
                <select name="semester" value={editProfile.semester || ''} onChange={handleEditChange} disabled={!editProfile.year} className={inputClass}>
                  <option value="">—</option>{semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target */}
      <div className="card p-6">
        <h3 className="font-[family-name:var(--font-newsreader)] text-lg text-[#B0B0B0] mb-3">Attendance Target</h3>
        <div className="font-[family-name:var(--font-newsreader)] text-3xl text-[#FFFFFF]">{target}%</div>
        <p className="text-[12px] text-[#555] mt-2">Loyola requires a minimum of 80%. This target is locked in V1.</p>
      </div>

      {/* About */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-[#666] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[14px] text-[#B0B0B0] mb-1">Student Attendance Checker</h3>
            <p className="text-[13px] text-[#666] leading-relaxed">
              Unofficial student utility. Not affiliated with or endorsed by any college.
            </p>
            <p className="text-[11px] text-[#444] mt-2">Version 2.0 · 100% client-side</p>
          </div>
        </div>
      </div>
    </div>
  );
}
