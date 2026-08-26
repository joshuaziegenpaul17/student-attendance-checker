export type Page = 'dashboard' | 'subjects' | 'cumulative' | 'whatif' | 'cgpa' | 'settings' | 'sheets';

export type SubjectCategory =
  | 'Major Core'
  | 'Major Elective'
  | 'Allied'
  | 'Cross-Disciplinary'
  | 'Skill / Soft Skill'
  | 'Language'
  | 'Other';

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
  'Major Core',
  'Major Elective',
  'Allied',
  'Cross-Disciplinary',
  'Skill / Soft Skill',
  'Language',
  'Other',
];

export interface StudentProfile {
  college: string;
  level?: 'UG' | 'PG';
  academicYear?: string;
  programme?: string;
  department?: string;
  year?: string;
  semester?: string;
}

// ===== ATTENDANCE MODULE =====

export interface Subject {
  id: string;
  code: string;
  name: string;
  category?: SubjectCategory;
  totalHours: number;
  presentHours: number;
  absentHours: number;
  clHours: number;
}

export interface MonthlyAttendance {
  id: string;
  month: string;
  absent: number;
  present: number;
  cl: number;
}

export interface CumulativeTotals {
  totalPresent: number;
  totalAbsent: number;
  totalCL: number;
  totalHours: number;
  percentage: number;
}

export interface OverallAttendance {
  percentage: number;
  totalPresent: number;
  totalConduct: number;
  totalAbsent: number;
  totalCL: number;
  status: 'ON_TRACK' | 'BELOW_TARGET' | 'HIGH_RISK' | 'CRITICAL';
}

export interface PredictionResult {
  hoursRequired: number;
  hoursCanMiss: number;
}

export interface CrossCheckResult {
  matches: boolean;
  subjectTotals: { present: number; absent: number; cl: number; total: number };
  cumulativeTotals: { present: number; absent: number; cl: number; total: number };
}

// ===== CGPA MODULE =====

export interface CGPASubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  marks: number;
  gradePoint: number;
  letterGrade: string;
}

export interface CGPACategory {
  id: string;
  name: SubjectCategory;
  includeInGPA: boolean;
  includeInCGPA: boolean;
  subjects: CGPASubject[];
}

export interface CGPASemester {
  id: string;
  label: string;
  year: string;
  categories: CGPACategory[];
}

export interface CGPAData {
  semesters: CGPASemester[];
}

export interface SemesterGPAResult {
  semesterId: string;
  label: string;
  totalCredits: number;
  weightedPoints: number;
  gpa: number;
}

export interface CGPAResult {
  totalCredits: number;
  weightedPoints: number;
  cgpa: number;
  semesters: SemesterGPAResult[];
}

// ===== MULTI-SHEET MODEL =====

export interface AttendanceSheet {
  id: string;
  name: string;
  profile: StudentProfile;
  subjects: Subject[];
  monthly: MonthlyAttendance[];
  cgpaData: CGPAData;
  createdAt: string;
  updatedAt: string;
}

export interface SheetsStore {
  sheets: AttendanceSheet[];
  currentSheetId: string | null;
}
