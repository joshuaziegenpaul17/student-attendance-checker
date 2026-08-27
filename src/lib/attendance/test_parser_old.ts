import { parseOCRText } from './tableParser';

// Old reference screenshot — 9 subjects, no CL column
// Expected: P=181 A=50 CL=0 T=231 Overall=78.35%

const OLD_REFERENCE = `
ATTENDANCE DETAILS

Subject Code
Subject Description
Total Hrs.
A
P
Attendance %

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

Jun-2026
7
56

Jul-2026
25
88

Aug-2026
18
37
`.trim();

console.log('=== OLD REFERENCE SCREENSHOT REGRESSION TEST ===\n');

const result = parseOCRText(OLD_REFERENCE);

console.log(`Subjects: ${result.subjects.length}/9 | Months: ${result.monthly.length}/3`);

const totalP = result.subjects.reduce((s, sub) => s + sub.presentHours, 0);
const totalA = result.subjects.reduce((s, sub) => s + sub.absentHours, 0);
const totalCL = result.subjects.reduce((s, sub) => s + sub.clHours, 0);
const totalH = result.subjects.reduce((s, sub) => s + sub.totalHours, 0);
const pct = totalH > 0 ? (totalP / totalH * 100).toFixed(2) : '0';

const pass = result.subjects.length === 9 && totalP === 181 && totalA === 50 && totalCL === 0 && totalH === 231;
console.log(`P=${totalP} A=${totalA} CL=${totalCL} T=${totalH} = ${pct}%`);
console.log(pass ? '✅ REGRESSION PASS' : '❌ REGRESSION FAIL');
if (!pass) process.exit(1);
