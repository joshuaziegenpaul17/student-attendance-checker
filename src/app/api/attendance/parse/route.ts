import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { GroqParseResult } from '@/lib/attendance/groqTypes';

// GROQ_API_KEY is server-side only — never NEXT_PUBLIC
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Vision-capable model on Groq
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT = `You are an attendance-table extraction system for a student portal screenshot.

Read the uploaded screenshot VISUALLY. Extract ONLY values that are clearly visible.

The screenshot is from a Loyola College student ERP portal.

There are two possible tables:
1. ATTENDANCE DETAILS  — subject-wise rows
2. CUMULATIVE ATTENDANCE — month-wise rows

STRICT RULES:
- Keep the two tables completely separate. NEVER mix rows between them.
- For each subject row in Attendance Details extract:
    subjectCode, subjectDescription, totalHours, absent, present, cl, displayedAttendancePercentage
- For each month row in Cumulative Attendance extract:
    month (e.g. "Jun"), year (e.g. 2026), absent, present, cl
- CL is a SEPARATE column. It is NOT present and NOT absent.
- The mathematical relationship should be: totalHours = absent + present + cl
- If the Total row is visible at the bottom of Attendance Details, extract it as reportedTotal.
- Do NOT invent values. Do NOT guess unreadable digits.
- If a value cannot be read, return null for that field.
- Do NOT calculate or modify attendance percentages — return only what you see.
- Return ONLY the required JSON object, nothing else.`;

const JSON_SCHEMA = {
  type: 'object' as const,
  required: ['documentType', 'attendanceDetails', 'cumulativeAttendance'],
  properties: {
    documentType: { type: 'string' as const, enum: ['loyola_attendance', 'unknown'] },
    attendanceDetails: {
      type: 'object' as const,
      required: ['subjects'],
      properties: {
        subjects: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            required: ['subjectCode', 'subjectDescription', 'totalHours', 'absent', 'present', 'cl'],
            properties: {
              subjectCode:                   { type: 'string'  as const },
              subjectDescription:            { type: 'string'  as const },
              totalHours:                    { type: 'number'  as const },
              absent:                        { type: 'number'  as const },
              present:                       { type: 'number'  as const },
              cl:                            { type: 'number'  as const },
              displayedAttendancePercentage: { type: ['number', 'null'] as unknown as 'number' },
            },
          },
        },
        reportedTotal: {
          type: ['object', 'null'] as unknown as 'object',
          properties: {
            totalHours:                    { type: ['number', 'null'] as unknown as 'number' },
            absent:                        { type: ['number', 'null'] as unknown as 'number' },
            present:                       { type: ['number', 'null'] as unknown as 'number' },
            cl:                            { type: ['number', 'null'] as unknown as 'number' },
            displayedAttendancePercentage: { type: ['number', 'null'] as unknown as 'number' },
          },
        },
      },
    },
    cumulativeAttendance: {
      type: 'object' as const,
      required: ['months'],
      properties: {
        months: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            required: ['month', 'year', 'absent', 'present', 'cl'],
            properties: {
              month:   { type: 'string' as const },
              year:    { type: 'number' as const },
              absent:  { type: 'number' as const },
              present: { type: 'number' as const },
              cl:      { type: 'number' as const },
            },
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check API key
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI extraction is temporarily unavailable.' },
      { status: 503 },
    );
  }

  try {
    // Parse multipart form
    const form = await req.formData();
    const file = form.get('image');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    const blob = file as Blob;
    if (blob.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 20MB).' }, { status: 400 });
    }

    // Convert to base64 for Groq vision
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Call Groq Vision
    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'attendance_parse_result',
          strict: true,
          schema: JSON_SCHEMA,
        },
      },
      max_tokens: 4096,
      temperature: 0,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try again.' },
        { status: 502 },
      );
    }

    let parsed: GroqParseResult;
    try {
      parsed = JSON.parse(rawContent) as GroqParseResult;
    } catch {
      return NextResponse.json(
        { error: 'AI returned an unexpected format. Please try again.' },
        { status: 502 },
      );
    }

    if (parsed.documentType === 'unknown') {
      return NextResponse.json(
        { error: "This doesn't appear to be an Attendance Details screenshot." },
        { status: 422 },
      );
    }

    if (!parsed.attendanceDetails?.subjects?.length) {
      return NextResponse.json(
        { error: 'No subjects were detected. Please upload a clear, full-screen screenshot.' },
        { status: 422 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/attendance/parse]', message);
    // Do not expose raw error details
    return NextResponse.json(
      { error: 'AI extraction failed. Please try again or enter data manually.' },
      { status: 500 },
    );
  }
}
