// 스크롤 시 1회성 은은한 페이드 인 — 사이트의 유일한 동작 효과
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, { threshold: 0.12 });
document.querySelectorAll('.fade').forEach(el => io.observe(el));
