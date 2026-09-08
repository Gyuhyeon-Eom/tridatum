# 관리자 페이지 설정 가이드

`tridatum.co/admin` — 허용된 회사 메일로만 접속해 소식·문구를 수정하고 문의를 확인하는 페이지.

## 구조 요약

```
방문자 ── tridatum.co/admin ──→ Cloudflare Access (메일 허용 목록 · 로그인)
                                      │ 통과하면
                              admin 페이지 (정적 · GitHub Pages)
                                      │ 저장/조회 요청
                              Cloudflare Worker (/api/*)
                                      ├─ Access 로그인 토큰을 서버에서 재검증
                                      ├─ 소식·문구 → GitHub 커밋 → Pages 자동 재배포
                                      └─ 문의 접수 → Workers KV (공개 저장소에 안 올라감)
```

보안 경계는 **워커**다. 관리자 화면 HTML은 누구나 볼 수 있지만(비밀 없음),
데이터 조회·수정은 워커가 Access 로그인 토큰(JWT)을 검증한 뒤에만 처리한다.

## 1. GitHub 토큰 만들기 (5분)

워커가 저장소에 커밋할 때 쓸 토큰. **본인 GitHub 계정에서 직접** 발급한다.

1. github.com → Settings → Developer settings → **Fine-grained tokens** → Generate new token
2. Repository access: **Only select repositories** → `tridatum` 만 선택
3. Permissions → Repository permissions → **Contents: Read and write** (나머지는 No access)
4. 만료는 1년으로 하고, 만료 알림 오면 재발급해서 아래 6단계의 secret만 갱신
5. 생성된 `github_pat_...` 값을 복사해 둔다 (이 창을 닫으면 다시 못 봄)

## 2. Cloudflare Zero Trust 시작

1. Cloudflare 대시보드 → **Zero Trust** (one.dash.cloudflare.com)
2. 처음이면 팀 이름을 정한다 (예: `tridatum`) → 팀 도메인이 `tridatum.cloudflareaccess.com` 이 됨. 요금제는 **Free** 선택
3. 로그인 방식은 기본값 **One-time PIN**(메일로 일회용 코드)이면 충분.
   Google 로그인으로 하고 싶으면: Settings → Authentication → Login methods → Add new → **Google** (GCP OAuth 클라이언트 필요 · 나중에 추가해도 됨)

## 3. Access 애플리케이션 만들기 (허용 메일 등록)

1. Zero Trust → Access → **Applications** → Add an application → **Self-hosted**
2. Application name: `tridatum-admin`
3. Public hostname 에 **두 개** 추가:
   - `tridatum.co` / 경로 `admin` (하위 경로 포함됨)
   - `tridatum.co` / 경로 `api/admin`
4. 정책(Policy) 추가: Action **Allow**, Include → Selector **Emails** → 허용할 회사 메일 주소들 입력
   - 이후 사람 추가/제거는 이 목록만 수정하면 됨
5. 만든 애플리케이션 → Overview 에서 **Application Audience (AUD) Tag** 복사해 둔다

## 4. 워커 설정값 채우기

`worker/wrangler.toml` 에서:

- `ACCESS_TEAM_DOMAIN` → 2단계의 팀 도메인 (예: `tridatum.cloudflareaccess.com`)
- `ACCESS_AUD` → 3단계에서 복사한 AUD 태그

## 5. KV 만들기 + 워커 배포

터미널에서 (Node 설치돼 있으면 됨):

```bash
cd worker
npx wrangler login                      # 브라우저로 Cloudflare 로그인
npx wrangler kv namespace create INQUIRIES
# 출력된 id 를 wrangler.toml 의 KV_NAMESPACE_ID_여기에_입력 자리에 넣는다
npx wrangler secret put GITHUB_TOKEN    # 1단계 토큰 붙여넣기
npx wrangler deploy
```

배포되면 `tridatum.co/api/*` 요청이 이 워커로 라우팅된다.

## 6. 동작 확인

1. `tridatum.co/admin` 접속 → Access 로그인 화면 → 허용 메일로 로그인
2. 문구 하나 수정 → 저장 → GitHub 저장소에 `콘텐츠 수정: site (내메일)` 커밋이 생겼는지 확인
3. 1~2분 뒤 홈페이지 새로고침 → 반영 확인
4. `tridatum.co/contact.html` 문의 폼 제출 → 관리자 문의함에 뜨는지 확인
5. 허용 안 된 메일로 로그인 시도 → 차단되는지 확인

## 알아둘 것

- **gyuhyeon-eom.github.io 주소로는 admin 화면이 그냥 열린다.** 정상이다 — 화면만 보일 뿐,
  데이터 조회·저장은 전부 워커가 거부한다. 신경 쓰이면 그대로 두고, Cloudflare 쪽 주소만 공유할 것
- 문의 내용은 GitHub 이 아니라 Workers KV 에만 저장된다 (공개 저장소 노출 방지)
- 소식·문구 저장 = GitHub 커밋이므로 변경 이력이 전부 저장소에 남는다
- 같은 IP 의 문의 접수는 시간당 5건으로 제한 + 봇 차단용 숨은 필드(허니팟) 적용

## 문의 이메일 알림

문의 저장과 메일 발송은 별도 단계입니다. 관리자 문의함에서 확인하고, 알림을 받을 수 있도록 [문의 이메일 연결](inquiry-email.md)의 최초 설정을 완료합니다. 공개 홈페이지와 관리자 파일은 기존 수동 배포 절차로 반영하며, Worker도 별도로 배포해야 합니다.
