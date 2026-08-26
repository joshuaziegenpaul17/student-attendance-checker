import { AttendanceSheet, SheetsStore, StudentProfile, Subject, MonthlyAttendance, CGPAData } from '@/types/attendance';
import { validateSubjectHours, calculateOverallAttendance } from './calculations';

const SHEETS_KEY = 'attendance_checker_sheets';
const CURRENT_SHEET_KEY = 'attendance_checker_current';

// ===== Sheet Management =====

export function getSheets(): AttendanceSheet[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SHEETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AttendanceSheet[];
    return [];
  } catch {
    return [];
  }
}

export function saveSheets(sheets: AttendanceSheet[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
}

export function getCurrentSheetId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_SHEET_KEY);
}

export function setCurrentSheetId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem(CURRENT_SHEET_KEY, id);
  else localStorage.removeItem(CURRENT_SHEET_KEY);
}

export function getCurrentSheet(): AttendanceSheet | null {
  const id = getCurrentSheetId();
  if (!id) return null;
  const sheets = getSheets();
  return sheets.find(s => s.id === id) || null;
}

export function getSheetById(id: string): AttendanceSheet | null {
  const sheets = getSheets();
  return sheets.find(s => s.id === id) || null;
}

export function saveSheet(sheet: AttendanceSheet): void {
  const sheets = getSheets();
  const idx = sheets.findIndex(s => s.id === sheet.id);
  const updated = { ...sheet, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    sheets[idx] = updated;
  } else {
    sheets.push(updated);
  }
  saveSheets(sheets);
}

export function deleteSheet(id: string): void {
  const sheets = getSheets().filter(s => s.id !== id);
  saveSheets(sheets);
  if (getCurrentSheetId() === id) {
    setCurrentSheetId(sheets.length > 0 ? sheets[sheets.length - 1].id : null);
  }
}

export function createNewSheet(name?: string): AttendanceSheet {
  const id = `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const sheet: AttendanceSheet = {
    id,
    name: name || 'New Sheet',
    profile: { college: 'Loyola College, Chennai' },
    subjects: [],
    monthly: [],
    cgpaData: { semesters: [] },
    createdAt: now,
    updatedAt: now,
  };
  return sheet;
}

export function openSheet(id: string): AttendanceSheet | null {
  const sheet = getSheetById(id);
  if (sheet) setCurrentSheetId(id);
  return sheet;
}

export function exitCurrentSheet(): void {
  setCurrentSheetId(null);
}

// ===== Legacy Migration =====

export function migrateLegacyData(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if old format exists
  const oldProfile = localStorage.getItem('loyola_attendance_profile');
  if (!oldProfile) return false;

  // Check if new format already exists
  const existing = getSheets();
  if (existing.length > 0) return false;

  try {
    const profile = JSON.parse(oldProfile) as StudentProfile;
    const subjectsRaw = localStorage.getItem('loyola_attendance_subjects');
    const monthlyRaw = localStorage.getItem('loyola_attendance_monthly');
    const targetRaw = localStorage.getItem('loyola_attendance_target');
    const cgpaRaw = localStorage.getItem('loyola_attendance_cgpa');

    const subjects: Subject[] = subjectsRaw ? JSON.parse(subjectsRaw) : [];
    const monthly: MonthlyAttendance[] = monthlyRaw ? JSON.parse(monthlyRaw) : [];
    const cgpaData: CGPAData = cgpaRaw ? JSON.parse(cgpaRaw) : { semesters: [] };

    // Generate a name from profile
    const parts = [profile.level, profile.semester ? `Semester ${profile.semester}` : null, profile.academicYear].filter(Boolean);
    const name = parts.join(' • ') || 'Migrated Sheet';

    const now = new Date().toISOString();
    const sheet: AttendanceSheet = {
      id: `sheet_migrated_${Date.now()}`,
      name,
      profile,
      subjects,
      monthly,
      cgpaData,
      createdAt: now,
      updatedAt: now,
    };

    saveSheets([sheet]);
    setCurrentSheetId(sheet.id);

    // Clean up old keys
    localStorage.removeItem('loyola_attendance_profile');
    localStorage.removeItem('loyola_attendance_subjects');
    localStorage.removeItem('loyola_attendance_monthly');
    localStorage.removeItem('loyola_attendance_target');
    localStorage.removeItem('loyola_attendance_cgpa');

    return true;
  } catch {
    return false;
  }
}

// ===== Target (still global) =====

const TARGET_KEY = 'attendance_checker_target';

export function getTarget(): number {
  if (typeof window === 'undefined') return 80;
  const data = localStorage.getItem(TARGET_KEY);
  if (!data) return 80;
  const parsed = parseInt(data, 10);
  return isNaN(parsed) || parsed < 1 || parsed > 100 ? 80 : parsed;
}

export function saveTarget(target: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TARGET_KEY, JSON.stringify(target));
}

// ===== Clear =====

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SHEETS_KEY);
  localStorage.removeItem(CURRENT_SHEET_KEY);
  localStorage.removeItem(TARGET_KEY);
}

// ===== Export =====

export function exportData(): void {
  if (typeof window === 'undefined') return;
  const sheets = getSheets();
  const target = getTarget();

  const exportObj = {
    appName: 'Attendance Checker',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    data: { sheets, target },
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportObj, null, 2)
  )}`;

  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `attendance_checker_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

// ===== Import =====

export interface ImportResult {
  success: boolean;
  error?: string;
  sheetsImported?: number;
}

export function importData(jsonContent: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonContent);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format.' };
    }

    const data = parsed.data;
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'This file doesn\'t contain valid Attendance Checker data.' };
    }

    // New format (multi-sheet)
    if (Array.isArray(data.sheets)) {
      const validSheets: AttendanceSheet[] = [];
      for (const sheet of data.sheets) {
        if (!sheet.id || !sheet.name || !sheet.profile || !Array.isArray(sheet.subjects)) {
          continue; // skip invalid sheets
        }
        validSheets.push({
          ...sheet,
          monthly: Array.isArray(sheet.monthly) ? sheet.monthly : [],
          cgpaData: sheet.cgpaData || { semesters: [] },
        });
      }

      if (validSheets.length === 0) {
        return { success: false, error: 'No valid attendance sheets found in the backup.' };
      }

      // Merge with existing sheets (add new, skip duplicates by id)
      const existing = getSheets();
      const existingIds = new Set(existing.map(s => s.id));
      const newSheets = validSheets.filter(s => !existingIds.has(s.id));
      const merged = [...existing, ...newSheets];

      saveSheets(merged);
      if (typeof data.target === 'number') saveTarget(data.target);

      return { success: true, sheetsImported: newSheets.length };
    }

    // Legacy format (single sheet) - migrate
    if (data.profile && Array.isArray(data.subjects)) {
      const profile = data.profile as StudentProfile;
      const subjects: Subject[] = data.subjects;
      const monthly: MonthlyAttendance[] = Array.isArray(data.monthly) ? data.monthly : [];
      const cgpaData: CGPAData = data.cgpaData || { semesters: [] };

      const parts = [profile.level, profile.semester ? `Semester ${profile.semester}` : null, profile.academicYear].filter(Boolean);
      const name = parts.join(' • ') || 'Imported Sheet';

      const sheet = createNewSheet(name);
      sheet.profile = profile;
      sheet.subjects = subjects;
      sheet.monthly = monthly;
      sheet.cgpaData = cgpaData;

      saveSheet(sheet);
      if (typeof data.target === 'number') saveTarget(data.target);

      return { success: true, sheetsImported: 1 };
    }

    return { success: false, error: 'Unrecognized backup format.' };
  } catch {
    return { success: false, error: 'Failed to read the backup file.' };
  }
}
