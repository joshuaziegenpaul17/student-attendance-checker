import {
  calculateAttendance,
  calculateOverallAttendance,
  calculateHoursRequiredToReachTarget,
  calculateHoursCanMiss,
  validateSubjectHours
} from './calculations';
import { Subject } from '@/types/attendance';

// Define the exact reference data from the Loyola attendance screenshot
const sampleSubjects: Subject[] = [
  { id: '1', code: 'excel', name: 'DATA ANALYSIS USING EXCEL', totalHours: 8, presentHours: 6, absentHours: 2, clHours: 0 },
  { id: '2', code: 'soft', name: 'SOFT SKILLS', totalHours: 6, presentHours: 5, absentHours: 1, clHours: 0 },
  { id: '3', code: 'vis_theory', name: 'DATA VISUALIZATION AND MATLAB THEORY', totalHours: 30, presentHours: 25, absentHours: 5, clHours: 0 },
  { id: '4', code: 'vis_lab', name: 'DATA VISUALIZATION AND MATLAB LAB', totalHours: 14, presentHours: 11, absentHours: 1, clHours: 2 },
  { id: '5', code: 'multi', name: 'MULTIVARIATE ANALYSIS', totalHours: 38, presentHours: 28, absentHours: 8, clHours: 2 },
  { id: '6', code: 'stoch', name: 'ADVANCED STOCHASTIC PROCESSES', totalHours: 45, presentHours: 35, absentHours: 8, clHours: 2 },
  { id: '7', code: 'mining', name: 'DATA MINING AND MACHINE LEARNING', totalHours: 34, presentHours: 21, absentHours: 11, clHours: 2 },
  { id: '8', code: 'stats_lab', name: 'STATISTICS LAB III', totalHours: 31, presentHours: 28, absentHours: 2, clHours: 1 },
  { id: '9', code: 'or', name: 'ADVANCED OPERATIONS RESEARCH', totalHours: 30, presentHours: 23, absentHours: 6, clHours: 1 }
];

console.log('--- Testing Subject Validations ---');
let allValid = true;
for (const sub of sampleSubjects) {
  const check = validateSubjectHours(sub);
  if (!check.isValid) {
    console.error(`❌ Validation failed for ${sub.name}: ${check.error}`);
    allValid = false;
  } else {
    console.log(`✓ ${sub.code.padEnd(12)}: Validated successfully`);
  }
}

console.log('\n--- Testing Subject Percentages ---');
for (const sub of sampleSubjects) {
  const percentage = calculateAttendance(sub.presentHours, sub.totalHours);
  console.log(`${sub.name.padEnd(40)}: Calculated = ${percentage.toFixed(2)}%`);
}

console.log('\n--- Testing Overall Attendance ---');
const overall = calculateOverallAttendance(sampleSubjects);
console.log(`Total Conducted Hours: ${overall.totalConduct} (Expected: 236)`);
console.log(`Total Present Hours  : ${overall.totalPresent} (Expected: 182)`);
console.log(`Total Absent Hours   : ${overall.totalAbsent} (Expected: 44)`);
console.log(`Total CL Hours       : ${overall.totalCL} (Expected: 10)`);
console.log(`Overall Percentage   : ${overall.percentage.toFixed(2)}% (Expected: 77.12%)`);
console.log(`Status               : ${overall.status} (Expected: BELOW_TARGET)`);

console.log('\n--- Testing Target Prediction ---');
const reqHours = calculateHoursRequiredToReachTarget(overall.totalPresent, overall.totalConduct);
console.log(`Hours required to reach 80%: ${reqHours} (Expected: 34)`);

// Test sub predictions
console.log('\n--- Testing Subject predictions (Multivariate Analysis, 28/38) ---');
const mvSub = sampleSubjects.find(s => s.code === 'multi')!;
const mvReq = calculateHoursRequiredToReachTarget(mvSub.presentHours, mvSub.totalHours);
console.log(`Multivariate Analysis (28/38) hours to reach 80%: ${mvReq} (Expected: 12)`);

console.log('\n--- Testing Subject predictions (Statistics Lab III, 28/31) ---');
const statLabSub = sampleSubjects.find(s => s.code === 'stats_lab')!;
const statLabMiss = calculateHoursCanMiss(statLabSub.presentHours, statLabSub.totalHours);
console.log(`Statistics Lab III (28/31) hours can miss: ${statLabMiss} (Expected: 4)`);

if (overall.totalConduct === 236 && overall.totalPresent === 182 && overall.percentage.toFixed(2) === '77.12' && reqHours === 34 && mvReq === 12 && statLabMiss === 4) {
  console.log('\n🚀 ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('\n❌ SOME TESTS FAILED! Check calculations logic.');
  process.exit(1);
}
