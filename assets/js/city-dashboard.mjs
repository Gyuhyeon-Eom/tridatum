import { buildings } from './solutions-data.mjs?v=20260907v1';
export function mountCities(root,onSelect=()=>{}) {
  let disposed=false;const scenes=[];
  const hosts=[...root.querySelectorAll('[data-city-scene]')];
  if(!hosts.length)return ()=>{};
  const io=new IntersectionObserver(entries=>entries.forEach(async entry=>{
    if(!entry.isIntersecting)return;io.unobserve(entry.target);
    const picker=entry.target.closest('.city-dashboard').querySelector('[data-city-select]');
    picker?.addEventListener('change',e=>onSelect(e.target.value));
    let mountCityScene;
    try { ({mountCityScene}=await import('./city-scene.mjs?v=20261007p1')); } catch { if(!disposed)entry.target.textContent='3D를 불러오지 못했습니다. 건물 선택 목록과 상세 정보를 이용해 주세요.'; return; }
    if(disposed)return;
    const host=entry.target,scope=host.dataset.cityScope||'all';
    const rows=buildings.filter(r=>scope==='all'||r.zone===Number(scope));
    const shell=host.closest('.city-dashboard');
    const select=id=>{ if(onSelect) onSelect(id); };
    const scene=mountCityScene(host,rows,host.dataset.citySelected,select);scenes.push(scene);
    shell.querySelectorAll('[data-city-action]').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.cityAction==='left')scene.rotate(-.25);if(b.dataset.cityAction==='right')scene.rotate(.25);
      if(b.dataset.cityAction==='in')scene.zoom(.15);if(b.dataset.cityAction==='out')scene.zoom(-.15);if(b.dataset.cityAction==='reset')scene.reset();
    }));

  }),{rootMargin:'150px'});hosts.forEach(h=>io.observe(h));
  return ()=>{disposed=true;io.disconnect();scenes.forEach(s=>s.dispose());};
}
