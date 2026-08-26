import { Subject, MonthlyAttendance, SubjectCategory } from '@/types/attendance';
import { OCRWord, OCRLine } from './ocrService';

let idCounter = 0;
const genId = () => `ocr_${Date.now()}_${++idCounter}`;

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface ParsedSubject {
  subjectCode: string;
  subjectName: string;
  totalHours: number;
  presentHours: number;
  absentHours: number;
  clHours: number;
  attendancePercentage: number;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
}

export interface ParsedMonthly {
  month: string;
  absent: number;
  present: number;
  cl: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParseResult {
  subjects: ParsedSubject[];
  monthly: ParsedMonthly[];
  subjectTotals: { present: number; absent: number; cl: number; total: number; percentage: number };
  monthlyTotals: { present: number; absent: number; cl: number; total: number; percentage: number };
  rawText: string;
  hasSubjectTable: boolean;
  hasCumulativeTable: boolean;
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ATTENDANCE_DETAILS_MARKERS = [
  /attendance\s*details/i,
  /subject[\s\-]*wise/i,
];

const CUMULATIVE_MARKERS = [
  /cumulative\s*attendance/i,
  /monthly\s*attendance/i,
];

// Subject code pattern: 2-6 letters + 1-4 digits + optional suffix
const SUBJECT_CODE_RE = /\b([A-Z]{2,6}\d{1,4}[A-Z]{0,3}\d{0,3})\b/;

// Month pattern: Jun-2026, Jul 2026, etc.
const MONTH_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/\.]+(\d{2,4})/i;

// ═══════════════════════════════════════════════════════
// SPATIAL ROW DETECTION
// ═══════════════════════════════════════════════════════

/**
 * Group words into rows based on Y-coordinate proximity.
 * Words with overlapping Y-ranges or within a small threshold are in the same row.
 */
function groupWordsIntoRows(words: OCRWord[], yThreshold: number = 12): OCRWord[][] {
  if (words.length === 0) return [];

  // Sort by Y position
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows: OCRWord[][] = [];
  let currentRow: OCRWord[] = [sorted[0]];
  let currentY = (sorted[0].bbox.y0 + sorted[0].bbox.y1) / 2;

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    const wordY = (word.bbox.y0 + word.bbox.y1) / 2;

    // Check if this word is in the same row (Y proximity or overlap)
    const overlap = Math.min(word.bbox.y1, currentRow[currentRow.length - 1].bbox.y1) -
                    Math.max(word.bbox.y0, currentRow[currentRow.length - 1].bbox.y0);
    const distance = Math.abs(wordY - currentY);

    if (overlap > 0 || distance < yThreshold) {
      currentRow.push(word);
    } else {
      rows.push(currentRow);
      currentRow = [word];
      currentY = wordY;
    }
  }
  rows.push(currentRow);

  // Sort each row by X position
  return rows.map(row => row.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

/**
 * Detect the Y-coordinate range of a text region by finding section headings.
 * Returns { startY, endY } for the region, or null if not found.
 */
function findRegionByHeading(
  lines: OCRLine[],
  markers: RegExp[],
): { startY: number; endY: number } | null {
  for (let i = 0; i < lines.length; i++) {
    if (markers.some(m => m.test(lines[i].text))) {
      const startY = lines[i].bbox.y0;
      // Region extends to the next section heading or end of document
      let endY = Infinity;
      for (let j = i + 1; j < lines.length; j++) {
        // Check for another major section heading
        if (
          ATTENDANCE_DETAILS_MARKERS.some(m => m.test(lines[j].text)) ||
          CUMULATIVE_MARKERS.some(m => m.test(lines[j].text))
        ) {
          endY = lines[j].bbox.y0;
          break;
        }
      }
      return { startY, endY };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// SPATIAL TABLE PARSER
// ═══════════════════════════════════════════════════════

/**
 * Parse OCR data using spatial (bounding box) information to reconstruct tables.
 * This is much more reliable than flat text parsing.
 */
export function parseOCRText(text: string, ocrLines?: OCRLine[], ocrWords?: OCRWord[]): ParseResult {
  // If we have spatial data, use it. Otherwise fall back to text parsing.
  if (ocrWords && ocrWords.length > 0 && ocrLines && ocrLines.length > 0) {
    return parseWithSpatialData(text, ocrLines, ocrWords);
  }
  return parseFlatText(text);
}

// ═══════════════════════════════════════════════════════
// SPATIAL PARSER (primary — uses bounding boxes)
// ═══════════════════════════════════════════════════════

function parseWithSpatialData(text: string, ocrLines: OCRLine[], ocrWords: OCRWord[]): ParseResult {
  // ── Step 1: Find the two table regions ──
  const subjectRegion = findRegionByHeading(ocrLines, ATTENDANCE_DETAILS_MARKERS);
  const cumulativeRegion = findRegionByHeading(ocrLines, CUMULATIVE_MARKERS);

  // ── Step 2: Get words in each region ──
  const allWordsInSubject = subjectRegion
    ? ocrWords.filter(w => w.bbox.y0 >= subjectRegion.startY && w.bbox.y0 < subjectRegion.endY)
    : [];

  const allWordsInCumulative = cumulativeRegion
    ? ocrWords.filter(w => w.bbox.y0 >= cumulativeRegion.startY && w.bbox.y0 < cumulativeRegion.endY)
    : [];

  // ── Step 3: Group words into rows ──
  const subjectRows = groupWordsIntoRows(allWordsInSubject);
  const cumulativeRows = groupWordsIntoRows(allWordsInCumulative);

  // ── Step 4: Extract subjects from rows ──
  const subjects = extractSubjectsWithSpatialData(subjectRows);

  // ── Step 5: Extract months from rows ──
  const monthly = extractMonthlyWithSpatialData(cumulativeRows);

  // ── Step 6: Compute totals ──
  const subjectTotals = {
    present: subjects.reduce((s, sub) => s + sub.presentHours, 0),
    absent: subjects.reduce((s, sub) => s + sub.absentHours, 0),
    cl: subjects.reduce((s, sub) => s + sub.clHours, 0),
    total: subjects.reduce((s, sub) => s + sub.totalHours, 0),
    percentage: 0,
  };
  subjectTotals.percentage = subjectTotals.total > 0
    ? Math.round((subjectTotals.present / subjectTotals.total) * 10000) / 100
    : 0;

  const monthlyTotals = {
    present: monthly.reduce((s, m) => s + m.present, 0),
    absent: monthly.reduce((s, m) => s + m.absent, 0),
    cl: monthly.reduce((s, m) => s + m.cl, 0),
    total: 0,
    percentage: 0,
  };
  monthlyTotals.total = monthlyTotals.present + monthlyTotals.absent + monthlyTotals.cl;
  monthlyTotals.percentage = monthlyTotals.total > 0
    ? Math.round((monthlyTotals.present / monthlyTotals.total) * 10000) / 100
    : 0;

  // Fallback: if spatial extraction failed, try flat text
  if (subjects.length === 0 && monthly.length === 0) {
    return parseFlatText(text);
  }

  return {
    subjects,
    monthly,
    subjectTotals,
    monthlyTotals,
    rawText: text,
    hasSubjectTable: subjects.length > 0,
    hasCumulativeTable: monthly.length > 0,
  };
}

/**
 * Extract subject attendance data from spatially-grouped rows.
 *
 * Table structure (from the Loyola screenshot):
 *   Col 0: Subject Code
 *   Col 1: Subject Description (may span multiple visual lines)
 *   Col 2: Total Hours
 *   Col 3: A (Absent)
 *   Col 4: P (Present)
 *   Col 5: Attendance %
 */
function extractSubjectsWithSpatialData(rows: OCRWord[][]): ParsedSubject[] {
  const subjects: ParsedSubject[] = [];
  const seenCodes = new Set<string>();

  // Skip header rows — they contain words like "Subject", "Code", "Description", "Total", etc.
  // Skip the Total row — it starts with "Total"

  for (const row of rows) {
    // Skip empty or header rows
    if (row.length < 2) continue;

    const rowText = row.map(w => w.text).join(' ').trim();

    // Skip header-like rows
    if (/^subject/i.test(rowText) || /^code/i.test(rowText) ||
        /^description/i.test(rowText) || /^total\s*hrs?/i.test(rowText) ||
        /^attendance/i.test(rowText) || /^month/i.test(rowText) ||
        /^with\s*od/i.test(rowText)) continue;

    // Skip the Total/summary row
    if (/^total\b/i.test(rowText) || /^grand\s*total/i.test(rowText)) continue;

    // Skip month rows
    if (MONTH_RE.test(rowText)) continue;

    // Try to find a subject code in this row
    const codeMatch = rowText.match(SUBJECT_CODE_RE);
    if (!codeMatch) continue;

    const code = codeMatch[1].toUpperCase();
    if (seenCodes.has(code)) continue;

    // Separate words into: code-word, text-words, number-words
    const codeWordIdx = row.findIndex(w => SUBJECT_CODE_RE.test(w.text));
    if (codeWordIdx === -1) continue;

    // Get text words (after code, before numbers)
    const textWords: string[] = [];
    const numberWords: number[] = [];
    let pctFromImage = 0;

    for (let i = codeWordIdx + 1; i < row.length; i++) {
      const w = row[i];
      const cleanText = w.text.replace(/[,]/g, '');

      // Check for percentage
      const pctMatch = w.text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*%/) ||
                       (i + 1 < row.length && row[i + 1].text === '%' ? null : null);
      // Handle separate % token
      if (w.text === '%' && i > 0) {
        const prevNum = parseFloat(row[i - 1].text);
        if (!isNaN(prevNum) && prevNum > 0 && prevNum <= 100) {
          pctFromImage = prevNum;
          continue;
        }
      }
      // Handle inline percentage like "75.00%"
      const inlinePct = w.text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*%/);
      if (inlinePct) {
        const p = parseFloat(inlinePct[1]);
        if (p > 0 && p <= 100) pctFromImage = p;
        continue;
      }

      // Check if it's a number (could be Total, A, P, CL)
      const num = parseInt(cleanText);
      if (!isNaN(num) && num >= 0 && num <= 999 && /^\d+$/.test(cleanText)) {
        numberWords.push(num);
      } else if (/^[A-Za-z]+$/.test(cleanText) && cleanText.length <= 3) {
        // Could be column header like "A", "P", "CL" — skip these
        continue;
      } else if (cleanText.length > 0) {
        textWords.push(cleanText);
      }
    }

    // Subject name: join text words
    let name = textWords.join(' ').trim();
    // Remove leading/trailing artifacts
    name = name.replace(/^\d+\s*/, '').trim();

    // Now assign numbers. The table columns are:
    // Total, A, P, (CL if present), Attendance%
    // But OCR may read them in various orders.
    //
    // Strategy: find the pattern that makes sense:
    // Total >= A + P (Total must be the sum)
    // If no explicit Total, compute it from A + P

    let total = 0, absent = 0, present = 0, cl = 0;

    // Filter out obviously-too-large numbers (like 552 from misread)
    const validNums = numberWords.filter(n => n <= 500);

    if (validNums.length >= 3) {
      // First check: is there a number that equals the sum of two others?
      // This is likely Total
      let foundTotal = false;
      for (let i = 0; i < validNums.length; i++) {
        for (let j = 0; j < validNums.length; j++) {
          if (i === j) continue;
          for (let k = 0; k < validNums.length; k++) {
            if (k === i || k === j) continue;
            if (validNums[i] === validNums[j] + validNums[k]) {
              total = validNums[i];
              absent = validNums[j];  // A comes before P in the table
              present = validNums[k];
              foundTotal = true;
              break;
            }
          }
          if (foundTotal) break;
        }
        if (foundTotal) break;
      }

      if (!foundTotal) {
        // No number equals sum of others — assume first two are A and P
        // Sort: larger is likely Total or P
        const sorted = [...validNums].sort((a, b) => b - a);
        total = sorted[0]; // Largest might be Total
        // Check if largest >= sum of next two
        if (sorted.length >= 3 && sorted[0] >= sorted[1] + sorted[2]) {
          absent = sorted[1];
          present = sorted[2];
        } else {
          // No valid Total found — compute from the two middle values
          absent = sorted[sorted.length - 2];
          present = sorted[sorted.length - 1];
          total = absent + present;
        }
      }

      // Check for CL — only if there's an extra number that doesn't fit T/A/P
      const remaining = validNums.filter(n => n !== total && n !== absent && n !== present);
      if (remaining.length > 0) {
        // Only assign CL if the remaining number makes T = A + P + CL
        const candidate = remaining[0];
        if (total === absent + present + candidate) {
          cl = candidate;
        }
        // Otherwise, don't invent CL
      }
    } else if (validNums.length === 2) {
      // Two numbers: likely A and P
      absent = validNums[0];
      present = validNums[1];
      if (absent > present) [absent, present] = [present, absent]; // Ensure P >= A
      total = absent + present;
      cl = 0;
    } else if (validNums.length === 1) {
      // Only one number — can't determine, skip
      continue;
    } else {
      continue;
    }

    // Validate
    if (total <= 0 || present < 0 || absent < 0) continue;

    // Ensure consistency: if P + A + CL != Total, recalculate Total
    const expectedTotal = present + absent + cl;
    if (Math.abs(expectedTotal - total) > 2) {
      total = expectedTotal; // Trust the components over OCR's Total
    }

    // Calculate percentage ourselves
    const calcPct = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

    const confidence: 'high' | 'medium' | 'low' =
      pctFromImage > 0 && Math.abs(calcPct - pctFromImage) <= 1 ? 'high' :
      validNums.length >= 3 ? 'medium' : 'low';

    const issues: string[] = [];
    if (pctFromImage > 0 && Math.abs(calcPct - pctFromImage) > 1) {
      issues.push(`Image shows ${pctFromImage}% but calculated ${calcPct}%`);
    }
    if (name.length < 2) {
      issues.push('Subject name could not be read clearly');
    }

    subjects.push({
      subjectCode: code,
      subjectName: name || 'Unknown Subject',
      totalHours: total,
      presentHours: present,
      absentHours: absent,
      clHours: cl,
      attendancePercentage: calcPct,
      confidence,
      issues,
    });

    seenCodes.add(code);
  }

  return subjects;
}

/**
 * Extract monthly attendance from spatially-grouped rows.
 * Each row contains: Month-Year, A, P, (CL optional)
 */
function extractMonthlyWithSpatialData(rows: OCRWord[][]): ParsedMonthly[] {
  const months: ParsedMonthly[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.length < 2) continue;
    const rowText = row.map(w => w.text).join(' ').trim();

    // Skip headers
    if (/^month/i.test(rowText) || /^with\s*od/i.test(rowText)) continue;
    // Skip total rows
    if (/^total\b/i.test(rowText)) continue;

    // Find month-year
    const monthMatch = rowText.match(MONTH_RE);
    if (!monthMatch) continue;

    let monthName = monthMatch[1];
    let year = monthMatch[2];
    if (year.length === 2) year = '20' + year;
    const monthKey = `${monthName.substring(0, 3)}-${year}`;

    if (seen.has(monthKey)) continue;
    seen.add(monthKey);

    // Extract numbers from this row
    const nums: number[] = [];
    for (const w of row) {
      const cleanText = w.text.replace(/[,]/g, '');
      const num = parseInt(cleanText);
      if (!isNaN(num) && num >= 0 && num <= 999 && /^\d+$/.test(cleanText)) {
        nums.push(num);
      }
    }

    // Monthly table: A, P, (CL)
    // Typically A comes before P
    if (nums.length >= 2) {
      months.push({
        month: monthKey,
        absent: nums[0],
        present: nums[1],
        cl: nums[2] || 0,
        confidence: nums.length >= 2 ? 'medium' : 'low',
      });
    }
  }

  return months;
}

// ═══════════════════════════════════════════════════════
// FLAT TEXT PARSER (fallback when no spatial data)
// ═══════════════════════════════════════════════════════

function parseFlatText(text: string): ParseResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const subjects = extractSubjectsFromLines(lines);
  const monthly = extractMonthlyFromLines(lines);

  const subjectTotals = {
    present: subjects.reduce((s, sub) => s + sub.presentHours, 0),
    absent: subjects.reduce((s, sub) => s + sub.absentHours, 0),
    cl: subjects.reduce((s, sub) => s + sub.clHours, 0),
    total: subjects.reduce((s, sub) => s + sub.totalHours, 0),
    percentage: 0,
  };
  subjectTotals.percentage = subjectTotals.total > 0
    ? Math.round((subjectTotals.present / subjectTotals.total) * 10000) / 100
    : 0;

  const monthlyTotals = {
    present: monthly.reduce((s, m) => s + m.present, 0),
    absent: monthly.reduce((s, m) => s + m.absent, 0),
    cl: monthly.reduce((s, m) => s + m.cl, 0),
    total: 0,
    percentage: 0,
  };
  monthlyTotals.total = monthlyTotals.present + monthlyTotals.absent + monthlyTotals.cl;
  monthlyTotals.percentage = monthlyTotals.total > 0
    ? Math.round((monthlyTotals.present / monthlyTotals.total) * 10000) / 100
    : 0;

  return {
    subjects,
    monthly,
    subjectTotals,
    monthlyTotals,
    rawText: text,
    hasSubjectTable: subjects.length > 0,
    hasCumulativeTable: monthly.length > 0,
  };
}

function extractSubjectsFromLines(lines: string[]): ParsedSubject[] {
  const subjects: ParsedSubject[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Must contain a subject code
    const codeMatch = line.match(SUBJECT_CODE_RE);
    if (!codeMatch) continue;

    const code = codeMatch[1].toUpperCase();
    if (seenCodes.has(code)) continue;

    // Get name — text after code, or next non-number line
    let name = '';
    const codeIdx = line.indexOf(codeMatch[1]);
    const afterCode = line.substring(codeIdx + codeMatch[1].length).trim();
    if (afterCode.length > 1 && !/^\d/.test(afterCode) && !MONTH_RE.test(afterCode)) {
      name = afterCode;
    } else if (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && !SUBJECT_CODE_RE.test(next) && !/^\d/.test(next) && !MONTH_RE.test(next)) {
        name = next;
        i++; // Skip the name line
      }
    }

    // Collect numbers from following lines
    const nums: number[] = [];
    let pctFromImage = 0;

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const nl = lines[j];

      // Stop at next subject code, total, or month
      if (SUBJECT_CODE_RE.test(nl) && j > i + 1) break;
      if (/^total\b/i.test(nl)) break;
      if (MONTH_RE.test(nl)) break;

      // Check for percentage
      const pctMatch = nl.match(/(\d{1,3}(?:\.\d{1,2})?)\s*%/);
      if (pctMatch) {
        const p = parseFloat(pctMatch[1]);
        if (p > 0 && p <= 100) pctFromImage = p;
      }

      // Extract numbers excluding percentages
      const cleaned = nl.replace(/\d{1,3}(?:\.\d{1,2})?\s*%/g, '');
      const matches = cleaned.match(/\b(\d{1,4})\b/g);
      if (matches) {
        for (const m of matches) {
          const n = parseInt(m);
          if (n >= 0 && n <= 500) nums.push(n);
        }
      }
    }

    // Assign numbers
    let total = 0, present = 0, absent = 0, cl = 0;

    if (nums.length >= 3) {
      // Check if first number = sum of next two (Total = A + P)
      if (nums[0] >= nums[1] + nums[2]) {
        total = nums[0];
        absent = nums[1];
        present = nums[2];
        cl = nums[3] || 0;
        // Only assign CL if T = A + P + CL
        if (cl > 0 && total !== absent + present + cl) {
          cl = 0; // Don't invent CL
        }
      } else {
        absent = nums[0];
        present = nums[1];
        cl = nums[2] || 0;
        total = present + absent + cl;
      }
    } else if (nums.length === 2) {
      absent = nums[0];
      present = nums[1];
      if (absent > present) [absent, present] = [present, absent];
      total = absent + present;
      cl = 0;
    } else {
      continue;
    }

    if (total <= 0 || present < 0 || absent < 0) continue;

    const calcPct = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;
    const confidence: 'high' | 'medium' | 'low' =
      pctFromImage > 0 && Math.abs(calcPct - pctFromImage) <= 1 ? 'high' :
      nums.length >= 3 ? 'medium' : 'low';

    subjects.push({
      subjectCode: code,
      subjectName: name || 'Unknown Subject',
      totalHours: total,
      presentHours: present,
      absentHours: absent,
      clHours: cl,
      attendancePercentage: calcPct,
      confidence,
      issues: pctFromImage > 0 && Math.abs(calcPct - pctFromImage) > 1
        ? [`Image shows ${pctFromImage}% but calculated ${calcPct}%`] : [],
    });

    seenCodes.add(code);
  }

  return subjects;
}

function extractMonthlyFromLines(lines: string[]): ParsedMonthly[] {
  const months: ParsedMonthly[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const monthMatch = line.match(MONTH_RE);
    if (!monthMatch) continue;

    let monthName = monthMatch[1];
    let year = monthMatch[2];
    if (year.length === 2) year = '20' + year;
    const monthKey = `${monthName.substring(0, 3)}-${year}`;

    if (seen.has(monthKey)) continue;
    seen.add(monthKey);

    // Collect numbers from this and next lines
    const nums: number[] = [];
    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
      if (j > i && lines[j].match(MONTH_RE)) break;
      if (/^total\b/i.test(lines[j])) break;
      const matches = lines[j].match(/\b(\d{1,3})\b/g);
      if (matches) {
        for (const m of matches) {
          const n = parseInt(m);
          if (n >= 0 && n <= 999) nums.push(n);
        }
      }
    }

    if (nums.length >= 2) {
      months.push({
        month: monthKey,
        absent: nums[0],
        present: nums[1],
        cl: nums[2] || 0,
        confidence: 'medium',
      });
    }
  }

  return months;
}

// ═══════════════════════════════════════════════════════
// CONVERT TO APP TYPES
// ═══════════════════════════════════════════════════════

export function parsedSubjectsToSubjects(parsed: ParsedSubject[]): Subject[] {
  return parsed.map(p => ({
    id: genId(),
    code: p.subjectCode,
    name: p.subjectName,
    category: 'Major Core' as SubjectCategory,
    totalHours: p.totalHours,
    presentHours: p.presentHours,
    absentHours: p.absentHours,
    clHours: p.clHours,
  }));
}

export function parsedMonthlyToMonthly(parsed: ParsedMonthly[]): MonthlyAttendance[] {
  return parsed.map(p => ({
    id: genId(),
    month: p.month,
    absent: p.absent,
    present: p.present,
    cl: p.cl,
  }));
}
