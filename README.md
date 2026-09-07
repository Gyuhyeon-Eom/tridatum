# Tridatum 홈페이지

공공 데이터 분석과 AI를 소개하는 정적 웹사이트입니다. 빌드 없이 HTML/CSS/JavaScript로 실행되며, Cloudflare Pages 반영은 검수 후 직접 진행합니다.

## 구성

- `index.html`: 큰 제목, 서비스 요약, 대시보드 5종과 세부 미리보기, 작업 원칙
- `services.html`: 서비스 설명과 관련 샘플 화면
- `work.html`: 팀 구성원의 경험을 문제와 해법으로 소개
- `about.html`: 팀 소개와 작업 원칙
- `contact.html`: 관리자 편집 가능한 연락처와 문의 폼
- `privacy.html`: 개인정보처리방침
- `admin/`: 콘텐츠 편집과 문의함. 인증 및 저장 API는 기존 Worker 사용

## 디자인과 기능

- `assets/css/design.css`: 공개 페이지 디자인 토큰, 레이아웃, 반응형, 등장 효과
- `assets/css/site.css`: 공용 헤더와 푸터
- `assets/css/components.css`: 기존 HTML/SVG 데모 컴포넌트
- `assets/css/base.css`: 기본 리셋. 관리자 화면에서도 사용하므로 공통 변경에 주의
- `assets/js/motion.js`: 스크롤 목차, 헤더 색 전환, 장식의 이동, 섹션 등장
- `assets/js/demos.js`: 데모 탭, 방향키 탐색, 추가 화면 펼치기
- `assets/js/dash.js`: 운영 데모의 기간/지역 필터
- `assets/js/include.js`: 공용 헤더/푸터와 모바일 메뉴
- `assets/js/content.js`: `assets/content/site.json`의 관리자 수정 문구 반영

`design.css`의 공개 페이지 토큰과 레이아웃은 관리자 UI와 분리돼 있습니다. 상세 디자인 사양이 준비되면 이 파일과 `motion.js`를 조정합니다. 애니메이션 감소 설정을 지원하며, JavaScript 없이도 기본 콘텐츠와 문의 이메일을 읽을 수 있습니다.

## 로컬 확인

```sh
python3 -m http.server 8934 --bind 127.0.0.1
```

`http://127.0.0.1:8934`에서 확인합니다. 로컬 정적 서버는 문의 저장 API를 제공하지 않습니다. 실제 인증, 콘텐츠 저장, 문의 수신은 Cloudflare Worker가 배포된 도메인에서 동작합니다.

## 변경 및 배포

1. 코드 변경을 GitHub에 커밋·푸시합니다.
2. 변경 내용을 검수합니다. GitHub 푸시는 운영 사이트 배포를 의미하지 않습니다.
3. 배포할 컴퓨터에서 승인한 최신 코드를 받아 기존 Cloudflare Pages 배포 절차를 실행합니다.

관리자 문구 저장도 GitHub 콘텐츠 변경이므로 다음 수동 배포에 반영됩니다. 문의함은 Worker의 비공개 저장소를 사용합니다. 도메인/DNS/Access 설정은 디자인 변경과 별개로 관리합니다.

공개 화면에 이전 소속의 사업명·기관명·로고·실측 성과를 추가하지 않습니다. 모든 데모는 예시 데이터로 표시하고, 기술은 해당 기능 옆에 설명합니다.
