// 관리자 API — Cloudflare Worker
// 보안 경계는 이 워커다. 관리자 페이지(/admin)는 정적 파일이라 누구나 소스를 볼 수 있지만,
// 쓰기·조회는 전부 여기서 Cloudflare Access JWT를 검증한 뒤에만 허용한다.
//
// 라우트
//   POST   /api/inquiry            문의 접수 (공개 · 홈페이지 문의 폼)
//   GET    /api/admin/me           로그인 확인 (인증 필요)
//   GET    /api/admin/content      ?file=site|news — 저장소의 콘텐츠 JSON 조회 (인증 필요)
//   PUT    /api/admin/content      {file, data} — GitHub 커밋으로 반영 (인증 필요)
//   GET    /api/admin/inquiries    문의 목록 (인증 필요)
//   DELETE /api/admin/inquiries/:id 문의 삭제 (인증 필요)

const CONTENT_FILES = {
  site: 'assets/content/site.json',
  news: 'assets/content/news.json',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === '/api/inquiry' && req.method === 'POST') return await postInquiry(req, env);

      if (path.startsWith('/api/admin/')) {
        const who = await requireAccess(req, env);
        if (!who) return json({ error: '인증이 필요합니다' }, 401);

        if (path === '/api/admin/me') return json({ email: who.email });
        if (path === '/api/admin/content' && req.method === 'GET') return await getContent(url, env);
        if (path === '/api/admin/content' && req.method === 'PUT') return await putContent(req, env, who);
        if (path === '/api/admin/inquiries' && req.method === 'GET') return await listInquiries(env);
        const del = path.match(/^\/api\/admin\/inquiries\/([\w:-]+)$/);
        if (del && req.method === 'DELETE') {
          await env.INQUIRIES.delete(del[1]);
          return json({ ok: true });
        }
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },
};

/* ---------- Cloudflare Access JWT 검증 ---------- */

let certCache = { keys: null, at: 0 };

async function requireAccess(req, env) {
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;

  const header = JSON.parse(b64uDecode(h));
  const payload = JSON.parse(b64uDecode(p));

  const iss = `https://${env.ACCESS_TEAM_DOMAIN}`;
  const now = Math.floor(Date.now() / 1000);
  const audOk = [].concat(payload.aud || []).includes(env.ACCESS_AUD);
  if (!audOk || payload.iss !== iss || payload.exp < now) return null;

  // 팀 공개키로 서명 검증 (5분 캐시)
  if (!certCache.keys || Date.now() - certCache.at > 300_000) {
    const r = await fetch(`${iss}/cdn-cgi/access/certs`);
    certCache = { keys: (await r.json()).keys, at: Date.now() };
  }
  const jwk = certCache.keys.find(k => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key,
    b64uToBytes(s), new TextEncoder().encode(`${h}.${p}`),
  );
  return ok ? payload : null;
}

/* ---------- 콘텐츠: GitHub 커밋으로 읽고 쓴다 ---------- */

async function ghRequest(env, method, apiPath, body) {
  const r = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'user-agent': 'tridatum-admin-api',
      accept: 'application/vnd.github+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function getContent(url, env) {
  const file = CONTENT_FILES[url.searchParams.get('file')];
  if (!file) return json({ error: 'file은 site 또는 news' }, 400);
  const meta = await ghRequest(env, 'GET',
    `/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${file}?ref=${env.GH_BRANCH}`);
  return json({ sha: meta.sha, data: JSON.parse(utf8Decode(meta.content)) });
}

async function putContent(req, env, who) {
  const { file: fileKey, data } = await req.json();
  const file = CONTENT_FILES[fileKey];
  if (!file || typeof data !== 'object') return json({ error: '잘못된 요청' }, 400);

  const meta = await ghRequest(env, 'GET',
    `/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${file}?ref=${env.GH_BRANCH}`);
  const res = await ghRequest(env, 'PUT',
    `/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${file}`, {
      message: `콘텐츠 수정: ${fileKey} (${who.email})`,
      content: utf8Encode(JSON.stringify(data, null, 2) + '\n'),
      sha: meta.sha,
      branch: env.GH_BRANCH,
    });
  return json({ ok: true, commit: res.commit.sha });
}

/* ---------- 문의: KV에 저장 (공개 저장소에 올리지 않는다) ---------- */

async function postInquiry(req, env) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return json({ ok: true }); // 허니팟 — 봇이면 조용히 무시
  const name = String(b.name || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().slice(0, 120);
  const org = String(b.org || '').trim().slice(0, 120);
  const msg = String(b.msg || '').trim().slice(0, 4000);
  if (!name || !email || !msg) return json({ error: '이름 · 이메일 · 내용은 필수입니다' }, 400);

  // 같은 IP는 시간당 5건까지
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const rlKey = `rl:${ip}`;
  const count = parseInt(await env.INQUIRIES.get(rlKey) || '0', 10);
  if (count >= 5) return json({ error: '잠시 후 다시 시도해 주세요' }, 429);
  await env.INQUIRIES.put(rlKey, String(count + 1), { expirationTtl: 3600 });

  const id = `inq:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  await env.INQUIRIES.put(id, JSON.stringify({
    id, name, email, org, msg,
    at: new Date().toISOString(),
  }));
  return json({ ok: true });
}

async function listInquiries(env) {
  const { keys } = await env.INQUIRIES.list({ prefix: 'inq:', limit: 500 });
  const items = await Promise.all(keys.map(k => env.INQUIRIES.get(k.name).then(JSON.parse)));
  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return json({ items });
}

/* ---------- 유틸 ---------- */

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
function b64uDecode(s) {
  return utf8Decode(s.replace(/-/g, '+').replace(/_/g, '/'));
}
function b64uToBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function utf8Decode(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
function utf8Encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
