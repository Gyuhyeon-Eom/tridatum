// Domain-specific synthetic work records. All operational rules below are demonstration settings.
import {
  markets,
  buildings,
  stacks,
  spots,
  districts,
  destinations,
  surveillance,
  merchants,
  documents,
  sources,
  mobilityData,
  sum,
  mean,
} from "./solutions-data.mjs?v=20260907v1";
const number = (v) => Math.round(v).toLocaleString("ko-KR");
const round = (v, digits = 1) => +v.toFixed(digits);
const percent = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "집계 없음");
const delta = (a, b) =>
  `${a >= b ? "+" : ""}${((a / b - 1) * 100).toFixed(1)}%`;
const selected = (rows, state) =>
  rows.find((r) => r.id === state.selected) || rows[0];
const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
const task = (
  key,
  target,
  issue,
  evidence,
  next,
  owner,
  checks,
  priority = "확인",
) => ({ key, target, issue, evidence, next, owner, checks, priority });
const apportioned = (total, weights) => {
  const scaled = weights.map((v) => (v / sum(weights)) * total),
    values = scaled.map(Math.floor);
  const order = scaled
    .map((v, i) => ({ i, r: v - values[i] }))
    .sort((a, b) => b.r - a.r);
  const remaining = total - sum(values);
  for (let i = 0; i < remaining; i++) values[order[i].i]++;
  return values;
};
export const GROUPS = [
  {
    id: "commerce",
    name: "상권·정책",
    desc: "매출 구조 · 노출 변화 · 소비 흐름",
    members: ["market", "broadcast", "voucher"],
  },
  {
    id: "city",
    name: "도시·생활",
    desc: "조사 후보 · 서비스 공백 · 이동 경로",
    members: ["vacancy", "care", "mobility"],
  },
  {
    id: "environment",
    name: "환경·안전",
    desc: "설비 수집 · 예찰 계획 · 위험 검토",
    members: ["emission", "wildlife", "risk"],
  },
  {
    id: "systems",
    name: "데이터·AI",
    desc: "원문 대조 · 적재 품질 · 요청 추적",
    members: ["documents", "warehouse", "llm"],
  },
];
export const WORKFLOWS = {
  market: {
    tabs: ["상권 현황", "매출 정합성", "상권 검토함"],
    role: "상권 분석 담당",
    unit: "시장 × 기준 월",
    version: "sales-cohort v2.3",
    lineage: ["승인·취소 원장", "점포 이력 연결", "동일점포 집계", "상권 비교"],
    methods: [
      [
        "매출 기준",
        "승인 금액에서 취소를 차감한 순매출입니다. 원장 금액은 만원 단위이며 월 마감 이후 취소는 별도 조정합니다.",
      ],
      [
        "비교 모집단",
        "현재 점포 전체와 두 기간에 모두 관측된 동일점포를 분리합니다. 신규·폐업 점포의 구성 변화가 기존 점포의 성장률로 섞이지 않도록 합니다.",
      ],
      [
        "해석 단위",
        "영업일 보정은 매출 ÷ 해당 기간 영업일로 계산합니다. 도매·소매와 표본 포착률이 다른 시장은 절대 규모만으로 비교하지 않습니다.",
      ],
    ],
  },
  vacancy: {
    tabs: ["건물 조사 후보", "지역 군집·영향 변수", "현장 조사함"],
    role: "빈집 조사 담당",
    unit: "건물관리번호 × 월",
    version: "vacancy-screen v1.8",
    lineage: [
      "건축물대장 스냅샷",
      "계량기 연결 검증",
      "월별 사용량 결합",
      "현장 확인",
    ],
    methods: [
      [
        "연결 단위",
        "건물 ID와 계량기 ID의 1:N 관계를 유지합니다. 공용 계량기나 연결 불명 기록은 개별 주택의 무사용 근거로 확정하지 않습니다.",
      ],
      [
        "결측과 무사용",
        "미수신 값과 관측된 0을 구분합니다. 계약 변경, 철거·말소, 계절 사용 여부를 현장 조사 전에 확인합니다.",
      ],
      [
        "조사 우선순위",
        "표시 점수는 합성 신호를 조합한 조사 우선순위입니다. 확률 보정이나 빈집 확정 등급을 의미하지 않습니다.",
      ],
    ],
  },
  emission: {
    tabs: ["설비 현황", "측정자료 검증", "점검·인계함"],
    role: "설비 모니터링 담당",
    unit: "설비 × 30분 집계 구간",
    version: "sensor-quality v1.4",
    lineage: [
      "원시 측정값",
      "시각·상태 플래그",
      "구간 유효성 검사",
      "점검 기록",
    ],
    methods: [
      [
        "품질 플래그",
        "미수신·교정·정상 측정을 구분하고 원시값을 덮어쓰지 않습니다. 측정 시각과 서버 수신 시각을 따로 보관합니다.",
      ],
      [
        "예시 집계 규칙",
        "1분 자료 30개 중 정상 자료가 24개 이상인 구간만 평균에 포함하도록 설정한 데모입니다. 실제 법정 유효자료 기준은 아닙니다.",
      ],
      [
        "예측 입력",
        "결측이나 교정 구간은 0으로 대체하지 않습니다. 현재 중단·통신 지연과 미래 중단 예측을 구분해 점검합니다.",
      ],
    ],
  },
  broadcast: {
    tabs: ["방송 전후 현황", "노출·대조군 설계", "해석 검토함"],
    role: "방송·관광 분석 담당",
    unit: "노출 장소 × 상대 주차",
    version: "exposure-panel v2.1",
    lineage: [
      "첫 방송·재방송 이력",
      "장소별 방문 패널",
      "대조 장소 매칭",
      "비교 구간 검토",
    ],
    methods: [
      [
        "시점 정렬",
        "첫 노출을 0주로 맞추고 재방송, 클립 게시, 인근 행사를 별도 기록합니다. 같은 장소의 반복 노출을 독립 사례로 중복 집계하지 않습니다.",
      ],
      [
        "비교 방식",
        "직전 8주, 이후 8주와 전년 같은 구간을 함께 확인합니다. 예시 대조군과의 변화 차이는 수준 차이로 계산한 기술 통계입니다.",
      ],
      [
        "해석 조건",
        "노출 전 추이, 주변 행사, 비교 장소의 동시 노출을 점검해야 합니다. 아래 차이를 인과효과로 확정하지 않습니다.",
      ],
    ],
  },
  care: {
    tabs: ["수요·공급 현황", "서비스 배분 검토", "연계 검토함"],
    role: "돌봄 자원 조정 담당",
    unit: "생활권 × 서비스 유형",
    version: "care-allocation v1.2",
    lineage: [
      "미연계 수요 집계",
      "서비스별 가용 정원",
      "시간·이동 조건",
      "연계 검토",
    ],
    methods: [
      [
        "가용 자원",
        "정원과 현재 연계 인원의 차이를 서비스별로 나눕니다. 이용자 수 단위의 예시이며 제공 시간 단위 자료와 혼합하지 않습니다.",
      ],
      [
        "배분 규칙",
        "동일 서비스·생활권 안에서 이동·시간 조건을 만족하는 가용 인원과 미연계 인원 중 작은 값을 배분 후보로 계산합니다.",
      ],
      [
        "남은 공백",
        "계산 후 남는 수요와 조건 때문에 사용하지 못하는 정원을 함께 표시합니다. 개인별 지원 자격이나 최종 배정을 결정하는 화면은 아닙니다.",
      ],
    ],
  },
  mobility: {
    tabs: ["이동 현황", "통행 연결·정합성", "노선 검토함"],
    role: "교통·이동 분석 담당",
    unit: "출발권 × 도착권 × 일 유형",
    version: "od-reconcile v2.0",
    lineage: ["승하차 이벤트", "통행 연결", "일 유형별 OD", "거점 이동 검토"],
    methods: [
      [
        "분석 단위",
        "환승 전후 이벤트와 사람 단위 통행은 서로 다른 단위입니다. 이 예시는 최종 목적지 OD를 통행 건수로 집계합니다.",
      ],
      [
        "집계 정합성",
        "전체 OD 합계, 목적지별 유입 합계, 시간대별 통행 합계를 같은 모집단으로 맞춥니다. 대각선 내부 통행은 예시에서 제외합니다.",
      ],
      [
        "연결 검토",
        "미연결·중복 이벤트는 별도 점검 대상으로 남깁니다. 시간대 이동과 노선별 수송 능력은 추가 자료로 대조해야 합니다.",
      ],
    ],
  },
  wildlife: {
    tabs: ["예찰 현황", "점검·검체 추적", "예찰 작업함"],
    role: "환경 예찰 담당",
    unit: "예찰 구역 × 점검 차수",
    version: "surveillance v1.6",
    lineage: [
      "신고 위치 정리",
      "예찰 구역 결합",
      "현장 점검·검체",
      "추적 상태 확인",
    ],
    methods: [
      [
        "우선순위",
        "위험 점수와 최근 점검 여부를 함께 확인합니다. 신고 건수는 중복 접수·접근성의 영향을 받으므로 위험률로 해석하지 않습니다.",
      ],
      [
        "검체 추적",
        "구역 ID, 채취 기록, 인계 시각, 접수 상태를 연결합니다. 미접수와 음성 결과를 구분합니다.",
      ],
      [
        "상태 분리",
        "현장 점검 완료와 검체 분석 완료는 다른 단계입니다. 결과가 없는 기록에 음성·양성을 채워 넣지 않습니다.",
      ],
    ],
  },
  voucher: {
    tabs: ["이용 현황", "정산·거주권 대조", "정산 검토함"],
    role: "지역 소비 분석 담당",
    unit: "가맹 업종 × 결제 월",
    version: "voucher-settle v1.9",
    lineage: ["승인·취소 거래", "정산일 대조", "거주권 매칭", "순결제 집계"],
    methods: [
      [
        "거래와 정산",
        "승인일, 취소일, 정산일을 별도로 보관합니다. 승인 금액과 실제 정산 금액의 차이를 매출 증감으로 해석하지 않습니다.",
      ],
      [
        "관내 비중",
        "거주권이 매칭된 거래 금액을 관내·관외·미매칭으로 나눕니다. 결제 장소와 이용자 거주지는 다른 정보입니다.",
      ],
      [
        "소비 변화",
        "가맹점당 결제액은 선택 기간에 거래가 발생한 점포를 분모로 사용합니다. 정책의 순증 소비를 뜻하지 않습니다.",
      ],
    ],
  },
  risk: {
    tabs: ["탐지 현황", "규칙·신호 대조", "대상 검토함"],
    role: "위험징후 검토 담당",
    unit: "대상 ID × 탐지 실행",
    version: "signal-review v3.2",
    lineage: ["이벤트 묶음", "비교군 기준 계산", "규칙별 신호", "담당자 확인"],
    methods: [
      [
        "비교 기준",
        "대상과 유사한 규모·기간의 비교군을 사용합니다. 소표본 구간은 보류하고 탐지 임계값과 모델 버전을 함께 기록합니다.",
      ],
      [
        "해석",
        "점수는 점검 순서에 사용합니다. 하나의 급증 신호나 관계 불일치가 위반 사실을 입증하지 않습니다.",
      ],
      [
        "피드백",
        "중복 탐지와 해소된 사유를 구분해 검토 결과를 남깁니다. 화면 내 완료 표시는 합성 기록의 검토 흐름만 보여줍니다.",
      ],
    ],
  },
  documents: {
    tabs: ["원문 대조", "추출·검증 이력", "보완 검토함"],
    role: "문서 검토 담당",
    unit: "문서 해시 × 페이지 × 필드",
    version: "document-extract v2.4",
    lineage: [
      "파일 해시·개정 확인",
      "페이지·문단 분할",
      "필드 추출",
      "원문 대조",
    ],
    methods: [
      [
        "근거 연결",
        "문서 ID와 개정 버전, 페이지, 문단을 함께 보관합니다. 같은 필드가 반복되면 첫 값만 고르는 대신 충돌 여부를 확인합니다.",
      ],
      [
        "값의 정규화",
        "원문의 날짜·단위·식별자를 보존하면서 검증용 값을 따로 만듭니다. 미기재 값은 원문에 없는 값으로 보완하지 않습니다.",
      ],
      [
        "검토 범위",
        "직접 작성한 예시 문서입니다. 필드의 원문 존재 여부와 형식 검증을 보여주며 실제 OCR 정확도나 모델 확률을 주장하지 않습니다.",
      ],
    ],
  },
  warehouse: {
    tabs: ["적재 현황", "파티션·품질 추적", "재처리 검토함"],
    role: "데이터 운영 담당",
    unit: "원천 × 논리 처리일 × 실행",
    version: "ingestion-contract v2.7",
    lineage: [
      "원천 스냅샷",
      "스키마·키 검증",
      "격리 레코드",
      "대상 파티션 적재",
    ],
    methods: [
      [
        "재현 범위",
        "실행 시각과 논리 처리일을 구분합니다. 재시도는 같은 입력 스냅샷과 파티션을 읽도록 구성합니다.",
      ],
      [
        "중복 방지",
        "원천 키와 처리일을 기준으로 재처리 범위를 제한합니다. 재실행 횟수와 관계없이 결과가 같도록 멱등성을 확인합니다.",
      ],
      [
        "검증 계약",
        "입력 = 적재 + 격리 관계를 검사하고 사유별 격리 수를 원천별 합계와 대조합니다. 완료 로그만으로 데이터 품질을 판정하지 않습니다.",
      ],
    ],
  },
  llm: {
    tabs: ["요청 현황", "트레이스 상세", "오류 검토함"],
    role: "AI 서비스 운영 담당",
    unit: "요청 trace × 실행 단계",
    version: "rag-observe v1.5",
    lineage: [
      "요청·배포 버전",
      "검색·재정렬",
      "첫 토큰·생성",
      "오류·응답 검토",
    ],
    methods: [
      [
        "지연 기준",
        "검색·재정렬·첫 토큰 대기·생성 단계를 나눕니다. 이 예시의 TTFT는 요청 시작부터 첫 토큰까지 앞 세 단계의 합입니다.",
      ],
      [
        "요청과 단계",
        "하나의 요청에 여러 실행 단계가 연결됩니다. 단계별 시간 합계와 요청 종료 시간을 대조하고 시간 초과의 남은 대기 시간을 별도 표시합니다.",
      ],
      [
        "품질과 사용량",
        "입출력 토큰, 프롬프트·검색 인덱스 버전과 근거 문서를 함께 기록합니다. 응답 속도만으로 정확성이나 검색 품질을 판단하지 않습니다.",
      ],
    ],
  },
};

function marketModel(state, rows) {
  const r = selected(rows, state),
    m = Number(state.period || 8) - 1;
  const audit = rows.map((x) => {
    const i = markets.findIndex((item) => item.id === x.id);
    const net = x.monthly[m],
      cancel = Math.round(net * (0.025 + i * 0.004)),
      shared = x.stores - 5 - (i % 3);
    return {
      id: x.id,
      name: x.name,
      net,
      cancel,
      gross: net + cancel,
      shared,
      stores: x.stores,
      matched: Math.round(x.stores * (0.84 + i * 0.01)),
      days: 26 - (i % 3),
    };
  });
  const a = audit.find((x) => x.id === r.id),
    series = r.monthly.slice(0, m + 1);
  return {
    title: `${r.name} · 월 마감 정합성`,
    kpis: [
      ["순매출", `${number(a.net)}만원`, "승인 − 취소"],
      ["동일점포", `${a.shared} / ${a.stores}`, "두 기간 모두 관측"],
      ["일평균 매출", `${number(a.net / a.days)}만원`, `${a.days}영업일 기준`],
      ["점포 연결률", percent(a.matched, a.stores), "대장과 거래 점포 연결"],
    ],
    chart: {
      title: "동일점포와 전체 점포의 변화",
      sub: "각 계열 1월 = 100 · 합성 동일점포 집계",
      labels: labels.slice(0, m + 1),
      series: [
        {
          name: "전체 점포",
          values: series.map((v) => round((v / series[0]) * 100)),
        },
        {
          name: "동일점포",
          values: series.map((v, i) => round((v / series[0]) * 100 - i * 0.8)),
          dashed: true,
        },
      ],
      unit: "지수",
    },
    columns: [
      "시장",
      "승인",
      "취소",
      "순매출",
      "동일점포",
      "점포 연결",
      "영업일",
    ],
    records: audit.map((x) => ({
      id: x.id,
      cells: [
        x.name,
        number(x.gross),
        number(x.cancel),
        number(x.net),
        `${x.shared}/${x.stores}`,
        percent(x.matched, x.stores),
        `${x.days}일`,
      ],
    })),
    tableTitle: "시장별 원장 대조",
    tableSub: "금액 만원 · 취소 차감 전후를 대조",
    facts: [
      ["선택 시장", r.id],
      ["집계 키", `market_id / 2026-${String(m + 1).padStart(2, "0")}`],
      ["월 마감", `다음 달 3일 06:00 KST`],
      [
        "표본 포착",
        `${a.matched}개 연결 · ${a.stores - a.matched}개 별도 확인`,
      ],
    ],
    tasks: audit.map((x, i) =>
      task(
        `market-${x.id}`,
        x.name,
        i % 2 ? "점포 구성 변화" : "월말 취소 반영",
        `${x.stores - x.shared}개 점포가 동일점포 비교에서 제외됩니다. 승인 ${number(x.gross)}만원에서 취소 ${number(x.cancel)}만원을 분리했습니다.`,
        i % 2
          ? "신규·폐업 이력과 기준일을 대조한 뒤 동일점포 비교를 확정합니다."
          : "익월 수신 취소의 원승인 키와 귀속 월을 대조합니다.",
        "상권 분석",
        [
          "원승인·취소 연결 확인",
          "점포 개폐업 기준일 확인",
          "동일점포 분모 확인",
        ],
      ),
    ),
    audit,
  };
}
function vacancyModel(state, rows) {
  const r = selected(rows, state),
    index = buildings.findIndex((item) => item.id === r.id),
    meters = index % 5 === 0 ? 2 : 1;
  const energy = labels.map((_, i) =>
    Math.max(
      0,
      Math.round(
        (r.utility * 2.1 + 38) * (i > 11 - r.empty ? 0.12 : 1) +
          Math.sin(i) * 8,
      ),
    ),
  );
  const water = labels.map((_, i) =>
    Math.max(
      0,
      Math.round(
        (r.utility * 0.13 + 3) * (i > 11 - r.empty ? 0.16 : 1) + Math.cos(i),
      ),
    ),
  );
  return {
    title: `${r.id} · 건물과 계량기 대조`,
    kpis: [
      [
        "연결 계량기",
        `${meters}개`,
        meters > 1 ? "공용 여부 확인" : "단일 연결 예시",
      ],
      ["미사용 추정", `${r.empty}개월`, "관측된 사용량 신호"],
      ["현장 상태", r.checked ? "확인 완료" : "조사 대기", "자료 판정과 별도"],
      ["예측 점수", r.score.toFixed(2), "확률이 아닌 우선순위"],
    ],
    chart: {
      title: "월별 전기 사용량",
      sub: "선택 건물 · 관측 0과 미수신을 구분",
      labels,
      series: [{ name: "전기 사용량", values: energy }],
      unit: "kWh",
    },
    columns: [
      "월",
      "전기 kWh",
      "상수도 ㎥",
      "수신 상태",
      "계량기 연결",
      "판정 메모",
    ],
    records: labels.map((month, i) => ({
      id: `${r.id}-${i}`,
      cells: [
        month,
        energy[i],
        water[i],
        i === 4 && index % 4 === 0 ? "지연 도착" : "수신 완료",
        meters > 1 ? "공용 연결 검토" : "1:1 연결",
        i > 11 - r.empty ? "저사용 지속" : "관측값 유지",
      ],
    })),
    tableTitle: "사용량과 자료 상태",
    tableSub: "예시 원자료 · 두 항목의 단위를 분리",
    facts: [
      ["건물 ID", r.id],
      ["계량기 ID", `ELEC-${101 + index}${meters > 1 ? " · 공용 후보" : ""}`],
      ["대장 기준일", "2026.08.01"],
      ["조사 단위", "건물 단위 · 세대별 확정 전"],
    ],
    tasks: rows
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((x, i) =>
        task(
          `vacancy-${x.id}`,
          `${x.id} · ${x.name}`,
          buildings.findIndex((item) => item.id === x.id) % 5 === 0
            ? "공용 계량기 확인"
            : "현장 사용 여부 확인",
          `미사용 추정 ${x.empty}개월, 경과 ${x.age}년, 사용 지수 ${x.utility}. ${x.checked ? "기존 조사 기록을 최신 자료와 다시 대조합니다." : "현장 확인 기록이 없습니다."}`,
          "계량기 계약·건물 말소·계절 사용을 대조하고 현장 조사 결과를 기록합니다.",
          "현장 조사",
          [
            "계량기·건물 연결 확인",
            "말소·계약 변경 확인",
            "출입·거주 흔적 조사 기록",
          ],
          x.score >= 0.7 ? "우선" : "확인",
        ),
      ),
  };
}
export function sensorWindows(r) {
  return r.temperature.slice(-12).map((temperature, i) => {
    const missing = r.status === "통신 지연" && i >= 10 ? 11 : 0,
      calibration = i === 4 ? 8 : 0,
      valid = 30 - missing - calibration;
    return {
      id: `${r.id}-${i}`,
      time: `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
      valid,
      missing,
      calibration,
      included: valid >= 24,
      temperature,
      oxygen: r.oxygen[i + 36],
      lag: missing ? 670 : 12 + i * 3,
    };
  });
}
function emissionModel(state, rows) {
  const r = selected(rows, state),
    windows = sensorWindows(r),
    valid = sum(windows.map((x) => x.valid));
  return {
    title: `${r.id} · 구간별 자료 유효성`,
    kpis: [
      ["정상 원자료", `${valid} / 360`, "최근 6시간 · 1분 자료"],
      [
        "집계 포함",
        `${windows.filter((x) => x.included).length} / 12`,
        "정상 24개 이상 · 데모 설정",
      ],
      [
        "교정 표시",
        `${sum(windows.map((x) => x.calibration))}개`,
        "평균 산정에서 분리",
      ],
      [
        "미수신",
        `${sum(windows.map((x) => x.missing))}개`,
        "0으로 대체하지 않음",
      ],
    ],
    chart: {
      title: "수신 지연",
      sub: "측정 시각과 수신 시각의 차이",
      labels: windows.map((x) => x.time),
      series: [{ name: "수신 지연", values: windows.map((x) => x.lag) }],
      unit: "초",
    },
    columns: [
      "구간 시작",
      "정상 / 30",
      "교정",
      "미수신",
      "온도 °C",
      "산소 %",
      "집계 상태",
    ],
    records: windows.map((x) => ({
      id: x.id,
      cells: [
        x.time,
        `${x.valid}/30`,
        x.calibration,
        x.missing,
        x.included ? x.temperature : "제외",
        x.included ? x.oxygen : "제외",
        x.included ? "포함" : "입력 보류",
      ],
    })),
    tableTitle: "30분 집계 대조",
    tableSub: "2026.08.31 · 각 행은 [시작, 시작+30분) 구간",
    facts: [
      ["설비·사업장", `${r.id} / ${r.site}`],
      ["측정 기준", "KST · 구간 끝 이전 기록"],
      ["수신 마감", "2026.08.31 14:00"],
      ["평균 포함 조건", "정상 24/30 이상 · 예시 규칙"],
    ],
    tasks: rows.map((x) =>
      task(
        `emission-${x.id}`,
        x.id,
        x.status === "통신 지연"
          ? "데이터 수신 지연"
          : x.status === "중단"
            ? "중단 기록 대조"
            : "교정 구간 인계",
        `${x.site} · ${x.status}. 최종 온도 ${x.temperature.at(-1)}°C, 산소 ${x.oxygen.at(-1)}%. 원시값·교정 플래그·운전 일지를 함께 대조합니다.`,
        "교정 시각과 원시 기록을 연결하고 누락 구간의 재수집 가능 여부를 인계합니다.",
        "설비 점검",
        ["측정·수신 시각 대조", "교정·운전 일지 확인", "집계 제외 구간 인계"],
        x.status === "가동" ? "확인" : "우선",
      ),
    ),
    windows,
  };
}
function broadcastModel(state, rows) {
  const r = selected(rows, state),
    controls = r.lastYear.map((v, i) => Math.round(v * (0.95 + i * 0.001))),
    before = mean(r.weekly.slice(0, 8)),
    after = mean(r.weekly.slice(8)),
    cb = mean(controls.slice(0, 8)),
    ca = mean(controls.slice(8));
  const weeks = Array.from({ length: 16 }, (_, i) =>
    i < 8 ? `-${8 - i}주` : `+${i - 7}주`,
  );
  return {
    title: `${r.name} · 첫 노출 기준 비교`,
    kpis: [
      ["노출 장소 변화", delta(after, before), "주평균 · 전후 8주"],
      ["대조 장소 변화", delta(ca, cb), "합성 비교 장소"],
      [
        "변화 차이",
        `${round(after - before - (ca - cb))}건/주`,
        "수준 차이 · 인과효과 아님",
      ],
      ["비교 구간", "8주 / 8주", "같은 길이로 구성"],
    ],
    chart: {
      title: "노출 전 추이와 이후 변화",
      sub: "전 8주 평균 = 100 · 첫 방송 시점 정렬",
      labels: weeks,
      series: [
        {
          name: "노출 장소",
          values: r.weekly.map((v) => round((v / before) * 100)),
        },
        {
          name: "대조 장소",
          values: controls.map((v) => round((v / cb) * 100)),
          dashed: true,
        },
      ],
      unit: "지수",
      eventAt: 8,
      eventLabel: "첫 방송",
    },
    columns: [
      "장소",
      "프로그램",
      "첫 노출",
      "재노출",
      "장소 매칭",
      "교란 요인",
    ],
    records: rows.map((x, i) => ({
      id: x.id,
      cells: [
        x.name,
        `프로그램 ${x.program ? "B" : "A"}`,
        "2026.07.05",
        `${spots.findIndex((item) => item.id === x.id) % 3}회`,
        spots.findIndex((item) => item.id === x.id) % 3 === 0
          ? "상호·좌표 재확인"
          : "주소·좌표 연결",
        spots.findIndex((item) => item.id === x.id) % 2
          ? "주말 행사 겹침"
          : "반복 노출 구간 확인",
      ],
    })),
    tableTitle: "장소·노출 이력",
    tableSub: "가상 방송 편성·장소 매칭 기록",
    facts: [
      ["노출 ID", `EXP-${r.id}`],
      ["패널 키", "place_id × relative_week"],
      ["재노출 처리", "별도 플래그 · 독립 사례 중복 제외"],
      ["대조 조건", "동일 장소 유형 · 사전 규모 대조"],
    ],
    tasks: rows.map((x, i) =>
      task(
        `broadcast-${x.id}`,
        x.name,
        spots.findIndex((item) => item.id === x.id) % 2
          ? "인근 행사 구간 겹침"
          : "대조 장소 동시 노출 점검",
        `프로그램 ${x.program ? "B" : "A"} 노출 후 방문 합계 ${number(sum(x.weekly.slice(8)))}건. 사전 추이·재노출·주말 행사 플래그를 검토해야 합니다.`,
        "노출 이력을 대조하고 비교 가능 구간을 확정한 뒤 해석 문구에 조건을 남깁니다.",
        "효과 분석",
        [
          "첫 노출·재노출 시점 확인",
          "대조 장소 사전 추이 확인",
          "행사·계절 요인 검토",
        ],
      ),
    ),
  };
}
export function careAllocation(r) {
  const need = apportioned(r.waiting, [4, 3, 2, 1]),
    capacity = apportioned(r.capacity - r.linked, [2, 4, 1, 3]);
  return ["일상생활 지원", "이동·외출 지원", "식사 지원", "안부 확인"].map(
    (name, i) => {
      const accessible = Math.max(
          0,
          capacity[i] - (i === 1 ? 3 : i === 3 ? 2 : 0),
        ),
        assigned = Math.min(need[i], accessible);
      return {
        name,
        need: need[i],
        capacity: capacity[i],
        accessible,
        assigned,
        residual: need[i] - assigned,
        unused: capacity[i] - assigned,
      };
    },
  );
}
function careModel(state, rows) {
  const r = selected(rows, state),
    allocation = careAllocation(r),
    assigned = sum(allocation.map((x) => x.assigned));
  return {
    title: `${r.name} · 서비스 유형별 배분 검토`,
    kpis: [
      ["미연계", `${r.waiting}명`, "서비스 유형별 합계"],
      ["가용 정원", `${r.capacity - r.linked}명`, "정원 − 현재 연계"],
      ["배분 후보", `${assigned}명`, "같은 유형·접근 조건 충족"],
      ["남는 수요", `${r.waiting - assigned}명`, "추가 자원 필요"],
    ],
    chart: {
      title: "유형별 수요와 배분 후보",
      sub: "다른 서비스의 빈 정원은 자동 전용하지 않음",
      labels: allocation.map((x) => x.name),
      series: [
        { name: "미연계 수요", values: allocation.map((x) => x.need) },
        {
          name: "배분 후보",
          values: allocation.map((x) => x.assigned),
          dashed: true,
        },
      ],
      unit: "명",
    },
    columns: [
      "서비스",
      "미연계",
      "가용 정원",
      "조건 충족 정원",
      "배분 후보",
      "잔여 수요",
    ],
    records: allocation.map((x, i) => ({
      id: `${r.id}-${i}`,
      cells: [x.name, x.need, x.capacity, x.accessible, x.assigned, x.residual],
    })),
    tableTitle: "수요·공급의 불일치",
    tableSub: "생활권 내 우선 배분 · 이동·시간 제약을 반영한 예시",
    facts: [
      ["대상 생활권", r.name],
      ["산정 단위", "월간 이용자 수"],
      ["접근 제약", "이동·운영 시간 부적합 정원 제외"],
      [
        "미사용 정원",
        `${sum(allocation.map((x) => x.unused))}명분 · 다른 유형과 자동 상쇄하지 않음`,
      ],
    ],
    tasks: rows.flatMap((x) =>
      careAllocation(x)
        .filter((a) => a.residual > 0)
        .map((a, i) =>
          task(
            `care-${x.id}-${i}`,
            `${x.name} · ${a.name}`,
            "서비스 유형별 공급 부족",
            `미연계 ${a.need}명, 조건 충족 정원 ${a.accessible}명, 배분 후보 ${a.assigned}명, 남는 수요 ${a.residual}명.`,
            "운영 시간·이동 지원·인접 생활권 자원을 검토하고 추가 연계 가능 인원을 확인합니다.",
            "자원 조정",
            [
              "서비스 유형·필요 시간 확인",
              "제공 기관 실제 가용 정원 확인",
              "이동·접근 조건 확인",
            ],
            "우선",
          ),
        ),
    ),
    allocation,
  };
}
function mobilityModel(state) {
  const data = mobilityData(state.scope === "weekend"),
    routes = data.matrix
      .flatMap((row, i) =>
        row.map((value, j) => ({
          id: `OD-${i}-${j}`,
          from: destinations[i],
          to: destinations[j],
          value,
          i,
          j,
        })),
      )
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value),
    r = selected(routes, state);
  return {
    title: `${r.from} → ${r.to} · 통행 연결`,
    kpis: [
      ["전체 OD", `${number(data.total)}건`, "동일 권역 내부 이동 제외"],
      [
        "목적지 합계",
        `${number(sum(data.incoming.map((x) => x.value)))}건`,
        "OD 열 합계 대조",
      ],
      ["시간대 합계", `${number(sum(data.hourly))}건`, "동일 통행 모집단"],
      ["선택 연결 비중", percent(r.value, data.total), "선택 OD / 전체 OD"],
    ],
    chart: {
      title: "시간대별 통행 분포",
      sub: state.scope === "weekend" ? "주말 집계" : "평일 집계",
      labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
      series: [{ name: "통행", values: data.hourly }],
      unit: "건",
    },
    columns: ["출발권", "도착권", "통행", "전체 비중", "OD 키"],
    records: routes.slice(0, 12).map((x) => ({
      id: x.id,
      cells: [
        x.from,
        x.to,
        number(x.value),
        percent(x.value, data.total),
        x.id,
      ],
    })),
    tableTitle: "주요 OD 연결",
    tableSub: "상위 12개 · 출발·도착 방향 구분",
    facts: [
      ["집계 유형", state.scope === "weekend" ? "주말" : "평일"],
      ["공간 기준", "가상 거점 6개"],
      ["필터 전후", "같은 일 유형의 OD·시간대 집계"],
      ["분석 단위", "이벤트 수와 사람 수가 아닌 통행 건수"],
    ],
    tasks: routes
      .slice(0, 6)
      .map((x, i) =>
        task(
          `mobility-${x.id}`,
          `${x.from} → ${x.to}`,
          i % 2 ? "환승 연결 대조" : "집중 시간대 운행 검토",
          `통행 ${number(x.value)}건, 전체 ${percent(x.value, data.total)}. 같은 방향의 승하차 이벤트와 연결 규칙 적용 결과를 확인합니다.`,
          "미연결·중복 이벤트를 분리하고 시간대별 운행 간격과 환승 대기 자료를 대조합니다.",
          "교통 분석",
          [
            "출발·도착 방향 확인",
            "미연결·중복 이벤트 점검",
            "시간대·운행 간격 대조",
          ],
        ),
      ),
    data,
  };
}
function wildlifeModel(state, rows) {
  const r = selected(rows, state),
    records = rows.map((x) => ({
      id: x.id,
      name: x.name,
      collected: x.samples,
      received:
        x.samples -
        (surveillance.findIndex((item) => item.id === x.id) % 4 === 0 ? 1 : 0),
      checked: x.checked,
      last: `08.${String(18 + (surveillance.findIndex((item) => item.id === x.id) % 10)).padStart(2, "0")}`,
      distance: round(
        1.8 + surveillance.findIndex((item) => item.id === x.id) * 0.27,
      ),
    }));
  return {
    title: `${r.name} · 점검과 검체 인계`,
    kpis: [
      [
        "채취 검체",
        `${sum(records.map((x) => x.collected))}건`,
        "선택 구역 합계",
      ],
      [
        "접수 검체",
        `${sum(records.map((x) => x.received))}건`,
        "접수 기록 연결",
      ],
      [
        "인계 확인",
        `${sum(records.map((x) => x.collected - x.received))}건`,
        "채취 − 접수",
      ],
      [
        "미점검 구역",
        `${rows.filter((x) => !x.checked).length}곳`,
        "현장 점검 단계",
      ],
    ],
    chart: {
      title: "구역별 신고와 검체 수",
      sub: "신고 건수와 검체 수는 다른 관측 단위",
      labels: rows.slice(0, 8).map((x) => x.id),
      series: [
        { name: "신고", values: rows.slice(0, 8).map((x) => x.reports) },
        {
          name: "검체",
          values: rows.slice(0, 8).map((x) => x.samples),
          dashed: true,
        },
      ],
      unit: "건",
    },
    columns: ["구역", "채취", "접수", "인계 대기", "최근 기록", "현장 상태"],
    records: records.map((x) => ({
      id: x.id,
      cells: [
        x.name,
        x.collected,
        x.received,
        x.collected - x.received,
        x.last,
        x.checked ? "점검 완료" : "미점검",
      ],
    })),
    tableTitle: "검체 인계 원장",
    tableSub: "채취 건과 접수 건 연결 · 검사 결과와 별도",
    facts: [
      ["구역 키", r.id],
      ["점검 차수", "2026-08 / 2차"],
      ["결과 처리", "미접수를 음성으로 간주하지 않음"],
      ["우선순위 점수", `${r.risk} / 100 · 가상 위험 신호`],
    ],
    tasks: records.map((x, i) =>
      task(
        `wildlife-${x.id}`,
        x.name,
        x.collected > x.received
          ? "검체 접수 미연결"
          : x.checked
            ? "점검 기록 대조"
            : "현장 방문 대기",
        `채취 ${x.collected}건, 접수 ${x.received}건. 최근 기록 ${x.last}, 현장 ${x.checked ? "점검 완료" : "미점검"}.`,
        "채취 ID와 인계·접수 시각을 대조하고 점검 상태와 검사 진행 상태를 각각 기록합니다.",
        "예찰 운영",
        [
          "채취 ID·구역 일치 확인",
          "인계·접수 시각 확인",
          "현장 점검·분석 상태 분리",
        ],
        x.collected > x.received ? "우선" : "확인",
      ),
    ),
  };
}
function voucherModel(state, rows) {
  const audit = rows.map((x) => {
      const i = merchants.findIndex((item) => item.id === x.id);
      const cancel = Math.round(x.amount * (0.018 + i * 0.002)),
        local = Math.round((x.amount * x.local) / 100),
        unknown = Math.round(x.amount * 0.035);
      return {
        ...x,
        cancel,
        gross: x.amount + cancel,
        localAmount: local,
        outside: x.amount - local - unknown,
        unknown,
        pending: Math.round(x.amount * 0.06),
      };
    }),
    r = selected(audit, state);
  return {
    title: `${r.name} · 순결제와 정산 대조`,
    kpis: [
      ["순결제", `${number(r.amount)}만원`, "승인 − 취소"],
      ["정산 완료", `${number(r.amount - r.pending)}만원`, "기준일 입금 확인"],
      ["미정산", `${number(r.pending)}만원`, "귀속 월과 정산일 분리"],
      ["거주권 미매칭", `${number(r.unknown)}만원`, "관내·관외와 별도"],
    ],
    chart: {
      title: "업종별 순결제와 미정산",
      sub: "금액 만원 · 미정산은 순결제에 포함",
      labels: audit.map((x) => x.name),
      series: [
        { name: "순결제", values: audit.map((x) => x.amount) },
        { name: "미정산", values: audit.map((x) => x.pending), dashed: true },
      ],
      unit: "만원",
    },
    columns: ["업종", "승인", "취소", "순결제", "관내", "관외", "미매칭"],
    records: audit.map((x) => ({
      id: x.id,
      cells: [
        x.name,
        number(x.gross),
        number(x.cancel),
        number(x.amount),
        number(x.localAmount),
        number(x.outside),
        number(x.unknown),
      ],
    })),
    tableTitle: "승인·취소와 거주권 대조",
    tableSub: "만원 · 관내 + 관외 + 미매칭 = 순결제",
    facts: [
      ["정산 마감", "2026.09.03 06:00"],
      ["원승인 연결", "approval_id / cancel_original_id"],
      ["거주권 기준", "합성 매칭 스냅샷 2026.08"],
      ["거래 가맹점", `${r.stores}곳 · 거래 발생 점포`],
    ],
    tasks: audit.map((x) =>
      task(
        `voucher-${x.id}`,
        x.name,
        "정산일·거주권 대조",
        `미정산 ${number(x.pending)}만원과 거주권 미매칭 ${number(x.unknown)}만원을 별도로 보관합니다.`,
        "원승인 키, 정산 일자와 거주권 매칭 실패 사유를 확인해 월 마감 조정 목록을 남깁니다.",
        "소비 분석",
        [
          "승인·취소 연결 대조",
          "귀속 월·정산일 확인",
          "거주권 미매칭 분모 확인",
        ],
      ),
    ),
    audit,
  };
}
function riskModel(state, rows) {
  const r = selected(rows, state),
    history = Array.from({ length: 8 }, (_, i) =>
      Math.round(r.count * (0.52 + i * 0.04) + (i === 7 ? r.count * 0.6 : 0)),
    ),
    baseline = history.map((_, i) => round(r.count * (0.52 + i * 0.025)));
  const rules = [
    [
      "반복 주기 변화",
      `${r.count}건`,
      `${Math.max(3, r.count - 5)}건`,
      r.reason === "반복 패턴 변화" ? "주 신호" : "보조 검토",
    ],
    [
      "기간 대비 급증",
      `${history.at(-1)}건`,
      `${baseline.at(-1)}건`,
      r.reason === "기준 대비 급증" ? "주 신호" : "보조 검토",
    ],
    [
      "관계 키 일치",
      "3개 속성",
      "동일 기준일",
      r.reason === "관계 정보 불일치" ? "불일치 검토" : "대조 필요",
    ],
    [
      "희소 조합",
      "범주 조합",
      "유사 규모 비교군",
      r.reason === "드문 조합 발생" ? "주 신호" : "보조 검토",
    ],
  ];
  return {
    title: `${r.id} · 규칙별 근거`,
    kpis: [
      ["탐지 점수", r.score.toFixed(2), "검토 순위용"],
      ["연관 기록", `${r.count}건`, "현재 탐지 묶음"],
      ["주 신호", r.reason, "단일 사유로 확정하지 않음"],
      ["기준 버전", "3.2", "재현 시 함께 보관"],
    ],
    chart: {
      title: "대상 변화와 비교 기준",
      sub: "합성 8주 기록 · 같은 기간·규모 기준",
      labels: Array.from({ length: 8 }, (_, i) => `${i + 1}주`),
      series: [
        { name: "대상", values: history },
        { name: "비교 기준", values: baseline, dashed: true },
      ],
      unit: "건",
    },
    columns: ["규칙", "관측값", "비교 기준", "검토 상태"],
    records: rules.map((cells, i) => ({ id: `${r.id}-${i}`, cells })),
    tableTitle: "탐지 신호 분해",
    tableSub: "점수와 원인 규칙을 분리해 확인",
    facts: [
      ["실행 ID", `RUN-0831-${r.id}`],
      ["관측 종료", "2026.08.31"],
      ["비교군", "같은 규모·권역의 합성 대상"],
      ["최종 판단", "담당자 검토 전"],
    ],
    tasks: rows.map((x) =>
      task(
        `risk-${x.id}`,
        x.id,
        x.reason,
        `탐지 점수 ${x.score.toFixed(2)}, 연관 기록 ${x.count}건. 같은 대상의 중복 탐지와 비교군 구성을 확인해야 합니다.`,
        "원기록·비교 기준을 확인하고 중복·설명 가능·추가 확인 중 하나로 검토 결과를 남깁니다.",
        "대상 검토",
        [
          "원기록·탐지 기간 확인",
          "비교군·소표본 조건 확인",
          "중복·기존 해소 사유 확인",
        ],
        x.score >= 0.9 ? "우선" : "확인",
      ),
    ),
  };
}
function documentsModel(state) {
  const r = selected(documents, state),
    fields = r.fields.map(([name, value], i) => ({
      id: `${r.id}-${i}`,
      name,
      value,
      found: r.excerpt.includes(value),
      page: r.page,
      paragraph: 2 + (i % 2),
    }));
  return {
    title: `${r.name} · 필드 검증 이력`,
    kpis: [
      ["추출 필드", `${fields.length}개`, "필드 스키마 v2.4"],
      [
        "정확 문자열 대조",
        `${fields.filter((x) => x.found).length}개`,
        "원문에서 동일 문자열 확인",
      ],
      [
        "정규화 검토",
        `${fields.filter((x) => !x.found).length}개`,
        "날짜·표현 차이 포함",
      ],
      ["근거 위치", `p.${r.page}`, "문서 버전과 함께 연결"],
    ],
    columns: ["필드", "추출값", "근거 페이지", "원문 대조", "검토 항목"],
    records: fields.map((x) => ({
      id: x.id,
      cells: [
        x.name,
        x.value,
        `p.${x.page}`,
        x.found ? "동일 문자열" : "정규화 필요",
        x.found ? "형식·단위 확인" : "날짜·범위·문장 대조",
      ],
    })),
    tableTitle: "필드 단위 검증",
    tableSub: "문자열 포함 여부를 계산 · 모델 신뢰도와 구분",
    facts: [
      ["문서 ID", r.id],
      ["원본 버전", "rev.01 · 합성 원문"],
      ["청크 키", `${r.id}:p${r.page}:b02`],
      ["필수 항목 처리", "미기재는 값 생성 없이 보완 대상으로 유지"],
    ],
    excerpt: r.excerpt,
    tasks: documents.flatMap((d) =>
      d.fields.map(([name, value], i) =>
        task(
          `documents-${d.id}-${i}`,
          `${d.id} · ${name}`,
          d.excerpt.includes(value) ? "원문·형식 대조" : "표현·정규화 대조",
          `추출값 “${value}” · ${d.name} p.${d.page}. ${d.excerpt.includes(value) ? "원문에서 동일 문자열이 확인됩니다." : "추출값과 원문의 표현이 달라 정규화 과정을 확인해야 합니다."}`,
          "페이지·문단에서 근거를 확인하고 날짜·단위·누락 여부를 대조합니다.",
          "문서 검토",
          [
            "문서 버전·페이지 확인",
            "원문 값·정규화 값 대조",
            "누락·충돌 필드 확인",
          ],
        ),
      ),
    ),
  };
}
export function qualityBreakdown(rows) {
  return rows.flatMap((r) =>
    r.rejected
      ? r.id === "SRC-03"
        ? [{ source: r.id, reason: "좌표 형식", count: r.rejected }]
        : [
            {
              source: r.id,
              reason: "중복 키",
              count: Math.round(r.rejected * 0.65),
            },
            {
              source: r.id,
              reason: "측정값 결측",
              count: r.rejected - Math.round(r.rejected * 0.65),
            },
          ]
      : [],
  );
}
function warehouseModel(state, rows) {
  const reasons = qualityBreakdown(rows),
    r = selected(rows, state),
    rejected = sum(rows.map((x) => x.rejected));
  return {
    title: `${r.name} · 파티션과 품질 계약`,
    kpis: [
      ["입력", number(sum(rows.map((x) => x.input))), "원천 스냅샷"],
      ["적재", number(sum(rows.map((x) => x.loaded))), "검증 통과"],
      ["격리", number(rejected), "사유별 합계와 대조"],
      ["사유 합계", number(sum(reasons.map((x) => x.count))), "선택 원천 범위"],
    ],
    columns: [
      "원천",
      "논리 처리일",
      "시도",
      "입력",
      "적재",
      "격리",
      "계약 버전",
    ],
    records: rows.map((x) => ({
      id: x.id,
      cells: [
        x.name,
        "2026-08-30",
        x.rejected ? "2/3" : "1/3",
        number(x.input),
        number(x.loaded),
        number(x.rejected),
        "schema.v2.7",
      ],
    })),
    tableTitle: "실행과 논리 처리일",
    tableSub: "실행일 2026.08.31 · 처리일과 구분",
    facts: [
      ["선택 파티션", `${r.id}/date=2026-08-30`],
      ["적재 키", "source_id + natural_key + data_date"],
      ["쓰기 방식", "대상 파티션 키 기준 UPSERT"],
      ["재처리 범위", "격리 키만 재검증 · 원장 보존"],
    ],
    breakdown: reasons,
    tasks: rows
      .filter((x) => x.rejected)
      .map((x) =>
        task(
          `warehouse-${x.id}`,
          `${x.id} · ${x.name}`,
          "격리 레코드 재처리",
          `입력 ${number(x.input)}건 = 적재 ${number(x.loaded)}건 + 격리 ${number(x.rejected)}건. 같은 스냅샷과 논리 처리일을 유지합니다.`,
          "격리 원인을 수정한 뒤 대상 키만 재검증하고 중복 생성 여부와 합계를 대조합니다.",
          "데이터 운영",
          [
            "원천 스냅샷·처리일 고정",
            "격리 사유·수정 키 확인",
            "재실행 중복·합계 검증",
          ],
          "우선",
        ),
      ),
    reasons,
  };
}
export function traceDetail(r) {
  const names = ["검색", "재정렬", "첫 토큰 대기", "생성"],
    parts = r.parts.map((duration, i) => ({ name: names[i], duration })),
    accounted = sum(r.parts);
  if (r.duration > accounted)
    parts.push({
      name: r.error ? "시간 초과 대기" : "기타 처리",
      duration: r.duration - accounted,
    });
  let offset = 0;
  const spans = parts.map((p) => {
    const s = { ...p, start: offset };
    offset += p.duration;
    return s;
  });
  const input = Math.round(r.tokens * 0.76),
    output = r.tokens - input;
  return {
    spans,
    input,
    output,
    ttft: sum(r.parts.slice(0, 3)),
    total: r.duration,
  };
}
function llmModel(state, rows) {
  const r = selected(rows, state),
    detail = traceDetail(r),
    sample = rows.slice(0, 8);
  return {
    title: `${r.id} · 요청 실행 경로`,
    kpis: [
      ["전체 시간", `${number(r.duration)}ms`, "요청 시작 → 종료"],
      [
        "TTFT",
        r.error ? "응답 미완료" : `${number(detail.ttft)}ms`,
        "검색 + 재정렬 + 첫 토큰 대기",
      ],
      [
        "입력 / 출력",
        `${number(detail.input)} / ${number(detail.output)}`,
        "토큰 · 합성 분해",
      ],
      [
        "종료 상태",
        r.error ? "시간 초과" : "정상",
        "단계 시간과 종료 시각 대조",
      ],
    ],
    columns: [
      "요청",
      "환경",
      "프롬프트",
      "검색 인덱스",
      "시간 ms",
      "토큰",
      "상태",
    ],
    records: sample.map((x) => ({
      id: x.id,
      cells: [
        x.id,
        "검증 환경",
        `rag-v${x.route + 1}.4`,
        "docs-20260830",
        number(x.duration),
        number(x.tokens),
        x.error ? "시간 초과" : "정상",
      ],
    })),
    tableTitle: "요청·배포 버전 연결",
    tableSub: "서로 다른 실행 버전의 지표를 구분",
    facts: [
      ["trace_id", r.id],
      [
        "session_id",
        `session_${Math.floor(Number(r.id.replace(/\D/g, "")) / 4)}`,
      ],
      ["검색 조건", "가상 청크 top-8 → 재정렬 top-3"],
      ["프롬프트 버전", `rag-v${r.route + 1}.4`],
    ],
    spans: detail.spans,
    tasks: rows
      .filter((x) => x.error || x.duration > 2400)
      .slice(0, 12)
      .map((x) =>
        task(
          `llm-${x.id}`,
          x.id,
          x.error ? "시간 초과 요청" : "지연 요청 검토",
          `전체 ${number(x.duration)}ms, 토큰 ${number(x.tokens)}, prompt rag-v${x.route + 1}.4. 검색·재정렬·첫 토큰·생성 구간을 나눠 확인합니다.`,
          "검색 후보·근거 문서·배포 버전을 대조하고 병목 단계와 재현 조건을 남깁니다.",
          "AI 운영",
          [
            "요청·프롬프트 버전 확인",
            "단계 시간·종료 상태 대조",
            "검색 근거·오류 사유 확인",
          ],
          x.error ? "우선" : "확인",
        ),
      ),
    trace: detail,
  };
}
const builders = {
  market: marketModel,
  vacancy: vacancyModel,
  emission: emissionModel,
  broadcast: broadcastModel,
  care: careModel,
  mobility: mobilityModel,
  wildlife: wildlifeModel,
  voucher: voucherModel,
  risk: riskModel,
  documents: documentsModel,
  warehouse: warehouseModel,
  llm: llmModel,
};
export function operationalDetail(id, state, rows) {
  const model = builders[id](state, rows);
  return {
    ...model,
    workflow: WORKFLOWS[id],
    tasks: model.tasks.map((t, i) => ({
      ...t,
      due: ["이번 점검", "다음 점검", "정기 검토"][
        [...t.key].reduce((a, c) => a + c.charCodeAt(0), 0) % 3
      ],
    })),
  };
}
