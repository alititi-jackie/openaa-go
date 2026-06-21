// dmv/ny/practice/data/build_questions.js
const fs = require('fs');

const inputPath = 'raw_zh_129.json';
const rawFile = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// 兼容两种输入：
// 1) 纯数组: [ {id, question, options:{A..}, answer:"C"} ... ]
// 2) 包一层: { source:{...}, questions:[ ... ] }
const rawQuestions = Array.isArray(rawFile) ? rawFile : (rawFile.questions || []);

if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
  console.error('ERROR: Cannot find questions array in', inputPath);
  process.exit(1);
}

const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };

function safeStr(x) {
  return (x === null || x === undefined) ? "" : String(x);
}

const out = {
  _meta: {
    source: "HookNY 中文题库（1-129）",
    disclaimer: "非官方，仅供学习。请以纽约州 DMV Driver’s Manual 为准。",
    version: "2026-04-18",
    totalQuestions: rawQuestions.length
  },
  questions: rawQuestions.map(q => {
    const A = safeStr(q.options?.A);
    const B = safeStr(q.options?.B);
    const C = safeStr(q.options?.C);
    const D = safeStr(q.options?.D);

    const answerLetter = safeStr(q.answer).toUpperCase();
    const answerIndex = (answerLetter in letterToIndex) ? letterToIndex[answerLetter] : null;

    return {
      id: q.id,
      question: safeStr(q.question),
      options: [A, B, C, D],
      answerIndex,
      explanation: "",
      tags: [],
      source: "HookNY"
    };
  })
};

fs.writeFileSync('questions.json', JSON.stringify(out, null, 2), 'utf8');
console.log('OK: wrote questions.json, count =', out.questions.length);