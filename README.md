<div align="center">

# 📊 Student Attendance Checker

**Know exactly where you stand — and exactly how many classes you can afford to miss.**

A mobile-first web app that turns a screenshot of your attendance portal into clear numbers, forecasts, and GPA insights.

[**🚀 Live Demo →**](https://student-attendance-checker-kappa.vercel.app/)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js-5A5A5A?style=flat-square)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

> [!IMPORTANT]
> **Disclaimer** — This is an unofficial student utility. It is not affiliated with, endorsed by, or associated with any college or university. All calculations are estimates; always confirm against your official records.

> [!NOTE]
> **Your data never leaves your device.** OCR runs entirely in your browser via WebAssembly. No uploads, no server, no account.

---

## ✨ Why this exists

Attendance portals tell you a percentage. They don't tell you the thing you actually want to know:

- *Am I safe?*
- *How many more classes do I need to hit 80%?*
- *If I skip Friday, what happens?*

This app answers all three in a couple of taps.

---

## 🎯 Features

### Attendance

| Feature | What it does |
| --- | --- |
| **Instant calculation** | Overall and subject-wise attendance percentages at a glance |
| **📸 Screenshot import** | Drop in a screenshot of your portal's attendance report and the data is extracted for you |
| **🔒 Client-side OCR** | Powered by Tesseract.js compiled to WASM — runs 100% in-browser |
| **📅 Cumulative view** | Monthly totals (Jun / Jul / Aug) cross-referenced against subject totals |
| **🔮 What-if prediction** | Simulate attending or missing upcoming classes and watch your percentage move in real time |
| **🎯 80% target planner** | Exact number of consecutive classes needed to reach 80% — or how many you can safely skip |

### Academics

| Feature | What it does |
| --- | --- |
| **🎓 GPA / CGPA calculator** | Isolated grade tracker computing semester GPA and overall CGPA from marks, letter grades, and credits |
| **📚 UG & PG support** | 3-year Undergraduate (Semesters I–VI) and 2-year Postgraduate (Semesters I–IV) |

---

## 🎨 Design

- **Mobile-first** — built for 360px screens, scales cleanly to desktop
- **Portal-aligned** — layout mirrors the structure of the student portal attendance report, so the numbers land where you expect them
- **Calm by default** — an atmospheric, weather-themed background that stays out of the way of the data

---

## 🛠 Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** — typed schemas for attendance profiles and CGPA grades |
| Styling | **Tailwind CSS** |
| OCR | **Tesseract.js** (client-side WASM) |
| Hosting | **Vercel** |

---

## 🚀 Getting Started

**Prerequisites:** Node.js 18.18 or later.

```bash
# 1. Clone
git clone <your-repo-url>
cd student-attendance-checker

# 2. Install
npm install

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production checks

```bash
npm run lint    # ESLint
npm run build   # Production build
npm start       # Serve the build locally
```

---

## 📖 How to use it

1. **Open the app** and pick UG or PG.
2. **Import your attendance** — upload a screenshot of your portal report, or enter classes held and attended manually.
3. **Review** your overall and subject-wise percentages.
4. **Plan ahead** — use the what-if slider to test scenarios, or the 80% planner to see exactly how many classes stand between you and the target.
5. **Switch to the GPA tab** to track marks, grades, and credits for your semester and cumulative scores.

---

## 💡 Tips for better OCR results

- Take a **full-resolution screenshot** rather than a photo of a screen.
- Crop to just the attendance table — less noise, better accuracy.
- Make sure the text is **sharp and upright**; avoid zoomed-out or rotated captures.
- Always **eyeball the extracted numbers** before trusting the results.

---

## 🗺 Roadmap

- [ ] Persist profiles locally so data survives a refresh
- [ ] Configurable attendance threshold (75% / 80% / custom)
- [ ] Export attendance and GPA summaries as PDF
- [ ] Dark mode
- [ ] Multi-semester attendance history

---

## 🤝 Contributing

Issues and pull requests are welcome. For larger changes, open an issue first to discuss the direction. Please run `npm run lint` and `npm run build` before submitting.

---


Built for students who'd rather know than guess.

</div>
