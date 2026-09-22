// attendanceCalc.ts — pure deterministic JS calculations (no AI, no guessing)
import type { GroqSubjectRow, GroqMonthRow, GroqReportedTotal, RowValidation, CrossCheck } from './groqTypes';

/** Overall attendance = sum(present) / sum(totalHours) * 100  — never average percentages */
export function calcOverallPct(subjects: GroqSubjectRow[]): number {
  const totalH = subjects.reduce((s, r) => s + (r.totalHours ?? 0), 0);
  const totalP = subjects.reduce((s, r) => s + (r.present ?? 0), 0);
  if (totalH === 0) return 0;
  return (totalP / totalH) * 100;
}

/** Per-subject display percentage (recalculated — do not trust Groq value) */
export function calcSubjectPct(present: number, totalHours: number): number {
  if (totalHours === 0) return 0;
  return (present / totalHours) * 100;
}

/** Validate that present + absent + cl === totalHours */
export function validateRow(row: GroqSubjectRow): RowValidation {
  const sum = (row.present ?? 0) + (row.absent ?? 0) + (row.cl ?? 0);
  const total = row.totalHours ?? 0;
  if (Math.abs(sum - total) > 0) {
    return {
      valid: false,
      issue: `P ${row.present} + A ${row.absent} + CL ${row.cl} = ${sum} (expected Total = ${total})`,
    };
  }
  return { valid: true, issue: null };
}

/** Cross-check subject totals vs monthly totals and vs reported table total */
export function crossCheck(
  subjects: GroqSubjectRow[],
  monthly: GroqMonthRow[],
  reportedTotal: GroqReportedTotal | null,
): CrossCheck {
  const subP   = subjects.reduce((s, r) => s + (r.present ?? 0), 0);
  const subA   = subjects.reduce((s, r) => s + (r.absent  ?? 0), 0);
  const subCL  = subjects.reduce((s, r) => s + (r.cl      ?? 0), 0);
  const subH   = subjects.reduce((s, r) => s + (r.totalHours ?? 0), 0);

  const monP   = monthly.reduce((s, m) => s + (m.present ?? 0), 0);
  const monA   = monthly.reduce((s, m) => s + (m.absent  ?? 0), 0);
  const monCL  = monthly.reduce((s, m) => s + (m.cl      ?? 0), 0);

  const subjectsMatchMonthly =
    monthly.length === 0 ||
    (subP === monP && subA === monA && subCL === monCL);

  const subjectsMatchReportedTotal =
    reportedTotal === null ||
    (
      (reportedTotal.present  === null || reportedTotal.present  === subP)  &&
      (reportedTotal.absent   === null || reportedTotal.absent   === subA)  &&
      (reportedTotal.cl       === null || reportedTotal.cl       === subCL) &&
      (reportedTotal.totalHours === null || reportedTotal.totalHours === subH)
    );

  return {
    subjectTotals: { present: subP, absent: subA, cl: subCL, total: subH },
    monthlyTotals: { present: monP, absent: monA, cl: monCL },
    subjectsMatchMonthly,
    subjectsMatchReportedTotal,
  };
}
