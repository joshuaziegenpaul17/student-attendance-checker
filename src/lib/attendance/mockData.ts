import { AttendanceSheet, Subject, StudentProfile, MonthlyAttendance, CGPAData } from '@/types/attendance';

export const mockProfile: StudentProfile = {
  college: 'Loyola College, Chennai',
  level: 'PG',
  academicYear: '2026–27',
  programme: 'M.Sc.',
  department: 'Statistics',
  year: 'II',
  semester: 'IV',
};

export const mockSubjects: Subject[] = [
  { id: '1', code: 'ST401', name: 'Data Analysis Using Excel', category: 'Major Core', totalHours: 8, presentHours: 6, absentHours: 2, clHours: 0 },
  { id: '2', code: 'ST402', name: 'Soft Skills', category: 'Skill / Soft Skill', totalHours: 6, presentHours: 5, absentHours: 1, clHours: 0 },
  { id: '3', code: 'ST403', name: 'Data Visualization & Matlab Theory', category: 'Major Core', totalHours: 30, presentHours: 25, absentHours: 5, clHours: 0 },
  { id: '4', code: 'ST404', name: 'Data Visualization & Matlab Lab', category: 'Major Core', totalHours: 14, presentHours: 11, absentHours: 1, clHours: 2 },
  { id: '5', code: 'ST405', name: 'Multivariate Analysis', category: 'Major Core', totalHours: 38, presentHours: 28, absentHours: 8, clHours: 2 },
  { id: '6', code: 'ST406', name: 'Advanced Stochastic Processes', category: 'Major Core', totalHours: 45, presentHours: 35, absentHours: 8, clHours: 2 },
  { id: '7', code: 'ST407', name: 'Data Mining & Machine Learning', category: 'Major Elective', totalHours: 34, presentHours: 21, absentHours: 11, clHours: 2 },
  { id: '8', code: 'ST408', name: 'Statistics Lab III', category: 'Major Core', totalHours: 31, presentHours: 28, absentHours: 2, clHours: 1 },
  { id: '9', code: 'ST409', name: 'Advanced Operations Research', category: 'Major Elective', totalHours: 30, presentHours: 23, absentHours: 6, clHours: 1 },
];

export const mockMonthly: MonthlyAttendance[] = [
  { id: 'm1', month: 'Jun-2026', absent: 0, present: 53, cl: 10 },
  { id: 'm2', month: 'Jul-2026', absent: 24, present: 93, cl: 0 },
  { id: 'm3', month: 'Aug-2026', absent: 20, present: 36, cl: 0 },
];

export const mockCGPA: CGPAData = {
  semesters: [
    {
      id: 'sem3', label: 'Semester 3', year: 'Year II',
      categories: [
        { id: 'cat1', name: 'Major Core', includeInGPA: true, includeInCGPA: true, subjects: [
          { id: 's1', name: 'Multivariate Analysis', code: 'ST3MC01', credits: 4, marks: 82, gradePoint: 9, letterGrade: 'A+' },
          { id: 's2', name: 'Advanced Stochastic Processes', code: 'ST3MC02', credits: 4, marks: 78, gradePoint: 8, letterGrade: 'A' },
          { id: 's3', name: 'Data Visualization & Matlab', code: 'ST3MC03', credits: 3, marks: 85, gradePoint: 9, letterGrade: 'A+' },
        ]},
        { id: 'cat2', name: 'Major Elective', includeInGPA: true, includeInCGPA: true, subjects: [
          { id: 's4', name: 'Data Mining & Machine Learning', code: 'ST3ME01', credits: 3, marks: 72, gradePoint: 8, letterGrade: 'A' },
        ]},
        { id: 'cat3', name: 'Skill / Soft Skill', includeInGPA: false, includeInCGPA: false, subjects: [
          { id: 's5', name: 'Soft Skills', code: 'SS301', credits: 1, marks: 88, gradePoint: 9, letterGrade: 'A+' },
        ]},
      ],
    },
    {
      id: 'sem4', label: 'Semester 4', year: 'Year II',
      categories: [
        { id: 'cat4', name: 'Major Core', includeInGPA: true, includeInCGPA: true, subjects: [
          { id: 's6', name: 'Data Analysis Using Excel', code: 'ST4MC01', credits: 3, marks: 80, gradePoint: 9, letterGrade: 'A+' },
          { id: 's7', name: 'Statistics Lab III', code: 'ST4MC02', credits: 2, marks: 91, gradePoint: 10, letterGrade: 'O' },
          { id: 's8', name: 'Data Visualization & Matlab Lab', code: 'ST4MC03', credits: 2, marks: 76, gradePoint: 8, letterGrade: 'A' },
        ]},
        { id: 'cat5', name: 'Major Elective', includeInGPA: true, includeInCGPA: true, subjects: [
          { id: 's9', name: 'Advanced Operations Research', code: 'ST4ME01', credits: 3, marks: 74, gradePoint: 8, letterGrade: 'A' },
        ]},
      ],
    },
  ],
};

/**
 * Create a full mock sheet.
 */
export function createMockSheet(): AttendanceSheet {
  const now = new Date().toISOString();
  return {
    id: `sheet_sample_${Date.now()}`,
    name: 'Loyola Sample • Demo',
    profile: { ...mockProfile },
    subjects: mockSubjects.map(s => ({ ...s })),
    monthly: mockMonthly.map(m => ({ ...m })),
    cgpaData: { semesters: [] },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Expected values for verification:
 * Subjects: Total 236, Present 182, Absent 44, CL 10 → 77.12%
 * Cumulative: A 44, P 182, CL 10 → 236 total → 77.12%
 * Hours to 80%: 34
 * Attend 5: 77.59%
 * Miss 5: 75.52%
 * Multivariate: 73.68% → 12 hours
 * Stats Lab III: 90.32% → 4 missable
 */
