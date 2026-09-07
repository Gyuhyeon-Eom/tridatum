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
- `assets/css/components.css`: 공통 카드와 유틸리티
- `assets/css/analytics.css`: 대시보드의 지표·차트·표와 좁은 화면 대응
- `assets/css/fonts.css`, `assets/fonts/`: 직접 제공하는 Wanted Sans와 SIL 라이선스
- `assets/css/base.css`: 기본 리셋. 관리자 화면에서도 사용하므로 공통 변경에 주의
- `assets/js/motion.js`: 스크롤 목차, 헤더 색 전환, 장식의 이동, 섹션 등장
- `assets/js/demos.js`: 데모 탭, 방향키 탐색, 추가 화면 펼치기
- `assets/js/analysis-samples.mjs`: 재현 가능한 합성 원자료와 실제 학습 모델의 검증 점수
- `assets/js/analytics-data.mjs`: 필터·집계·평가 지표·bootstrap 추정
- `assets/js/analytics-charts.mjs`: 축·범례·구간·툴팁을 공유하는 SVG 차트
- `assets/js/analytics-view.mjs`: 대표 화면·세부 분석·서비스 미리보기 렌더러
- `assets/js/dash.js`: 필터·임계값·문서 출처·요청 선택·상세 분석 대화상자
- `scripts/render-demos.mjs`: 같은 렌더러로 정적 HTML 미리보기 생성
- `assets/img/logo-*.svg`, `assets/js/brand.mjs`: 공용 워드마크와 td 모노그램
- `scripts/render-brand.py`: 로고 SVG·공용 헤더·푸터·브랜드 모듈 생성
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

## 데모 편집

집계 로직은 `analytics-data.mjs`, 차트는 `analytics-charts.mjs`, 화면 구성은 `analytics-view.mjs`, 스타일은 `assets/css/analytics.css`에서 수정합니다. 정적 첫 화면과 조작 후 화면이 같도록 HTML을 다시 생성합니다. 배포·실행 시에는 빌드 과정이 필요 없습니다.

```sh
node scripts/render-demos.mjs
node --test scripts/analytics.test.mjs
```

생성된 `index.html`과 `services.html`도 함께 커밋합니다. 모듈 변경 시 해당 import와 HTML의 리소스 버전을 갱신합니다. 상세 화면 15종은 선택한 권역·기간·모델·분석 집단을 전달받습니다. 문서 AI는 사전 작성한 예시 문서와 답변을 보여주며 실제 모델 호출을 하지 않습니다.

## 합성 데이터와 분석 방법

`analysis-samples.mjs`에 포함된 원자료에서 모든 지표를 계산합니다. 공개 화면의 SAMPLE 표기와 분석 조건을 유지합니다.

- 데이터 진단: 2,400개 고유 레코드와 중복 24개. 중복 키를 제외한 뒤 결측 비율, 중앙값, 사분위 범위, IQR 상한 초과 건수를 계산합니다.
- 모델 검증: scikit-learn 합성 이진 분류 데이터 4,000건을 층화 분할합니다. 3,000건으로 세 모델을 실제 학습하고 독립 검증 1,000건의 점수로 PR·AP·혼동 행렬·보정 구간을 계산합니다. 변수 기여도는 permutation ΔAP 5회 평균입니다. 모델 데이터와 분할의 난수 시드는 42입니다.
- 정책효과: 80개 개체 × 12개월의 합성 패널입니다. 집단별 전후 평균 차이의 차이를 계산하고 개체 단위 percentile bootstrap 800회로 구간을 구합니다. 시점별 비교는 시행 직전 월을 기준으로 합니다. 회귀나 공변량 보정 결과를 표시한 화면은 아닙니다.
- 운영 분석: 합성 요청 로그 420건에서 기간별 집계와 지연 분위수, 오류율, 토큰 수를 계산합니다. 정상 요청의 단계별 시간 합은 전체 지연과 같습니다. 오류 필터는 요청 표에 적용합니다.

원자료를 변경할 때만 아래 명령을 실행합니다. NumPy·SciPy·scikit-learn이 필요하며 사용한 scikit-learn 버전은 생성 파일의 `meta.sklearn`에 기록합니다. 관측·패널·요청 생성 시드는 20260907입니다.

```sh
python3 scripts/generate-analysis-data.py
node scripts/render-demos.mjs
node --test scripts/analytics.test.mjs
```

테스트는 원자료 보존, PR·AP 기준값, 혼동 행렬, 보정 구간 집계, bootstrap 기준 시점, 요청 집계와 화면의 유효 수치를 확인합니다. 지표 정의는 [scikit-learn 평가 문서](https://scikit-learn.org/stable/modules/model_evaluation.html)를 참고합니다.

## 브랜드와 서체

소문자 워드마크와 td 모노그램은 직접 구성한 SVG 경로입니다. `python3 scripts/render-brand.py`로 관련 에셋과 공용 로고를 재생성합니다. `assets/img/brand-study.svg`에서 밝은 배경과 어두운 배경의 조합을 확인할 수 있습니다.

Wanted Sans 원본은 [공식 저장소](https://github.com/wanteddev/wanted-sans)에서 제공하며 라이선스를 `assets/fonts/OFL-WantedSans.txt`에 포함했습니다. 공유 이미지의 글자는 SVG 경로로 저장되어 외부 폰트 없이 표시됩니다.
