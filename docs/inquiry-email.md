# 문의 저장과 이메일 알림

문의 폼은 `/api/inquiry`에서 접수하고 Workers KV에 먼저 저장합니다. 이후 Cloudflare Email Service로 `contact@tridatum.co`에 알림을 요청합니다. 발신 주소는 `website@notify.tridatum.co`, 회신 주소(Reply-To)는 문의자가 입력한 이메일입니다.

메일 발송 실패와 관계없이 저장된 문의는 관리자 문의함에 남습니다. ‘접수되었습니다’는 문의 저장 확인입니다. 메일 상태 `accepted`는 발송 서비스의 요청 수락이며, 수신함 도착을 확정한 상태는 아닙니다.

## 관리자 문의함 접속

1. https://tridatum.co/admin/ 접속
2. Cloudflare Access에 허용된 회사 이메일로 로그인
3. 상단 **문의함** 탭 선택

메일 설정 상태와 문의별 결과가 표시됩니다. 설정 전 접수와 실패한 알림은 **메일 알림 보내기**로 발송할 수 있습니다. 이미 수락되었거나 처리 결과가 미확정인 요청은 반복 발송하지 않습니다. `pending` 상태가 계속되면 Cloudflare 이메일 로그에서 먼저 결과를 확인합니다. 이 화면과 API는 Access 인증 뒤에만 사용할 수 있습니다.

## 최초 연결

2026-09-08에 알림 전용 `notify.tridatum.co`의 Email Routing을 활성화하고 MX·SPF 레코드를 연결했습니다. 루트 `tridatum.co`의 Google MX·SPF는 유지합니다. `contact@tridatum.co` 수신 인증을 확인한 뒤 운영 Worker를 배포했습니다(버전 `cb7da4dc-9567-4e94-a087-80b89df850e0`). 공개 `/api/inquiry`에 내부 테스트 한 건을 제출해 접수 성공과 메일 발송 요청 수락(`accepted`, messageId 반환)을 확인했습니다. 같은 messageId의 Cloudflare `emailRoutingAdaptive` 로그에서도 `delivered`와 빈 오류 내용을 확인했습니다. 이는 수신 메일 서버로의 전달 완료이며, 받은편지함·스팸함 분류는 수신 서비스에서 결정합니다.

기존 공개 문의 폼은 같은 API를 사용하므로 Worker 배포 후부터 자동 알림이 동작합니다. 관리자 화면의 메일 상태 표시 등 정적 파일 개선은 저장소 최신 파일을 기존 수동 배포 절차로 반영하면 됩니다.

문의 접수는 `https://tridatum.co/contact`에서 합니다. GitHub Pages의 `gyuhyeon-eom.github.io/tridatum/contact.html`에는 Worker API가 없으므로, 해당 미러의 문의 페이지를 열면 공식 접수 페이지로 이동합니다. 로컬 정적 미리보기 역시 운영 문의 접수에 사용하지 않습니다.

1. **Compute → Email Service → Email Routing → tridatum.co → Settings → Subdomains**에서 `notify.tridatum.co`가 Enabled인지 확인합니다. 초기 재설정이 필요하면 알림용 하위 도메인에만 Email Routing을 설정합니다. `POST /zones/{zone_id}/email/routing/dns`를 사용할 때는 반드시 `{"name":"notify.tridatum.co"}`를 지정합니다.
2. **Email Service → Email Routing → Destination Addresses**에서 `contact@tridatum.co`를 등록하고, 해당 메일함으로 온 **Verify email address** 링크를 누릅니다. 관리자 Access 로그인용 숫자 코드와는 별도 인증입니다.
3. 루트 도메인은 Google 수신을 유지하므로 Routing 화면에 루트 MX·SPF가 Conflicting 또는 Missing으로 표시될 수 있습니다. 이를 해소하려고 Google 레코드를 삭제하거나 루트의 **Add missing records / Activate**를 누르지 않습니다. 알림 발신에는 `notify.tridatum.co`만 사용합니다.
4. `worker/wrangler.toml`의 `INQUIRY_FROM`, `[[send_email]]`을 확인합니다. 수신 대상은 `contact@tridatum.co`로 제한되어 있습니다.
5. 인증을 완료한 뒤 Worker를 배포합니다.

```sh
cd worker
npx wrangler deploy
```

6. 공개 홈페이지와 관리자 정적 파일도 기존 수동 배포 절차로 반영합니다. 홈페이지 파일만 배포하면 Worker 코드는 바뀌지 않습니다.
7. 명확히 테스트라고 표시한 문의를 한 건 제출합니다. 관리자 문의함의 접수·발송 상태, Cloudflare 이메일 로그, 수신 메일함을 차례로 확인합니다. 새 문의에 대해서만 자동 알림을 요청하며 기존 문의를 자동으로 일괄 발송하지 않습니다.

Cloudflare 공식 요금 안내에 따르면 Email Routing만 설정된 경우에도 계정 내 인증된 수신 주소로 보내는 메일은 모든 플랜에서 무료입니다. 이 구성은 `contact@tridatum.co` 한 곳으로 수신 대상을 제한합니다. 불특정 수신자에게 보내는 Email Sending 메뉴의 Workers Paid 구매는 필요하지 않습니다.

## 확인과 테스트

```sh
node --test scripts/inquiry.test.mjs
cd worker
npx wrangler deploy --dry-run --outdir /tmp/tridatum-worker-check
```

테스트는 메모리 저장소와 모의 메일 바인딩을 사용하며 실제 메일을 보내지 않습니다. 로컬 문의 폼이 정적 서버의 HTML 응답을 받으면 접수 성공으로 처리하지 않고 입력을 유지합니다.

참고: [Cloudflare 메일 요금](https://developers.cloudflare.com/email-service/platform/pricing/), [하위 도메인 설정](https://developers.cloudflare.com/email-service/configuration/subdomains/), [발송 바인딩](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [Workers 메일 API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [수신 주소 인증](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/).
