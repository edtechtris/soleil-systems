/* Starting with Soleil — data capture.
   Every decision writes an xAPI statement. Statements are kept on the device
   (localStorage) and, if an LRS is set in config.js, also sent there. */
(function () {
  const CFG = window.BP_CONFIG || {};
  const BASE = (CFG.activityBase || 'https://starting-with-soleil.example/game').replace(/\/$/, '');
  const STORE = 'bp_sessions_v1';

  const VERBS = {
    initialized: 'http://adlnet.gov/expapi/verbs/initialized',
    experienced: 'http://adlnet.gov/expapi/verbs/experienced',
    viewed: 'http://id.tincanapi.com/verb/viewed',
    selected: 'http://id.tincanapi.com/verb/selected',
    unselected: 'http://id.tincanapi.com/verb/unselected',
    responded: 'http://adlnet.gov/expapi/verbs/responded',
    evaluated: 'http://www.tincanapi.co.uk/verbs/evaluated',
    completed: 'http://adlnet.gov/expapi/verbs/completed'
  };

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } }
  function save(all) { try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { /* storage unavailable: keep in memory */ } }

  let playerId;
  try { playerId = localStorage.getItem('bp_player') || uuid(); localStorage.setItem('bp_player', playerId); } catch (e) { playerId = uuid(); }
  const params = new URLSearchParams(location.search);
  const session = {
    sessionId: uuid(), playerId, cohort: params.get('cohort') || '',
    gameVersion: CFG.gameVersion || '', startedAt: new Date().toISOString(), statements: []
  };
  const memory = load();
  memory.push(session);
  save(memory);

  function actor() {
    return { objectType: 'Agent', account: { homePage: location.origin || BASE, name: playerId } };
  }

  function track(verb, path, name, result, ext) {
    const st = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      actor: actor(),
      verb: { id: VERBS[verb], display: { 'en-US': verb } },
      object: { objectType: 'Activity', id: `${BASE}/${path}`, definition: { name: { 'en-US': name || path } } },
      context: {
        registration: session.sessionId,
        contextActivities: { grouping: [{ id: BASE, definition: { name: { 'en-US': 'Starting with Soleil' } } }] },
        extensions: Object.assign({ [`${BASE}/ext/cohort`]: session.cohort, [`${BASE}/ext/version`]: session.gameVersion }, prefix(ext || {}))
      }
    };
    if (result) st.result = result;
    session.statements.push(st);
    persist();
    send(st);
    return st;
  }
  function prefix(o) { const r = {}; for (const k in o) r[`${BASE}/ext/${k}`] = o[k]; return r; }

  function persist() {
    const all = load();
    const i = all.findIndex(x => x.sessionId === session.sessionId);
    if (i >= 0) all[i] = session; else all.push(session);
    save(all);
  }

  const queue = [];
  function send(st) {
    if (!CFG.lrs || !CFG.lrs.endpoint) return;
    queue.push(st);
    flush();
  }
  let sending = false;
  async function flush() {
    if (sending || !queue.length) return;
    sending = true;
    const batch = queue.splice(0, queue.length);
    try {
      const res = await fetch(CFG.lrs.endpoint + 'statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Experience-API-Version': '1.0.3', Authorization: CFG.lrs.auth },
        body: JSON.stringify(batch)
      });
      if (!res.ok) throw new Error(res.status);
    } catch (e) { queue.unshift(...batch); setTimeout(() => { sending = false; flush(); }, 5000); return; }
    sending = false;
    if (queue.length) flush();
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.BP_TRACK = {
    track, VERBS, session,
    exportSession() { download(`soleil-${session.sessionId.slice(0, 8)}.json`, [session]); },
    exportAll() { download('soleil-all-sessions.json', load()); },
    allSessions: load
  };
})();
