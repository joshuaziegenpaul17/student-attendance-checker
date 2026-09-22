import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { GroqParseResult } from '@/lib/attendance/groqTypes';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const VISION_MODEL = 'qwen/qwen3.8-27b';

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
- You must reply with ONLY a valid JSON object matching this exact structure:
{
  "documentType": "loyola_attendance",
  "attendanceDetails": {
    "subjects": [
      {
        "subjectCode": "string",
        "subjectDescription": "string",
        "totalHours": 0,
        "absent": 0,
        "present": 0,
        "cl": 0,
        "displayedAttendancePercentage": 0
      }
    ],
    "reportedTotal": {
      "totalHours": 0,
      "absent": 0,
      "present": 0,
      "cl": 0,
      "displayedAttendancePercentage": 0
    }
  },
  "cumulativeAttendance": {
    "months": [
      {
        "month": "string",
        "year": 0,
        "absent": 0,
        "present": 0,
        "cl": 0
      }
    ]
  }
}
If no data is found for a section, provide an empty array or null.`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI extraction is temporarily unavailable.' }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const file = form.get('image');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: SYSTEM_PROMPT },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 });
    }

    let parsed: GroqParseResult;
    try {
      parsed = JSON.parse(rawContent) as GroqParseResult;
    } catch {
      return NextResponse.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 502 });
    }

    if (parsed.documentType === 'unknown' || !parsed.attendanceDetails?.subjects?.length) {
      return NextResponse.json({ error: "No subjects were detected. Please upload a clear, full-screen screenshot." }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/attendance/parse]', message);
    return NextResponse.json({ error: 'AI extraction failed. Please try again or enter data manually.' }, { status: 500 });
  }
}
