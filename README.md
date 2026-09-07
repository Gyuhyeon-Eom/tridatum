# Tridatum 홈페이지

공공 데이터 분석과 AI 개발을 소개하는 정적 웹사이트입니다. 실행 시 빌드 없이 HTML/CSS/JavaScript로 동작합니다. GitHub 변경을 검수한 뒤 기존 Cloudflare Pages 절차로 수동 배포합니다.

## 구성

- `index.html`: 3D 첫 화면, 서비스 소개, 업무 대시보드 12종, 작업 원칙, 문의
- `services.html`: 상권·빈집·문서 검토 예시와 서비스 설명
- `work.html`, `about.html`: 익명화한 수행 역량과 팀 소개
- `contact.html`, `privacy.html`: 문의 폼과 개인정보처리방침
- `admin/`: 콘텐츠 편집·문의함. 인증·저장은 기존 Worker API 사용

## 화면과 모션

- `assets/css/design.css`: 녹색 명도 토큰, 제목·본문 크기, 레이아웃, 진입·전환·스크롤 스타일
- `assets/css/site.css`: 공용 헤더와 푸터
- `assets/css/solutions.css`: 업무 화면·필터·지도·목록·문서 검토의 반응형 스타일
- `assets/css/analytics.css`: 공통 SVG 차트와 분석 컴포넌트
- `assets/js/sculpture.mjs`: 직접 만든 세 개의 입체 프레임, 조명·반사·포인터·스크롤·버튼 반응
- `assets/js/motion.js`: 제목 등장, 페이지 전환, 섹션 추적, 스크롤에 따른 화면 움직임
- `assets/vendor/three/`: three.js 0.185.1의 공식 WebGL 모듈과 MIT 라이선스. 외부 CDN 요청 없음

첫 화면의 WebGL은 화면을 벗어나거나 탭이 숨겨지면 멈춥니다. 모션 감소 설정에서는 정지된 형태로 표시하고 페이지 전환 애니메이션을 생략합니다. WebGL을 사용할 수 없으면 CSS 입체 도형을 표시합니다. JavaScript가 없어도 기본 내용과 첫 업무 화면을 읽을 수 있습니다.

서체는 자체 제공하는 Wanted Sans입니다. 제목은 최대 68px, 섹션 제목은 최대 44px, 주요 본문은 16–18px를 기준으로 합니다. 페이지·로고·차트는 녹색 계열의 밝기 차이로 구성하며, 상태 표시는 글자와 도형을 함께 사용합니다.

## 업무 대시보드 편집

| 파일                           | 역할                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `assets/js/solutions-data.mjs` | 재현 가능한 가상 시장·건물·센서·돌봄·방송·교통·문서·배치 기록 |
| `assets/js/solutions-view.mjs` | 12개 업무 화면과 서비스 미리보기 렌더러                       |
| `assets/js/solutions.mjs`      | 분야 선택, 필터, 지도·목록 연결, 확인 표시, CSV 내보내기      |
| `scripts/render-demos.mjs`     | 첫 업무 화면과 서비스 미리보기를 정적 HTML로 생성             |
| `scripts/solutions.test.mjs`   | 모든 필터, 선택 레코드, 집계 보존, 검토 표시, CSV 검증        |

분야는 상권 종합 분석, 빈집 예측, 굴뚝 모니터링, 방송 홍보 분석, 돌봄 수요 분석, 교통·이동 분석, 환경·예찰 분석, 지역 소비 분석, 위험징후 탐지, 문서 검토 AI, 데이터 운영, AI 운영 모니터링입니다.

모든 원자료는 합성이며 지도는 직접 그린 가상 공간 배치입니다. 실제 고객명·사업명·개인 데이터·실측 성과를 넣지 않습니다. 예측 점수는 모델 출력 화면의 예시이며, 실제 설비 제어·지원 결정·위반 확정 기능이 아닙니다. 검토 표시는 화면 내 메모리에만 유지됩니다. CSV는 현재 선택 조건의 예시 기록을 내려받습니다.

```sh
node scripts/render-demos.mjs
node --test scripts/solutions.test.mjs scripts/analytics.test.mjs
```

생성된 `index.html`, `services.html`을 함께 커밋합니다. 모듈과 정적 에셋을 수정한 뒤 HTML 및 모듈 import의 버전 쿼리를 같이 갱신합니다.

## 공통 분석 모듈

기존 분석 도구는 재사용할 수 있도록 유지합니다.

- `assets/js/analysis-samples.mjs`: 합성 데이터에서 실제 학습한 모델의 검증 점수, 패널, 관측, 요청 로그
- `assets/js/analytics-data.mjs`: 원자료 필터·집계·모델 지표·bootstrap 추정
- `assets/js/analytics-charts.mjs`: 축·범례·툴팁을 포함한 SVG 차트
- `assets/js/analytics-view.mjs`: 모델 검증·정책효과 등의 공통 분석 화면
- `scripts/generate-analysis-data.py`: 합성 분석 자료 재생성. NumPy·SciPy·scikit-learn 필요

분류 데이터와 분할의 시드는 42, 관측·패널·요청 자료의 시드는 20260907, 업무 화면 자료의 시드는 907158입니다. 모델 검증은 학습 3,000건·독립 검증 1,000건이며, 정책 비교 구간은 개체 단위 bootstrap 800회로 계산합니다. 사용한 scikit-learn 버전은 생성 파일에 기록되어 있습니다. 지표 정의는 [scikit-learn 평가 문서](https://scikit-learn.org/stable/modules/model_evaluation.html)를 따릅니다.

## 브랜드·콘텐츠

`python3 scripts/render-brand.py`로 워드마크·td 모노그램·공용 로고를 재생성합니다. 로고는 직접 구성한 SVG 경로입니다. Wanted Sans의 [공식 저장소](https://github.com/wanteddev/wanted-sans)와 SIL 라이선스는 `assets/fonts/OFL-WantedSans.txt`에 기록했습니다.

`assets/content/site.json`과 HTML의 `data-c` 키가 관리자 편집 문구를 연결합니다. 기존 키와 문의 폼의 ID·필드 이름을 유지합니다. `base.css`는 관리자에서도 사용하므로 공개 페이지 변경은 별도 스타일에서 처리합니다.

## 로컬 검토와 배포

```sh
python3 -m http.server 8934 --bind 127.0.0.1
```

`http://127.0.0.1:8934`에서 검토합니다. 로컬 정적 서버에는 문의 저장·관리자 인증 API가 없습니다. 실제 인증과 문의 수신은 Worker가 배포된 도메인에서 동작합니다.

1. GitHub에 커밋·푸시합니다.
2. 변경 내용을 검수합니다.
3. 배포 컴퓨터에서 승인한 코드를 받아 기존 Cloudflare Pages 배포 절차를 실행합니다.

관리자 문구 저장은 GitHub 콘텐츠 변경이므로 다음 수동 배포에 반영됩니다. 도메인·DNS·Access 설정은 별도로 관리합니다.
