/* Local-only cartography workspace. No game-save access and no automatic source writes. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), svg = $('map'), ns = 'http://www.w3.org/2000/svg';
  const clone = value => JSON.parse(JSON.stringify(value));
  const base = globalThis.ERYNDOR_MAP_LAYOUT;
  const names = { aerendell:'Aerendell / Aelbrook', forestRoad:'Aerendell Forest Road', thalBarak:'Thal-Barak', stilltidePass:'Stilltide Pass', duunVaelBridge:'Duun-Vael Bridge', riverhold:'Riverhold' };
  const loreAliases={aerendell:'aelbrook',thalBarak:'thal-barak',duunVaelBridge:'duun-vael',riverhold:'riverhold'};
  const lorePlaces=globalThis.ERYNDOR_ATLAS?.pois || [];
  let data = { version:1, world:clone(base.world), places:[
    ...Object.entries(base.places).map(([id,p]) => {const lore=lorePlaces.find(p=>p.id===loreAliases[id]);return {id,gameId:id,name:names[id] || id,...p,note:lore?lore.note+' Source: '+lore.source:'Current game location; exact lore placement is provisional.'};}),
    ...lorePlaces.filter(p=>!Object.values(loreAliases).includes(p.id)).map(p => ({...p,id:'lore-'+p.id}))
  ], roads:[...Object.entries(base.routes).map(([id,points]) => ({id,gameId:id,name:id,points:clone(points),note:'Current gameplay route; bends are provisional.'})),
    ...(globalThis.ERYNDOR_ATLAS?.routes||[]).map(r=>({...clone(r),id:'lore-road-'+r.id}))] };
  const key = 'eryndor-map-workshop-v1';
  let box={x:0,y:0,w:1752,h:898}, selected=data.places[0].id, history=[], drag=null, mode='', draft=[], dirty=false;
  function say(text){$('status').textContent=text;}
  function pointOK(p){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1752&&p.y>=0&&p.y<=898;}
  function valid(d){
    if(!d||d.version!==1||d.world?.width!==1752||d.world?.height!==898||d.world.image!==base.world.image||!Array.isArray(d.places)||!Array.isArray(d.roads)||d.places.length>2000||d.roads.length>1000)return false;
    const all=[...d.places,...d.roads];
    if(all.some(p=>typeof p.id!=='string'||typeof p.name!=='string'||p.name.length>120|| (p.note!=null&&typeof p.note!=='string'))||new Set(all.map(p=>p.id)).size!==all.length)return false;
    if(!d.places.every(pointOK)||!d.roads.every(r=>Array.isArray(r.points)&&r.points.length>=2&&r.points.length<=5000&&r.points.every(p=>Array.isArray(p)&&p.length===2&&pointOK({x:p[0],y:p[1]}))))return false;
    for(const id of Object.keys(base.places)) if(d.places.filter(p=>p.gameId===id).length!==1)return false;
    for(const id of Object.keys(base.routes)) if(d.roads.filter(r=>r.gameId===id).length!==1)return false;
    return d.places.every(p=>!p.gameId||Object.hasOwn(base.places,p.gameId))&&d.roads.every(r=>!r.gameId||Object.hasOwn(base.routes,r.gameId));
  }
  try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved)){data=saved;say('Restored this browser’s draft. Export a project for a portable backup.');}}catch{}
  function remember(){history.push(clone(data));if(history.length>60)history.shift();}
  function save(){dirty=true;try{localStorage.setItem(key,JSON.stringify(data));say('Draft saved in this browser. Export project to keep a portable copy.');}catch{say('Browser storage unavailable. Export project before closing.');}}
  function item(){return [...data.places,...data.roads].find(p=>p.id===selected);}
  function node(tag,attrs,parent,text){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;parent.append(n);return n;}
  function syncRoads(){for(const r of data.roads){if(!r.gameId)continue;const [from,to]=r.gameId.split('-');const a=data.places.find(p=>p.gameId===from),b=data.places.find(p=>p.gameId===to);r.points[0]=[a.x,a.y];r.points[r.points.length-1]=[b.x,b.y];}}
  function updateView(){svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.w} ${box.h}`);$('zoom').textContent=(1752/box.w).toFixed(1)+'×';renderGeometry();}
  function renderGeometry(){
    ['lines','markers','handles'].forEach(id=>$(id).replaceChildren());
    const unit=1/(svg.getScreenCTM()?.a || 1);
    for(const r of data.roads)node('polyline',{points:r.points.map(p=>p.join(',')).join(' '),class:'road'+(r.id===selected?' selected':''),'data-road':r.id},$('lines'));
    for(const p of data.places){
      if(!p.gameId&&!$('lore').checked)continue;
      const g=node('g',{class:'marker','data-place':p.id,transform:`translate(${p.x} ${p.y}) scale(${unit})`},$('markers'));
      node('circle',{r:p.id===selected?9:6,fill:p.gameId?'#f2cb70':'#7ccee7',stroke:'#102634','stroke-width':2},g);
      node('text',{x:p.x>1550?-12:12,y:-10,'text-anchor':p.x>1550?'end':'start'},g,p.name);
    }
    const r=item();if(r?.points)r.points.forEach(([x,y],i)=>node('circle',{cx:x,cy:y,r:7*unit,class:'handle','data-index':i},$('handles')));
    $('draft').setAttribute('points',draft.map(p=>p.join(',')).join(' '));
  }
  function render(){
    const select=$('features');select.replaceChildren();
    for(const p of [...data.places,...data.roads])select.add(new Option((p.points?'Road · ':p.gameId?'Game · ':'POI · ')+p.name,p.id));
    select.value=selected;const p=item();$('details').hidden=!p;
    if(p){$('name').value=p.name;$('notes').value=p.note||'';$('x').value=p.x??'';$('y').value=p.y??'';$('x').disabled=$('y').disabled=!!p.points;$('remove').disabled=!!p.gameId;}
    $('undo').disabled=!history.length;renderGeometry();
  }
  function coord(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  function bounded(p){return {x:Math.round(Math.max(0,Math.min(1752,p.x))),y:Math.round(Math.max(0,Math.min(898,p.y)))};}
  function zoom(f,c={x:box.x+box.w/2,y:box.y+box.h/2}){const w=Math.max(1752/16,Math.min(1752,box.w*f)),s=w/box.w;box={x:c.x-(c.x-box.x)*s,y:c.y-(c.y-box.y)*s,w,h:898*w/1752};updateView();}
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001),coord(e));},{passive:false});
  svg.onpointerdown=e=>{
    if(e.button!==0||drag)return;
    const mark=e.target.closest('[data-place]'),road=e.target.closest('[data-road]'),handle=e.target.closest('[data-index]');
    if(!mode){if(mark)selected=mark.dataset.place;else if(road)selected=road.dataset.road;}
    drag={id:e.pointerId,start:coord(e),screen:[e.clientX,e.clientY],box:{...box},place:!mode&&mark?.dataset.place,index:!mode&&handle?Number(handle.dataset.index):null,moved:false,snapshot:clone(data)};
    svg.setPointerCapture(e.pointerId);render();
  };
  svg.onpointermove=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.screen[0],e.clientY-drag.screen[1])<4)return;
    if(!drag.moved&&(drag.place||drag.index!==null))remember();drag.moved=true;
    const p=bounded(coord(e));
    if(drag.place){Object.assign(data.places.find(p=>p.id===drag.place),p);syncRoads();render();}
    else if(drag.index!==null){const r=item(),i=drag.index;
      if(r.gameId&&(i===0||i===r.points.length-1)){const ids=r.gameId.split('-');Object.assign(data.places.find(p=>p.gameId===ids[i===0?0:1]),p);syncRoads();}
      else r.points[i]=[p.x,p.y];renderGeometry();
    }else{const current=coord(e);box.x+=drag.start.x-current.x;box.y+=drag.start.y-current.y;updateView();}
  };
  svg.onpointerup=e=>{
    if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;svg.releasePointerCapture(e.pointerId);
    if(d.moved&&(d.place||d.index!==null))save();
    if(!d.moved&&mode){const p=bounded(coord(e));if(mode==='poi'){
      const name=prompt('Point of interest name');if(name?.trim()){remember();const id='poi-'+Date.now();data.places.push({id,name:name.trim().slice(0,120),...p,note:''});selected=id;setMode('');save();render();}
    }else{draft.push([p.x,p.y]);renderGeometry();say(`${draft.length} road points. Finish road when ready; drag empty map to pan.`);}}
  };
  svg.onpointercancel=()=>{if(drag&&(drag.place||drag.index!==null)){data=drag.snapshot;if(drag.moved)history.pop();}drag=null;render();};
  svg.ondblclick=e=>{
    if(mode)return;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-road]');if(!hit)return;selected=hit.dataset.road;const r=item(),p=bounded(coord(e));
    let nearest=1,best=Infinity;
    for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));const dist=Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);if(dist<best){best=dist;nearest=i;}}
    remember();r.points.splice(nearest,0,[p.x,p.y]);save();render();
  };
  svg.oncontextmenu=e=>{const h=e.target.closest('[data-index]');if(!h)return;e.preventDefault();const r=item(),i=Number(h.dataset.index);if(r.points.length<=2||(r.gameId&&(i===0||i===r.points.length-1))){say('Keep both road endpoints. Move the connected location instead.');return;}remember();r.points.splice(i,1);save();render();};
  function setMode(value){mode=value;draft=[];$('finish').hidden=value!=='road';$('cancel').hidden=!value;$('add').setAttribute('aria-pressed',value==='poi');$('road').setAttribute('aria-pressed',value==='road');renderGeometry();say(value==='poi'?'Click to place a POI.':value==='road'?'Click successive road points. Drag empty map to pan.':'Drag markers or road handles to adjust them.');}
  $('add').onclick=()=>setMode('poi');$('road').onclick=()=>setMode('road');$('cancel').onclick=()=>setMode('');
  $('finish').onclick=()=>{if(draft.length<2){say('A road needs at least two points.');return;}const name=prompt('Road name');if(!name?.trim())return;remember();const id='road-'+Date.now();data.roads.push({id,name:name.trim().slice(0,120),points:clone(draft),note:'Planning annotation; not a gameplay connection yet.'});selected=id;setMode('');save();render();};
  $('features').onchange=()=>{selected=$('features').value;render();};$('lore').onchange=renderGeometry;
  $('focus').onclick=()=>{const p=item();if(!p)return;const q=p.points?p.points[Math.floor(p.points.length/2)]:[p.x,p.y];box={x:q[0]-200,y:q[1]-102.5,w:400,h:898*400/1752};updateView();};
  $('apply').onclick=()=>{const p=item(),name=$('name').value.trim(),q={x:Number($('x').value),y:Number($('y').value)};if(!name||(!p.points&&(!pointOK(q)||$('x').value===''||$('y').value===''))){say('Enter a name and coordinates inside the map (0–1752, 0–898).');return;}remember();p.name=name;p.note=$('notes').value;if(!p.points)Object.assign(p,q);syncRoads();save();render();};
  $('remove').onclick=()=>{const p=item();if(!p||p.gameId||!confirm('Delete this planning annotation? Undo can restore it.'))return;remember();data.places=data.places.filter(p=>p.id!==selected);data.roads=data.roads.filter(p=>p.id!==selected);selected=data.places[0].id;save();render();};
  $('undo').onclick=()=>{if(!history.length)return;data=history.pop();setMode('');save();render();};
  $('plus').onclick=()=>zoom(.7);$('minus').onclick=()=>zoom(1/.7);$('fit').onclick=()=>{box={x:0,y:0,w:1752,h:898};updateView();};
  svg.onkeydown=e=>{if(e.key==='Escape')setMode('');if(e.key==='+'||e.key==='=')zoom(.7);if(e.key==='-')zoom(1/.7);};
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('export').onclick=()=>{download('eryndor-map-project.json',JSON.stringify(data,null,2),'application/json');dirty=false;say('Project exported with all POIs, notes, and roads. Send this file back for integration.');};
  $('game').onclick=()=>{syncRoads();const layout={version:1,world:clone(base.world),places:{},routes:{}};data.places.filter(p=>p.gameId).forEach(p=>layout.places[p.gameId]={x:p.x,y:p.y});data.roads.filter(p=>p.gameId).forEach(r=>layout.routes[r.gameId]=r.points);download('world-map-layout.js','// Exported from Eryndor Map Workshop. Planning annotations remain in the project JSON.\nglobalThis.ERYNDOR_MAP_LAYOUT = '+JSON.stringify(layout,null,2)+';\n','text/javascript');say('Downloaded game layout. Replace assets/maps/world-map-layout.js to apply existing location/road positions; export project for notes and new POIs.');};
  $('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error();const next=JSON.parse(await file.text());if(!valid(next))throw Error();if(!confirm('Replace this draft with the imported project? Undo can restore it.'))return;remember();data=next;syncRoads();selected=data.places[0].id;setMode('');save();render();}catch{say('Could not import: choose a valid Eryndor Map Workshop project JSON.');}finally{e.target.value='';}};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('resize',renderGeometry);
  syncRoads();render();
})();
