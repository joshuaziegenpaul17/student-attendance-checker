import { CGPASubject } from '@/types/attendance';

/**
 * Verify CGPA calculation:
 *
 * Semester 3 (includeInGPA=true):
 *   Major Core:
 *     Multivariate Analysis: 4cr × 9.0 = 36.0
 *     Adv Stochastic:        4cr × 8.0 = 32.0
 *     Data Viz & Matlab:     3cr × 9.0 = 27.0
 *   Major Elective:
 *     Data Mining:           3cr × 8.0 = 24.0
 *   Skill (excluded from GPA)
 *   Total: 14 credits, 119 weighted → GPA = 8.50
 *
 * Semester 4 (includeInGPA=true):
 *   Major Core:
 *     Data Analysis:         3cr × 9.0 = 27.0
 *     Statistics Lab III:    2cr × 10.0 = 20.0
 *     Data Viz Lab:          2cr × 8.0 = 16.0
 *   Major Elective:
 *     Adv Ops Research:      3cr × 8.0 = 24.0
 *   Total: 10 credits, 87 weighted → GPA = 8.70
 *
 * CGPA:
 *   Total: 24 credits, 206 weighted → CGPA = 8.58
 */

const gradeScale = [
  { min: 90, gp: 10, grade: 'O' },
  { min: 80, gp: 9, grade: 'A+' },
  { min: 70, gp: 8, grade: 'A' },
  { min: 60, gp: 7, grade: 'B+' },
  { min: 50, gp: 6, grade: 'B' },
  { min: 45, gp: 5, grade: 'C' },
  { min: 40, gp: 4, grade: 'D' },
  { min: 35, gp: 3, grade: 'E' },
  { min: 0, gp: 0, grade: 'F' },
];

function getGP(marks: number): { gp: number; grade: string } {
  for (const tier of gradeScale) {
    if (marks >= tier.min) return { gp: tier.gp, grade: tier.grade };
  }
  return { gp: 0, grade: 'F' };
}

const subjects: { name: string; marks: number; credits: number; semester: number }[] = [
  { name: 'Multivariate Analysis', marks: 82, credits: 4, semester: 3 },
  { name: 'Advanced Stochastic Processes', marks: 78, credits: 4, semester: 3 },
  { name: 'Data Visualization & Matlab', marks: 85, credits: 3, semester: 3 },
  { name: 'Data Mining & ML', marks: 72, credits: 3, semester: 3 },
  { name: 'Soft Skills (excluded)', marks: 88, credits: 1, semester: 3 },
  { name: 'Data Analysis Using Excel', marks: 80, credits: 3, semester: 4 },
  { name: 'Statistics Lab III', marks: 91, credits: 2, semester: 4 },
  { name: 'Data Viz & Matlab Lab', marks: 76, credits: 2, semester: 4 },
  { name: 'Adv Operations Research', marks: 74, credits: 3, semester: 4 },
];

console.log('=== CGPA Verification ===\n');

let sem3Credits = 0, sem3Weighted = 0;
let sem4Credits = 0, sem4Weighted = 0;

for (const s of subjects) {
  const { gp, grade } = getGP(s.marks);
  const weighted = s.credits * gp;
  const isExcluded = s.name.includes('excluded');
  console.log(`${s.name.padEnd(35)} ${String(s.marks).padStart(3)} marks → ${grade.padEnd(2)} (GP ${gp}) × ${s.credits}cr = ${weighted}`);

  if (s.semester === 3 && !isExcluded) {
    sem3Credits += s.credits;
    sem3Weighted += weighted;
  } else if (s.semester === 4 && !isExcluded) {
    sem4Credits += s.credits;
    sem4Weighted += weighted;
  }
}

const sem3GPA = sem3Credits > 0 ? sem3Weighted / sem3Credits : 0;
const sem4GPA = sem4Credits > 0 ? sem4Weighted / sem4Credits : 0;
const totalCredits = sem3Credits + sem4Credits;
const totalWeighted = sem3Weighted + sem4Weighted;
const cgpa = totalCredits > 0 ? totalWeighted / totalCredits : 0;

console.log(`\nSemester 3: ${sem3Credits} credits, Σ(C×G) = ${sem3Weighted} → GPA = ${sem3GPA.toFixed(2)}`);
console.log(`Semester 4: ${sem4Credits} credits, Σ(C×G) = ${sem4Weighted} → GPA = ${sem4GPA.toFixed(2)}`);
console.log(`\nCGPA: ${totalCredits} credits, Σ(C×G) = ${totalWeighted} → ${cgpa.toFixed(2)}`);
