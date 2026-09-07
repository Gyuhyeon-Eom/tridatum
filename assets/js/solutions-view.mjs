import {
  DEFINITIONS,
  mobilityData,
  filtered,
  markets,
  buildings,
  stacks,
  spots,
  districts,
  destinations,
  od,
  surveillance,
  merchants,
  flags,
  documents,
  sources,
  mean,
  sum,
  monitorData,
} from "./solutions-data.mjs?v=20260907t2";
import {
  lineFigure,
  histogramFigure,
  heatFigure,
  esc,
  COLORS,
} from "./analytics-charts.mjs?v=20260907t2";
import { WORDMARK } from "./brand.mjs?v=20260907t2";
const n = (v) => Math.round(v).toLocaleString("ko-KR"),
  pct = (v) => `${v.toFixed(1)}%`,
  change = (a, b) => `${a >= b ? "+" : ""}${((a / b - 1) * 100).toFixed(1)}%`;
const metric = (label, value, sub) =>
  `<div class="ops-metric"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;
const panel = (title, sub, body, extra = "") =>
  `<section class="a-panel ops-panel ${extra}"><header class="ops-panel-head"><h4>${title}</h4><span>${sub}</span></header>${body}</section>`;
const status = (text, level = "") =>
  `<span class="ops-status ${level}"><i></i>${text}</span>`;
const select = (key, label, options, value) =>
  `<label class="ops-control"><span>${label}</span><select data-ops-filter="${key}" aria-label="${label}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value ?? "all") === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
const pick = (r, state, source) =>
  source.find((r) => r.id === state.selected) || r;
function table(heads, rows, caption) {
  return `<div class="ops-table-scroll" tabindex="0" role="region" aria-label="${caption}"><table class="ops-table"><caption class="a-sr">${caption}</caption><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => (i ? `<td>${v}</td>` : `<th scope="row">${v}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const record = (r, label, state) =>
  `<button class="ops-record ${r.id === state.selected ? "selected" : ""}" data-ops-record="${r.id}" aria-pressed="${r.id === state.selected}">${label || r.id}<span aria-hidden="true">↗</span></button>`;
function bars(rows, unit = "") {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="ops-bars">${rows.map((r, i) => `<div><span>${r.name}</span><div><i style="width:${(r.value / max) * 100}%;--bar:${COLORS[i % 3]}"></i></div><b>${n(r.value)}${unit}</b></div>`).join("")}</div>`;
}
function cityMap(
  rows,
  selected,
  { mode = "points", value = (r) => r.score ?? r.risk / 100 ?? 0.5 } = {},
) {
  let blocks = "";
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 8; col++)
      blocks += `<rect x="${24 + col * 67}" y="${28 + row * 51}" width="${44 + (col % 3) * 3}" height="${31 + (row % 2) * 5}" rx="3" fill="${["var(--map-block)", "var(--map-block)", "var(--map-water)"][(row + col) % 3]}"/>`;
  const paths = `<path d="M609 -20C521 110 657 169 562 390" stroke="var(--map-water)" stroke-width="65" fill="none"/><path d="M0 181H640M273 0V360" stroke="var(--map-road)" stroke-width="16"/><path d="M0 181H640M273 0V360" stroke="var(--map-block)" stroke-width="1" stroke-dasharray="4 7"/><path d="M40 348C170 269 377 285 567 61" fill="none" stroke="var(--map-road)" stroke-width="11"/>`;
  const marks = rows
    .map((r, i) => {
      const active = r.id === selected;
      const v = Math.max(0.1, Math.min(1, value(r) || 0.5));
      const radius =
        mode === "capacity" ? 14 + v * 17 : mode === "areas" ? 29 : 7;
      return `<g class="ops-map-point ${active ? "selected" : ""}" data-ops-record="${r.id}" role="button" tabindex="0" aria-label="${esc(r.name || r.id)} 상세 보기" aria-pressed="${active}"><circle cx="${r.x}" cy="${r.y}" r="${radius + 5}" fill="var(--map-road)" opacity="${active ? 1 : 0.5}"/><circle cx="${r.x}" cy="${r.y}" r="${radius}" fill="${v > 0.7 ? COLORS[0] : v > 0.4 ? COLORS[2] : COLORS[1]}" stroke="${active ? "var(--map-selection)" : "var(--map-road)"}" stroke-width="${active ? 3 : 1.5}"/>${mode !== "points" ? `<text x="${r.x}" y="${r.y + 4}" text-anchor="middle" fill="${v > 0.4 ? "var(--map-number-high)" : "var(--map-number-low)"}" font-size="13">${i + 1}</text>` : ""}${active ? `<g><rect x="${Math.min(r.x + 15, 450)}" y="${r.y - 30}" width="124" height="25" rx="4" fill="var(--map-selection)"/><text x="${Math.min(r.x + 23, 458)}" y="${r.y - 13}" fill="var(--map-on-selection)" font-size="12">${esc(r.name || r.id)}</text></g>` : ""}</g>`;
    })
    .join("");
  return `<div class="ops-map"><svg viewBox="0 0 640 360" role="group" aria-label="가상 생활권의 ${mode === "points" ? "조사 대상" : "분석 구역"} 배치"><rect width="640" height="360" fill="var(--map-bg)"/>${blocks}${paths}<text x="23" y="18" fill="var(--map-ink)" font-size="12">가상 생활권</text><text x="600" y="38" fill="var(--map-ink)" font-size="12">N ↑</text>${marks}<text x="18" y="345" fill="var(--map-ink)" font-size="12">공간 배치 예시 · 지점을 선택해 상세 확인</text></svg></div>`;
}
function trend(labels, series, unit = "", options = {}) {
  const vals = series.flatMap((r) => r.values);
  return lineFigure({
    labels,
    series,
    min: options.min ?? 0,
    max: options.max ?? Math.ceil((Math.max(...vals) * 1.12) / 10) * 10,
    unit,
    ...options,
  });
}
const monthLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
  weeks = Array.from({ length: 16 }, (_, i) =>
    i < 8 ? `−${8 - i}주` : `+${i - 7}주`,
  );
function marketView(state) {
  const rows = filtered("market", state),
    m = Number(state.period || 8) - 1,
    selected = pick(rows[0], state, rows),
    total = sum(rows.map((r) => r.monthly[m])),
    previous = sum(rows.map((r) => r.monthly[m - 1]));
  return {
    filters:
      select(
        "scope",
        "거래 유형",
        [
          ["all", "전체"],
          ["도매", "도매 중심"],
          ["소매", "소매 중심"],
        ],
        state.scope,
      ) +
      select(
        "period",
        "기준 월",
        [
          [8, "2026년 8월"],
          [6, "2026년 6월"],
        ],
        m + 1,
      ),
    metrics: [
      metric(
        "추정 카드매출",
        `${(total / 10000).toFixed(2)}억 원`,
        `${monthLabels[m]} · 전월 ${change(total, previous)}`,
      ),
      metric(
        "분석 점포",
        `${n(sum(rows.map((r) => r.stores)))}개`,
        `${rows.length}개 시장`,
      ),
      metric(
        "월 방문 추정",
        `${n(sum(rows.map((r) => Math.round((r.visits * r.monthly[m]) / r.monthly[7]))))}명`,
        "동일 생활권 집계",
      ),
      metric(
        "주말 매출 비중",
        pct(sum(rows.map((r) => r.monthly[m] * r.weekend)) / total),
        "토·일 거래 기준",
      ),
    ],
    body: `<div class="ops-grid wide-left">${panel("시장별 거래 흐름", "카드매출 · 억원", trend(monthLabels.slice(0, m + 1), [{ name: "전체 매출", values: Array.from({ length: m + 1 }, (_, j) => sum(rows.map((r) => r.monthly[j])) / 10000) }], "억원"))}${panel("시장별 매출 구성", `${monthLabels[m]} · 만원`, bars(rows.map((r) => ({ name: r.name, value: r.monthly[m] }))))}</div><div class="ops-grid wide-left">${panel("상권 공간 분포", "시장을 선택해 비교", cityMap(rows, selected.id, { mode: "areas", value: (r) => r.monthly[m] / Math.max(...rows.map((x) => x.monthly[m])) }))}${panel(selected.name, `${selected.type} 중심`, `<div class="ops-detail-values">${metric("점포 수", `${selected.stores}개`, "분석 대상")}${metric("방문 추정", `${n((selected.visits * selected.monthly[m]) / selected.monthly[7])}명`, "월 단위")}</div><div class="ops-insight"><span>거래 패턴</span><p>${selected.weekend < 30 ? "평일 거래 비중이 높습니다. 도매 거래 시간대와 물류 동선을 먼저 검토합니다." : "주말 수요가 집중됩니다. 방문 시간대별 운영과 인근 목적지 연계를 검토합니다."}</p></div>`)}</div>${panel(
      "시장별 비교",
      "행을 선택해 상세 보기",
      table(
        ["시장", "거래 유형", "점포", "카드매출", "주말 비중"],
        rows.map((r) => [
          record(r, r.name, state),
          r.type,
          n(r.stores),
          `${n(r.monthly[m])}만원`,
          `${r.weekend}%`,
        ]),
        "시장별 매출 비교",
      ),
    )}`,
    note: "합성 카드매출·방문 집계 · 매출은 표본 기반 추정값을 표현한 예시입니다.",
    rows,
  };
}
function vacancyView(state) {
  const rows = filtered("vacancy", state),
    ordered = [...rows].sort((a, b) => b.score - a.score),
    r = pick(ordered[0], state, rows),
    high = rows.filter((r) => r.score >= 0.7);
  return {
    filters: select(
      "scope",
      "조사 권역",
      [
        ["all", "전체 권역"],
        [0, "해솔권"],
        [1, "서림권"],
        [2, "수변권"],
      ],
      state.scope,
    ),
    metrics: [
      metric("분석 건물", `${rows.length}동`, "주거용 건물"),
      metric("우선 조사 후보", `${high.length}동`, "예측 점수 0.70 이상"),
      metric(
        "현장 확인 완료",
        `${rows.filter((r) => r.checked).length}동`,
        "조사 기록 기준",
      ),
      metric(
        "미확인 후보",
        `${high.filter((r) => !r.checked).length}동`,
        "우선 조사 중 미확인",
      ),
    ],
    body: `<div class="ops-grid wide-left">${panel("조사 후보 위치", "색이 짙을수록 높은 예측 점수", cityMap(rows, r.id))}${panel(`${r.id} · ${r.name}`, status(r.checked ? "확인 완료" : "현장 확인 필요"), `<div class="ops-score"><span>빈집 예측 점수</span><strong>${r.score.toFixed(2)}</strong><div><i style="width:${r.score * 100}%"></i></div></div><dl class="ops-facts"><div><dt>건축 경과</dt><dd>${r.age}년</dd></div><div><dt>미사용 추정 기간</dt><dd>${r.empty}개월</dd></div><div><dt>에너지 사용 지수</dt><dd>${r.utility} / 100</dd></div></dl><p class="ops-note">사용량과 건물 특성을 함께 검토한 뒤 현장 조사로 확인합니다.</p>`)}</div>${panel(
      "현장 조사 우선순위",
      `${ordered.length}동 · 예측 점수순`,
      table(
        ["건물 ID", "권역", "예측 점수", "미사용 추정", "조사 상태"],
        ordered
          .slice(0, 8)
          .map((r) => [
            record(r, r.id, state),
            r.name,
            r.score.toFixed(2),
            `${r.empty}개월`,
            status(r.checked ? "확인 완료" : "조사 대기"),
          ]),
        "빈집 조사 후보",
      ),
    )}`,
    note: "가상 건물·사용량·모델 출력 예시 · 예측 점수만으로 빈집 여부를 확정하지 않습니다.",
    rows,
  };
}
function emissionView(state) {
  const rows = filtered("emission", state),
    r = pick(rows[0], state, rows),
    channel = state.channel || "temperature",
    values = r[channel],
    stopped = rows.filter((r) => r.status === "중단").length;
  return {
    filters:
      select(
        "scope",
        "사업장",
        [
          ["all", "전체 사업장"],
          ...["1사업장", "2사업장", "3사업장"].map((x) => [x, x]),
        ],
        state.scope,
      ) +
      select(
        "channel",
        "측정 항목",
        [
          ["temperature", "배가스 온도"],
          ["oxygen", "산소 농도"],
        ],
        channel,
      ),
    metrics: [
      metric("수집 설비", `${rows.length}기`, "30분 단위 기록"),
      metric(
        "가동 중",
        `${rows.filter((r) => r.status === "가동").length}기`,
        "최종 수집 상태",
      ),
      metric("가동 중단", `${stopped}기`, "확인된 상태"),
      metric(
        "수집 점검",
        `${rows.filter((r) => r.status === "통신 지연").length}기`,
        "통신 지연",
      ),
    ],
    body: `${panel("설비별 현재 상태", "기록 기준 2026.08.31 14:00", `<div class="ops-equipment">${rows.map((s) => `<button data-ops-record="${s.id}" class="${s.id === r.id ? "selected" : ""}"><b>${s.id}</b><span>${s.site}</span>${status(s.status, s.status === "가동" ? "" : "attention")}</button>`).join("")}</div>`)}<div class="ops-grid wide-left">${panel(
      `${r.id} · ${channel === "temperature" ? "배가스 온도" : "산소 농도"}`,
      "최근 24시간",
      trend(
        Array.from(
          { length: 48 },
          (_, i) =>
            `${String(Math.floor((i + 28) / 2) % 24).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
        ),
        [{ name: channel === "temperature" ? "온도" : "산소", values }],
        channel === "temperature" ? "°C" : "%",
      ),
    )}${panel("선택 설비 점검", r.site, `<dl class="ops-facts"><div><dt>설비 상태</dt><dd>${status(r.status)}</dd></div><div><dt>최종 온도</dt><dd>${r.temperature.at(-1)} °C</dd></div><div><dt>산소 농도</dt><dd>${r.oxygen.at(-1)} %</dd></div><div><dt>배출 유량</dt><dd>${n(r.flow)} ㎥/min</dd></div></dl><div class="ops-insight"><span>점검 항목</span><p>${r.status === "통신 지연" ? "마지막 수집 이후 응답이 없습니다. 통신 상태와 센서 전원을 확인합니다." : r.status === "중단" ? "온도 하락 구간과 설비 중단 기록을 대조합니다." : "수집 상태는 정상입니다. 예상 중단 구간과 정비 일정을 대조합니다."}</p></div>`)}</div>${panel("향후 24시간 가동 중단 예측", "각 셀 30분 · 모델 출력 예시", `<div class="ops-forecast">${r.forecast.map((p, i) => `<span title="${i * 0.5}시간 후 · 중단 점수 ${p}" style="--prob:${p}"></span>`).join("")}</div><div class="ops-scale"><span>현재</span><span>+6시간</span><span>+12시간</span><span>+18시간</span><span>+24시간</span></div><p class="ops-note">짙은 구간은 중단 가능성이 높은 시간대입니다. 현재 상태·결측 여부와 함께 점검합니다.</p>`)}`,
    note: "합성 센서 기록과 가상 예측값 · 실제 설비·배출 기준·자동 제어에 연결되지 않은 화면입니다.",
    rows,
  };
}
function broadcastView(state) {
  const rows = filtered("broadcast", state),
    v = sum(rows.map((r) => sum(r.weekly.slice(8)))),
    before = sum(rows.map((r) => sum(r.weekly.slice(0, 8)))),
    last = sum(rows.map((r) => sum(r.lastYear.slice(8))));
  return {
    filters: select(
      "scope",
      "방송 묶음",
      [
        ["all", "전체 프로그램"],
        [0, "프로그램 A"],
        [1, "프로그램 B"],
      ],
      state.scope,
    ),
    metrics: [
      metric("방송 후 방문", `${n(v)}건`, "노출 장소 · 8주"),
      metric("전년 동기 대비", change(v, last), "동일한 8주 비교"),
      metric("방송 직전 대비", change(v, before), "직전 8주 비교"),
      metric("분석 장소", `${rows.length}곳`, "노출 이력 확인"),
    ],
    body: `<div class="ops-grid wide-left">${panel(
      "방송 전후 방문 추이",
      "방송일을 기준으로 정렬",
      trend(
        weeks,
        [
          {
            name: "분석 연도",
            values: weeks.map((_, j) => sum(rows.map((r) => r.weekly[j]))),
          },
          {
            name: "전년 동기",
            values: weeks.map((_, j) => sum(rows.map((r) => r.lastYear[j]))),
            dashed: true,
          },
        ],
        "건",
        { eventAt: 8, eventLabel: "방송 이후" },
      ),
    )}${panel("온라인 관심도", "검색 지수 · 상대적 규모", trend(weeks, [{ name: "검색 관심도", values: weeks.map((_, j) => mean(rows.map((r) => r.search[j]))) }], "지수"))}</div>${panel(
      "노출 장소별 변화",
      "방문·계절성·연계 목적지를 구분해 확인",
      table(
        [
          "노출 장소",
          "방송 전 8주",
          "방송 후 8주",
          "전년 같은 기간",
          "전년 대비",
        ],
        rows.map((r) => [
          r.name,
          n(sum(r.weekly.slice(0, 8))),
          n(sum(r.weekly.slice(8))),
          n(sum(r.lastYear.slice(8))),
          change(sum(r.weekly.slice(8)), sum(r.lastYear.slice(8))),
        ]),
        "장소별 방송 전후 방문 비교",
      ),
    )}<div class="ops-insight"><span>분석 기준</span><p>방송 전후 변화와 전년 동기를 함께 봅니다. 계절·행사·반복 노출을 구분해야 방송의 영향을 해석할 수 있습니다.</p></div>`,
    note: "가상 프로그램·장소의 합성 방문·검색 기록 · 표시된 변화율은 방송의 인과효과가 아닙니다.",
    rows,
  };
}
function careView(state) {
  const rows = filtered("care", state),
    r = pick(rows[0], state, rows),
    need = sum(rows.map((r) => r.need)),
    linked = sum(rows.map((r) => r.linked));
  return {
    filters: select(
      "scope",
      "생활권",
      [["all", "전체 생활권"], ...districts.map((r) => [r.id, r.name])],
      state.scope,
    ),
    metrics: [
      metric("돌봄 수요", `${n(need)}명`, "생활권 집계"),
      metric(
        "서비스 연계",
        `${n(linked)}명`,
        `${pct((linked / need) * 100)} 연계`,
      ),
      metric("미연계 수요", `${n(need - linked)}명`, "서비스 공백 검토"),
      metric(
        "공급 여력",
        `${n(sum(rows.map((r) => r.capacity - r.linked)))}명`,
        "현재 정원 대비",
      ),
    ],
    body: `<div class="ops-grid wide-left">${panel("생활권별 돌봄 수요", "원 크기 · 미연계 수요", cityMap(rows, r.id, { mode: "capacity", value: (r) => r.waiting / 70 }))}${panel(
      "생활권별 미연계",
      "인원 · 생활권 집계",
      bars(
        rows.map((r) => ({ name: r.name, value: r.waiting })),
        "명",
      ),
    )}</div>${panel(
      "서비스 공급 조정",
      "수요·연계·정원을 함께 비교",
      table(
        [
          "생활권",
          "전체 수요",
          "연계 인원",
          "공급 정원",
          "미연계",
          "운영 기관",
        ],
        rows.map((r) => [
          record(r, r.name, state),
          n(r.need),
          n(r.linked),
          n(r.capacity),
          n(r.waiting),
          `${r.centres}곳`,
        ]),
        "생활권별 돌봄 공급과 수요",
      ),
    )}<div class="ops-insight"><span>${r.name} · 검토 항목</span><p>미연계 ${r.waiting}명과 공급 여력 ${r.capacity - r.linked}명을 확인했습니다. 서비스 유형·이동 거리·운영 시간의 불일치를 검토합니다.</p></div>`,
    note: "가상 생활권의 집계 데이터 · 개인별 건강정보나 실제 지원 대상자를 포함하지 않습니다.",
    rows,
  };
}
function mobilityView(state) {
  const weekend = state.scope === "weekend";
  const { matrix, total, incoming, hourly, alightings } = mobilityData(weekend);
  const shortNames = ["환승", "주거", "시장", "업무", "문화", "상업"];
  return {
    filters: select(
      "scope",
      "요일 구분",
      [
        ["all", "평일"],
        ["weekend", "주말"],
      ],
      state.scope,
    ),
    metrics: [
      metric("분석 통행", `${n(total)}건`, "출발·도착지 매칭"),
      metric("연계 거점", `${destinations.length}곳`, "POI 기준"),
      metric(
        "최다 도착지",
        [...incoming].sort((a, b) => b.value - a.value)[0].name,
        "유입 통행 기준",
      ),
      metric("요일 구분", weekend ? "주말" : "평일", "평균 일일 패턴"),
    ],
    body: `<div class="ops-grid wide-left">${panel(
      "출발지 → 도착지 흐름",
      "각 셀 · 통행 건수",
      heatFigure(
        matrix.map((values, i) => ({ label: shortNames[i], values })),
        shortNames,
        "거점별 OD 통행량",
        (v) => n(v),
      ),
    )}${panel("도착지 유입 순위", "통행 건수", bars([...incoming].sort((a, b) => b.value - a.value)))}</div>${panel(
      "시간대별 승하차 패턴",
      "이용 시간 · 시간당 건수",
      trend(
        Array.from({ length: 24 }, (_, i) => `${i}시`),
        [
          { name: "승차", values: hourly },
          {
            name: "하차",
            values: alightings,
          },
        ],
        "건",
      ),
    )}`,
    note: "합성 교통 OD·시간대별 통행 기록 · 실제 위치나 개별 이동 이력은 사용하지 않습니다.",
    rows: matrix.map((r, i) =>
      Object.fromEntries([
        ["출발지", destinations[i]],
        ...r.map((v, j) => [destinations[j], v]),
      ]),
    ),
  };
}
function wildlifeView(state) {
  const rows = filtered("wildlife", state),
    r = pick(rows[0], state, rows);
  return {
    filters: select(
      "scope",
      "조회 구역",
      [
        ["all", "전체 구역"],
        ["priority", "우선 예찰"],
        ["pending", "미점검"],
      ],
      state.scope,
    ),
    metrics: [
      metric("예찰 구역", `${rows.length}곳`, "격자 단위 집계"),
      metric(
        "우선 예찰",
        `${rows.filter((r) => r.risk >= 70).length}곳`,
        "모델 점수 70 이상",
      ),
      metric(
        "신고 접수",
        `${sum(rows.map((r) => r.reports))}건`,
        "선택 구역 합계",
      ),
      metric(
        "점검 완료",
        `${rows.filter((r) => r.checked).length}곳`,
        "현장 기록 대조",
      ),
    ],
    body: `<div class="ops-grid wide-left">${panel("예찰 우선순위 지도", "가상 구역 · 위험 점수", cityMap(rows, r.id, { mode: "areas" }))}${panel("현장 점검 대상", r.name, `<div class="ops-score"><span>환경 위험 점수</span><strong>${r.risk}<small>/ 100</small></strong></div><dl class="ops-facts"><div><dt>신고</dt><dd>${r.reports}건</dd></div><div><dt>검체 접수</dt><dd>${r.samples}건</dd></div><div><dt>현장 점검</dt><dd>${status(r.checked ? "완료" : "예정")}</dd></div></dl>`)}</div>${panel(
      "예찰 계획",
      "위험 점수와 현장 상태를 대조",
      table(
        ["구역", "위험 점수", "신고", "검체", "점검 상태"],
        [...rows]
          .sort((a, b) => b.risk - a.risk)
          .slice(0, 6)
          .map((r) => [
            record(r, r.name, state),
            r.risk,
            r.reports,
            r.samples,
            status(r.checked ? "점검 완료" : "일정 확인"),
          ]),
        "예찰 우선순위 목록",
      ),
    )}`,
    note: "합성 환경·신고 기록과 가상 위험 점수 · 실제 질병 발생 또는 검사 결과를 표시하지 않습니다.",
    rows,
  };
}
function voucherView(state) {
  const rows = filtered("voucher", state),
    amount = sum(rows.map((r) => r.amount));
  return {
    filters: select(
      "scope",
      "가맹 업종",
      [["all", "전체 업종"], ...merchants.map((r) => [r.name, r.name])],
      state.scope,
    ),
    metrics: [
      metric(
        "지역화폐 결제",
        `${(amount / 10000).toFixed(2)}억 원`,
        "선택 업종 · 월간",
      ),
      metric(
        "이용 가맹점",
        `${n(sum(rows.map((r) => r.stores)))}곳`,
        "거래 발생 기준",
      ),
      metric(
        "관내 이용 비중",
        pct(sum(rows.map((r) => r.amount * r.local)) / amount),
        "이용자 거주 권역",
      ),
      metric("집계 기간", "2026.08", "월 단위"),
    ],
    body: `<div class="ops-grid wide-left">${panel("지역 소비 추이", "월별 거래 지수 · 1월=100", trend(monthLabels.slice(0, 8), [{ name: "지역화폐 이용", values: monthLabels.slice(0, 8).map((_, i) => mean(rows.map((r) => (r.monthly[i] / r.monthly[0]) * 100))) }], "지수"))}${panel("업종별 이용 규모", "만원", bars(rows.map((r) => ({ name: r.name, value: r.amount }))))}</div>${panel(
      "가맹 업종별 비교",
      "관내 이용 비중과 가맹점당 규모",
      table(
        ["업종", "가맹점", "결제액", "가맹점당 결제", "관내 이용"],
        rows.map((r) => [
          r.name,
          n(r.stores),
          `${n(r.amount)}만원`,
          `${n(r.amount / r.stores)}만원`,
          `${r.local}%`,
        ]),
        "지역화폐 업종 비교",
      ),
    )}`,
    note: "합성 가맹점·거래 집계 · 정책의 순효과를 표시한 지표가 아닙니다.",
    rows,
  };
}
function riskView(state) {
  const rows = filtered("risk", state),
    r = pick([...rows].sort((a, b) => b.score - a.score)[0], state, rows),
    done = new Set(state.reviewed || []);
  return {
    filters: select(
      "scope",
      "점검 기준",
      [
        ["all", "점수 0.70 이상"],
        [0.8, "점수 0.80 이상"],
        [0.9, "점수 0.90 이상"],
      ],
      state.scope,
    ),
    metrics: [
      metric("점검 후보", `${rows.length}건`, "선택 기준 적용"),
      metric(
        "확인 표시",
        `${rows.filter((r) => done.has(r.id)).length}건`,
        "현재 검토 화면",
      ),
      metric(
        "검토 대기",
        `${rows.filter((r) => !done.has(r.id)).length}건`,
        "담당자 확인 필요",
      ),
      metric("신호 종류", "4개", "반복·급증·불일치·조합"),
    ],
    body: `<div class="ops-grid wide-left">${panel(
      "위험징후 점검 목록",
      "점수순 · 행을 선택해 근거 확인",
      table(
        ["대상 ID", "탐지 점수", "주요 신호", "상태"],
        [...rows]
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((r) => [
            record(r, r.id, state),
            r.score.toFixed(2),
            r.reason,
            status(done.has(r.id) ? "확인 표시" : r.status),
          ]),
        "위험징후 검토 목록",
      ),
    )}${panel(`${r.id} · 탐지 근거`, "탐지 결과는 검토 후보", `<div class="ops-score"><span>탐지 점수</span><strong>${r.score.toFixed(2)}</strong></div><dl class="ops-facts"><div><dt>주요 신호</dt><dd>${r.reason}</dd></div><div><dt>연관 기록</dt><dd>${r.count}건</dd></div><div><dt>검토 상태</dt><dd>${done.has(r.id) ? "확인 표시" : "담당자 확인 전"}</dd></div></dl><button class="ops-action" data-ops-review="${r.id}">${done.has(r.id) ? "확인 표시 해제" : "확인 표시"}</button>`)}</div>`,
    note: "가상 대상·탐지 점수 · 위반 사실을 확정하지 않으며 확인 표시는 현재 화면에서만 유지됩니다.",
    rows,
  };
}
function documentsView(state) {
  const r = documents.find((r) => r.id === state.selected) || documents[0],
    done = new Set(state.reviewed || []);
  return {
    filters: "",
    metrics: [
      metric("접수 문서", `${documents.length}건`, "샘플 문서함"),
      metric(
        "원문 페이지",
        `${sum(documents.map((r) => r.pages))}p`,
        "수집 문서 합계",
      ),
      metric("확인 표시", `${done.size}건`, "현재 검토 화면"),
      metric("검토 대기", `${documents.length - done.size}건`, "원문 대조"),
    ],
    body: `<div class="ops-doc-layout"><aside class="ops-document-list"><span>검토 문서</span>${documents.map((d) => `<button data-ops-record="${d.id}" aria-pressed="${d.id === r.id}" class="${d.id === r.id ? "selected" : ""}"><small>${d.id} · ${d.pages}p</small><b>${d.name}</b>${status(done.has(d.id) ? "확인 표시" : d.type)}</button>`).join("")}</aside>${panel("원문 확인", `${r.name} · p.${r.page}`, `<article class="ops-paper"><header><span>${r.id}</span><b>${r.name}</b></header><h5>검토 대상 및 기록</h5><p>본 문서는 업무 검토를 위해 접수한 자료의 해당 구간입니다.</p><mark id="ops-source">${r.excerpt}</mark><p>추출한 항목은 원문과 대조하고, 불일치하거나 누락된 내용은 별도 확인합니다.</p><footer>예시 문서 · ${r.page} / ${r.pages}</footer></article>`)}${panel("추출 항목 대조", "원문 근거와 함께 검토", `<dl class="ops-facts">${r.fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl><a class="ops-source-link" href="#ops-source" data-ops-source>인용 구간 확인 ↗</a><button class="ops-action" data-ops-review="${r.id}">${done.has(r.id) ? "확인 표시 해제" : "원문 대조 · 확인 표시"}</button>`)}</div>`,
    note: "직접 작성한 예시 문서와 추출값 · 확인 표시는 현재 화면에서만 유지됩니다.",
    rows: documents.map((r) => ({
      문서번호: r.id,
      문서명: r.name,
      페이지: r.pages,
      분류: r.type,
    })),
  };
}
function warehouseView(state) {
  const rows = filtered("warehouse", state),
    total = sum(rows.map((r) => r.input)),
    loaded = sum(rows.map((r) => r.loaded));
  return {
    filters: select(
      "scope",
      "배치 상태",
      [
        ["all", "전체 배치"],
        ["issues", "확인 필요"],
      ],
      state.scope,
    ),
    metrics: [
      metric("원천 레코드", n(total), "최근 배치"),
      metric("적재 완료", n(loaded), "검증 통과 레코드"),
      metric("격리 레코드", n(total - loaded), "확인 후 재처리"),
      metric("파이프라인", `${rows.length}개`, "소스별 수집 흐름"),
    ],
    body: `${panel(
      "배치 진행 흐름",
      "2026.08.31 · 02:00 배치",
      `<div class="ops-pipeline">${[
        ["수집", n(total)],
        ["스키마 확인", `${rows.length}개 소스`],
        ["품질 검증", `${n(total - loaded)}건 격리`],
        ["운영 적재", n(loaded)],
      ]
        .map(
          ([t, v], i) =>
            `<div><span>0${i + 1}</span><b>${t}</b><small>${v}</small></div>`,
        )
        .join("")}</div>`,
    )}${panel(
      "원천별 적재 상태",
      "입력 = 적재 + 격리",
      table(
        ["원천 데이터", "입력", "적재", "격리", "소요", "상태"],
        rows.map((r) => [
          r.name,
          n(r.input),
          n(r.loaded),
          n(r.rejected),
          `${r.minutes}분`,
          status(r.status, r.rejected ? "attention" : ""),
        ]),
        "데이터 수집과 적재 현황",
      ),
    )}<div class="ops-grid">${panel(
      "품질 점검",
      "격리 사유",
      bars([
        { name: "좌표 형식", value: 47 },
        { name: "중복 키", value: 83 },
        { name: "측정값 결측", value: 45 },
      ]),
    )}${panel("재처리 기준", "운영 확인", `<div class="ops-insight"><span>격리 후 검토</span><p>원천 키와 적재 시점을 남겨 오류 레코드를 추적합니다. 수정된 기록만 다시 검증해 적재합니다.</p></div>`)}</div>`,
    note: "합성 배치 로그 · 운영 DB와 연결되지 않은 예시입니다.",
    rows,
  };
}
function llmView(state) {
  const minutes = Number(state.scope || 60),
    d = monitorData(minutes),
    r =
      d.requests.find((r) => r.id === state.selected && !r.error) ||
      d.requests.find((r) => !r.error);
  return {
    filters: select(
      "scope",
      "조회 구간",
      [
        [60, "최근 60분"],
        [30, "최근 30분"],
      ],
      minutes,
    ),
    metrics: [
      metric("요청 수", `${d.requests.length}건`, "기록 구간 합계"),
      metric("p95 응답 지연", `${n(d.p95)}ms`, "전체 요청 기준"),
      metric(
        "오류율",
        pct(((d.requests.length - d.ok) / d.requests.length) * 100),
        "시간 초과",
      ),
      metric("사용 토큰", n(d.tokens), "입력·출력 합계"),
    ],
    body: `<div class="ops-grid wide-left">${panel(
      "응답 지연 추이",
      "5분 단위",
      trend(
        d.buckets.map((b) => b.label),
        [
          { name: "p50", values: d.buckets.map((b) => b.p50) },
          { name: "p95", values: d.buckets.map((b) => b.p95) },
        ],
        "ms",
      ),
    )}${panel(
      "요청 단계별 시간",
      `${r.id} · ${n(r.duration)}ms`,
      bars(
        r.parts.map((value, i) => ({
          name: ["검색", "재정렬", "첫 토큰", "생성"][i],
          value,
        })),
        "ms",
      ),
    )}</div>${panel(
      "최근 요청",
      "정상 요청을 선택해 병목 확인",
      table(
        ["요청 ID", "처리 시간", "토큰", "상태"],
        d.requests
          .slice(0, 6)
          .map((r) => [
            r.error ? r.id : record(r, r.id, state),
            `${n(r.duration)}ms`,
            n(r.tokens),
            status(r.error ? "시간 초과" : "정상", r.error ? "attention" : ""),
          ]),
        "AI 요청 추적 로그",
      ),
    )}`,
    note: "합성 요청 로그 · 실제 모델 호출이나 운영 서비스 연결은 없습니다.",
    rows: d.requests,
  };
}
const renderers = {
  market: marketView,
  vacancy: vacancyView,
  emission: emissionView,
  broadcast: broadcastView,
  care: careView,
  mobility: mobilityView,
  wildlife: wildlifeView,
  voucher: voucherView,
  risk: riskView,
  documents: documentsView,
  warehouse: warehouseView,
  llm: llmView,
};
export function solutionModel(id, state = {}) {
  return renderers[id](state);
}
export function renderSolution(id = "market", state = {}) {
  if (!state.selected) {
    const rows =
      id === "llm"
        ? monitorData(Number(state.scope || 60)).requests.filter(
            (r) => !r.error,
          )
        : filtered(id, state);
    const first = ["vacancy", "risk"].includes(id)
      ? [...rows].sort((a, b) => b.score - a.score)[0]
      : rows[0];
    if (first) state = { ...state, selected: first.id };
  }
  const def = DEFINITIONS.find((r) => r.id === id) || DEFINITIONS[0],
    d = solutionModel(def.id, state);
  return `<div class="ops-workspace analytics" data-ops-id="${def.id}"><div class="ops-chrome"><div>${WORDMARK}<span>${def.group}</span></div><span class="ops-sample">SAMPLE · 2026.08</span></div><div class="ops-body"><header class="ops-heading"><div><p>${def.desc}</p><h3>${def.title}</h3></div><div class="ops-controls">${d.filters}<button class="ops-export" data-ops-export>CSV 내보내기 <span aria-hidden="true">↓</span></button></div></header><div class="ops-metrics">${d.metrics.join("")}</div>${d.body}<p class="ops-footnote">${d.note}</p></div></div>`;
}
export function renderShowcase() {
  return `<div class="solution-tools"><span>분야를 선택해 화면을 살펴보세요.</span><div class="solution-appearance" role="group" aria-label="업무 화면 테마"><button type="button" data-workspace-theme="light" aria-pressed="true">밝게</button><button type="button" data-workspace-theme="dark" aria-pressed="false">어둡게</button></div></div><div class="solution-shell" data-theme="light"><aside class="solution-catalog"><p class="catalog-label">업무 분야 <span>12</span></p><div class="solution-tabs" role="tablist" aria-orientation="vertical" aria-label="업무 분야">${DEFINITIONS.map((d, i) => `<button id="solution-tab-${d.id}" role="tab" aria-selected="${i === 0}" aria-controls="solution-screen" tabindex="${i === 0 ? 0 : -1}" data-solution="${d.id}"><span>${String(i + 1).padStart(2, "0")}</span>${d.title}</button>`).join("")}</div><label class="solution-select">업무 분야<select aria-label="업무 분야 선택">${DEFINITIONS.map((d) => `<option value="${d.id}">${d.title}</option>`).join("")}</select></label><p class="catalog-foot">ANALYTICS<br/>WORKSPACE</p></aside><div id="solution-screen" role="tabpanel" aria-labelledby="solution-tab-market">${renderSolution()}</div></div><p class="a-sr" id="solution-status" role="status"></p>`;
}

export function renderServicePreview(index) {
  let title, figure;
  if (index === 2) {
    title = "상권별 매출 구성";
    figure = bars(
      markets.slice(0, 5).map((r) => ({ name: r.name, value: r.monthly[7] })),
      "만원",
    );
  } else if (index === 1) {
    title = "빈집 현장 조사 후보";
    figure = cityMap(buildings.slice(0, 21), buildings[2].id)
      .replaceAll('tabindex="0"', "")
      .replaceAll('role="button"', "")
      .replace(/data-ops-record="[^"]*"/g, "");
  } else {
    title = "문서 원문과 추출 항목";
    const r = documents[0];
    figure = `<div class="ops-paper"><header><b>${r.name}</b></header><mark>${r.excerpt}</mark></div><dl class="ops-facts">${r.fields
      .slice(0, 2)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("")}</dl>`;
  }
  return `<div class="ops-service-preview analytics">${panel(title, "SAMPLE", figure)}<p class="ops-note">합성 데이터로 구성한 업무 화면 예시</p></div>`;
}
