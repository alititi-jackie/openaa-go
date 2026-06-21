// dmv/ny/practice/assets/view.js
function questionsUrl() {
  return new URL('data/questions.json', document.baseURI).href;
}

async function loadQuestions() {
  const resp = await fetch(questionsUrl());
  if (!resp.ok) throw new Error(`Failed to load questions: ${resp.status}`);
  return await resp.json();
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function renderList(container, questions, keyword, showAnswers) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const kw = (keyword || '').trim();

  const filtered = !kw ? questions : questions.filter(q => {
    const hay = [q.question, ...(q.options || [])].join(' ');
    return hay.includes(kw);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted">没有匹配的题目。</p>`;
    return;
  }

  container.innerHTML = filtered.map((q, idx) => {
    const ansIdx = q.answerIndex;
    const ansLetter = (ansIdx >= 0 && ansIdx < letters.length) ? letters[ansIdx] : '?';
    const ansText = (ansIdx >= 0 && ansIdx < (q.options || []).length) ? q.options[ansIdx] : '';

    const opts = (q.options || []).map((opt, i) => {
      const isCorrect = i === ansIdx;
      const style = (showAnswers && isCorrect) ? ' style="font-weight:800;color:var(--correct)"' : '';
      return `<li${style}>${letters[i]}. ${esc(opt)}</li>`;
    }).join('');

    const m = /图\s*[<〈《]\s*(\d+)\s*[>〉》]/.exec(q.question || '');
    const imgNum = m ? parseInt(m[1], 10) : null;

    const imgBtn = imgNum
      ? `
        <button class="qa-img-card" type="button" data-imgnum="${imgNum}" title="查看图 ${imgNum}">
          <span class="qa-img-card-icon">🖼</span>
          <span class="qa-img-card-text">查看图 ${imgNum}</span>
        </button>
      `
      : '';

    return `
      <div class="qa-item" data-qid="${q.id ?? (idx + 1)}">
        <div class="qa-q">
          <span class="qa-q-text">${q.id ?? (idx + 1)}. ${esc(q.question)}</span>
          ${imgBtn}
        </div>

        <ol class="qa-opts" type="A">${opts}</ol>

        <div class="qa-ans-wrap" style="${showAnswers ? '' : 'display:none;'}">
          <div class="qa-ans">正确答案：${ansLetter}${ansText ? `（${esc(ansText)}）` : ''}</div>
          ${q.explanation ? `<div class="qa-muted">解析：${esc(q.explanation)}</div>` : ''}
        </div>

        <button class="btn btn-ghost btn-sm qa-toggle-one" type="button">
          ${showAnswers ? '隐藏本题答案' : '显示本题答案'}
        </button>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const metaLine = document.getElementById('metaLine');
  const qaList = document.getElementById('qaList');
  const filterInput = document.getElementById('filterInput');
  const toggleAnswersBtn = document.getElementById('toggleAnswersBtn');

  let showAnswers = false;
  let questions = [];

  function syncToggleBtn() {
    if (!toggleAnswersBtn) return;
    toggleAnswersBtn.textContent = showAnswers ? '🙈 隐藏答案' : '👁 显示答案';
  }

  function doRender() {
    renderList(qaList, questions, filterInput.value, showAnswers);
    syncToggleBtn();
  }

  function openImageModal(numOrSrc, titleText) {
    const modal = document.getElementById('imgModal');
    const img = document.getElementById('imgModalImg');
    const title = document.getElementById('imgModalTitle');
    const back = document.getElementById('imgBackBtn');

    if (!modal || !img || !back) return;

    const src = typeof numOrSrc === 'number'
      ? `assets/signs/${numOrSrc}.png`
      : numOrSrc;

    img.onerror = null;
    img.src = src;
    img.onerror = () => alert(`图片不存在：${src}。请确认对应图片文件存在。`);

    if (title) title.textContent = titleText || (typeof numOrSrc === 'number' ? `图示（图 ${numOrSrc}）` : '图示');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const onKey = (ev) => { if (ev.key === 'Escape') closeImageModal(); };
    modal._esc = onKey;
    document.addEventListener('keydown', onKey);

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

  // Handle static image button (e.g. 查看所有交通标志与信号) — it lives outside #qaList
  const signsTopBtn = document.querySelector('[data-staticimg]');
  if (signsTopBtn) {
    signsTopBtn.addEventListener('click', () => {
      const key = signsTopBtn.dataset.staticimg;
      openImageModal(`assets/${key}.png`, '交通标志与信号（图 1-16）');
    });
  }

  try {
    const data = await loadQuestions();
    questions = data.questions || [];
    metaLine.textContent = `共 ${questions.length} 题（版本：${data._meta?.version || '—'}）`;

    doRender();
    filterInput.addEventListener('input', () => doRender());

    if (toggleAnswersBtn) {
      toggleAnswersBtn.addEventListener('click', () => {
        showAnswers = !showAnswers;
        doRender();
      });
    }

    qaList.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.qa-toggle-one');
      if (toggleBtn) {
        const item = toggleBtn.closest('.qa-item');
        const wrap = item.querySelector('.qa-ans-wrap');
        const isHidden = getComputedStyle(wrap).display === 'none';
        wrap.style.display = isHidden ? '' : 'none';
        toggleBtn.textContent = isHidden ? '隐藏本题答案' : '显示本题答案';
        return;
      }

      const imgBtn = e.target.closest('.qa-img-card');
      if (imgBtn) {
        const num = parseInt(imgBtn.dataset.imgnum, 10);
        if (Number.isFinite(num)) openImageModal(num);
      }
    });

  } catch (e) {
    console.error(e);
    metaLine.textContent = '题库加载失败。';
    qaList.innerHTML = `<p class="text-muted">无法加载 questions.json，请刷新重试。</p>`;
  }
});