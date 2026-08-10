# Tridatum 홈페이지

공공 데이터 분석 · AI 전문팀 Tridatum의 회사 홈페이지입니다.

## 구조

```
index.html          홈 (히어로 · 서비스 요약 · 대표 사례 · 원칙 · CTA)
services.html       서비스 (3개 영역 상세 · 기술 스택)
work.html           수행 실적 (숫자 · 재발주 이력 · 프로젝트 목록)
about.html          회사소개 (팀 · 일하는 방식)
contact.html        문의 (연락처 · 진행 절차 · 계약 경로)

partials/
  header.html       공용 헤더 — 메뉴 수정은 이 파일 하나만
  footer.html       공용 푸터

assets/css/
  base.css          디자인 토큰(색 · 타이포) · 리셋 · 공통 유틸
  site.css          헤더 · 푸터 스타일
  components.css    카드 · 그리드 등 페이지 조립용 블록

assets/js/
  include.js        헤더 · 푸터 주입 + 현재 페이지 내비 표시
  fade.js           스크롤 페이드 (사이트의 유일한 동작 효과)
```

## 수정 가이드

- **메뉴 항목 추가/변경** → `partials/header.html`, `partials/footer.html`
- **색 · 폰트 크기** → `assets/css/base.css` 상단 `:root` 변수
- **새 페이지 추가** → 기존 페이지 하나를 복사한 뒤 `<body data-page="...">` 값과 본문만 교체

## 로컬에서 보기

헤더 · 푸터를 fetch로 불러오기 때문에 로컬 서버가 필요합니다.

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 배포

GitHub Pages: Settings → Pages → Branch `main`, root 선택.
