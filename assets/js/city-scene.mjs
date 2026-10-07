import * as THREE from '../vendor/three/three.module.min.js';
// Procedural sample neighborhood. Positions and heights are illustrative, not GIS measurements.
const views = new Map();
export function mountCityScene(host, rows, selected, onSelect = ()=>{}) {
  let renderer, disposed=false, observer;
  const geos=[], mats=[], pickables=[];
  const model=new THREE.Group(), scene=new THREE.Scene();
  const view=views.get(host.dataset.cityKey||'city') || {angle:.65,zoom:1};
  const camera=new THREE.OrthographicCamera(-18,18,14,-14,.1,150);
  const geo=(g)=>(geos.push(g),g), mat=(color)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.88});mats.push(m);return m;};
  const wall=mat('#e4e5df'), roof=mat('#f6f5ef'), asphalt=mat('#9c9f99'), pavement=mat('#ced0c8'), leaf=mat('#87947a'), trunk=mat('#837a64'), glass=mat('#6c7777'), yellow=mat('#edd332'), active=mat('#dcb719');
  const cube=geo(new THREE.BoxGeometry(1,1,1)), crown=geo(new THREE.IcosahedronGeometry(.42,1));
  function box(parent,x,y,z,w,h,d,material){const m=new THREE.Mesh(cube,material);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
  box(model,0,-.25,0,24,.4,21,pavement);
  for(let c=0;c<8;c++)box(model,-12+c*3.35,0,0,.62,.025,21,asphalt);
  for(let r=0;r<7;r++)box(model,0,.005,-10.5+r*3.35,24,.025,.64,asphalt);
  rows.forEach((row,j)=>{
    const i=Number(row.id.replace(/\D/g,''))-101;
    const x=-10.3+(i%7)*3.35,z=-8.8+Math.floor(i/7)*3.35;
    const floors=2+(i*7%5), height=floors*.51;
    const group=new THREE.Group();group.position.set(x,0,z);model.add(group);
    const chosen=row.id===selected, priority=row.score>=.7;
    const body=box(group,0,height/2,0,1.75,height,1.65,chosen?active:priority?yellow:wall);
    body.userData.id=row.id;pickables.push(body);
    box(group,0,height+.065,0,1.86,.13,1.76,roof);
    box(group,.36,height+.24,-.27,.64,.3,.62,wall);
    for(let f=0;f<floors;f++)for(let n=0;n<3;n++){
      box(group,-.55+n*.55,.3+f*.51,.832,.24,.29,.028,glass);
      box(group,.882,.3+f*.51,-.54+n*.54,.025,.29,.24,glass);
    }
    box(group,0,.25,.85,.32,.5,.045,glass);
    if(chosen) {
      const ring=new THREE.Mesh(geo(new THREE.RingGeometry(1.2,1.35,48)),mat('#242c2a'));
      ring.rotation.x=-Math.PI/2;ring.position.y=.05;group.add(ring);
    }
    for(let t=0;t<2;t++){
      const tx=x+1.2, tz=z-.8+t*1.2;
      box(model,tx,.28,tz,.085,.56,.085,trunk);
      const tree=new THREE.Mesh(crown,leaf);tree.position.set(tx,.83,tz);tree.scale.set(.85,1.3,.85);model.add(tree);
    }
  });
  scene.background=new THREE.Color('#f2f3ed'); scene.add(model);
  scene.add(new THREE.HemisphereLight('#ffffff','#7f8878',2.5));
  const sun=new THREE.DirectionalLight('#fff8e8',3);sun.position.set(-12,25,12);scene.add(sun);
  function draw(){if(disposed||!renderer)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const half=Math.max(15,18/(w/h))/view.zoom;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.position.set(Math.sin(view.angle)*36,30,Math.cos(view.angle)*36);camera.lookAt(0,1,0);camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.render(scene,camera);}
  const clean=()=>{disposed=true;observer?.disconnect();renderer?.dispose();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());host.replaceChildren();};
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const canvas=renderer.domElement;canvas.setAttribute('aria-label','가상 주거지 3D 모형. 건물을 선택하거나 아래 선택 목록을 사용하세요.');canvas.setAttribute('role','img');host.replaceChildren(canvas);
    let down;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,angle:view.angle};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!down)return;view.angle=down.angle+(e.clientX-down.x)*.008;draw();});
    canvas.addEventListener('pointerup',e=>{if(!down)return;const click=Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;down=null;views.set(host.dataset.cityKey||'city',view);if(!click)return;const rect=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(pickables)[0];if(hit)onSelect(hit.object.userData.id);});
    canvas.addEventListener('pointercancel',()=>{down=null;});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();host.textContent='3D 표시가 중단되었습니다. 아래 건물 선택 목록으로 확인하세요.';});
    observer=new ResizeObserver(draw);observer.observe(host);draw();
    return {dispose:clean,rotate:delta=>{view.angle+=delta;views.set(host.dataset.cityKey||'city',view);draw();},zoom:delta=>{view.zoom=Math.max(.75,Math.min(1.6,view.zoom+delta));draw();},reset:()=>{view.angle=.65;view.zoom=1;draw();}};
  } catch {clean();host.textContent='이 환경에서는 3D를 표시할 수 없습니다. 아래 건물 선택 목록으로 확인하세요.';return {dispose:clean,rotate(){},zoom(){},reset(){}};}
}
