import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newState,validateBackup,makeBackup,migrateState} from '../app/store.js';
const course=JSON.parse(fs.readFileSync(new URL('../contenido/curso.json',import.meta.url),'utf8'));
test('Doce capítulos, 84 sesiones únicas, siete por capítulo',()=>{
 assert.equal(course.semanas.length,12);
 const all=course.semanas.flatMap(w=>w.sesiones);
 assert.equal(all.length,84);
 assert.equal(new Set(all.map(s=>s.id)).size,84);
 assert.ok(course.semanas.every(w=>w.sesiones.length===7));
 assert.ok(all.every(s=>['titulo','explicacion','practica','reflexion','version_minima'].every(k=>typeof s[k]==='string'&&s[k].length>12)));
 assert.ok(course.semanas.every(w=>w.lectura.length>1000));
 assert.equal(course.herramientas.length,5);
 assert.equal(course.autoevaluacion.items.length,6);
});
test('Copia completa y formato válido',()=>{
 const state=newState();state.journal.push({id:'abc',title:'Hola',text:'Mi texto',projectId:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 const backup=makeBackup(state);const loaded=validateBackup(backup);
 assert.deepEqual(loaded,state);assert.notEqual(loaded,state);
});
test('Importación corrupta no se acepta',()=>{
 const b=makeBackup(newState());b.payload.attempts=[{id:'x'}];
 assert.throws(()=>validateBackup(b),/intento/);
 b.payload.attempts=[];b.payload.journal=[{id:'x',title:'bien',text:123}];
 assert.throws(()=>validateBackup(b),/nota/);
});
test('Duplicados y versiones futuras se rechazan',()=>{
 const b=makeBackup(newState());b.payload.projects=[{id:'x',name:'a',nextAction:''},{id:'x',name:'b',nextAction:''}];
 assert.throws(()=>validateBackup(b),/duplicados/);
 b.schemaVersion=99;assert.throws(()=>validateBackup(b),/compatible/);
});
test('Estado previo se completa en migración',()=>{
 const from=migrateState({schemaVersion:1,attempts:[{id:'a'}]});
 assert.equal(from.attempts.length,1);
 assert.ok(Array.isArray(from.journal));assert.equal(from.preferences.theme,'system');
});
test('GitHub Pages: manifest usa rutas relativas y assets precargados',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url)));
 assert.equal(m.start_url,'./#/inicio');assert.equal(m.scope,'./');
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/paciencia-offline-1\.0\.1/);
 const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/id="curso-embebido"/);assert.doesNotMatch(index,/script type="module" src/);
 const embedded=index.match(/<script id="curso-embebido" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),course);
});
