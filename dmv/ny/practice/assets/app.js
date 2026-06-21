/**
 * OpenAA DMV Practice — Core App Logic (app.js)
 * Shared by index.html, quiz.html, result.html
 * Pure vanilla JS, no dependencies.
 */

/* ============================================================
   CONSTANTS
   ============================================================ */
const STORAGE_KEY   = 'dmv_config';
const STATE_KEY     = 'dmv_state';
const RESULT_KEY    = 'dmv_result';

const PASS_THRESHOLD = 0.7; // 70% to pass (NY exam ~70%)

/* ============================================================
   UTILITIES
   ============================================================ */

/** Fisher-Yates shuffle (returns a new array) */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Save value to localStorage (JSON-serialised) */
function lsSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

/** Load value from localStorage */
function lsLoad(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

/** Format seconds as MM:SS */
function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Show a brief toast notification */
function showToast(msg, duration = 2200) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

/** Parse URL query params */
function getQueryParams() {
  const params = {};
  new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });
  return params;
}

/** Relative path to data file (works on file:// and gh-pages subpath) */
function questionsUrl() {
  // All three pages (index/quiz/result) live in dmv/ and data is at dmv/data/
  // Using a URL relative to the page (not the script) ensures it resolves correctly.
  return new URL('data/questions.json', document.baseURI).href;
}

/** Load questions from JSON */
async function loadQuestions() {
  const url = questionsUrl();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load questions: ${resp.status}`);
  const data = await resp.json();
  return data.questions;
}

/* ============================================================
   CONFIG (index.html)
   ============================================================ */

function initIndexPage() {
  const modeCards   = document.querySelectorAll('.mode-card');
  const countSelect = document.getElementById('countSelect');
  const customCount = document.getElementById('customCount');
  const orderSelect = document.getElementById('orderSelect');
  const timerToggle = document.getElementById('timerToggle');
  const timerRow    = document.getElementById('timerRow');
  const timerMins   = document.getElementById('timerMins');
  const startBtn    = document.getElementById('startBtn');
  const searchInput = document.getElementById('searchInput');

  if (!startBtn) return; // not on index page

  // Restore last config
  const saved = lsLoad(STORAGE_KEY) || {};

  let activeMode = saved.mode || 'practice';
  modeCards.forEach(c => {
    if (c.dataset.mode === activeMode) c.classList.add('active');
    c.addEventListener('click', () => {
      modeCards.forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      activeMode = c.dataset.mode;
    });
  });

  if (saved.count) countSelect.value = ['10','20','30','50','all','custom'].includes(saved.count) ? saved.count : '20';
  if (saved.customCount) customCount.value = saved.customCount;
  if (saved.order) orderSelect.value = saved.order;

  // Show/hide custom count input
  function updateCustomVis() {
    customCount.classList.toggle('hidden', countSelect.value !== 'custom');
  }
  countSelect.addEventListener('change', updateCustomVis);
  updateCustomVis();

  // Show/hide timer mins
  function updateTimerVis() {
    timerRow && timerRow.classList.toggle('hidden', !timerToggle.checked);
  }
  if (timerToggle) {
    timerToggle.checked = !!saved.timer;
    timerToggle.addEventListener('change', updateTimerVis);
    updateTimerVis();
    if (timerMins && saved.timerMins) timerMins.value = saved.timerMins;
  }

  // Search (filter questions preview — optional visual)
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      // future: live search preview
    });
  }

  // Start
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Loading…';

    let count = countSelect.value;
    let customVal = parseInt(customCount.value, 10);
    const config = {
      mode:        activeMode,
      count:       count,
      customCount: customVal || 20,
      order:       orderSelect.value,
      timer:       timerToggle ? timerToggle.checked : false,
      timerMins:   timerMins   ? parseInt(timerMins.value, 10) || 30 : 30,
    };

    try {
      const questions = await loadQuestions();
      let selected = questions.slice();
      if (config.order === 'random') selected = shuffle(selected);

      // Determine count
      let n;
      if (count === 'all') {
        n = selected.length;
      } else if (count === 'custom') {
        n = Math.max(1, Math.min(config.customCount, selected.length));
      } else {
        n = Math.min(parseInt(count, 10), selected.length);
      }
      selected = selected.slice(0, n);

      // Build quiz state
      const state = {
        mode:       config.mode,
        timer:      config.timer,
        timerMins:  config.timerMins,
        questions:  selected,
        answers:    new Array(selected.length).fill(null),
        current:    0,
        startedAt:  Date.now(),
      };

      lsSave(STORAGE_KEY, config);
      lsSave(STATE_KEY,   state);

      window.location.href = 'quiz.html';
    } catch (err) {
      showToast('⚠️ Failed to load questions. Please refresh.');
      console.error(err);
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
    }
  });
}

/* ============================================================
   QUIZ PAGE (quiz.html)
   ============================================================ */

function initQuizPage() {
  const state = lsLoad(STATE_KEY);
  if (!state || !state.questions || !state.questions.length) {
    window.location.href = 'index.html';
    return;
  }

  // Ensure answers array exists
  if (!state.answers) state.answers = new Array(state.questions.length).fill(null);

  /* DOM refs */
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const timerBadge    = document.getElementById('timerBadge');
  const timerDisplay  = document.getElementById('timerDisplay');
  const questionNum   = document.getElementById('questionNum');
  const questionText  = document.getElementById('questionText');
  const optionsList   = document.getElementById('optionsList');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const submitBtn     = document.getElementById('submitBtn');
  const exitBtn       = document.getElementById('exitBtn');

  let current    = state.current || 0;
  let answers    = state.answers;
  let timerSec   = null;
  let timerInt   = null;

  function openImageModal(num) {
    const modal = document.getElementById('imgModal');
    const img = document.getElementById('imgModalImg');
    const title = document.getElementById('imgModalTitle');
    const back = document.getElementById('imgBackBtn');

    if (!modal || !img || !back) return;

    // ✅ 合集图（1-16）
    img.src = `assets/signs/${num}.png`;
    img.onerror = null;
img.src = `assets/signs/${num}.png`;
img.onerror = () => {
  alert(`图片不存在：图 ${num}。请确认 assets/signs/ 里有对应图片文件。`);
};

    title.textContent = `图示（图 ${num}）`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // ESC 关闭
    modal._esc = (e) => { if (e.key === 'Escape') closeImageModal(); };
    document.addEventListener('keydown', modal._esc);

    back.onclick = closeImageModal;
  }

  function closeImageModal() {
    const modal = document.getElementById('imgModal');
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.style.overflow = '';

    if (modal._esc) {
      document.removeEventListener('keydown', modal._esc);
      modal._esc = null;
    }
  }

  /* Timer setup */
  if (state.timer && timerBadge && timerDisplay) {
    timerBadge.classList.remove('hidden');
    const totalSec = (state.timerMins || 30) * 60;
    const elapsed  = Math.floor((Date.now() - state.startedAt) / 1000);
    timerSec = Math.max(0, totalSec - elapsed);

    timerDisplay.textContent = fmtTime(timerSec);
    timerInt = setInterval(() => {
      timerSec--;
      timerDisplay.textContent = fmtTime(timerSec);
      if (timerSec <= 60) timerBadge.classList.add('urgent');
      if (timerSec <= 0) {
        clearInterval(timerInt);
        showToast('⏰ Time is up! Submitting your answers…');
        setTimeout(submitQuiz, 1200);
      }
      persistState();
    }, 1000);
  }

  /* Render current question */
  function render() {
    const q     = state.questions[current];
    const total = state.questions.length;
    const pct   = ((current) / total) * 100;

    progressFill.style.width  = pct + '%';
    progressLabel.innerHTML   = `<span>Question ${current + 1} / ${total}</span><span>${Math.round(pct)}%</span>`;
    questionNum.textContent   = `Question ${current + 1}`;

    // Question text
    questionText.textContent  = q.question;

    // ✅ 如果题干含 "图<数字>"，显示一个查看按钮
    const m = /图\s*[<〈《]\s*(\d+)\s*[>〉》]/.exec(q.question);

    let viewBtn = document.getElementById('viewImgBtn');

    if (m) {
      const num = parseInt(m[1], 10);

      if (!viewBtn) {
        viewBtn = document.createElement('button');
        viewBtn.id = 'viewImgBtn';
        viewBtn.type = 'button';
        viewBtn.className = 'view-img-btn';
        questionText.parentNode.insertBefore(viewBtn, questionText.nextSibling);
      }

      viewBtn.textContent = `🖼 查看图 ${num}`;
      viewBtn.onclick = () => openImageModal(num);
      viewBtn.style.display = '';
    } else {
      if (viewBtn) viewBtn.style.display = 'none';
    }

    optionsList.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];

    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'option-item' + (answers[current] === i ? ' selected' : '');
      li.dataset.idx = i;
      li.innerHTML = `
        <span class="option-letter">${letters[i]}</span>
        <span class="option-text">${opt}</span>
      `;
      li.addEventListener('click', () => selectOption(i));
      optionsList.appendChild(li);
    });

    prevBtn.disabled   = current === 0;
    nextBtn.classList.toggle('hidden', current === total - 1);
    submitBtn.classList.toggle('hidden', current !== total - 1);
  }

  function selectOption(idx) {
    answers[current] = idx;
    document.querySelectorAll('.option-item').forEach((li, i) => {
      li.classList.toggle('selected', i === idx);
    });
    persistState();
  }

  function persistState() {
    state.answers = answers;
    state.current = current;
    lsSave(STATE_KEY, state);
  }

  function submitQuiz() {
    clearInterval(timerInt);
    // Build result
    const questions = state.questions;
    let correct = 0;
    const details = questions.map((q, i) => {
      const isCorrect = answers[i] === q.answerIndex;
      if (isCorrect) correct++;
      return {
        question:    q.question,
        options:     q.options,
        answerIndex: q.answerIndex,
        userAnswer:  answers[i],
        isCorrect,
        explanation: q.explanation,
        id:          q.id,
      };
    });

    const result = {
      mode:      state.mode,
      total:     questions.length,
      correct,
      wrong:     questions.length - correct - details.filter(d => d.userAnswer === null).length,
      skipped:   details.filter(d => d.userAnswer === null).length,
      pct:       Math.round((correct / questions.length) * 100),
      pass:      (correct / questions.length) >= PASS_THRESHOLD,
      details,
      finishedAt: Date.now(),
    };

    lsSave(RESULT_KEY, result);
    window.location.href = 'result.html';
  }

  /* Nav */
  prevBtn.addEventListener('click', () => {
    if (current > 0) { current--; render(); persistState(); }
  });
  nextBtn.addEventListener('click', () => {
    if (current < state.questions.length - 1) { current++; render(); persistState(); }
  });
  submitBtn.addEventListener('click', () => {
    const skipped = answers.filter(a => a === null).length;
    if (skipped > 0) {
      const go = confirm(`You have ${skipped} unanswered question(s). Submit anyway?`);
      if (!go) return;
    }
    submitQuiz();
  });
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (confirm('Exit quiz? Your progress will be lost.')) {
        clearInterval(timerInt);
        window.location.href = 'index.html';
      }
    });
  }

  /* Keyboard navigation */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (current < state.questions.length - 1) { current++; render(); persistState(); }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (current > 0) { current--; render(); persistState(); }
    }
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= (state.questions[current]?.options?.length || 0)) {
      selectOption(num - 1);
    }
  });

  render();
}

/* ============================================================
   RESULT PAGE (result.html)
   ============================================================ */

function initResultPage() {
  const result = lsLoad(RESULT_KEY);
  if (!result) {
    window.location.href = 'index.html';
    return;
  }

  /* Score ring */
  const ringFill   = document.getElementById('ringFill');
  const scorePct   = document.getElementById('scorePct');
  const scoreFrac  = document.getElementById('scoreFrac');
  const scoreVerdict = document.getElementById('scoreVerdict');
  const statCorrect  = document.getElementById('statCorrect');
  const statWrong    = document.getElementById('statWrong');
  const statSkipped  = document.getElementById('statSkipped');

  if (ringFill) {
    const circumference = 2 * Math.PI * 50; // r=50
    ringFill.style.strokeDasharray  = circumference;
    ringFill.style.strokeDashoffset = circumference;
    ringFill.classList.toggle('ring-pass', result.pass);
    ringFill.classList.toggle('ring-fail', !result.pass);

    setTimeout(() => {
      ringFill.style.strokeDashoffset = circumference * (1 - result.pct / 100);
    }, 100);
  }
  if (scorePct)    scorePct.textContent    = result.pct + '%';
  if (scoreFrac)   scoreFrac.textContent   = `${result.correct} / ${result.total}`;
  if (scoreVerdict) {
    scoreVerdict.textContent = result.pass ? '🎉 Passed!' : '📚 Keep Practicing';
    scoreVerdict.className   = 'score-verdict ' + (result.pass ? 'pass' : 'fail');
  }
  if (statCorrect) statCorrect.textContent = result.correct;
  if (statWrong)   statWrong.textContent   = result.wrong;
  if (statSkipped) statSkipped.textContent = result.skipped;

  /* Wrong answers list */
  const wrongListEl = document.getElementById('wrongList');
  if (wrongListEl) {
    const wrongItems = result.details.filter(d => !d.isCorrect);
    if (wrongItems.length === 0) {
      wrongListEl.innerHTML = '<p class="text-muted" style="padding:12px 0">🎯 Perfect score — no mistakes!</p>';
    } else {
      wrongListEl.innerHTML = '';
      wrongItems.forEach((item, idx) => {
        const letters = ['A','B','C','D','E'];
        const li = document.createElement('li');
        li.className = 'wrong-item';
        const userTxt    = item.userAnswer === null
          ? '<em>Not answered</em>'
          : `${letters[item.userAnswer]}. ${item.options[item.userAnswer]}`;
        const correctTxt = `${letters[item.answerIndex]}. ${item.options[item.answerIndex]}`;

        li.innerHTML = `
          <div class="wrong-q">${idx + 1}. ${item.question}</div>
          <div class="wrong-answers">
            <div class="wa-row">
              <span class="wa-label wa-wrong-lbl">Your answer:</span>
              <span class="wa-text">${userTxt}</span>
            </div>
            <div class="wa-row">
              <span class="wa-label wa-correct-lbl">Correct:</span>
              <span class="wa-text">${correctTxt}</span>
            </div>
          </div>
          <div class="wrong-explain">${item.explanation}</div>
        `;
        wrongListEl.appendChild(li);
      });
    }
  }

  /* Collapsible wrong list */
  const colBtn = document.getElementById('collapseWrong');
  const colContent = document.getElementById('wrongContent');
  if (colBtn && colContent) {
    colBtn.addEventListener('click', () => {
      const open = colContent.classList.toggle('open');
      colBtn.classList.toggle('open', open);
      colBtn.querySelector('.caret').textContent = open ? '▼' : '▶';
    });
  }

  /* Redo wrong questions */
  const redoWrongBtn = document.getElementById('redoWrongBtn');
  if (redoWrongBtn) {
    const wrongItems = result.details.filter(d => !d.isCorrect);
    if (wrongItems.length === 0) {
      redoWrongBtn.classList.add('hidden');
    } else {
      redoWrongBtn.addEventListener('click', () => {
        const config = lsLoad(STORAGE_KEY) || {};
        // Build state from wrong questions
        const questions = wrongItems.map(item => ({
          id:          item.id,
          question:    item.question,
          options:     item.options,
          answerIndex: item.answerIndex,
          explanation: item.explanation,
        }));
        const state = {
          mode:      'practice',
          timer:     false,
          timerMins: 0,
          questions: shuffle(questions),
          answers:   new Array(questions.length).fill(null),
          current:   0,
          startedAt: Date.now(),
        };
        lsSave(STATE_KEY, state);
        window.location.href = 'quiz.html';
      });
    }
  }

  /* Again button (keep config) */
  const againBtn = document.getElementById('againBtn');
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  /* Share result */
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = `I scored ${result.pct}% (${result.correct}/${result.total}) on the NY DMV Permit Practice Test! Try it at OpenAA: ${window.location.origin}${window.location.pathname.replace('result.html','')}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'NY DMV Practice Test', text }); } catch (_) {}
      } else {
        try {
          await navigator.clipboard.writeText(text);
          showToast('📋 Result copied to clipboard!');
        } catch (_) {
          showToast('Share: ' + text.slice(0, 60) + '…');
        }
      }
    });
  }
}

/* ============================================================
   ROUTER — auto-init based on page
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path.endsWith('/dmv/') || path.endsWith('/dmv')) {
    initIndexPage();
  } else if (path.endsWith('quiz.html')) {
    initQuizPage();
  } else if (path.endsWith('result.html')) {
    initResultPage();
  } else {
    // Try all — only the one with matching DOM elements will actually do anything
    initIndexPage();
    initQuizPage();
    initResultPage();
  }
});