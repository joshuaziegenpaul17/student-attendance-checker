import {
  Subject, OverallAttendance, MonthlyAttendance, CumulativeTotals, CrossCheckResult,
  CGPASubject, CGPACategory, CGPASemester, CGPAData, SemesterGPAResult, CGPAResult,
} from '@/types/attendance';

export const TARGET_ATTENDANCE = 0.80; // 80%

// ===== ATTENDANCE CALCULATIONS =====

export function validateSubjectHours(subject: {
  totalHours: number;
  presentHours: number;
  absentHours: number;
  clHours: number;
}): { isValid: boolean; error?: string } {
  const { totalHours, presentHours, absentHours, clHours } = subject;

  if (
    !Number.isInteger(totalHours) ||
    !Number.isInteger(presentHours) ||
    !Number.isInteger(absentHours) ||
    !Number.isInteger(clHours)
  ) {
    return { isValid: false, error: 'Hours must be whole numbers.' };
  }

  if (totalHours < 0 || presentHours < 0 || absentHours < 0 || clHours < 0) {
    return { isValid: false, error: 'Hours cannot be negative.' };
  }

  if (totalHours === 0) {
    return { isValid: false, error: 'Total hours must be greater than zero.' };
  }

  if (presentHours + absentHours + clHours !== totalHours) {
    return {
      isValid: false,
      error: `Present (${presentHours}) + Absent (${absentHours}) + CL (${clHours}) must equal Total Hours (${totalHours}).`,
    };
  }

  return { isValid: true };
}

export function calculateAttendance(present: number, total: number): number {
  if (total <= 0) return 0;
  return (present / total) * 100;
}

export function getAttendanceStatus(
  percentage: number,
  target: number = TARGET_ATTENDANCE * 100
): OverallAttendance['status'] {
  if (percentage >= target) return 'ON_TRACK';
  if (percentage >= 65) return 'BELOW_TARGET';
  if (percentage >= 50) return 'HIGH_RISK';
  return 'CRITICAL';
}

export function calculateOverallAttendance(subjects: Subject[]): OverallAttendance {
  let totalPresent = 0;
  let totalConduct = 0;
  let totalAbsent = 0;
  let totalCL = 0;

  const validSubjects = subjects.filter(s => validateSubjectHours(s).isValid);

  for (const sub of validSubjects) {
    totalPresent += sub.presentHours;
    totalConduct += sub.totalHours;
    totalAbsent += sub.absentHours;
    totalCL += sub.clHours;
  }

  const percentage = totalConduct > 0 ? (totalPresent / totalConduct) * 100 : 0;
  const status = getAttendanceStatus(percentage);

  return { percentage, totalPresent, totalConduct, totalAbsent, totalCL, status };
}

export function calculateHoursRequiredToReachTarget(
  present: number, total: number, target: number = TARGET_ATTENDANCE
): number {
  if (total === 0) return 0;
  if (present / total >= target) return 0;
  if (target >= 1) return Infinity;
  const val = (target * total - present) / (1 - target);
  return Math.max(0, Math.ceil(Number(val.toFixed(9))));
}

export function calculateHoursCanMiss(
  present: number, total: number, target: number = TARGET_ATTENDANCE
): number {
  if (total === 0) return 0;
  if (present / total < target) return 0;
  if (target <= 0) return Infinity;
  const val = present / target - total;
  return Math.max(0, Math.floor(Number(val.toFixed(9))));
}

export function calculateFutureAttendance(
  present: number, total: number, futureHours: number, type: 'attend' | 'miss'
): number {
  const futureTotal = total + futureHours;
  if (futureTotal <= 0) return 0;
  return type === 'attend'
    ? ((present + futureHours) / futureTotal) * 100
    : (present / futureTotal) * 100;
}

// ===== CUMULATIVE / MONTHLY =====

export function calculateCumulativeTotals(monthly: MonthlyAttendance[]): CumulativeTotals {
  let totalPresent = 0, totalAbsent = 0, totalCL = 0;
  for (const m of monthly) { totalPresent += m.present; totalAbsent += m.absent; totalCL += m.cl; }
  const totalHours = totalPresent + totalAbsent + totalCL;
  const percentage = totalHours > 0 ? (totalPresent / totalHours) * 100 : 0;
  return { totalPresent, totalAbsent, totalCL, totalHours, percentage };
}

export function calculateMonthlyPercentage(month: MonthlyAttendance): number {
  const total = month.present + month.absent + month.cl;
  return total > 0 ? (month.present / total) * 100 : 0;
}

export function crossCheckAttendance(
  subjectTotals: { present: number; absent: number; cl: number; total: number },
  cumulativeTotals: { present: number; absent: number; cl: number; total: number }
): CrossCheckResult {
  const matches =
    subjectTotals.present === cumulativeTotals.present &&
    subjectTotals.absent === cumulativeTotals.absent &&
    subjectTotals.cl === cumulativeTotals.cl;
  return { matches, subjectTotals: { ...subjectTotals }, cumulativeTotals: { ...cumulativeTotals } };
}

// ===== CGPA CALCULATIONS =====

/**
 * Grade point scale (0-10). Maps marks (0-100) to grade point and letter grade.
 * This is a standard 10-point scale. Replace with exact Loyola scale when provided.
 */
export function getGradeFromMarks(marks: number): { gradePoint: number; letterGrade: string } {
  if (marks < 0 || marks > 100) return { gradePoint: 0, letterGrade: 'F' };

  if (marks >= 90) return { gradePoint: 10, letterGrade: 'O' };
  if (marks >= 80) return { gradePoint: 9, letterGrade: 'A+' };
  if (marks >= 70) return { gradePoint: 8, letterGrade: 'A' };
  if (marks >= 60) return { gradePoint: 7, letterGrade: 'B+' };
  if (marks >= 50) return { gradePoint: 6, letterGrade: 'B' };
  if (marks >= 45) return { gradePoint: 5, letterGrade: 'C' };
  if (marks >= 40) return { gradePoint: 4, letterGrade: 'D' };
  if (marks >= 35) return { gradePoint: 3, letterGrade: 'E' };
  return { gradePoint: 0, letterGrade: 'F' };
}

/**
 * Calculate GPA for a single semester.
 * GPA = Σ(Cᵢ × Gᵢ) / ΣCᵢ
 * Only includes subjects in categories where includeInGPA is true.
 */
export function calculateSemesterGPA(
  categories: CGPACategory[],
  onlyIncludeInGPA: boolean = true
): { gpa: number; totalCredits: number; weightedPoints: number } {
  let totalCredits = 0;
  let weightedPoints = 0;

  for (const cat of categories) {
    if (onlyIncludeInGPA && !cat.includeInGPA) continue;

    for (const sub of cat.subjects) {
      if (sub.credits > 0 && sub.marks >= 0) {
        const gp = getGradeFromMarks(sub.marks);
        totalCredits += sub.credits;
        weightedPoints += sub.credits * gp.gradePoint;
      }
    }
  }

  const gpa = totalCredits > 0 ? weightedPoints / totalCredits : 0;
  return { gpa, totalCredits, weightedPoints };
}

/**
 * Calculate CGPA across all semesters.
 * CGPA = Σ(Cᵢ × Gᵢ) / ΣCᵢ across applicable semesters.
 * Only includes subjects in categories where includeInCGPA is true.
 */
export function calculateCGPA(
  semesters: CGPASemester[],
  onlyIncludeInCGPA: boolean = true
): CGPAResult {
  let totalCredits = 0;
  let weightedPoints = 0;

  const semesterResults: SemesterGPAResult[] = [];

  for (const sem of semesters) {
    let semCredits = 0;
    let semWeighted = 0;

    for (const cat of sem.categories) {
      if (onlyIncludeInCGPA && !cat.includeInCGPA) continue;

      for (const sub of cat.subjects) {
        if (sub.credits > 0 && sub.marks >= 0) {
          const gp = getGradeFromMarks(sub.marks);
          semCredits += sub.credits;
          semWeighted += sub.credits * gp.gradePoint;
        }
      }
    }

    const semGPA = semCredits > 0 ? semWeighted / semCredits : 0;
    totalCredits += semCredits;
    weightedPoints += semWeighted;

    semesterResults.push({
      semesterId: sem.id,
      label: sem.label,
      totalCredits: semCredits,
      weightedPoints: semWeighted,
      gpa: semGPA,
    });
  }

  const cgpa = totalCredits > 0 ? weightedPoints / totalCredits : 0;

  return { totalCredits, weightedPoints, cgpa, semesters: semesterResults };
}

/**
 * Count subjects in a category.
 */
export function countCategorySubjects(category: CGPACategory): number {
  return category.subjects.length;
}

/**
 * Get total credits for a category.
 */
export function getCategoryTotalCredits(category: CGPACategory): number {
  return category.subjects.reduce((sum, s) => sum + s.credits, 0);
}
