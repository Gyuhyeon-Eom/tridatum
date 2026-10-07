const serviceLinks = [...document.querySelectorAll('[data-service]')];
function chooseService(id) {
  if (!serviceLinks.some(a => a.dataset.service === id)) id = 'analysis';
  for (const a of serviceLinks) a.setAttribute('aria-current', String(a.dataset.service === id));
  for (const panel of document.querySelectorAll('.service-detail')) {
    panel.hidden = panel.id !== id;
    panel.querySelectorAll('.fade,.reveal').forEach(n=>n.classList.add('in','is-visible'));
  }
}
if (serviceLinks.length) {
  chooseService(location.hash.slice(1));
  serviceLinks.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();history.replaceState(null,'',a.hash);chooseService(a.dataset.service);}));
  addEventListener('hashchange',()=>chooseService(location.hash.slice(1)));
}
document.querySelectorAll('[data-experience-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-experience-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-experience]').forEach(row=>row.hidden=button.dataset.experienceFilter!=='all' && row.dataset.experience!==button.dataset.experienceFilter);
}));

const cityPreview = document.getElementById('service-city-preview');
if(cityPreview) {
  const [{citySceneMarkup},{buildings},{mountCities}] = await Promise.all([
    import('./solutions-view.mjs?v=20261007p1'),import('./solutions-data.mjs?v=20260907v1'),import('./city-dashboard.mjs?v=20261007p1')
  ]);
  let cleanup=()=>{};
  function renderCity(id=buildings[2].id) {
    cleanup();
    cityPreview.innerHTML=citySceneMarkup(buildings,id)+'<p class="ops-note">가상 건물로 표현한 조사 우선순위 예시입니다. 실제 주소·건물 높이가 아닙니다.</p>';
    cleanup=mountCities(cityPreview,renderCity);
  }
  renderCity();
}
