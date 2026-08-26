import { parseOCRText } from './tableParser';

const cleanText = `
ATTENDANCE DETAILS

Subject Code
Subject Description
Total Hrs.
A
P
Attendance With OD and ML (%)

PEC3VA01
DATA ANALYSIS USING EXCEL
8
2
6
75.00%

PHE3SK01
SOFT SKILLS
6
1
5
83.33%

PST3ID01
DATA VISUALIZATION AND MATLAB THEORY
30
6
24
80.00%

PST3ID02
DATA VISUALIZATION AND MATLAB LAB
14
3
11
78.57%

PST3MC01
MULTIVARIATE ANALYSIS
38
9
29
76.32%

PST3MC02
ADVANCED STOCHASTIC PROCESSES
45
9
36
80.00%

PST3MC03
DATA MINING AND MACHINE LEARNING
34
10
24
70.59%

PST3MC04
STATISTICS LAB III
31
5
26
83.87%

PST3ME02
ACTUARIAL STATISTICS
25
5
20
80.00%

Total
231
50
181
78.35%

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
18
37
0

Total
50
181
0
`;

console.log('=== CLEAN TEXT PARSER TEST ===\n');

const result = parseOCRText(cleanText);

console.log('Subjects found:', result.subjects.length, '(expected: 9)');
console.log('Months found:', result.monthly.length, '(expected: 3)\n');

for (const sub of result.subjects) {
  const check = sub.presentHours + sub.absentHours + sub.clHours === sub.totalHours ? '✓' : '✗';
  console.log(`  ${sub.subjectCode.padEnd(12)} ${sub.subjectName.padEnd(42)} T:${String(sub.totalHours).padStart(3)} A:${String(sub.absentHours).padStart(2)} P:${String(sub.presentHours).padStart(2)} CL:${String(sub.clHours).padStart(2)} ${sub.attendancePercentage.toFixed(2).padStart(6)}% ${check}`);
}

console.log('');
console.log(`Subject totals: P=${result.subjectTotals.present} A=${result.subjectTotals.absent} CL=${result.subjectTotals.cl} Total=${result.subjectTotals.total} Overall=${result.subjectTotals.percentage}%`);
console.log('Expected:       P=181 A=50 CL=0 Total=231 Overall=78.35%');
console.log('');

for (const m of result.monthly) {
  const total = m.present + m.absent + m.cl;
  const pct = total > 0 ? ((m.present / total) * 100).toFixed(2) : '—';
  console.log(`  ${m.month.padEnd(12)} A:${m.absent} P:${m.present} CL:${m.cl} ${pct}%`);
}
console.log('');
console.log(`Monthly totals: P=${result.monthlyTotals.present} A=${result.monthlyTotals.absent} CL=${result.monthlyTotals.cl}`);
console.log('Expected:       P=181 A=50 CL=0');

const crossMatch = result.subjectTotals.present === result.monthlyTotals.present &&
  result.subjectTotals.absent === result.monthlyTotals.absent;
console.log(`\nCross-check: ${crossMatch ? '✓ Totals match' : '✗ Totals differ'}`);

// Validation checks
console.log('\n=== VALIDATION ===');
const allValid = result.subjects.every(s => s.presentHours + s.absentHours + s.clHours === s.totalHours);
console.log(`All P+A+CL = Total: ${allValid ? '✓' : '✗'}`);

const noFabricatedCL = result.subjects.every(s => s.clHours === 0);
console.log(`No fabricated CL: ${noFabricatedCL ? '✓' : '✗'}`);

const correctOverall = result.subjectTotals.percentage === 78.35;
console.log(`Correct overall %: ${correctOverall ? '✓' : '✗'} (got ${result.subjectTotals.percentage}%)`);

const correctSubjects = result.subjects.length === 9;
console.log(`Found 9 subjects: ${correctSubjects ? '✓' : '✗'} (got ${result.subjects.length})`);

const correctMonths = result.monthly.length === 3;
console.log(`Found 3 months: ${correctMonths ? '✓' : '✗'} (got ${result.monthly.length})`);

const allPass = allValid && noFabricatedCL && correctOverall && correctSubjects && correctMonths && crossMatch;
console.log(`\n${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
