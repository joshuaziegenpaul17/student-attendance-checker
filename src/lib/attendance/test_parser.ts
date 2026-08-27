import { parseOCRText } from './tableParser';

// ═══════════════════════════════════════════════════════
// NEW REFERENCE SCREENSHOT — 9 subjects with CL
// Expected: P=188 A=44 CL=10 T=242 Overall=77.69%
// ═══════════════════════════════════════════════════════

const REFERENCE_OCR = `
ATTENDANCE DETAILS

Subject Code
Subject Description
Total Hrs.
A
P
CL
Attendance With OD and ML (%)

PEC3VA01
DATA ANALYSIS USING EXCEL
9
2
7
0
77.78%

PHE3SK01
SOFT SKILLS
6
1
5
0
83.33%

PST3ID01
DATA VISUALIZATION AND MATLAB THEORY
31
5
26
0
83.87%

PST3ID02
DATA VISUALIZATION AND MATLAB LAB
14
1
11
2
78.57%

PST3MC01
MULTIVARIATE ANALYSIS
39
8
29
2
74.36%

PST3MC02
ADVANCED STOCHASTIC PROCESSES
46
8
36
2
78.26%

PST3MC03
DATA MINING AND MACHINE LEARNING
35
11
22
2
62.86%

PST3MC04
STATISTICS LAB III
31
2
28
1
90.32%

PST3ME01
ADVANCED OPERATIONS RESEARCH
31
6
24
1
77.42%

Total
242
44
188
10
77.69%

CUMULATIVE ATTENDANCE

Month / Year
A
P
CL

Jun-2026
7
56
0

Jul-2026
25
88
0

Aug-2026
12
44
10

Total
44
188
10
`.trim();

console.log('=== NEW REFERENCE SCREENSHOT TEST ===\n');

const result = parseOCRText(REFERENCE_OCR);

console.log(`Subjects found: ${result.subjects.length} (expected: 9)`);
console.log(`Months found: ${result.monthly.length} (expected: 3)\n`);

let allPass = true;

for (const sub of result.subjects) {
  const calculatedPct = sub.totalHours > 0
    ? Math.round((sub.presentHours / sub.totalHours) * 10000) / 100
    : 0;
  const pctOk = Math.abs(calculatedPct - sub.attendancePercentage) <= 0.01;
  const sumOk = sub.presentHours + sub.absentHours + sub.clHours === sub.totalHours;

  console.log(
    `  ${sub.subjectCode.padEnd(10)} ${sub.subjectName.padEnd(40)} ` +
    `T: ${String(sub.totalHours).padStart(3)} A: ${String(sub.absentHours).padStart(2)} ` +
    `P: ${String(sub.presentHours).padStart(2)} CL: ${sub.clHours} ` +
    `${sub.attendancePercentage.toFixed(2)}% ${pctOk && sumOk ? '✓' : '✗'}`
  );

  if (!sumOk) {
    console.log(`    ✗ P+A+CL (${sub.presentHours}+${sub.absentHours}+${sub.clHours}=${sub.presentHours+sub.absentHours+sub.clHours}) != Total (${sub.totalHours})`);
    allPass = false;
  }
  if (!pctOk) {
    console.log(`    ✗ Calculated ${calculatedPct}% != displayed ${sub.attendancePercentage}%`);
    allPass = false;
  }
}

const totalP = result.subjects.reduce((s, sub) => s + sub.presentHours, 0);
const totalA = result.subjects.reduce((s, sub) => s + sub.absentHours, 0);
const totalCL = result.subjects.reduce((s, sub) => s + sub.clHours, 0);
const totalH = result.subjects.reduce((s, sub) => s + sub.totalHours, 0);
const overallPct = totalH > 0 ? Math.round((totalP / totalH) * 10000) / 100 : 0;

console.log(`\nSubject totals: P=${totalP} A=${totalA} CL=${totalCL} Total=${totalH} Overall=${overallPct.toFixed(2)}%`);
console.log(`Expected:       P=188 A=44 CL=10 Total=242 Overall=77.69%`);

const monthP = result.monthly.reduce((s, m) => s + m.present, 0);
const monthA = result.monthly.reduce((s, m) => s + m.absent, 0);
const monthCL = result.monthly.reduce((s, m) => s + m.cl, 0);

console.log(`\nMonthly totals: P=${monthP} A=${monthA} CL=${monthCL}`);
console.log(`Expected:       P=188 A=44 CL=10`);

console.log(`\n=== VALIDATION ===`);
console.log(`Found 9 subjects: ${result.subjects.length === 9 ? '✓' : '✗ (got ' + result.subjects.length + ')'} ${result.subjects.length !== 9 ? '— FAIL' : ''}`);
console.log(`Found 3 months: ${result.monthly.length === 3 ? '✓' : '✗ (got ' + result.monthly.length + ')'}`);
console.log(`P=188: ${totalP === 188 ? '✓' : '✗ (got ' + totalP + ')'}`);
console.log(`A=44: ${totalA === 44 ? '✓' : '✗ (got ' + totalA + ')'}`);
console.log(`CL=10: ${totalCL === 10 ? '✓' : '✗ (got ' + totalCL + ')'}`);
console.log(`Total=242: ${totalH === 242 ? '✓' : '✗ (got ' + totalH + ')'}`);
console.log(`Overall=77.69%: ${Math.abs(overallPct - 77.69) < 0.02 ? '✓' : '✗ (got ' + overallPct.toFixed(2) + '%)'}`);
console.log(`Cross-check match: ${totalP === monthP && totalA === monthA ? '✓' : '✗'}`);

if (result.subjects.length !== 9 || totalP !== 188 || totalA !== 44 || totalCL !== 10 || totalH !== 242) {
  console.log('\n❌ SOME TESTS FAILED');
  allPass = false;
}

if (allPass) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
