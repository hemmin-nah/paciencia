export const SCHEMA = 1;
export const FORMAT = 'paciencia-backup';
export function newState() {
  return {
    schemaVersion: SCHEMA,
    profile: { onboarded: false, interests: ['Proyectos creativos','Esperas'] },
    preferences: { theme: 'system', fontSize: 'normal', hideTimes: false, reduceMotion: false },
    attempts: [], projects: [], projectSessions: [], toolUses: [], journal: [], assessments: []
  };
}
const dataArrays = ['attempts','projects','projectSessions','toolUses','journal','assessments'];
export function migrateState(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return newState();
  if (source.schemaVersion > SCHEMA) throw Error('Esta copia pertenece a una versión más reciente.');
  const def = newState();
  return {
    schemaVersion: SCHEMA,
    profile: { ...def.profile, ...(source.profile && typeof source.profile === 'object' ? source.profile : {}) },
    preferences: { ...def.preferences, ...(source.preferences && typeof source.preferences === 'object' ? source.preferences : {}) },
    ...Object.fromEntries(dataArrays.map(key => [key, Array.isArray(source[key]) ? source[key] : []]))
  };
}
function validRecord(item) { return item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string' && item.id.length < 150; }
export function validateBackup(back) {
  if (!back || back.format !== FORMAT || back.schemaVersion !== SCHEMA || !back.payload || typeof back.payload !== 'object') throw Error('No es una copia compatible de PACIENCIA.');
  const p = back.payload;
  if (p.schemaVersion !== SCHEMA) throw Error('La versión de los datos no es compatible.');
  if (!p.profile || typeof p.profile !== 'object' || typeof p.profile.onboarded !== 'boolean') throw Error('Perfil dañado.');
  if (!p.preferences || typeof p.preferences !== 'object' || !['light','dark','system'].includes(p.preferences.theme)) throw Error('Preferencias dañadas.');
  for (const key of dataArrays) {
    if (!Array.isArray(p[key]) || p[key].length > 100000 || !p[key].every(validRecord)) throw Error(`Datos dañados: ${key}.`);
    if (new Set(p[key].map(x=>x.id)).size !== p[key].length) throw Error(`Identificadores duplicados: ${key}.`);
  }
  const isText = v => typeof v === 'string' && v.length <= 300000;
  const iso = v => typeof v === 'string' && v.length < 100 && Number.isFinite(Date.parse(v));
  const optNum = v => v === null || Number.isInteger(v) && v >= 0 && v <= 10;
  if (!Array.isArray(p.profile.interests) || !p.profile.interests.every(x => isText(x))) throw Error('Preferencias de contexto dañadas.');
  if (!['normal','large','xlarge'].includes(p.preferences.fontSize) || typeof p.preferences.hideTimes !== 'boolean' || typeof p.preferences.reduceMotion !== 'boolean') throw Error('Preferencias dañadas.');
  for (const a of p.attempts) if (!isText(a.lessonId) || !['started','practiced','skipped'].includes(a.status) || !isText(a.notes) || !iso(a.startedAt) || (a.completedAt !== null && !iso(a.completedAt)) || !optNum(a.urgeBefore) || !optNum(a.urgeAfter)) throw Error('Un intento de lección está dañado.');
  for (const j of p.journal) if (!isText(j.text) || !isText(j.title) || !iso(j.createdAt) || !iso(j.updatedAt) || (j.projectId !== null && typeof j.projectId !== 'string')) throw Error('Una nota está dañada.');
  for (const pr of p.projects) if (![pr.name,pr.nextAction,pr.why,pr.phase,pr.returnBridge].every(isText) || !iso(pr.createdAt) || !iso(pr.updatedAt) || typeof pr.archived !== 'boolean') throw Error('Un proyecto está dañado.');
  for (const ps of p.projectSessions) if (![ps.action,ps.learning,ps.next].every(isText) || !isText(ps.projectId) || !iso(ps.createdAt)) throw Error('Una sesión de proyecto está dañada.');
  for (const t of p.toolUses) if (!isText(t.toolId) || !iso(t.createdAt) || !Array.isArray(t.responses) || !t.responses.every(isText)) throw Error('Un registro de herramienta está dañado.');
  for (const a of p.assessments) if (!['baseline','followup'].includes(a.kind) || !iso(a.createdAt) || !a.answers || typeof a.answers !== 'object' || !Object.values(a.answers).every(n => Number.isInteger(n) && n >= 0 && n <= 4)) throw Error('Una evaluación está dañada.');
  const seenProject = new Set(p.projects.map(x => x.id));
  if (p.projectSessions.some(s => !seenProject.has(s.projectId)) || p.journal.some(j => j.projectId && !seenProject.has(j.projectId))) throw Error('Hay notas o sesiones vinculadas a proyectos inexistentes.');
  const json = JSON.stringify(p);
  if (json.length > 15_000_000) throw Error('La copia es demasiado grande.');
  return structuredClone(migrateState(p));
}
export function makeBackup(p) { return { format: FORMAT, schemaVersion: SCHEMA, exportedAt: new Date().toISOString(), payload: structuredClone(p) }; }
const dbName = 'paciencia-cuaderno';
let dbPromise;
function db() {
  if (!('indexedDB' in globalThis)) return Promise.reject(Error('IndexedDB no está disponible.'));
  if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
    const req = indexedDB.open(dbName, SCHEMA);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('state')) req.result.createObjectStore('state'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = undefined; reject(req.error || Error('No se pudo abrir la base de datos.')); };
  });
  return dbPromise;
}
export async function loadState() {
  const d = await db();
  return new Promise((resolve,reject) => {
    const req = d.transaction('state','readonly').objectStore('state').get('main');
    req.onsuccess = () => resolve(migrateState(req.result));
    req.onerror = () => reject(req.error);
  });
}
export async function saveState(state) {
  const d = await db();
  return new Promise((resolve,reject) => {
    const tx = d.transaction('state','readwrite');
    tx.objectStore('state').put(state,'main');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || Error('No se pudieron guardar los datos.'));
    tx.onerror = () => reject(tx.error || Error('No se pudieron guardar los datos.'));
  });
}
