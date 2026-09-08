# 문의 저장과 이메일 알림

문의 폼은 `/api/inquiry`에서 접수하고 Workers KV에 먼저 저장합니다. 이후 Cloudflare Email Service로 `contact@tridatum.co`에 알림을 요청합니다. 발신 주소는 `website@tridatum.co`, 회신 주소(Reply-To)는 문의자가 입력한 이메일입니다.

메일 발송 실패와 관계없이 저장된 문의는 관리자 문의함에 남습니다. ‘접수되었습니다’는 문의 저장 확인입니다. 메일 상태 `accepted`는 발송 서비스의 요청 수락이며, 수신함 도착을 확정한 상태는 아닙니다.

## 관리자 문의함 접속

1. https://tridatum.co/admin/ 접속
2. Cloudflare Access에 허용된 회사 이메일로 로그인
3. 상단 **문의함** 탭 선택

메일 설정 상태와 문의별 결과가 표시됩니다. 설정 전 접수와 실패한 알림은 **메일 알림 보내기**로 발송할 수 있습니다. 이미 수락되었거나 처리 결과가 미확정인 요청은 반복 발송하지 않습니다. `pending` 상태가 계속되면 Cloudflare 이메일 로그에서 먼저 결과를 확인합니다. 이 화면과 API는 Access 인증 뒤에만 사용할 수 있습니다.

## 최초 연결

2026-09-08 점검 당시 운영 Worker에는 메일 바인딩이 없었고, 계정에 인증된 수신 주소도 없었습니다. 코드 변경만으로 기존 배포가 자동 갱신되지는 않습니다.

1. Cloudflare 대시보드의 **Compute → Email Service → Email Sending → Onboard Domain**에서 `tridatum.co`의 발신 도메인을 설정합니다. 이 단계에서 제시되는 DNS 레코드를 검토하고 인증을 완료합니다.
2. **Email Service → Email Routing → Destination Addresses**에서 `contact@tridatum.co`를 수신 주소로 등록하고, 해당 메일함으로 온 인증 링크를 누릅니다. 수신 주소 등록은 루트 도메인의 Email Routing 활성화와 별개입니다.
3. 회사 수신 메일은 Google로 연결되어 있습니다. 루트 도메인의 Google MX와 기존 인증 레코드를 유지합니다. 필요한 것은 Email **Sending** 연결이며, 루트 MX를 Cloudflare 수신 서버로 교체하는 절차가 아닙니다. 발송 설정은 `cf-bounce` 하위 도메인 등의 인증 레코드를 사용합니다.
4. `worker/wrangler.toml`의 `INQUIRY_FROM`, `[[send_email]]`을 확인합니다. 수신 대상은 `contact@tridatum.co`로 제한되어 있습니다.
5. 인증을 완료한 뒤 Worker를 배포합니다.

```sh
cd worker
npx wrangler deploy
```

6. 공개 홈페이지와 관리자 정적 파일도 기존 수동 배포 절차로 반영합니다. 홈페이지 파일만 배포하면 Worker 코드는 바뀌지 않습니다.
7. 사용자 본인이 테스트 문의를 한 건 제출합니다. 관리자 문의함의 접수·발송 상태, Cloudflare 이메일 로그, 수신 메일함을 차례로 확인합니다. 새 문의에 대해서만 자동 알림을 요청하며 기존 문의를 자동으로 일괄 발송하지 않습니다.

Email Sending 이용 자격과 계정 상태는 Cloudflare 대시보드에서 확인합니다. 설정 전에는 해당 서비스나 요금제를 자동 활성화하지 않습니다.

## 확인과 테스트

```sh
node --test scripts/inquiry.test.mjs
cd worker
npx wrangler deploy --dry-run --outdir /tmp/tridatum-worker-check
```

테스트는 메모리 저장소와 모의 메일 바인딩을 사용하며 실제 메일을 보내지 않습니다. 로컬 문의 폼이 정적 서버의 HTML 응답을 받으면 접수 성공으로 처리하지 않고 입력을 유지합니다.

참고: [Cloudflare 발신 도메인 설정](https://developers.cloudflare.com/email-service/configuration/domains/), [발송 바인딩](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [Workers 메일 API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [수신 주소 인증](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/).
