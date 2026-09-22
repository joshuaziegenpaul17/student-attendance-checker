// groqTypes.ts — shared Groq Vision parse types

export interface GroqSubjectRow {
  subjectCode: string;
  subjectDescription: string;
  totalHours: number;
  absent: number;
  present: number;
  cl: number;
  displayedAttendancePercentage: number | null;
}

export interface GroqMonthRow {
  month: string;
  year: number;
  absent: number;
  present: number;
  cl: number;
}

export interface GroqReportedTotal {
  totalHours: number | null;
  absent: number | null;
  present: number | null;
  cl: number | null;
  displayedAttendancePercentage: number | null;
}

export interface GroqParseResult {
  documentType: 'loyola_attendance' | 'unknown';
  attendanceDetails: {
    subjects: GroqSubjectRow[];
    reportedTotal: GroqReportedTotal | null;
  };
  cumulativeAttendance: {
    months: GroqMonthRow[];
  };
}

export interface RowValidation {
  valid: boolean;
  issue: string | null;
}

export interface CrossCheck {
  subjectTotals: { present: number; absent: number; cl: number; total: number };
  monthlyTotals: { present: number; absent: number; cl: number };
  subjectsMatchMonthly: boolean;
  subjectsMatchReportedTotal: boolean;
}
