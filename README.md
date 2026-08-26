# Student Attendance Checker

A polished, mobile-first web application designed to help students track their attendance, calculate future class targets, and manage academic performance.

> [!IMPORTANT]
> **Disclaimer**: This is an unofficial student utility. It is not affiliated with, endorsed by, or associated with any college or university.

## Core Features

- **Attendance Calculation**: Instantly compute overall and subject-wise attendance percentages.
- **Screenshot Attendance Import**: Extract attendance data automatically from a screenshot of your student portal report.
- **OCR Extraction**: Pure client-side (in-browser) text extraction using Tesseract.js.
- **Cumulative Attendance**: Breakdown monthly attendance totals (Jun, Jul, Aug) and cross-reference them with subject totals.
- **What-If Prediction**: Dynamically simulate how your overall percentage changes if you attend or miss upcoming classes.
- **80% Attendance Prediction**: Calculate the exact number of consecutive classes required to reach the 80% target, or how many classes you can afford to miss.
- **GPA / CGPA Calculator**: Isolated grade tracker that calculates semester GPA and overall CGPA based on marks, letter grades, and credits.
- **UG / PG Support**: Configured to support 3-year Undergraduate programs (Semesters I-VI) and 2-year Postgraduate programs (Semesters I-IV).

## Design & Layout

- Designed with a clean, responsive layout fitting devices from mobile (360px) to desktop.
- Built around the referenced student portal attendance details structure.
- Features a calm, weather-themed atmospheric background.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **TypeScript**: Typed schemas for attendance profiles and CGPA grades
- **OCR Engine**: Tesseract.js (Client-side WASM compilation)

## Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build and Lint

To verify production readiness:

```bash
npm run lint
npm run build
```
