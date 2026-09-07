// Fictional operational records. No customer data, names, locations or measured project outcomes.
import {
  rng,
  mean,
  sum,
  monitorData,
  policyData,
} from "./analytics-data.mjs?v=20260907v1";
export { mean, sum, monitorData, policyData };
export const DEFINITIONS = [
  ["market", "상권 종합 분석", "시장별 매출과 방문 흐름", "상권·정책"],
  ["vacancy", "빈집 예측", "지역 유형과 빈집 예측 변수", "도시·생활"],
  ["emission", "굴뚝 모니터링", "설비 상태와 가동 중단 예측", "환경·안전"],
  ["broadcast", "방송 홍보 분석", "방송 전후 방문·검색 변화", "상권·정책"],
  ["care", "돌봄 수요 분석", "미충족 수요와 서비스 공급", "도시·생활"],
  ["mobility", "교통·이동 분석", "시간대별 이동과 목적지 연계", "도시·생활"],
  ["wildlife", "환경·예찰 분석", "위험 구역과 현장 점검 계획", "환경·안전"],
  ["voucher", "지역 소비 분석", "지역화폐 이용과 가맹점 변화", "상권·정책"],
  ["risk", "위험징후 탐지", "점검 대상을 근거와 함께 검토", "환경·안전"],
  ["documents", "문서 검토 AI", "원문 대조와 필드 검토", "데이터·AI"],
  ["warehouse", "데이터 운영", "수집·적재와 품질 점검", "데이터·AI"],
  ["llm", "AI 운영 모니터링", "응답 지연과 요청별 병목", "데이터·AI"],
].map(([id, title, desc, group]) => ({ id, title, desc, group }));
const random = rng(907158),
  int = (a, b) => Math.round(a + random() * (b - a));
export const markets = Array.from({ length: 8 }, (_, i) => ({
  id: `M-${101 + i}`,
  name: [
    "중앙시장",
    "동부시장",
    "서부시장",
    "수변시장",
    "북문시장",
    "역전시장",
    "남문시장",
    "생활시장",
  ][i],
  type: i % 3 === 0 ? "도매" : "소매",
  stores: int(50, 140),
  x: 95 + (i % 4) * 120,
  y: 95 + Math.floor(i / 4) * 130,
  monthly: Array.from({ length: 12 }, (_, m) =>
    Math.round(
      (28000 + i * 4500) * (1 + 0.16 * Math.sin(m * 0.6 + i) + m * 0.018),
    ),
  ),
  visits: int(10000, 35000),
  weekend: int(21, 48),
  age: int(24, 54),
}));
export const buildings = Array.from({ length: 42 }, (_, i) => {
  const empty = int(0, 13),
    utility = int(3, 100),
    age = int(8, 48),
    score = Math.min(
      0.97,
      Math.max(0.07, empty * 0.045 + (100 - utility) * 0.004 + age * 0.003),
    );
  return {
    id: `H-${String(101 + i).padStart(4, "0")}`,
    zone: i % 3,
    name: `${["해솔", "서림", "수변"][i % 3]} ${Math.floor(i / 3) + 1}구역`,
    age,
    empty,
    utility,
    score,
    checked: i % 6 === 0,
    x: 60 + (i % 7) * 72 + (i % 3) * 6,
    y: 65 + Math.floor(i / 7) * 45,
  };
});
export const stacks = Array.from({ length: 12 }, (_, i) => ({
  id: `ST-${String(i + 1).padStart(2, "0")}`,
  site: ["1사업장", "2사업장", "3사업장"][i % 3],
  status: i === 3 ? "중단" : i === 8 ? "통신 지연" : "가동",
  temperature: Array.from({ length: 48 }, (_, j) =>
    i === 3 && j > 31
      ? Math.round(85 + Math.sin(j) * 4)
      : Math.round(145 + i * 3 + Math.sin(j * 0.24 + i) * 13 + random() * 5),
  ),
  oxygen: Array.from(
    { length: 48 },
    (_, j) => +(8 + Math.sin(j * 0.3 + i) * 1.4 + random() * 0.3).toFixed(1),
  ),
  flow: int(1100, 2400),
  forecast: Array.from(
    { length: 48 },
    (_, j) =>
      +(
        i === 3
          ? 0.87 + random() * 0.08
          : i === 6 && j > 12 && j < 27
            ? 0.72 + random() * 0.17
            : 0.03 + random() * 0.18
      ).toFixed(2),
  ),
}));
export const spots = Array.from({ length: 6 }, (_, i) => ({
  id: `P-${i + 1}`,
  name: [
    "식음 A",
    "문화공간 B",
    "전시관 C",
    "관광지 D",
    "식음 E",
    "체험공간 F",
  ][i],
  program: i % 2,
  weekly: Array.from({ length: 16 }, (_, j) =>
    Math.round(
      (370 + i * 95) *
        (1 + Math.sin(j * 0.8) * 0.12 + (j > 7 ? 0.12 + (i % 3) * 0.09 : 0)) +
        random() * 35,
    ),
  ),
  lastYear: Array.from({ length: 16 }, (_, j) =>
    Math.round((355 + i * 95) * (1 + Math.sin(j * 0.8) * 0.13) + random() * 35),
  ),
  search: Array.from({ length: 16 }, (_, j) =>
    Math.round(
      30 + i * 2 + random() * 8 + (j > 7 ? Math.max(5, 50 - (j - 8) * 8) : 0),
    ),
  ),
}));
export const districts = Array.from({ length: 6 }, (_, i) => {
  const need = int(140, 290),
    linked = need - int(18, 70),
    capacity = linked + int(7, 48);
  return {
    id: `D-${i + 1}`,
    name: ["해솔동", "서림동", "수변동", "중앙동", "북문동", "남문동"][i],
    need,
    linked,
    capacity,
    waiting: need - linked,
    centres: int(2, 6),
    x: 100 + (i % 3) * 165,
    y: 100 + Math.floor(i / 3) * 130,
  };
});
export const destinations = [
  "환승거점",
  "주거지역",
  "전통시장",
  "업무지역",
  "문화시설",
  "상업지역",
];
export const od = destinations.map((_, i) =>
  destinations.map((_, j) => (i === j ? 0 : int(180, 1700))),
);
export const surveillance = Array.from({ length: 18 }, (_, i) => ({
  id: `E-${String(i + 1).padStart(2, "0")}`,
  name: `예찰 구역 ${String(i + 1).padStart(2, "0")}`,
  risk: int(15, 96),
  reports: int(1, 9),
  samples: int(1, 7),
  checked: i % 3 !== 0,
  x: 65 + (i % 6) * 87,
  y: 80 + Math.floor(i / 6) * 85,
}));
export const merchants = [
  "음식점",
  "식료품",
  "생활서비스",
  "문화·여가",
  "교육",
  "기타",
].map((name, i) => ({
  id: `V-${i + 1}`,
  name,
  stores: int(38, 130),
  amount: int(4200, 18000),
  local: int(55, 88),
  before: int(75, 105),
  monthly: Array.from({ length: 12 }, (_, m) =>
    Math.round(100 + i * 14 + m * 2 + Math.sin(m * 0.8 + i) * 10),
  ),
}));
export const flags = Array.from({ length: 36 }, (_, i) => ({
  id: `R-${String(i + 1).padStart(4, "0")}`,
  score: +(0.56 + random() * 0.42).toFixed(2),
  reason: [
    "반복 패턴 변화",
    "기준 대비 급증",
    "관계 정보 불일치",
    "드문 조합 발생",
  ][i % 4],
  count: int(3, 29),
  status: i % 5 === 0 ? "확인 중" : "검토 대기",
  zone: i % 3,
}));
export const documents = [
  {
    id: "DOC-041",
    name: "시설 점검 결과서",
    pages: 8,
    type: "정기 점검",
    fields: [
      ["점검일", "2026.08.28"],
      ["시설 코드", "F-027"],
      ["점검 결과", "추가 확인 필요"],
      ["후속 일정", "2026.09.04"],
    ],
    excerpt:
      "2026년 8월 28일 시설 F-027에 대한 정기 점검을 실시하였다. 센서 교정 이력은 확인되었으나 통신 중단 구간의 원인이 기록되지 않아 추가 확인이 필요하다. 후속 점검일은 2026년 9월 4일로 정한다.",
    page: 3,
  },
  {
    id: "DOC-042",
    name: "사업 검토 요청서",
    pages: 6,
    type: "요건 검토",
    fields: [
      ["접수일", "2026.08.29"],
      ["검토 번호", "REQ-018"],
      ["사업 구분", "시설 개선"],
      ["첨부 서류", "일정표 미첨부"],
    ],
    excerpt:
      "검토 번호 REQ-018은 시설 개선 계획에 관한 요청이다. 접수된 자료에는 개선 대상 목록과 소요 비용 내역이 포함되어 있다. 실행 일정표는 첨부되지 않았으므로 검토 전에 보완을 요청한다.",
    page: 2,
  },
  {
    id: "DOC-043",
    name: "분석 수행 계획서",
    pages: 12,
    type: "조건 추출",
    fields: [
      ["분석 기간", "2026.01–06"],
      ["집계 단위", "주 단위"],
      ["제외 기준", "결측 구간"],
      ["검증 구간", "마지막 4주"],
    ],
    excerpt:
      "분석 기간은 2026년 1월부터 6월까지이며 주 단위로 집계한다. 수집 누락이 확인된 구간은 별도로 표시하고 비교 대상에서 제외한다. 마지막 4주는 학습에 사용하지 않고 검증 구간으로 분리한다.",
    page: 5,
  },
];
export const sources = [
  "거래 집계",
  "생활인구",
  "건축물 정보",
  "공간 경계",
  "센서 측정",
  "업무 문서",
].map((name, i) => {
  const input = int(15000, 180000),
    rejected = i === 2 ? 47 : i === 4 ? 128 : 0;
  return {
    id: `SRC-0${i + 1}`,
    name,
    input,
    loaded: input - rejected,
    rejected,
    minutes: [4, 7, 3, 9, 2, 6][i],
    status: rejected ? "확인 필요" : "완료",
  };
});
export function filtered(key, state = {}) {
  const scope = state.scope ?? "all";
  if (key === "market")
    return markets.filter((r) => scope === "all" || r.type === scope);
  if (key === "vacancy")
    return buildings.filter((r) => scope === "all" || r.zone === Number(scope));
  if (key === "emission")
    return stacks.filter((r) => scope === "all" || r.site === scope);
  if (key === "broadcast")
    return spots.filter((r) => scope === "all" || r.program === Number(scope));
  if (key === "care")
    return districts.filter((r) => scope === "all" || r.id === scope);
  if (key === "wildlife")
    return surveillance.filter(
      (r) =>
        scope === "all" || (scope === "priority" ? r.risk >= 70 : !r.checked),
    );
  if (key === "risk")
    return flags.filter(
      (r) => r.score >= Number(scope === "all" ? 0.7 : scope),
    );
  if (key === "documents") return documents;
  if (key === "warehouse")
    return sources.filter((r) => scope === "all" || r.rejected > 0);
  if (key === "voucher")
    return merchants.filter((r) => scope === "all" || r.name === scope);
  return [];
}
export function csv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return (
    "\ufeff" +
    [
      keys.map(cell).join(","),
      ...rows.map((r) =>
        keys
          .map((k) => cell(Array.isArray(r[k]) ? r[k].join(" / ") : r[k]))
          .join(","),
      ),
    ].join("\r\n")
  );
}

export function mobilityData(weekend = false) {
  const matrix = od.map((row) =>
    row.map((v, j) =>
      Math.round(v * (weekend ? 0.78 : 1) * (weekend && j === 4 ? 1.5 : 1)),
    ),
  );
  const total = sum(matrix.flat()),
    incoming = destinations.map((name, j) => ({
      name,
      value: sum(matrix.map((r) => r[j])),
    }));
  const weights = Array.from(
    { length: 24 },
    (_, i) =>
      180 +
      Math.exp(-(((i - 8) / 2) ** 2)) * 930 +
      Math.exp(-(((i - 18) / 2.7) ** 2)) * 1250 +
      (weekend ? Math.exp(-(((i - 14) / 4) ** 2)) * 500 : 0),
  );
  const precise = weights.map((w) => (w / sum(weights)) * total),
    hourly = precise.map(Math.floor);
  const order = precise
    .map((v, i) => ({ i, remainder: v - hourly[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  const remaining = total - sum(hourly);
  for (let j = 0; j < remaining; j++) hourly[order[j].i]++;
  return {
    matrix,
    total,
    incoming,
    hourly,
    alightings: hourly.map((_, i) => hourly[(i + 23) % 24]),
  };
}
