// 관리자 화면 로직 — 모든 요청은 /api/admin/* (워커가 Access JWT를 검증)
(() => {
  const $ = (s) => document.querySelector(s);
  const status = $('#adm-status');

  /* 문구 편집기에 노출할 키와 라벨 (site.json과 짝) */
  const COPY_FIELDS = [
    { key: 'hero.lede', label: '메인 히어로 보조 문구', long: true },
    { key: 'cta.title', label: '하단 문의 배너 제목' },
    { key: 'cta.desc', label: '하단 문의 배너 설명', long: true },
    { key: 'contact.person', label: '문의 담당자' },
    { key: 'contact.phone', label: '대표 연락처' },
    { key: 'contact.email', label: '대표 이메일' },
    { key: 'footer.desc', label: '푸터 소개 문구', long: true },
  ];

  let newsSha = null, copySha = null;
  let newsData = [], copyData = {};

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  async function api(path, opts) {
    const r = await fetch(path, opts);
    if (r.status === 401) throw new Error('로그인이 만료되었습니다. 새로고침해 주세요.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `요청 실패 (${r.status})`);
    return body;
  }
  const say = (msg) => { status.textContent = msg; };

  /* 탭 전환 */
  document.querySelectorAll('.adm-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.adm-tabs button').forEach(b => b.classList.toggle('on', b === btn));
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === `pane-${btn.dataset.pane}`));
    });
  });

  /* ---------- 소식 ---------- */
  function renderNews() {
    $('#news-editor').innerHTML = newsData.map((n, i) => `
      <div class="acard" data-i="${i}">
        <div class="arow">
          <label>제목 <input data-f="title" value="${esc(n.title)}" maxlength="120"></label>
          <label>날짜 <input data-f="date" type="date" value="${esc(n.date)}"></label>
        </div>
        <label style="margin-bottom:0">내용 <textarea data-f="body" rows="3" maxlength="2000">${esc(n.body)}</textarea></label>
        <div class="abar" style="margin-top:10px"><button class="abtn danger" data-del="${i}" type="button">이 소식 삭제</button></div>
      </div>`).join('') || '<p class="empty">등록된 소식이 없습니다. "+ 새 소식"으로 추가하세요.</p>';
  }
  function collectNews() {
    document.querySelectorAll('#news-editor .acard').forEach(card => {
      const n = newsData[+card.dataset.i];
      card.querySelectorAll('[data-f]').forEach(el => { n[el.dataset.f] = el.value.trim(); });
    });
  }
  $('#news-editor').addEventListener('click', (e) => {
    const del = e.target.dataset.del;
    if (del === undefined) return;
    collectNews();
    newsData.splice(+del, 1);
    renderNews();
  });
  $('#news-add').addEventListener('click', () => {
    collectNews();
    newsData.unshift({
      id: `n-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      title: '', body: '',
    });
    renderNews();
  });
  $('#news-save').addEventListener('click', async () => {
    collectNews();
    const bad = newsData.find(n => !n.title || !n.date);
    if (bad) return say('제목과 날짜가 비어 있는 소식이 있습니다.');
    try {
      $('#news-save').disabled = true;
      say('저장 중…');
      await api('/api/admin/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: 'news', data: newsData }),
      });
      say('저장되었습니다. 1~2분 뒤 홈페이지에 반영됩니다.');
    } catch (err) { say(err.message); } finally { $('#news-save').disabled = false; }
  });

  /* ---------- 문구 ---------- */
  function renderCopy() {
    $('#copy-editor').innerHTML = `<div class="acard">${COPY_FIELDS.map(f => `
      <label>${f.label}
        ${f.long
          ? `<textarea data-k="${f.key}" rows="2" maxlength="500">${esc(copyData[f.key])}</textarea>`
          : `<input data-k="${f.key}" value="${esc(copyData[f.key])}" maxlength="200">`}
      </label>`).join('')}</div>`;
  }
  $('#copy-save').addEventListener('click', async () => {
    document.querySelectorAll('#copy-editor [data-k]').forEach(el => { copyData[el.dataset.k] = el.value.trim(); });
    try {
      $('#copy-save').disabled = true;
      say('저장 중…');
      await api('/api/admin/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: 'site', data: copyData }),
      });
      say('저장되었습니다. 1~2분 뒤 홈페이지에 반영됩니다.');
    } catch (err) { say(err.message); } finally { $('#copy-save').disabled = false; }
  });

  /* ---------- 문의함 ---------- */
  function renderInq(items) {
    $('#inq-list').innerHTML = items.length ? items.map(q => `
      <div class="inq">
        <div class="m">
          <b>${esc(q.name)}</b>
          <span>${esc(q.org || '')}</span>
          <span><a href="mailto:${esc(q.email)}">${esc(q.email)}</a></span>
          <span>${esc((q.at || '').slice(0, 16).replace('T', ' '))}</span>
          <button class="abtn danger" data-id="${esc(q.id)}" type="button">삭제</button>
        </div>
        <p>${esc(q.msg)}</p>
      </div>`).join('') : '<p class="empty">접수된 문의가 없습니다.</p>';
  }
  $('#inq-list').addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id || !confirm('이 문의를 삭제할까요? 되돌릴 수 없습니다.')) return;
    try {
      await api(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
      const { items } = await api('/api/admin/inquiries');
      renderInq(items);
    } catch (err) { say(err.message); }
  });

  /* ---------- 초기 로드 ---------- */
  (async () => {
    try {
      const me = await api('/api/admin/me');
      $('#adm-who').textContent = me.email;
      const [site, news, inq] = await Promise.all([
        api('/api/admin/content?file=site'),
        api('/api/admin/content?file=news'),
        api('/api/admin/inquiries'),
      ]);
      copySha = site.sha; copyData = site.data;
      newsSha = news.sha; newsData = news.data;
      renderCopy(); renderNews(); renderInq(inq.items);
    } catch (err) {
      const box = $('#adm-error');
      box.style.display = 'block';
      box.textContent = `불러오지 못했습니다: ${err.message} · 워커 배포와 Access 설정(docs/admin-setup.md)을 확인해 주세요.`;
    }
  })();
})();
