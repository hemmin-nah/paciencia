import {icon} from './icons.js';
import {newState,loadState,saveState,validateBackup,makeBackup} from './store.js';
const root=document.getElementById('app');
let course,state,storageError='',saveQueue=Promise.resolve(),lastSaving=0,workingRoute='',timer=null,toastTimeout;
const ui={search:'',journalSearch:'',journalFilter:'all',librarySearch:'',currentDraftId:null, toolDrafts:{}};
const now=()=>new Date().toISOString();
const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}):'—';
const desc=s=>String(s||'').split(/\n\s*\n/g).filter(Boolean).map(p=>`<p>${safe(p).replace(/\n/g,'<br>')}</p>`).join('');
const route=()=>decodeURI(location.hash.replace(/^#/,''))||'/inicio';
const go=r=>{if(route()===r)render();else location.hash='#'+r};
const lessonById=id=>course.semanas.flatMap(w=>w.sesiones).find(s=>s.id===id);
const weekByNum=num=>course.semanas.find(w=>w.numero===Number(num));
const savedAttempts=id=>state.attempts.filter(a=>a.lessonId===id).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
const practiced=id=>state.attempts.some(a=>a.lessonId===id&&a.status==='practiced');
const finished=id=>state.attempts.some(a=>a.lessonId===id&&(a.status==='practiced'||a.status==='skipped'));
const practicedCount=()=>course.semanas.flatMap(w=>w.sesiones).filter(s=>practiced(s.id)).length;
const finishedCount=()=>course.semanas.flatMap(w=>w.sesiones).filter(s=>finished(s.id)).length;
const completedWeek=w=>w.sesiones.filter(s=>finished(s.id)).length;
const nextLesson=()=>course.semanas.flatMap(w=>w.sesiones).find(s=>!finished(s.id))||course.semanas[11].sesiones[6];
const timeTag=n=>state.preferences.hideTimes?'':`<span class="tag">${icon('clock',13)} ${n} min aprox.</span>`;
const b=(txt,to,kind='primary',extra='')=>`<a class="btn ${kind==='primary'?'':kind}" href="#${to}" ${extra}>${txt}</a>`;
const btn=(txt,action,kind='secondary',extra='')=>`<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${txt}</button>`;
function persist(){
 const snapshot=structuredClone(state);lastSaving++;
 const mark=lastSaving;
 saveQueue=saveQueue.catch(()=>{}).then(()=>saveState(snapshot)).then(()=>{
   if(mark===lastSaving){storageError='';savedIndicator('Guardado',false)}
 }).catch(e=>{storageError=e.message||'Fallo de guardado'; savedIndicator('Sin guardar',true);});
 savedIndicator('Guardando…',false);
 return saveQueue;
}
function mutate(fn,r=true){fn(state);persist();if(r)render();}
function savedIndicator(msg,bad){const target=document.getElementById('save-indicator');if(target)target.innerHTML=`<span class="status-dot ${bad?'bad':''}"></span>${safe(msg)}`;}
function toast(msg){clearTimeout(toastTimeout);document.querySelector('.toast')?.remove();let el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=msg;document.body.appendChild(el);toastTimeout=setTimeout(()=>el.remove(),3200);}
function applyPrefs(){
 const p=state.preferences;let theme=p.theme;
 if(theme==='system')theme=window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
 document.documentElement.dataset.theme=theme;document.documentElement.dataset.size=p.fontSize;
 document.documentElement.dataset.reducedMotion=p.reduceMotion?'true':'false';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#171b19':'#f5f0e8');
}
const navs=[['inicio','Inicio','home'],['curso','El curso','book'],['herramientas','Herramientas','hourglass'],['proyectos','Mis proyectos','layers'],['diario','Cuaderno','notebook'],['evolucion','Evolución','chart'],['biblioteca','Biblioteca','feather'],['ajustes','Ajustes','settings']];
const activeNav=r=>r.startsWith('/semana/')||r.startsWith('/leccion/')?'curso':r.startsWith('/herramienta/')?'herramientas':r.startsWith('/proyecto/')?'proyectos':r.startsWith('/nota/')?'diario':r.startsWith('/evaluacion/')?'evolucion':r.split('/')[1];
function appFrame(content){
 const nav=activeNav(route());
 return `<div class="wrap"><aside class="sidebar"><a class="brand" href="#/inicio"><span class="brandmark">${icon('hourglass',25)}</span><span><b>PACIENCIA</b><span>EL ARTE DE TARDAR</span></span></a>
 <div><div class="nav-label">Tu espacio</div><nav class="side-nav" aria-label="Navegación principal">${navs.map(([id,name,i])=>`<a href="#/${id}" class="${nav===id?'active':''}" ${nav===id?'aria-current="page"':''}>${icon(i,19)} ${name}</a>`).join('')}</nav></div>
 <div class="side-foot">«No todo lo valioso llega deprisa.»</div></aside>
 <div class="appmain"><header class="topbar"><div class="crumb">El arte de aprender a tardar</div><div class="top-right"><div id="save-indicator" class="save-status"><span class="status-dot ${storageError?'bad':''}"></span>${storageError?'Sin guardar':'Datos locales'}</div><span class="top-symbol">${icon('leaf',20)}</span></div></header>
 ${storageError?`<div class="alertbar" role="alert">${icon('alert',18)} No se ha podido guardar en este dispositivo. Exporta tus datos si es posible.</div>`:''}
 <main class="container" id="main-content">${content}</main></div>
 <nav class="mobile-nav" aria-label="Navegación móvil">${[['inicio','Inicio','home'],['curso','Curso','book'],['herramientas','Ayudas','hourglass'],['proyectos','Taller','layers'],['mas','Más','more']].map(([id,label,i])=>`<a href="#/${id}" class="${nav===id||(id==='mas'&&['diario','evolucion','biblioteca','ajustes','mas'].includes(nav))?'active':''}">${icon(i,21)}<span>${label}</span></a>`).join('')}</nav></div>`;
}
function head(kicker,title,subtitle=''){return `<div class="head-row"><div class="overline">${safe(kicker)}</div><h1>${safe(title)}</h1>${subtitle?`<p class="muted reading">${safe(subtitle)}</p>`:''}</div>`;}
function artwork(){return `<div class="art-ring"></div><svg class="art-hourglass" viewBox="0 0 170 230" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M34 24h102M34 208h102" stroke-width="8"/><path d="M42 28c0 50 43 51 43 89s-43 39-43 87M128 28c0 50-43 51-43 89s43 39 43 87" stroke-width="5"/><path d="M64 57c0 13 21 21 21 43M106 57c0 13-21 21-21 43M61 177l24-18 24 18" stroke-width="3"/><circle cx="85" cy="119" r="4" fill="currentColor" stroke="none"/></svg>`;}
function welcome(){
 return `<div class="splash"><div class="splash-left"><a class="brand" href="#/inicio"><span class="brandmark">${icon('hourglass',24)}</span><span><b>PACIENCIA</b><span>UNA ESCUELA PARA TI</span></span></a>
 <div class="splash-title"><div class="eyebrow">12 capítulos · a tu ritmo</div><h1>Aprende<br>a <em>tardar.</em></h1><p>Para empezar ese libro que parece interminable. Para dibujar sin necesitar acabar hoy. Para esperar sin que la espera decida por ti.</p><p>Un curso completo y un cuaderno personal. Sin rachas, sin fechas límite y sin convertir tus aficiones en obligaciones.</p>
 <details style="margin:24px 0 18px"><summary>¿Qué te gustaría trabajar especialmente?</summary><div class="flex" style="margin-top:9px">${['Proyectos creativos','Esperas','Frustración','Relaciones','Paciencia conmigo'].map((x,i)=>`<label class="choice"><input type="checkbox" name="interest" value="${x}" ${i<2?'checked':''}>${x}</label>`).join('')}</div><p class="mini" style="margin-top:6px">Podrás acceder igualmente al curso entero. Estas preferencias no bloquean nada.</p></details><div class="flex">${btn(`Entrar en mi cuaderno ${icon('arrow',18)}`,'onboard','', 'style="min-width:220px"')}${btn('Hacer una reflexión inicial','onboard-assess','ghost')}</div></div><div class="splash-foot">No necesitas aprender deprisa a tener paciencia.</div></div>
 <div class="splash-right">${artwork()}<div style="position:absolute;bottom:10%;font:italic 1.4rem Georgia,serif;color:var(--sage-dark)">Una cosa cada vez.</div></div></div>`;
}
function home(){let next=nextLesson(),week=weekByNum(next.semana),count=finishedCount();
 return `<section class="hero"><div class="hero-content"><div class="eyebrow">Tu cuaderno de práctica</div><h1>Las cosas buenas<br>también <em style="font-weight:400;color:var(--sage)">tardan.</em></h1><p>No tienes que terminar la obra, el libro ni siquiera esta lección hoy. Solo aprender a estar en el proceso.</p><div class="flex">${b(`Continuar el camino ${icon('arrow',17)}`,`/leccion/${next.id}`)}${b('Ver el curso','/curso','secondary')}</div></div><div class="hero-art">${artwork()}</div></section>
 <div class="section-heading"><div><div class="kicker">Una mirada tranquila</div><h2>Tu recorrido</h2></div><span class="tag sage">A tu ritmo, siempre</span></div>
 <div class="card"><div class="between"><div><div class="overline">Páginas que has recorrido</div><div style="font:2.4rem Georgia,serif;margin:4px 0">${count}<span class="muted" style="font-size:1.3rem"> / 84 sesiones</span></div></div><div class="ring-icon">${icon('leaf',23)}</div></div><div class="progress" role="progressbar" aria-valuenow="${count}" aria-valuemax="84" aria-label="Lecciones practicadas"><span style="width:${count/84*100}%"></span></div><p class="mini" style="margin:13px 0 0">Aquí no hay días perdidos. Puedes retomar cuando quieras.</p></div>
 <div class="section-heading"><h2>¿Qué necesitas hoy?</h2></div><div class="columns3">
 ${(()=>{const options=[
 ['Proyectos creativos','layers','Quiero empezar algo grande','Encontrar un primer movimiento, aunque la obra tarde meses.','/proyectos'],
 ['Esperas','clock','Estoy esperando','Decidir cuándo actuar y cuándo dejar transcurrir el tiempo.','/herramienta/espera'],
 ['Frustración','heart','Me estoy frustrando','Responder a un error sin abandonarlo todo.','/herramienta/error'],
 ['Relaciones','heart','Paciencia con otras personas','Respetar otros ritmos sin renunciar a mis propios límites.','/semana/8'],
 ['Paciencia conmigo','leaf','Paciencia conmigo','Aprender a volver sin castigarme por haber parado.','/semana/9']
 ]; const selected=new Set(state.profile.interests);return options.sort((a,b)=>Number(selected.has(b[0]))-Number(selected.has(a[0]))).map(o=>shortcut(o[1],o[2],o[3],o[4])).join('');})()}
 </div><div class="section-heading"><h2>Tu próxima página</h2><a class="text-link" href="#/curso">Ver capítulos ${icon('arrow',16)}</a></div>
 <a href="#/leccion/${next.id}" class="card card-link" style="display:flex;gap:20px;align-items:center"><span class="week-num">${String(next.semana).padStart(2,'0')}</span><div style="flex:1"><div class="overline">Semana ${next.semana} · Sesión ${next.dia} ${timeTag(next.duracion_estimada_min)}</div><h3 style="margin:7px 0">${safe(next.titulo)}</h3><p class="muted small" style="margin:0">${safe(week.titulo)} · ${safe(next.objetivo)}</p></div>${icon('arrow',23)}</a>
 <div class="section-heading"><h2>Pequeñas cosas, mucho camino</h2></div><div class="columns2">${shortcut('notebook','Escribir en mi cuaderno','Lo que estoy aprendiendo, incluso en un día difícil.','/diario')}${shortcut('chart','Mirar mi evolución','Hechos, reflexiones y cambios sin porcentajes milagrosos.','/evolucion')}</div>`;
}
function shortcut(ic,title,subtitle,path){return `<a class="card card-link tool-card" href="#${path}"><div class="ring-icon">${icon(ic,21)}</div><h3>${safe(title)}</h3><p>${safe(subtitle)}</p><span class="text-link">Abrir ${icon('arrow',16)}</span></a>`;}
function courseIndex(){let total=finishedCount();return `${head('El recorrido','Doce capítulos, tu propio ritmo','Cada capítulo tiene una lectura y siete experiencias distintas. Puedes saltar, repetir o volver a cualquier parte.')}
 <div class="card between" style="margin-bottom:25px"><div><div class="overline">Índice de tu cuaderno</div><p style="font:1.6rem Georgia,serif;margin:8px 0">${total} de 84 sesiones recorridas</p><div class="progress" style="max-width:380px"><span style="width:${total/84*100}%"></span></div></div><span class="ring-icon">${icon('book',22)}</span></div>
 <div class="columns2">${course.semanas.map(w=>`<a class="card card-link week-card" href="#/semana/${w.numero}"><span class="week-num">${String(w.numero).padStart(2,'0')}</span><div class="week-body"><div class="between"><span class="overline">Capítulo ${w.numero}</span><span class="tag ${completedWeek(w)?'sage':''}">${completedWeek(w)}/7</span></div><h3>${safe(w.titulo)}</h3><p>${safe(w.objetivo)}</p><div class="progress"><span style="width:${completedWeek(w)/7*100}%"></span></div></div></a>`).join('')}</div>`;}
function weekScreen(n){let w=weekByNum(n);if(!w)return missing();return `<div class="backline"><a class="text-link" href="#/curso">${icon('left',16)} Todos los capítulos</a></div>${head(`Capítulo ${String(n).padStart(2,'0')} de 12`,w.titulo,w.objetivo)}
 <div class="card"><div class="between"><div class="kicker">Antes de practicar</div><span class="tag sage">Lectura del capítulo</span></div><h2 style="margin:9px 0 22px">Un poco de perspectiva</h2><div class="article reading">${desc(w.lectura)}</div></div>
 <div class="section-heading"><h2>Las siete sesiones</h2><span class="tag">${completedWeek(w)} recorridas</span></div>
 <div class="card">${w.sesiones.map(s=>`<a class="list-row" href="#/leccion/${s.id}"><span class="number-dot ${finished(s.id)?'done':''}">${finished(s.id)?icon('check',17):String(s.dia).padStart(2,'0')}</span><span class="row-main"><span class="overline">${safe(s.fase)} · Sesión ${s.dia}</span><h3>${safe(s.titulo)}</h3><p>${safe(s.objetivo)}</p></span>${icon('chevron',19)}</a>`).join('')}</div>
 <div class="actions-footer">${n>1?b(`${icon('left',16)} Capítulo anterior`,`/semana/${n-1}`,'secondary'):''}${n<12?b(`Siguiente capítulo ${icon('arrow',16)}`,`/semana/${n+1}`,'secondary'):''}</div>`;}
function lessonScreen(id){const s=lessonById(id);if(!s)return missing();const related=savedAttempts(id),active=related.find(a=>a.status==='started'),complete=related.filter(a=>a.status==='practiced').length;
 const all=course.semanas.flatMap(w=>w.sesiones),idx=all.findIndex(x=>x.id===id),prev=all[idx-1],next=all[idx+1];
 return `<div class="backline"><a class="text-link" href="#/semana/${s.semana}">${icon('left',16)} Capítulo ${s.semana}</a></div><div class="reading">${head(`Capítulo ${s.semana} · Sesión ${s.dia} · ${s.fase}`,s.titulo,s.objetivo)}<div class="flex">${timeTag(s.duracion_estimada_min)}<span class="tag">${related.length} ${related.length===1?'intento':'intentos'}</span>${complete?'<span class="tag sage">Ya practicada</span>':''}</div>
 <div class="section-heading"><h2>01. Entender</h2></div><div class="lesson-text">${desc(s.explicacion)}</div>
 <div class="section-heading"><h2>02. Probar</h2></div><div class="card"><div class="kicker">Una práctica para hoy</div><div class="lesson-text">${desc(s.practica)}</div><details><summary>¿Hoy necesito una versión más pequeña?</summary><p style="padding:8px 0 0">${safe(s.version_minima)}</p></details></div>
 <div class="section-heading"><h2>03. Tu cuaderno</h2></div>
 ${active?`<div class="card gap12"><p class="muted" style="margin:0">No se evalúa si te ha salido bien. Una observación honesta ya es una práctica.</p><div class="field"><label for="lesson-reflection">${safe(s.reflexion)}</label><textarea id="lesson-reflection" class="big" data-attempt-id="${active.id}" data-attempt-field="notes" placeholder="Escribe lo que quieras recordar. Puedes dejarlo vacío.">${safe(active.notes)}</textarea><small>Autoguardado local: puedes cerrar y volver después.</small></div>
 <div class="formgrid"><div class="field"><label for="urge-before">Impaciencia antes (opcional)</label>${rangeInput('urgeBefore',active.urgeBefore,active.id)}</div><div class="field"><label for="urge-after">Impaciencia después (opcional)</label>${rangeInput('urgeAfter',active.urgeAfter,active.id)}</div></div>
 <div class="actions-footer">${btn(`${icon('check',17)} Marcar como practicada`,'complete-lesson','',`data-id="${active.id}"`)}${btn('Terminar sin escribir','finish-lesson-no-notes','secondary',`data-id="${active.id}"`)}${btn('Omitir esta sesión','skip-lesson','ghost',`data-id="${active.id}"`)}${b('Guardar para otro día','/curso','ghost')}</div></div>`:
 `<div class="card"><h3>Esta página está disponible cuando quieras.</h3><p class="muted">${complete?'Puedes repetirla creando un nuevo intento. Tus respuestas anteriores se conservarán.':'Puedes abrir un intento y escribir lo que descubras. No es obligatorio responder ni terminar hoy.'}</p>${btn(`${icon(complete?'rotate':'pen',17)} ${complete?'Repetir sesión':'Empezar mi práctica'}`,'start-lesson','',`data-lesson="${id}"`)}</div>`}
 ${related.filter(a=>a.status!=='started').length?`<div class="section-heading"><h2>Mis intentos anteriores</h2></div><div class="card timeline">${related.filter(a=>a.status!=='started').map(a=>`<div class="timeline-item"><div class="between"><strong>${date(a.startedAt)}</strong><span class="tag ${a.status==='practiced'?'sage':''}">${a.status==='practiced'?'Practicada':'Terminada sin escribir'}</span></div>${a.notes?`<p style="white-space:pre-line;overflow-wrap:anywhere;margin:12px 0">${safe(a.notes)}</p>`:'<p class="mini">Sin anotaciones</p>'}${a.urgeBefore!==null||a.urgeAfter!==null?`<p class="mini">Impaciencia subjetiva: ${a.urgeBefore??'—'} → ${a.urgeAfter??'—'}</p>`:''}</div>`).join('')}</div>`:''}
 <div class="actions-footer">${prev?b(`${icon('left',16)} Anterior`,`/leccion/${prev.id}`,'secondary'):''}${next?b(`Siguiente ${icon('arrow',16)}`,`/leccion/${next.id}`,'secondary'):b('Volver al mapa','/curso','secondary')}</div></div>`;
}
function rangeInput(field,value,id){return `<div class="range-wrap"><select aria-label="${field==='urgeBefore'?'Impaciencia antes':'Impaciencia después'}" data-attempt-id="${id}" data-attempt-field="${field}"><option value="">Sin responder</option>${Array.from({length:11},(_,i)=>`<option value="${i}" ${value===i?'selected':''}>${i} / 10</option>`).join('')}</select></div><small>0 = nada · 10 = muy intensa. No es un test.</small>`;}
function toolsScreen(){return `${head('Recursos para el momento','Una caja de herramientas','No tienes que estar en calma para usarlas. Elige la que encaje con lo que está ocurriendo ahora.')}
 <div class="columns2">${course.herramientas.map((t,i)=>shortcut(['pause','target','clock','heart','rotate'][i],t.nombre,({ 'antes-de-abandonar':'Cuando quieres dejarlo todo a medias.','primer-paso':'Cuando una obra entera parece demasiado grande.','espera':'Cuando otra cosa o persona marca el tiempo.','error':'Cuando algo sale mal y quieres rendirte.','volver':'Cuando llevas tiempo sin abrir un proyecto.'})[t.id],`/herramienta/${t.id}`)).join('')}</div><div class="notice sep-space">Estas herramientas no sustituyen una atención profesional ni deben emplearse para retrasar respuestas ante urgencias o necesidades de seguridad.</div>`;}
function toolScreen(id){const tool=course.herramientas.find(x=>x.id===id);if(!tool)return missing();let previous=state.toolUses.filter(u=>u.toolId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
 return `<div class="backline"><a class="text-link" href="#/herramientas">${icon('left',16)} Todas las herramientas</a></div>${head('Una ayuda cuando la necesites',tool.nombre,'No hay respuestas correctas. Puedes usar esta guía las veces que quieras.')}
 <div class="split"><div><form class="card stack" data-form="tool" data-tool="${id}"><div class="overline">Un paso cada vez</div>${tool.instrucciones.map((q,i)=>`<div class="field"><label for="tool-${i}"><span class="overline">${String(i+1).padStart(2,'0')}</span><br>${safe(q)}</label><textarea id="tool-${i}" name="response-${i}" rows="2" style="min-height:80px" placeholder="Lo que observes, si te apetece…">${safe(ui.toolDrafts[id]?.[i]||'')}</textarea></div>`).join('')}<div class="actions-footer"><button class="btn" type="submit">${icon('check',17)} Guardar este momento</button>${btn('Cerrar sin guardar','close-tool','ghost')}</div></form>
 ${id==='espera'?`<div class="card sep-space"><div class="overline">Opcional · Un intervalo breve</div><h3 style="margin:8px 0">Puedo dejar pasar un minuto</h3><p class="muted">No hace falta mirar la cuenta atrás. Úsala solo si te ayuda, y nunca para aplazar algo urgente.</p><div class="flex"><button id="timer-start" class="btn secondary" data-action="timer-start">${icon('play',15)} Iniciar 60 segundos</button>${btn('Detener','timer-stop','ghost')}<span id="wait-timer" role="status" aria-live="off" style="font:1.5rem Georgia,serif">—</span></div></div>`:''}
 </div><div><div class="card soft"><div class="kicker">Para recordar</div><h3>Una respuesta distinta basta.</h3><p>La intención no es borrar el malestar ni hacer todo de una vez. Se trata de recuperar un margen para elegir qué hacer.</p><a class="text-link" href="#/leccion/s01-d01">Visitar la primera sesión ${icon('arrow',16)}</a></div>
 ${previous.length?`<div class="section-heading"><h3>Otras veces</h3></div><div class="card timeline">${previous.map(u=>`<div class="timeline-item"><strong>${date(u.createdAt)}</strong>${u.responses.filter(Boolean).slice(0,2).map(x=>`<p class="small" style="margin:8px 0;white-space:pre-line;overflow-wrap:anywhere">${safe(x)}</p>`).join('')||'<p class="mini">Sin anotaciones</p>'}</div>`).join('')}</div>`:''}</div></div>`;
}
function projectCard(p){let sessions=state.projectSessions.filter(x=>x.projectId===p.id).length;return `<a class="card card-link" href="#/proyecto/${p.id}"><div class="project-head"><span class="ring-icon">${icon('layers',21)}</span><div style="flex:1"><div class="between"><span class="overline">${p.archived?'Archivado':'En marcha'}</span><span class="tag">${sessions} ${sessions===1?'registro':'registros'}</span></div><h3 style="margin-top:10px">${safe(p.name)}</h3></div></div><p class="muted small" style="margin:16px 0 6px">Mi siguiente movimiento</p><p style="font-weight:680">${safe(p.nextAction||'Todavía por decidir')}</p><div class="between"><span class="tag">${safe(p.phase||'Exploración')}</span><span class="text-link">Abrir ${icon('arrow',16)}</span></div></a>`;}
function projectsScreen(){const active=state.projects.filter(p=>!p.archived).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)), archived=state.projects.filter(p=>p.archived);
 return `${head('El taller','Las grandes cosas se hacen por partes','Aquí caben esa novela, ese diseño, ese juego o cualquier obra que merezca tiempo. Sin fechas de entrega impuestas.')}
 <div class="split"><div><div class="section-heading" style="margin-top:0"><h2>Mis proyectos</h2><span class="tag">${active.length} abiertos</span></div>
 ${active.length?`<div class="stack">${active.map(projectCard).join('')}</div>`:`<div class="card empty"><div class="ring-icon">${icon('layers',21)}</div><h3>Una página por empezar</h3><p>Elige algo que te apetezca construir, aunque tardes meses. Solo necesitas decidir su primer movimiento.</p></div>`}
 ${archived.length?`<details class="card sep-space"><summary>Proyectos archivados (${archived.length})</summary><div class="stack sep-space">${archived.map(projectCard).join('')}</div></details>`:''}</div>
 <div><form class="card stack" data-form="create-project"><div class="kicker">Abrir una carpeta nueva</div><h3>¿Qué te gustaría crear?</h3><div class="field"><label for="new-project-name">Nombre del proyecto</label><input id="new-project-name" name="name" required maxlength="150" placeholder="Mi primera novela, una ilustración…"></div><div class="field"><label for="new-project-why">¿Por qué te importa?</label><textarea id="new-project-why" name="why" rows="3" placeholder="Quiero contar esta historia porque…"></textarea></div><div class="field"><label for="new-project-next">¿Cuál es la próxima acción pequeña?</label><input id="new-project-next" name="nextAction" placeholder="Escribir una escena, probar una paleta…"></div><button class="btn" type="submit">${icon('plus',16)} Crear proyecto</button><p class="mini">Sin fecha límite. Puedes modificar o archivar el proyecto cuando quieras.</p></form></div></div>`;
}
function projectScreen(id){let p=state.projects.find(p=>p.id===id);if(!p)return missing();let sessions=state.projectSessions.filter(x=>x.projectId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return `<div class="backline"><a class="text-link" href="#/proyectos">${icon('left',16)} Mis proyectos</a></div>${head('Mi taller personal',p.name,p.why||'Un proyecto al que puedes volver sin recuperar ningún día perdido.')}
 <div class="split"><div><div class="card"><div class="kicker">La siguiente cosa, no todas</div><h2>${safe(p.nextAction||'Elige un paso sencillo.')}</h2><p class="muted">${safe(p.returnBridge||'No tienes que terminarlo para que esta sesión haya valido la pena.')}</p><div class="flex"><span class="tag sage">${safe(p.phase)}</span><span class="tag">${sessions.length} experiencias registradas</span></div></div>
 <div class="section-heading"><h2>Registrar una sesión</h2></div><form class="card stack" data-form="project-session" data-project="${p.id}"><p class="muted">Aunque solo hayas abierto un archivo o tomado una decisión, eso también cuenta.</p><div class="field"><label for="work-did">¿Qué has hecho o intentado?</label><textarea id="work-did" name="action" required placeholder="Hoy he…" rows="2"></textarea></div><div class="field"><label for="work-learned">¿Qué has descubierto?</label><textarea id="work-learned" name="learning" placeholder="Me he dado cuenta de…" rows="2"></textarea></div><div class="field"><label for="work-next">Deja un puente para volver</label><input id="work-next" name="next" placeholder="La próxima vez puedo…"></div><button class="btn" type="submit">${icon('check',17)} Guardar esta sesión</button></form>
 <div class="section-heading"><h2>El camino recorrido</h2></div>${sessions.length?`<div class="card timeline">${sessions.map(s=>`<div class="timeline-item"><div class="overline">${date(s.createdAt)}</div><strong>${safe(s.action)}</strong>${s.learning?`<p class="muted small" style="white-space:pre-line;margin:8px 0">${safe(s.learning)}</p>`:''}${s.next?`<p class="small"><b>Para volver:</b> ${safe(s.next)}</p>`:''}</div>`).join('')}</div>`:`<div class="card"><p class="no-data">Tu historia con este proyecto empieza aquí. No existe una cantidad mínima de trabajo.</p></div>`}</div>
 <div><form class="card stack" data-form="edit-project" data-project="${p.id}"><div class="kicker">Ficha del proyecto</div><div class="field"><label>Nombre</label><input name="name" required maxlength="150" value="${safe(p.name)}"></div><div class="field"><label>Por qué me importa</label><textarea name="why" rows="3">${safe(p.why)}</textarea></div><div class="field"><label>Fase actual</label><select name="phase">${['Exploración','Primeros pasos','En construcción','Revisión','En pausa','Terminado a mi ritmo'].map(v=>`<option ${p.phase===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Próxima acción</label><textarea name="nextAction" rows="2">${safe(p.nextAction)}</textarea></div><div class="field"><label>Puente de regreso</label><textarea name="returnBridge" rows="3" placeholder="Cuando vuelva, abro el archivo y…">${safe(p.returnBridge||'')}</textarea><small>Una indicación amable para tu yo de dentro de dos semanas.</small></div><button type="submit" class="btn">${icon('check',17)} Guardar cambios</button>${btn(p.archived?'Restaurar proyecto':'Archivar proyecto',p.archived?'restore-project':'archive-project','ghost',`data-id="${p.id}"`)}</form></div></div>`;
}
function diaryScreen(){let list=state.journal.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));let q=ui.journalSearch.toLocaleLowerCase('es');if(q)list=list.filter(n=>[n.title,n.text].some(x=>x.toLocaleLowerCase('es').includes(q)));
 if(ui.journalFilter!=='all')list=list.filter(n=>n.projectId===ui.journalFilter);
 return `${head('El cuaderno','Palabras para volver','Escribe con libertad. Nadie va a corregir tus notas, medir tus palabras ni decirte cuántos días llevas sin escribir.')}
 <div class="flex" style="margin-bottom:23px">${b(`${icon('plus',17)} Página nueva`,'/nota/nueva')}</div>
 <div class="card" style="margin-bottom:23px"><div class="formgrid"><div class="field"><label for="diary-search">Buscar una palabra</label><input id="diary-search" data-ui="journalSearch" type="search" placeholder="Busca en tus páginas…" value="${safe(ui.journalSearch)}"></div><div class="field"><label for="diary-project-filter">Filtrar por proyecto</label><select id="diary-project-filter" data-ui="journalFilter"><option value="all">Todos los proyectos</option>${state.projects.map(p=>`<option value="${p.id}" ${ui.journalFilter===p.id?'selected':''}>${safe(p.name)}</option>`).join('')}</select></div></div></div>
 ${list.length?`<div class="columns2" id="journal-list">${list.map(n=>`<a href="#/nota/${n.id}" class="card card-link"><div class="between"><span class="overline">${date(n.createdAt)}</span>${n.projectId?`<span class="tag">${safe(state.projects.find(p=>p.id===n.projectId)?.name||'Proyecto')}</span>`:''}</div><h3 style="margin:15px 0 10px">${safe(n.title||'Sin título')}</h3><div class="journal-preview">${safe(n.text||'Una página en blanco…')}</div><span class="text-link" style="margin-top:20px">Abrir página ${icon('arrow',15)}</span></a>`).join('')}</div>`:`<div class="card empty"><div class="ring-icon">${icon('notebook',22)}</div><h3>${q?'No hay coincidencias':'Todavía hay páginas en blanco'}</h3><p>${q?'Prueba con otra búsqueda.':'Escribe una frase, una observación o algo que te apetezca dejar aquí.'}</p>${!q?b('Crear una página','/nota/nueva'):''}</div>`}`;
}
function noteScreen(id){let n=id==='nueva'?null:state.journal.find(x=>x.id===id);if(id!=='nueva'&&!n)return missing();ui.currentDraftId=n?.id||null;
 return `<div class="backline"><a class="text-link" href="#/diario">${icon('left',16)} Todas mis páginas</a></div><div class="reading">${head('Cuaderno personal',n?'Volver a una página':'Una página nueva','Se guarda automáticamente mientras escribes, incluso si todavía no tiene título.')}
 <div class="card stack"><div class="field"><label for="note-title">Título (opcional)</label><input id="note-title" data-note-field="title" maxlength="200" placeholder="Una cosa que hoy quiero recordar" value="${safe(n?.title||'')}"></div>
 <div class="field"><label for="note-project">Relacionado con un proyecto (opcional)</label><select id="note-project" data-note-field="projectId"><option value="">Sin proyecto</option>${state.projects.map(p=>`<option value="${p.id}" ${n?.projectId===p.id?'selected':''}>${safe(p.name)}</option>`).join('')}</select></div>
 <div class="field"><label for="note-text">Mi página</label><textarea id="note-text" class="big" data-note-field="text" placeholder="Hoy me he dado cuenta de…">${safe(n?.text||'')}</textarea><small>Todo queda en este dispositivo. Puedes hacer una copia en Ajustes.</small></div>
 <div class="between"><span class="mini" id="note-status">${n?'Última edición: '+date(n.updatedAt):'Se guardará al escribir'}</span><div class="flex">${n?btn(`${icon('trash',16)} Borrar página`,'delete-note','danger',`data-id="${n.id}"`):''}${b('Volver al cuaderno','/diario','secondary')}</div></div></div></div>`;
}
function assessmentScreen(kind){let label=kind==='inicial'?'Mi punto de partida':'Una nueva mirada';const existing=state.assessments.filter(a=>a.kind===(kind==='inicial'?'baseline':'followup')).at(-1);
 return `<div class="backline"><a class="text-link" href="#/evolucion">${icon('left',16)} Mi evolución</a></div>${head('Autoobservación · opcional',label,course.autoevaluacion.instruccion)}
 <div class="card reading"><div class="notice">No es un test clínico. Las respuestas sirven para reflexionar, no para obtener una nota. 0 = casi nunca · 4 = casi siempre.</div>
 <form data-form="assessment" data-kind="${kind}" class="sep-space"><div class="stack">${course.autoevaluacion.items.map((item,i)=>`<div class="assessment-question"><div class="overline">Pregunta ${i+1} de 6</div><p style="font-weight:680;margin:7px 0">${safe(item.texto)}</p><div class="rating" role="group" aria-label="${safe(item.texto)}">${course.autoevaluacion.escala.map(v=>`<label title="${safe(v.etiqueta)}"><input type="radio" name="${item.id}" value="${v.valor}" ${existing?.answers[item.id]===v.valor?'checked':''} required><span>${v.valor}</span></label>`).join('')}</div><div class="mini">0 Casi nunca · 1 Pocas veces · 2 A veces · 3 A menudo · 4 Casi siempre</div></div>`).join('')}</div>
 <div class="actions-footer"><button type="submit" class="btn">${icon('check',17)} Guardar mi reflexión</button>${b('No quiero responder','/evolucion','ghost')}</div></form></div>`;}
function insightsScreen(){const lastBase=state.assessments.filter(a=>a.kind==='baseline').at(-1),lastFollow=state.assessments.filter(a=>a.kind==='followup').at(-1);
 let unique=practicedCount(),repeats=state.attempts.filter(a=>a.status==='practiced').length-unique;
 return `${head('Evolución personal','Aprender no es ir en línea recta','Esta página muestra hechos y observaciones. Un día impaciente no borra lo que has aprendido.')}
 <div class="card"><div class="kicker">Pequeños hechos reales</div><div class="stats-line"><div><strong>${unique}</strong><span>Lecciones practicadas</span></div><div><strong>${Math.max(0,repeats)}</strong><span>Prácticas repetidas</span></div><div><strong>${state.toolUses.length}</strong><span>Herramientas usadas</span></div></div><hr class="divider"><div class="stats-line"><div><strong>${state.projectSessions.length}</strong><span>Sesiones de proyecto</span></div><div><strong>${state.projects.length}</strong><span>Proyectos abiertos o archivados</span></div><div><strong>${state.journal.length}</strong><span>Páginas escritas</span></div></div></div>
 <div class="section-heading"><h2>Cómo me veo hoy</h2></div><div class="card"><p class="muted">Compara cada respuesta por separado. Son percepciones subjetivas y los cambios no demuestran por sí solos la causa.</p><div class="flex">${b(lastBase?'Repetir punto de partida':'Hacer punto de partida','/evaluacion/inicial','secondary')}${b('Nueva autoobservación','/evaluacion/seguimiento')}</div>
 ${lastBase||lastFollow?`<hr class="divider"><div class="overline" style="margin-bottom:15px">Comparación de respuestas (0–4)</div>${course.autoevaluacion.items.map(q=>`<div class="assessment-question"><p style="font-weight:640">${safe(q.texto)}</p><div class="flex"><span class="tag">Antes: ${lastBase?.answers[q.id]??'—'}</span><span class="tag sage">Después: ${lastFollow?.answers[q.id]??'—'}</span></div></div>`).join('')}`:`<p class="no-data sep-space">Todavía no has hecho ninguna autoobservación. Puedes saltártela sin problema.</p>`}</div>
 <div class="section-heading"><h2>Lo que significa avanzar</h2></div><div class="card soft"><div class="quote" style="margin:0">Poder volver después de parar también es paciencia.</div><p class="muted sep-space">No medimos cuánta paciencia tienes como si fuese una habilidad fija. Observamos si has probado respuestas diferentes, empezado cosas difíciles o sido capaz de regresar.</p></div>`;
}
function libraryScreen(){let q=ui.librarySearch.trim().toLocaleLowerCase('es');const ws=course.semanas.filter(w=>`${w.titulo} ${w.lectura}`.toLocaleLowerCase('es').includes(q));const lessons=course.semanas.flatMap(w=>w.sesiones).filter(s=>`${s.titulo} ${s.explicacion} ${s.tags.join(' ')}`.toLocaleLowerCase('es').includes(q));
 return `${head('La biblioteca','Todas las páginas, siempre abiertas','Para encontrar un concepto, volver a una lectura o escoger lo que más necesitas practicar.')}
 <div class="card"><div class="field"><label for="library-search">Buscar en el curso</label><input id="library-search" data-ui="librarySearch" type="search" placeholder="Proceso, esperas, novela, frustración…" value="${safe(ui.librarySearch)}"></div></div>
 <div class="section-heading"><h2>Lecturas de capítulos</h2><span class="tag">${ws.length}</span></div><div class="columns2">${ws.map(w=>`<a href="#/semana/${w.numero}" class="card card-link book-index"><div><div class="overline">Capítulo ${w.numero}</div><h3 style="margin:5px 0">${safe(w.titulo)}</h3></div>${icon('arrow',17)}</a>`).join('')||'<p class="muted">No hay lecturas con esas palabras.</p>'}</div>
 <div class="section-heading"><h2>Lecciones</h2><span class="tag">${lessons.length}</span></div><div class="card">${lessons.map(s=>`<a class="list-row" href="#/leccion/${s.id}"><span class="number-dot">${s.dia}</span><span class="row-main"><div class="overline">Semana ${s.semana} · ${safe(s.fase)}</div><h3>${safe(s.titulo)}</h3></span>${icon('chevron',17)}</a>`).join('')||'<p>No hay lecciones con esas palabras.</p>'}</div>`;
}
function moreScreen(){return `${head('Tu espacio','Más rincones del cuaderno','Todo sigue aquí cuando vuelvas.')}
 <div class="columns2">${[['diario','Cuaderno','notebook','Escribir y releer mis páginas.'],['evolucion','Evolución','chart','Reconocer mis pasos sin exigencias.'],['biblioteca','Biblioteca','feather','Todas las lecturas y sesiones.'],['ajustes','Ajustes','settings','Aspecto, datos y copias de seguridad.']].map(([id,name,i,d])=>shortcut(i,name,d,`/${id}`)).join('')}</div>`;}
function settingsScreen(){const p=state.preferences;return `${head('Ajustes','Un cuaderno a tu manera','Aquí puedes cambiar cómo lees, hacer copias de seguridad y decidir qué permanece guardado.')}
 <div class="split"><div class="stack"><div class="card stack"><div class="kicker">Lo que quieres trabajar más</div><p class="muted small">Las áreas elegidas aparecen primero en los accesos del inicio. El curso siempre incluye todas.</p><div class="flex">${['Proyectos creativos','Esperas','Frustración','Relaciones','Paciencia conmigo'].map(x=>`<label class="choice"><input type="checkbox" data-interest="${x}" ${state.profile.interests.includes(x)?'checked':''}>${x}</label>`).join('')}</div></div><div class="card stack"><div class="kicker">Lectura y apariencia</div><div class="field"><label for="pref-theme">Tema</label><select id="pref-theme" data-pref="theme">${[['system','Seguir el dispositivo'],['light','Papel claro'],['dark','Tinta oscura']].map(([v,t])=>`<option value="${v}" ${p.theme===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="pref-size">Tamaño del texto</label><select id="pref-size" data-pref="fontSize">${[['normal','Normal'],['large','Grande'],['xlarge','Muy grande']].map(([v,t])=>`<option value="${v}" ${p.fontSize===v?'selected':''}>${t}</option>`).join('')}</select></div>
 <label class="setup-choice"><input type="checkbox" data-pref="hideTimes" ${p.hideTimes?'checked':''}><span><strong>Ocultar las duraciones orientativas</strong><br><span class="muted small">Para no pensar en minutos si eso te desanima.</span></span></label>
 <label class="setup-choice"><input type="checkbox" data-pref="reduceMotion" ${p.reduceMotion?'checked':''}><span><strong>Reducir las animaciones</strong><br><span class="muted small">Menos movimiento visual.</span></span></label></div>
 <div class="card stack"><div class="kicker">Tus datos, tus decisiones</div><h3>Copias de seguridad</h3><p class="muted">Todo se guarda en este navegador, no en GitHub. Puedes exportar un archivo y luego importarlo en el iPhone o en otro ordenador. No se sincronizan automáticamente.</p>${btn(`${icon('download',17)} Exportar mis datos`,'export','')}
 <div class="field"><label for="import-file">Importar una copia JSON</label><input id="import-file" type="file" accept=".json,application/json"><small>Se validará antes de sustituir los datos actuales. La importación requiere confirmación.</small></div>
 <hr class="divider"><h3>Empezar desde cero</h3><p class="muted">Borrar significa perder las notas, prácticas y proyectos de este dispositivo, salvo que tengas una copia exportada.</p>${btn(`${icon('trash',17)} Borrar todos los datos`,'reset','danger')}</div></div>
 <div class="stack"><div class="card soft"><div class="kicker">Un espacio privado</div><h3>Sin cuenta. Sin anuncios. Sin prisas.</h3><p>Esta app no envía tus textos a un servidor. GitHub Pages publica la aplicación, pero las anotaciones personales permanecen en el almacenamiento local del navegador.</p><p>Eliminar los datos del navegador, cambiar de origen web o desinstalar la app puede borrar el cuaderno. Exporta una copia con regularidad.</p></div><div class="card"><div class="kicker">Sobre el curso</div><p>12 capítulos, 84 sesiones, 12 lecturas y cinco herramientas. Inspirado en habilidades de observación, flexibilidad cognitiva, aceptación y acción gradual.</p><p class="muted small">Material educativo, no diagnóstico ni tratamiento psicológico. No existe una «puntuación de paciencia» validada por esta aplicación.</p><div class="overline">Lecturas orientativas</div>${course.fuentes_orientativas.map(f=>`<p class="small" style="margin:10px 0"><a class="link" href="${safe(f.url)}" target="_blank" rel="noopener noreferrer">${safe(f.organizacion)} · ${safe(f.titulo)} ${icon('arrow',13)}</a></p>`).join('')}</div></div></div>`;}
function missing(){return `<div class="card empty"><div class="ring-icon">${icon('book',23)}</div><h2>Esta página no existe</h2><p>Puede que se haya movido. El cuaderno sigue en su sitio.</p>${b('Ir al inicio','/inicio')}</div>`;}
function render(){
 if(!course||!state)return;
 applyPrefs();
 const current=route();
 if(!state.profile.onboarded){root.innerHTML=welcome();return;}
 if(workingRoute!==current){stopTimer();workingRoute=current;window.scrollTo({top:0,behavior:'instant'});}
 const parts=current.split('/').filter(Boolean);
 let content;
 switch(parts[0]){
 case 'inicio':content=home();break;
 case 'curso':content=courseIndex();break;
 case 'semana':content=weekScreen(Number(parts[1]));break;
 case 'leccion':content=lessonScreen(parts[1]);break;
 case 'herramientas':content=toolsScreen();break;
 case 'herramienta':content=toolScreen(parts[1]);break;
 case 'proyectos':content=projectsScreen();break;
 case 'proyecto':content=projectScreen(parts[1]);break;
 case 'diario':content=diaryScreen();break;
 case 'nota':content=noteScreen(parts[1]);break;
 case 'evolucion':content=insightsScreen();break;
 case 'evaluacion':content=assessmentScreen(parts[1]);break;
 case 'biblioteca':content=libraryScreen();break;
 case 'ajustes':content=settingsScreen();break;
 case 'mas':content=moreScreen();break;
 default:content=missing();
 }
 root.innerHTML=appFrame(content);
}
function startLesson(id){let existing=savedAttempts(id).find(a=>a.status==='started');if(existing){toast('Tu práctica está disponible para continuar.');return;}
 mutate(s=>s.attempts.push({id:uid(),lessonId:id,startedAt:now(),completedAt:null,status:'started',notes:'',urgeBefore:null,urgeAfter:null}));
}
function endLesson(id,status){mutate(s=>{let a=s.attempts.find(a=>a.id===id);if(a){a.status=status;a.completedAt=now();}});toast(status==='practiced'?'Práctica registrada. Puedes volver cuando quieras.':'Sesión cerrada. No tienes que escribir para seguir.');}
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function startTimer(){stopTimer();let remaining=60;const label=document.getElementById('wait-timer');if(!label)return;
 const draw=()=>{if(document.getElementById('wait-timer'))document.getElementById('wait-timer').textContent=remaining>0?`${remaining} s`:'Ya puedes elegir qué hacer ahora.';};draw();
 timer=setInterval(()=>{remaining--;draw();if(remaining<=0)stopTimer();},1000);
}
function saveNoteInput(el){const field=el.dataset.noteField;if(!field)return;
 let n=state.journal.find(x=>x.id===ui.currentDraftId);
 if(!n){n={id:uid(),title:'',text:'',projectId:null,createdAt:now(),updatedAt:now()};state.journal.push(n);ui.currentDraftId=n.id;
   if(route()==='/nota/nueva')history.replaceState(null,'','#/nota/'+n.id);
 }
 n[field]=field==='projectId'?(el.value||null):el.value;n.updatedAt=now();persist();
 const noteStatus=document.getElementById('note-status');if(noteStatus)noteStatus.textContent='Guardando tu página…';
}
function rememberInputFocus(){let current=document.activeElement;if(!current||!current.id)return ()=>{};
 let id=current.id,atStart,atEnd;
 try{atStart=current.selectionStart;atEnd=current.selectionEnd}catch{};
 return ()=>{const target=document.getElementById(id);if(target){target.focus({preventScroll:true});if(atStart!==undefined&&atEnd!==undefined)try{target.setSelectionRange(atStart,atEnd)}catch{}}};
}
function captureToolDraft(form){const t=form.dataset.tool;if(!t)return;
 ui.toolDrafts[t]=[...form.querySelectorAll('textarea')].map(x=>x.value);
}
document.addEventListener('input',event=>{
 const el=event.target;if(!(el instanceof HTMLElement))return;
 if(el.dataset.attemptField){const a=state.attempts.find(a=>a.id===el.dataset.attemptId);if(a){let field=el.dataset.attemptField;a[field]=field==='notes'?el.value:(el.value===''?null:Number(el.value));persist();}return;}
 if(el.dataset.noteField){saveNoteInput(el);return;}
 if(el.dataset.ui){ui[el.dataset.ui]=el.value;const restore=rememberInputFocus();render();restore();return;}
 if(el.closest('form[data-form="tool"]'))captureToolDraft(el.closest('form'));
});
document.addEventListener('change',event=>{
 const el=event.target;if(!(el instanceof HTMLElement))return;
 if(el.dataset.interest){mutate(s=>{const set=new Set(s.profile.interests);if(el.checked)set.add(el.dataset.interest);else set.delete(el.dataset.interest);s.profile.interests=[...set];});toast('Área actualizada');return;}
 if(el.dataset.pref){const k=el.dataset.pref,v=el.type==='checkbox'?el.checked:el.value;mutate(s=>s.preferences[k]=v);toast('Preferencia guardada');return;}
 if(el.dataset.noteField)saveNoteInput(el);
 if(el.dataset.attemptField){const a=state.attempts.find(a=>a.id===el.dataset.attemptId);if(a){a[el.dataset.attemptField]=el.value===''?null:Number(el.value);persist();}return;}
 if(el.dataset.ui){ui[el.dataset.ui]=el.value;render();return;}
 if(el.id==='import-file'&&el.files?.[0])importFromFile(el.files[0]);
});
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action;
 switch(action){
 case 'onboard':
 case 'onboard-assess':{
   const interests=[...document.querySelectorAll('input[name="interest"]:checked')].map(i=>i.value);
   mutate(s=>{s.profile.onboarded=true;s.profile.interests=interests.length?interests:['Proyectos creativos','Esperas'];});
   go(action==='onboard'?'/inicio':'/evaluacion/inicial');toast('Bienvenida a tu cuaderno.');break;
 }
 case 'start-lesson':startLesson(target.dataset.lesson);break;
 case 'complete-lesson':endLesson(target.dataset.id,'practiced');break;
 case 'skip-lesson':endLesson(target.dataset.id,'skipped');break;
 case 'finish-lesson-no-notes':endLesson(target.dataset.id,'practiced');toast('Sesión terminada sin necesidad de escribir.');break;
 case 'close-tool':delete ui.toolDrafts[route().split('/')[2]];go('/herramientas');break;
 case 'timer-start':startTimer();break;
 case 'timer-stop':stopTimer();const t=document.getElementById('wait-timer');if(t)t.textContent='Detenido';break;
 case 'archive-project':mutate(s=>{const p=s.projects.find(p=>p.id===target.dataset.id);p.archived=true;p.updatedAt=now();});toast('Proyecto archivado. Puedes recuperarlo.');break;
 case 'restore-project':mutate(s=>{const p=s.projects.find(p=>p.id===target.dataset.id);p.archived=false;p.updatedAt=now();});toast('Proyecto restaurado.');break;
 case 'delete-note':{
   if(!confirm('¿Borrar esta página definitivamente? Esta acción no se puede deshacer.'))return;
   const id=target.dataset.id;mutate(s=>s.journal=s.journal.filter(n=>n.id!==id),false);ui.currentDraftId=null;go('/diario');toast('Página borrada.');break;
 }
 case 'export':downloadBackup();break;
 case 'reset':{
   if(!confirm('¿Borrar todo tu cuaderno local? Se perderán lecciones, proyectos y notas. Exporta una copia primero si quieres conservarlos.'))return;
   if(!confirm('Última confirmación: ¿borrar definitivamente todos los datos de PACIENCIA en este dispositivo?'))return;
   const clean=newState();await replaceState(clean);toast('Cuaderno reiniciado.');break;
 }
 }
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement)||!form.dataset.form)return;
 e.preventDefault();const data=new FormData(form),str=k=>String(data.get(k)||'').trim();
 switch(form.dataset.form){
 case 'create-project':{
   if(!str('name'))return toast('Escribe un nombre para el proyecto.');
   const id=uid();mutate(s=>s.projects.push({id,name:str('name'),why:str('why'),nextAction:str('nextAction'),phase:'Exploración',returnBridge:'',archived:false,createdAt:now(),updatedAt:now()}),false);
   go(`/proyecto/${id}`);toast('Ya tienes un lugar para ese proyecto.');break;
 }
 case 'edit-project':{
   const id=form.dataset.project;mutate(s=>{const p=s.projects.find(x=>x.id===id);if(!p)return;p.name=str('name');p.why=str('why');p.phase=str('phase');p.nextAction=str('nextAction');p.returnBridge=str('returnBridge');p.updatedAt=now();});toast('Ficha del proyecto guardada.');break;
 }
 case 'project-session':{
   if(!str('action'))return toast('Escribe qué has hecho o intentado.');
   const id=form.dataset.project;mutate(s=>{s.projectSessions.push({id:uid(),projectId:id,createdAt:now(),action:str('action'),learning:str('learning'),next:str('next')});let p=s.projects.find(x=>x.id===id);if(p){if(str('next')){p.nextAction=str('next');p.returnBridge=str('next');}p.updatedAt=now();}});toast('Un paso más en tu camino.');break;
 }
 case 'tool':{
   const id=form.dataset.tool;let responses=course.herramientas.find(t=>t.id===id).instrucciones.map((_,i)=>str(`response-${i}`));
   delete ui.toolDrafts[id];mutate(s=>s.toolUses.push({id:uid(),toolId:id,createdAt:now(),responses}));toast('Momento guardado en tu cuaderno.');break;
 }
 case 'assessment':{
   const answers={};for(const item of course.autoevaluacion.items){const value=data.get(item.id);if(value===null)return toast('Puedes responder a todas o salir sin guardar.');answers[item.id]=Number(value);}
   const kind=form.dataset.kind==='inicial'?'baseline':'followup';mutate(s=>s.assessments.push({id:uid(),kind,createdAt:now(),answers}),false);go('/evolucion');toast('Reflexión guardada, sin puntuaciones ni juicios.');break;
 }
 }
});
function downloadBackup(){try{
 const obj=makeBackup(state);const json=JSON.stringify(obj,null,2);const blob=new Blob([json],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`paciencia-copia-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
 toast('Copia descargada. Consérvala en un lugar seguro.');
 }catch(e){toast('No se pudo exportar: '+e.message);}}
async function replaceState(newData){
 const snapshot=structuredClone(newData);
 try{saveQueue=saveQueue.catch(()=>{}).then(()=>saveState(snapshot));await saveQueue;state=snapshot;storageError='';render();}
 catch(e){storageError=e.message;render();alert('No se pudieron reemplazar los datos: '+e.message);}
}
async function importFromFile(file){
 if(file.size>10_000_000)return alert('El archivo supera el límite de 10 MB. No se ha modificado ningún dato.');
 try{
   const text=await file.text();const parsed=JSON.parse(text);const imported=validateBackup(parsed);
   const summary=`Esta copia contiene ${imported.attempts.length} intentos, ${imported.journal.length} páginas, ${imported.projects.length} proyectos y ${imported.toolUses.length} registros de herramientas.\n\nSustituirá TODOS los datos actuales de este dispositivo. ¿Continuar?`;
   if(!confirm(summary))return toast('Importación cancelada: no se ha modificado nada.');
   await replaceState(imported);toast('Copia importada correctamente.');
 }catch(e){alert('No se importó el archivo. Tu cuaderno sigue intacto.\n\n'+(e.message||String(e)));}
 finally{const input=document.getElementById('import-file');if(input)input.value='';}
}
window.addEventListener('hashchange',render);
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state?.preferences.theme==='system')applyPrefs()});
async function setupPWA(){
 if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
 try{
   const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
   const signal=()=>{if(reg.waiting&&navigator.serviceWorker.controller){
     let bar=document.getElementById('updatebar');if(bar)return;
     bar=document.createElement('div');bar.className='alertbar';bar.id='updatebar';bar.innerHTML=`Hay una versión nueva del cuaderno disponible. <button class="btn small" id="update-button">Actualizar ahora</button>`;
     document.body.prepend(bar);document.getElementById('update-button').onclick=async()=>{await saveQueue.catch(()=>{});reg.waiting?.postMessage('SKIP_WAITING');};
   }};
   if(reg.waiting)signal();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',signal));
   let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});
 }catch(e){console.warn('No se pudo activar el modo sin conexión:',e);}
}
async function init(){
 try{
   const [content,loaded]=await Promise.all([
      fetch('./contenido/curso.json').then(r=>{if(!r.ok)throw Error('No se encontró el contenido del curso.');return r.json();}),
      loadState().catch(e=>{storageError=e.message;return newState();})
   ]);
   if(content.semanas?.length!==12||content.semanas.some(w=>w.sesiones?.length!==7))throw Error('El curso está incompleto.');
   course=content;state=loaded;render();setupPWA();
 }catch(e){root.innerHTML=`<div class="loading-view"><div class="card reading"><h2>No hemos podido abrir el cuaderno</h2><p>${safe(e.message)}</p><p>Si acabas de abrirlo por primera vez, necesitas conexión. Después de esa primera carga, funcionará sin internet.</p><button class="btn" onclick="location.reload()">Reintentar</button></div></div>`;}
}
init();
