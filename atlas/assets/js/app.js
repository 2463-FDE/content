/* =====================================================================
   FDE Mindset Atlas — interactive zoomable mind-map
   - click a node  -> expand its child nodes + relational edges
   - click again   -> collapse
   - zoom IN near a node (wheel/double-click) -> dive deeper down that branch
   - zoom OUT      -> climb back up a layer
   - drag = pan, click a leaf/node = open the cited detail drawer
   Tree is built from content.js (BRANCHES -> nodes -> deeper). Renderer-only.
   ===================================================================== */
(function(){
  const { SOURCES, VIDEOS, BRANCHES } = window.FDE;
  const SVG = document.getElementById('graph');
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- tiny helpers ---------- */
  const _ta = document.createElement('textarea');
  function decode(s){ _ta.innerHTML = (s||'').replace(/<[^>]+>/g,''); return _ta.value; }
  function esc(s){ return (s||'').replace(/"/g,'&quot;'); }
  function el(tag, attrs){ const e=document.createElementNS(NS,tag); if(attrs) for(const k in attrs) e.setAttribute(k,attrs[k]); return e; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }

  /* ---------- citation / content rendering (for the drawer) ---------- */
  function cite(html, collector){
    if(!html) return '';
    return html.replace(/\[\[([A-Z0-9_]+)\]\]/g, function(_, id){
      const s = SOURCES[id]; if(!s) return '';
      if(collector) collector.add(id);
      return '<a class="cite" href="'+s.url+'" target="_blank" rel="noopener" title="'+esc(s.t)+' ('+s.d+')">'+id+'</a>';
    });
  }
  function videoHTML(key){
    const v = VIDEOS[key]; if(!v) return '';
    let src = v.kind==='youtube' ? 'https://www.youtube.com/embed/'+v.id+'?rel=0'
            : v.kind==='vimeo'   ? 'https://player.vimeo.com/video/'+v.id+(v.hash?'?h='+v.hash:'') : '';
    const s = SOURCES[v.src];
    return '<div class="video-embed"><iframe src="'+src+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="'+esc(v.title)+'"></iframe></div>'+
           '<p class="video-cap">&#9654; '+esc(v.title)+(s?' &middot; <a href="'+s.url+'" target="_blank" rel="noopener">source</a>':'')+'</p>';
  }
  function viewsHTML(views, collector){
    if(!views||!views.length) return '';
    const gid='v'+Math.random().toString(36).slice(2,7);
    let tabs='', panes='';
    views.forEach(function(v,i){ const a=i===0?' active':'';
      tabs += '<div class="tab'+a+'" data-g="'+gid+'" data-i="'+i+'">'+decode(v.r)+'</div>';
      panes+= '<div class="pane'+a+'" data-g="'+gid+'" data-i="'+i+'"><span class="role">'+v.r+'</span>'+cite(v.t,collector)+'</div>';
    });
    return '<div class="views"><div class="tabs">'+tabs+'</div>'+panes+'</div>';
  }

  /* ---------- build tree model ---------- */
  const N = {}; let ROOT='root';
  N[ROOT] = { id:ROOT, t:'The FDE Mindset', color:'#e8590c', kind:'root', depth:0, parent:null, children:[] };
  BRANCHES.forEach(function(b){
    N[b.id] = { id:b.id, t:b.t, color:b.color, icon:b.icon, kind:'branch', depth:1, parent:ROOT, children:[], tag:b.tag, lead:b.lead };
    N[ROOT].children.push(b.id);
    (b.nodes||[]).forEach(function(n,ni){ addNode(n, b.id, b.color, b.id+'-'+ni, 2); });
  });
  function addNode(n, parent, color, id, depth){
    N[id] = { id:id, t:n.t, color:color, kind:'node', depth:depth, parent:parent, children:[], lead:n.lead, payload:n };
    N[parent].children.push(id);
    (n.deeper||[]).forEach(function(d,i){ addNode(d, id, color, id+'-'+i, depth+1); });
  }

  /* ---------- state ---------- */
  const expanded = new Set([ROOT]);
  let focus = ROOT;
  const RAD = [0, 300, 250, 215, 190, 175, 165]; // base ring radius at each depth
  const SEP = [0, 320, 195, 145, 118, 102, 95];  // min px between siblings at each depth (drives radius)
  let pos = {};                 // target world coords
  const cur = {};               // animated world coords
  let view = { x:0, y:0, k:1 }; // scene transform
  let viewT = null;             // tween target for view
  const els = {};               // id -> {g,circle,label,hit,ring}
  const edges = {};             // id -> line
  let raf = 0, lastAuto = 0;

  /* ---------- layout (radial, expansion-aware, aspect-aware) ---------- */
  let STRETCH = 1.2;   // widen the tree horizontally on wide screens, narrow it on portrait phones
  function relayout(){
    const rc = rect(); STRETCH = clamp(rc.width / Math.max(rc.height,1), 0.82, 1.55);
    pos = {};
    place(ROOT, -Math.PI/2, {x:0,y:0}, 0, 0);
  }
  // place a node at ppos + polar(dir, radius); then fan its children with breathing room
  function place(id, dir, ppos, depth, radius){
    const p = depth===0 ? {x:0,y:0} : { x: ppos.x + Math.cos(dir)*radius*STRETCH, y: ppos.y + Math.sin(dir)*radius };
    pos[id] = p;
    if(!(id in cur)) cur[id] = depth===0 ? {x:0,y:0} : {x:ppos.x, y:ppos.y}; // spawn from parent
    if(!expanded.has(id)) return;
    const kids = N[id].children, k = kids.length; if(!k) return;
    const cd = depth+1;
    // fan width: grows with child count, capped (wider near the root, tighter deep down)
    let aSpan, aStart;
    if(depth===0){ aSpan = Math.PI*2; aStart = -Math.PI/2; }
    else { const maxFan = depth===1 ? Math.PI*0.95 : Math.PI*0.7; aSpan = Math.min(0.5 + k*0.30, maxFan); aStart = dir - aSpan/2; }
    // child radius: push children out far enough that the arc spacing >= SEP[cd]
    const baseR = RAD[Math.min(cd, RAD.length-1)];
    const denom = depth===0 ? k : Math.max(k-1, 1);
    const step  = aSpan/denom;
    const childR = clamp((SEP[Math.min(cd, SEP.length-1)] || baseR)/Math.max(step,0.0001), baseR, baseR*2.7);
    kids.forEach(function(kid,i){
      const ca = depth===0 ? aStart + (i+0.5)/k*aSpan
                           : (k===1 ? dir : aStart + (i/(k-1))*aSpan);
      place(kid, ca, p, cd, childR);
    });
  }

  /* ---------- visibility + DOM sync ---------- */
  function visibleIds(){
    const out=[]; (function rec(id){ out.push(id); if(expanded.has(id)) N[id].children.forEach(rec); })(ROOT); return out;
  }
  let gEdges, gNodes;
  function sync(){
    relayout();
    const vis = new Set(visibleIds());
    // remove stale
    Object.keys(els).forEach(function(id){ if(!vis.has(id)){ els[id].g.remove(); delete els[id]; } });
    Object.keys(edges).forEach(function(id){ if(!vis.has(id)){ edges[id].remove(); delete edges[id]; } });
    // create new
    vis.forEach(function(id){
      const node = N[id];
      if(id!==ROOT && !edges[id]){ const ln = el('line',{class:'edge-line'}); ln.style.stroke=node.color; gEdges.appendChild(ln); edges[id]=ln; }
      if(!els[id]){
        const g = el('g',{class:'gnode k-'+node.kind}); g.dataset.id=id;
        const ring = el('circle',{class:'ring', r:nodeR(node)+5}); ring.style.stroke=node.color;
        const c = el('circle',{class:'dot', r:nodeR(node)}); c.style.fill=node.color;
        const hit = el('circle',{class:'hit', r:nodeR(node)+14});
        const label = el('text',{class:'lbl'});
        setLabel(label, node);
        const tip = el('title'); tip.textContent = decode(node.t); g.appendChild(tip);
        g.appendChild(ring); g.appendChild(c); g.appendChild(hit); g.appendChild(label);
        // notes / perspective badge — open this node's detail at its own level
        const hasViews = !!(node.payload && node.payload.views && node.payload.views.length);
        const hasContent = (node.payload && (node.payload.body||node.payload.lead||node.payload.video||hasViews)) || node.kind==='branch';
        if(hasContent){
          const br=clamp(nodeR(node)*0.85, 7, 10), off=nodeR(node)+br*0.5;
          const badge=el('g',{class:'notebadge'+(hasViews?' has-views':'')});
          const bbg=el('circle',{class:'nb-bg', r:br, cx:off, cy:-off}); bbg.style.stroke=node.color;
          const bic=el('text',{class:'nb-ic', x:off, y:-off+3}); bic.textContent = hasViews ? '◉' : 'i';
          const btip=el('title'); btip.textContent = hasViews ? 'Open notes + role perspectives' : 'Open notes'; badge.appendChild(btip);
          badge.appendChild(bbg); badge.appendChild(bic); g.appendChild(badge);
          badge.addEventListener('click', function(e){ e.stopPropagation(); clearTimeout(clickTimer); openDrawer(id); });
        }
        gNodes.appendChild(g);
        els[id] = { g:g, dot:c, ring:ring, label:label, hit:hit };
        bindNode(id, g);
      }
      // expandable / state styling
      const hasKids = N[id].children.length>0;
      els[id].g.classList.toggle('expandable', hasKids && !expanded.has(id));
      els[id].g.classList.toggle('open', expanded.has(id) && hasKids);
      els[id].g.classList.toggle('leaf', !hasKids);
    });
    drawHud();
    animate();
  }
  function nodeR(n){ return n.kind==='root'?34 : n.depth===1?14 : n.depth===2?9.5 : 7; }
  function labelDY(n){ return n.kind==='root'?5 : nodeR(n)+15; }
  function truncate(s,m){ return s.length>m ? s.slice(0,m-1).trim()+'…' : s; }
  // full title, word-wrapped into centered tspans (no truncation)
  function setLabel(label, node){
    while(label.firstChild) label.removeChild(label.firstChild);
    const max = node.kind==='root' ? 16 : 18;
    const words = decode(node.t).split(/\s+/);
    const lines=[]; let line='';
    words.forEach(function(w){
      if(line && (line+' '+w).length>max){ lines.push(line); line=w; }
      else line = line ? line+' '+w : w;
    });
    if(line) lines.push(line);
    const y0 = labelDY(node);
    lines.forEach(function(ln,i){
      const ts = el('tspan', i===0 ? {x:0, y:y0} : {x:0, dy:'1.15em'});
      ts.textContent = ln; label.appendChild(ts);
    });
  }

  /* ---------- animation loop ---------- */
  function animate(){ if(!raf) raf = requestAnimationFrame(frame); }
  function frame(){
    let moving=false;
    // node positions ease toward targets
    Object.keys(els).forEach(function(id){
      const t=pos[id]; if(!t) return; const c=cur[id]||(cur[id]={x:t.x,y:t.y});
      c.x=lerp(c.x,t.x,0.18); c.y=lerp(c.y,t.y,0.18);
      if(Math.abs(c.x-t.x)>0.4||Math.abs(c.y-t.y)>0.4) moving=true;
      els[id].g.setAttribute('transform','translate('+c.x.toFixed(1)+','+c.y.toFixed(1)+')');
    });
    // edges follow current positions
    Object.keys(edges).forEach(function(id){
      const a=cur[N[id].parent], b=cur[id]; if(!a||!b) return;
      const ln=edges[id]; ln.setAttribute('x1',a.x); ln.setAttribute('y1',a.y); ln.setAttribute('x2',b.x); ln.setAttribute('y2',b.y);
    });
    // view tween (focus animation)
    if(viewT){
      view.x=lerp(view.x,viewT.x,0.16); view.y=lerp(view.y,viewT.y,0.16); view.k=lerp(view.k,viewT.k,0.16);
      if(Math.abs(view.k-viewT.k)<0.005 && Math.abs(view.x-viewT.x)<0.6 && Math.abs(view.y-viewT.y)<0.6){ view=Object.assign({},viewT); viewT=null; } else moving=true;
    }
    applyView();
    if(moving) raf=requestAnimationFrame(frame); else raf=0;
  }
  function applyView(){ scene.setAttribute('transform','translate('+view.x.toFixed(2)+','+view.y.toFixed(2)+') scale('+view.k.toFixed(4)+')'); }

  /* ---------- screen<->world ---------- */
  function rect(){ return SVG.getBoundingClientRect(); }
  function toWorld(sx,sy){ const r=rect(); return { x:(sx-r.left-view.x)/view.k, y:(sy-r.top-view.y)/view.k }; }

  /* ---------- focus / framing ---------- */
  function frameNode(id, scale){
    const r=rect(); const p=pos[id]||cur[id]||{x:0,y:0};
    const k = scale || clamp(view.k, 0.9, 1.7);
    viewT = { k:k, x: r.width/2 - p.x*k, y: r.height/2 - p.y*k };
    animate();
  }
  function fitAll(){
    relayout();
    let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
    visibleIds().forEach(function(id){ const p=pos[id]; minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y); });
    const r=rect(); const pad = r.width<560 ? 60 : 110;
    const w=Math.max(maxx-minx,160)+pad*2, h=Math.max(maxy-miny,160)+pad*2;
    const k=clamp(Math.min(r.width/w, r.height/h),0.32,2.1);
    const cx=(minx+maxx)/2, cy=(miny+maxy)/2;
    viewT={ k:k, x:r.width/2-cx*k, y:r.height/2-cy*k }; animate();
  }

  /* ---------- expand / collapse ---------- */
  function expand(id, andFocus){ if(!N[id].children.length) return; expanded.add(id); sync(); if(andFocus!==false) frameSubtree(id); }
  // frame a node together with its now-visible children/grandchildren, with padding
  function frameSubtree(id){
    const r=rect(); const ids=[id];
    if(expanded.has(id)) N[id].children.forEach(function(c){ ids.push(c); if(expanded.has(c)) N[c].children.forEach(function(g){ ids.push(g); }); });
    let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
    ids.forEach(function(i){ const p=pos[i]; if(!p) return; minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y); });
    if(minx>maxx){ return frameNode(id); }
    const pad=110; const w=Math.max(maxx-minx,200)+pad*2, h=Math.max(maxy-miny,200)+pad*2;
    const k=clamp(Math.min(r.width/w, r.height/h),0.45,1.5);
    const cx=(minx+maxx)/2, cy=(miny+maxy)/2;
    viewT={ k:k, x:r.width/2-cx*k, y:r.height/2-cy*k }; animate();
  }
  function collapse(id){ // collapse id and everything under it
    (function rec(x){ N[x].children.forEach(function(c){ expanded.delete(c); rec(c); }); })(id);
    expanded.delete(id); expanded.add(ROOT);
    sync();
  }
  function toggle(id){ if(expanded.has(id)) collapse(id); else expand(id); }
  function upALayer(){
    // collapse the deepest currently-expanded layer
    let maxd=0; expanded.forEach(function(id){ maxd=Math.max(maxd,N[id].depth); });
    if(maxd<=0){ return; }
    const toClose=[]; expanded.forEach(function(id){ if(N[id].depth===maxd) toClose.push(id); });
    toClose.forEach(function(id){ expanded.delete(id); });
    // refocus to a shallower node
    const f = N[focus] && N[focus].depth>=maxd ? N[focus].parent : focus; focus=f||ROOT;
    sync(); frameNode(focus, clamp(view.k*0.8,0.5,1.2));
  }

  /* ---------- interactions: pan / wheel-zoom / pinch-zoom / click ---------- */
  let panning=false, moved=false, sx0,sy0,vx0,vy0;
  const pointers = new Map();   // active pointers (mouse + touch), for pinch
  let pinchPrev = null;
  scenePointerInit();
  function scenePointerInit(){
    // pointerdown bubbles up from nodes too; no pointer-capture so node click events still fire
    SVG.addEventListener('pointerdown', function(e){
      pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if(pointers.size===1){ panning=true; moved=false; sx0=e.clientX; sy0=e.clientY; vx0=view.x; vy0=view.y; viewT=null; }
      else if(pointers.size===2){ panning=false; pinchPrev=pinchState(); }
    });
    window.addEventListener('pointermove', function(e){
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if(pointers.size>=2){ moved=true; doPinch(); return; }   // two-finger pinch + pan
      if(!panning) return;
      const dx=e.clientX-sx0, dy=e.clientY-sy0;
      if(Math.abs(dx)+Math.abs(dy)>4) moved=true;
      view.x=vx0+dx; view.y=vy0+dy; applyView();
    });
    window.addEventListener('pointerup', endPtr);
    window.addEventListener('pointercancel', endPtr);
    SVG.addEventListener('wheel', onWheel, {passive:false});
    SVG.addEventListener('dblclick', function(e){ e.preventDefault(); });
  }
  function endPtr(e){
    pointers.delete(e.pointerId);
    if(pointers.size<2) pinchPrev=null;
    if(pointers.size===0){ panning=false; }
    else if(pointers.size===1){ const p=[...pointers.values()][0]; sx0=p.x; sy0=p.y; vx0=view.x; vy0=view.y; panning=true; }
  }
  function pinchState(){
    const a=[...pointers.values()]; const dx=a[0].x-a[1].x, dy=a[0].y-a[1].y;
    return { dist:Math.hypot(dx,dy)||1, cx:(a[0].x+a[1].x)/2, cy:(a[0].y+a[1].y)/2 };
  }
  function doPinch(){
    const s=pinchState(); if(!pinchPrev){ pinchPrev=s; return; }
    const r=rect();
    const nk=clamp(view.k*(s.dist/pinchPrev.dist), 0.2, 3.6);
    const mx=s.cx-r.left, my=s.cy-r.top, wx=(mx-view.x)/view.k, wy=(my-view.y)/view.k;
    view.k=nk; view.x=mx-wx*nk + (s.cx-pinchPrev.cx); view.y=my-wy*nk + (s.cy-pinchPrev.cy);
    pinchPrev=s; viewT=null; applyView();
  }
  function onWheel(e){
    e.preventDefault();
    const r=rect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    const dir = e.deltaY<0 ? 1 : -1;
    const factor = dir>0 ? 1.15 : 1/1.15;
    const nk = clamp(view.k*factor, 0.28, 3.2);
    // zoom around cursor
    const wx=(mx-view.x)/view.k, wy=(my-view.y)/view.k;
    view.k=nk; view.x=mx-wx*nk; view.y=my-wy*nk; viewT=null; applyView();
    // gesture: zoom in near a collapsed node -> dive deeper; zoom out far -> climb a layer
    const now=Date.now(); if(now-lastAuto<260) return;
    const w=toWorld(e.clientX,e.clientY);
    if(dir>0){
      const near=nearestCollapsed(w);
      if(near && near.d < (nodeR(N[near.id])+22)){ lastAuto=now; expanded.add(near.id); focus=near.id; sync(); }
    } else if(view.k<0.6){
      lastAuto=now; upALayer();
    }
  }
  function nearestCollapsed(w){
    let best=null;
    visibleIds().forEach(function(id){
      if(!N[id].children.length || expanded.has(id)) return;
      const p=pos[id]; const d=Math.hypot(p.x-w.x,p.y-w.y);
      if(!best||d<best.d) best={id:id,d:d};
    });
    return best;
  }
  let clickTimer=null;
  function bindNode(id, g){
    g.addEventListener('click', function(e){
      e.stopPropagation();
      if(moved) return;                 // it was a drag, not a click
      clearTimeout(clickTimer);
      clickTimer=setTimeout(function(){ doClick(id); }, 210); // wait to see if it's a dblclick
    });
    g.addEventListener('dblclick', function(e){
      e.stopPropagation(); e.preventDefault(); clearTimeout(clickTimer);
      if(N[id].payload) openDrawer(id);                  // read full cited detail
      else if(N[id].children.length){ focus=id; expand(id); }
    });
  }
  function doClick(id){
    const node=N[id];
    if(id===ROOT){ expanded.add(ROOT); sync(); fitAll(); return; }
    if(node.children.length){ focus=id; toggle(id); }    // reveal/collapse children + edges
    else if(node.payload) openDrawer(id);                // leaf -> read cited detail
  }

  /* ---------- detail drawer ---------- */
  const drawer=document.getElementById('drawer'), scrim=document.getElementById('scrim');
  function openDrawer(id){
    const node=N[id]; const n=node.payload||{}; const collector=new Set();
    const lead = n.lead || node.lead;
    let html='<button class="dr-close" id="drClose" aria-label="close">&times;</button>';
    html+='<div class="dr-kicker" style="color:'+node.color+'">'+breadcrumbText(id)+'</div>';
    html+='<h2 class="dr-title">'+node.t+'</h2>';
    if(lead) html+='<p class="dr-lead">'+cite(lead,collector)+'</p>';
    if(n.body) html+='<div class="dr-body item-body">'+cite(n.body,collector)+'</div>';
    if(n.video) html+=videoHTML(n.video);
    if(n.views) html+='<div class="dr-views-label">Switch perspective &mdash; same node, different roles</div>'+viewsHTML(n.views,collector);
    if(node.children.length){
      html+='<div class="dr-children"><div class="deeper-label">'+(node.kind==='branch'?'In this branch':'Deeper layers')+' &mdash; explore on the map</div>';
      node.children.forEach(function(cid){ html+='<button class="dr-jump" data-jump="'+cid+'" style="--bcolor:'+node.color+'">'+N[cid].t+' &rarr;</button>'; });
      html+='</div>';
    }
    // sources
    if(collector.size){ html+='<div class="sources"><h3>Sources cited here</h3>';
      Array.from(collector).forEach(function(sid){ const s=SOURCES[sid];
        html+='<div class="src-item"><span class="sid">'+sid+'</span><span><a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.t)+'</a> <span class="sd">&middot; '+s.d+'</span></span></div>'; });
      html+='</div>'; }
    drawer.innerHTML=html; drawer.classList.add('open'); scrim.classList.add('on');
    document.getElementById('drClose').onclick=closeDrawer;
    drawer.querySelectorAll('.dr-jump').forEach(function(b){ b.onclick=function(){
      const cid=b.dataset.jump; closeDrawer();
      expanded.add(N[cid].parent); sync();
      if(N[cid].children.length){ focus=cid; expand(cid); }
      else { frameNode(cid,1.5); if(N[cid].payload) setTimeout(function(){ openDrawer(cid); },360); }
    }; });
    drawer.querySelectorAll('.views .tab').forEach(function(t){ t.onclick=function(){ const g=t.getAttribute('data-g'),i=t.getAttribute('data-i');
      drawer.querySelectorAll('[data-g="'+g+'"]').forEach(function(x){x.classList.remove('active')});
      drawer.querySelectorAll('[data-g="'+g+'"][data-i="'+i+'"]').forEach(function(x){x.classList.add('active')}); }; });
    location.hash='#node/'+id;
  }
  function closeDrawer(){ drawer.classList.remove('open'); scrim.classList.remove('on'); if(location.hash.indexOf('#node/')===0) history.replaceState(null,'',location.pathname+location.search); }
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeDrawer(); });

  function breadcrumbText(id){ const parts=[]; let x=id; while(x){ parts.unshift(decode(N[x].t)); x=N[x].parent; } return parts.join('  /  '); }

  /* ---------- HUD ---------- */
  function drawHud(){
    const bc=document.getElementById('bcrumb'); if(bc) bc.textContent = breadcrumbText(focus);
  }

  /* ---------- controls ---------- */
  function bindControls(){
    document.getElementById('cZin').onclick = function(){ zoomBtn(1.3); };
    document.getElementById('cZout').onclick= function(){ zoomBtn(1/1.3); };
    document.getElementById('cUp').onclick  = upALayer;
    document.getElementById('cReset').onclick=function(){ expanded.clear(); expanded.add(ROOT); focus=ROOT; sync(); fitAll(); };
    document.getElementById('cExpand').onclick=function(){ // expand everything (full puzzle)
      Object.keys(N).forEach(function(id){ if(N[id].children.length) expanded.add(id); }); sync(); fitAll(); };
    document.getElementById('brand').onclick=function(){ expanded.clear(); expanded.add(ROOT); focus=ROOT; sync(); fitAll(); };
    const hx=document.getElementById('hintX'); if(hx) hx.onclick=function(){ const h=document.getElementById('hudHint'); if(h) h.style.display='none'; };
  }
  function zoomBtn(f){ const r=rect(); const mx=r.width/2,my=r.height/2; const nk=clamp(view.k*f,0.28,3.2);
    const wx=(mx-view.x)/view.k, wy=(my-view.y)/view.k; viewT={k:nk,x:mx-wx*nk,y:my-wy*nk}; animate(); }

  /* ---------- scene root ---------- */
  let scene;
  function boot(){
    scene = el('g',{id:'scene'}); SVG.appendChild(scene);
    gEdges = el('g',{class:'edges'}); gNodes = el('g',{class:'nodes'});
    scene.appendChild(gEdges); scene.appendChild(gNodes);
    bindControls();
    sync(); fitAll();
    // deep-link
    if(location.hash.indexOf('#node/')===0){ const id=location.hash.slice(6); if(N[id]){ let x=N[id].parent; const chain=[]; while(x){chain.unshift(x);x=N[x].parent;} chain.forEach(function(c){if(N[c].children.length)expanded.add(c);}); sync(); setTimeout(function(){ if(N[id].payload) openDrawer(id); frameNode(id,1.2); },200); } }
    let rzT; window.addEventListener('resize', function(){ clearTimeout(rzT); rzT=setTimeout(function(){ sync(); fitAll(); }, 180); });
    window.addEventListener('orientationchange', function(){ setTimeout(function(){ sync(); fitAll(); }, 250); });
  }
  boot();
})();
