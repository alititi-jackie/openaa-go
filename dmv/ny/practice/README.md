# NY DMV Learner Permit Practice Test

A free, static, mobile-first web app for studying the New York State Learner Permit (Driver's License) written exam.

**Live site:** https://alititi-jackie.github.io/OpenAA-siet/dmv/

---

## ⚠️ Disclaimer

> **This is a non-official study tool.**
> All questions are based on knowledge points from the *New York State Driver's Manual* (Form MV-21) and have been independently written for educational purposes. This site does not copy content from any third-party quiz website.
>
> **For authoritative and up-to-date information, always refer to the [official NY DMV website](https://dmv.ny.gov) and the [official Driver's Manual](https://dmv.ny.gov/about-dmv/manuals-and-guides).**
>
> Content last reviewed: **2026-04-17** (based on the current NY DMV Driver's Manual, common knowledge points).

---

## Features

| Feature | Details |
|---------|---------|
| **Practice Mode** | Study at your own pace, sequential or random order |
| **Exam Simulation** | Timed, scored, configurable question count |
| **Progress Bar** | Real-time question progress |
| **Countdown Timer** | Optional; auto-submits when time runs out |
| **Score Ring** | Visual percentage score with pass/fail indication |
| **Wrong-Answer Review** | Collapsible list with correct answers and explanations |
| **Redo Wrong Questions** | Instantly re-quiz only your missed questions |
| **Keyboard Navigation** | ← → arrows to navigate, 1-4 to select options |
| **Share Results** | Native share sheet or clipboard copy |

---

## Topics Covered (80 questions)

- 🚦 Traffic signs & signals (warning, regulatory, informational, color meanings)
- 🛑 Right-of-way rules at intersections
- 🏎️ Speed limits — school zones, residential, highways, work zones
- 🍺 DWI / DUI laws (BAC limits, Zero Tolerance, Implied Consent, penalties)
- 🚌 School bus stopping rules & distances
- 🚒 Emergency vehicles — yield rules & Move Over Law
- 🔄 Lane use, passing, turning signals, parking rules
- 🚶 Pedestrians, cyclists, motorcycles — sharing the road
- 🌧️ Adverse weather — fog, rain, hydroplaning, ice/skids
- 🚗 Highway driving — merging, exits, minimum speed
- 📱 Distracted driving — handheld device law, points system
- 🔴 Pavement markings — solid/broken lines, yellow/white lines
- 💥 Collision reporting (MV-104), breakdowns, tire blowouts

---

## File Structure

```
dmv/
├── index.html          # Home / mode-selection page
├── quiz.html           # Active quiz page
├── result.html         # Score & review page
├── assets/
│   ├── styles.css      # All styles (OpenAA brand, mobile-first)
│   └── app.js          # All JavaScript logic
├── data/
│   └── questions.json  # Question bank (easily replaceable)
└── README.md           # This file
```

---

## Updating the Question Bank

Edit `data/questions.json`. Each question follows this schema:

```json
{
  "id": 1,
  "question": "What does a flashing red light mean?",
  "options": ["Slow down", "Stop and yield", "Speed up", "Proceed normally"],
  "answerIndex": 1,
  "explanation": "A flashing red is treated like a stop sign...",
  "tags": ["signals", "stopping"],
  "source": "NY DMV Manual – Traffic Signals"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `question` | string | Question text |
| `options` | string[] | 2–5 answer choices |
| `answerIndex` | number | 0-based index of the correct answer |
| `explanation` | string | Explanation shown after answering |
| `tags` | string[] | *(optional)* Topic tags |
| `source` | string | *(optional)* Manual chapter reference |

---

## Technical Notes

- **Pure static** — no backend, no build step required
- **No external dependencies** — no npm, no frameworks
- **Works on `file://`** — open directly in a browser for local testing
- **Relative paths throughout** — compatible with GitHub Pages sub-path hosting
- **Mobile-first CSS** — tested on iOS Safari & Android Chrome
- State persisted via `localStorage` (config, quiz progress, results)

---

## License & Credits

- UI and code: © OpenAA / alititi-jackie — for educational use
- Content: Independently written based on [NY DMV Driver's Manual](https://dmv.ny.gov/about-dmv/manuals-and-guides) public knowledge
- OpenAA logo used with permission

---

*Built for OpenAA.com — 美国华人一站式服务平台*
