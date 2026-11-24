/* Starting with Soleil — data capture (xAPI 1.0.3).
   Every statement is kept on the player's device (localStorage). If an LRS is set in config.js,
   statements are also sent there in small batches. Unsent statements wait on the device and are
   sent on the next visit.

   How the records read in the LRS:
   - Actor: "Player 4f2a" (an anonymous id kept on the device). One game = one registration.
   - Verbs: initialized, experienced (a step), viewed (information or a tip), answered (a step's choices),
     passed / failed (one scored choice), scored (one learning objective), completed (a season or the game).
   - Every activity has a plain name and a description that says where it is (season · team).
   - Scored choices carry their learning objective as a category, so the LRS can filter by objective.
   - Grouping: the game, the season and, if the link had ?cohort=name, the cohort. */
(function () {
  const CFG = window.BP_CONFIG || {};
  const BASE = (CFG.activityBase || 'https://starting-with-soleil.example/game').replace(/\/$/, '');
  const STORE = 'bp_sessions_v1';
  const QUEUE = 'soleil_lrs_queue_v1';
  const LRS_ON = !!(CFG.lrs && CFG.lrs.endpoint && CFG.lrs.auth);

  const VERBS = {
    initialized: ['http://adlnet.gov/expapi/verbs/initialized', 'started'],
    experienced: ['http://adlnet.gov/expapi/verbs/experienced', 'started step'],
    viewed: ['http://id.tincanapi.com/verb/viewed', 'opened'],
    selected: ['http://id.tincanapi.com/verb/selected', 'selected'],
    unselected: ['http://id.tincanapi.com/verb/unselected', 'unselected'],
    answered: ['http://adlnet.gov/expapi/verbs/answered', 'answered'],
    passed: ['http://adlnet.gov/expapi/verbs/passed', 'got right'],
    failed: ['http://adlnet.gov/expapi/verbs/failed', 'got wrong'],
    scored: ['http://adlnet.gov/expapi/verbs/scored', 'scored'],
    completed: ['http://adlnet.gov/expapi/verbs/completed', 'completed']
  };
  // Clicks that are only steps toward an answer stay on the device. The "answered" statement carries the final choices.
  const LOCAL_ONLY = new Set(['selected', 'unselected']);

  const TYPES = {
    game: 'http://adlnet.gov/expapi/activities/simulation',
    season: 'http://adlnet.gov/expapi/activities/module',
    step: 'http://adlnet.gov/expapi/activities/interaction',
    info: 'http://id.tincanapi.com/activitytype/resource',
    decision: 'http://adlnet.gov/expapi/activities/question',
    objective: 'http://adlnet.gov/expapi/activities/objective',
    cohort: 'http://id.tincanapi.com/activitytype/group'
  };

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
  };

  let playerId;
  try { playerId = localStorage.getItem('bp_player') || uuid(); localStorage.setItem('bp_player', playerId); } catch (e) { playerId = uuid(); }
  const playerName = 'Player ' + playerId.replace(/-/g, '').slice(0, 4);
  const params = new URLSearchParams(location.search);
  const cohort = (params.get('cohort') || '').trim().slice(0, 60);
  const session = {
    sessionId: uuid(), playerId, playerName, cohort,
    gameVersion: CFG.gameVersion || '', startedAt: new Date().toISOString(), statements: []
  };
  const all = ls.get(STORE, []);
  all.push(session);
  ls.set(STORE, all);

  const activity = (path, name, type, description) => {
    const def = { name: { 'en-US': name || path } };
    if (type) def.type = TYPES[type] || type;
    if (description) def.description = { 'en-US': description };
    return { objectType: 'Activity', id: `${BASE}/${path}`, definition: def };
  };
  const GAME = activity('game', 'Starting with Soleil', 'game', 'Onboarding game for frontline teams at Soleil Systems (a fictional company).');
  const ext = o => { const r = {}; for (const k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[`${BASE}/ext/${k}`] = o[k]; return r; };

  /* track(verb, path, name, result, extensions, options)
     options: { type, description, season: {id, name}, parent: {path, name, type}, objective: {n, text} } */
  function track(verb, path, name, result, extensions, o = {}) {
    const grouping = [GAME];
    if (o.season) grouping.push(activity(`season/${o.season.id}`, o.season.name, 'season'));
    if (cohort) grouping.push(activity(`cohort/${encodeURIComponent(cohort)}`, `Cohort: ${cohort}`, 'cohort'));
    const contextActivities = { grouping };
    if (o.parent) contextActivities.parent = [activity(o.parent.path, o.parent.name, o.parent.type)];
    if (o.objective) contextActivities.category = [activity(`objective/${o.objective.n}`, `Objective ${o.objective.n}: ${o.objective.text}`, 'objective')];
    const st = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      actor: { objectType: 'Agent', name: playerName, account: { homePage: BASE, name: playerId } },
      verb: { id: VERBS[verb][0], display: { 'en-US': VERBS[verb][1] } },
      object: path === 'game' ? GAME : activity(path, name, o.type, o.description),
      context: {
        registration: session.sessionId,
        platform: 'Starting with Soleil (web)',
        language: 'en-US',
        contextActivities,
        extensions: ext(Object.assign({ cohort, version: session.gameVersion }, extensions || {}))
      }
    };
    if (result) st.result = result;
    session.statements.push(st);
    persist();
    if (LRS_ON && !LOCAL_ONLY.has(verb)) enqueue(st);
    return st;
  }

  function persist() {
    const list = ls.get(STORE, []);
    const i = list.findIndex(x => x.sessionId === session.sessionId);
    if (i >= 0) list[i] = session; else list.push(session);
    ls.set(STORE, list);
  }

  /* ---- sending to the LRS: batched, retried, kept on the device until accepted ---- */
  let queue = LRS_ON ? ls.get(QUEUE, []) : [];
  let timer = null, sending = false, backoff = 5000;
  const status = { sent: 0, waiting: queue.length, lastError: null };
  function enqueue(st) {
    queue.push(st); ls.set(QUEUE, queue); status.waiting = queue.length;
    clearTimeout(timer);
    timer = setTimeout(flush, queue.length >= 25 ? 0 : 2500);
  }
  async function flush(keepalive = false) {
    if (!LRS_ON || sending || !queue.length) return;
    sending = true;
    const batch = queue.slice(0, 50);
    try {
      const res = await fetch(CFG.lrs.endpoint.replace(/\/?$/, '/') + 'statements', {
        method: 'POST', keepalive,
        headers: { 'Content-Type': 'application/json', 'X-Experience-API-Version': '1.0.3', Authorization: CFG.lrs.auth },
        body: JSON.stringify(batch)
      });
      // 409 means the LRS already has these statement ids (sent before a reload): treat as delivered.
      if (!res.ok && res.status !== 409) throw new Error('LRS answered ' + res.status);
      const sentIds = new Set(batch.map(s => s.id));
      queue = queue.filter(s => !sentIds.has(s.id)); ls.set(QUEUE, queue);
      status.sent += batch.length; status.waiting = queue.length; status.lastError = null; backoff = 5000;
      sending = false;
      if (queue.length) flush(keepalive);
    } catch (e) {
      status.lastError = String(e.message || e); sending = false;
      timer = setTimeout(flush, backoff); backoff = Math.min(backoff * 2, 60000);
    }
  }
  if (LRS_ON) {
    if (queue.length) setTimeout(flush, 1500); // left over from an earlier visit
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', () => flush(true));
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.BP_TRACK = {
    track, VERBS, session, status, flush,
    exportSession() { download(`soleil-${session.sessionId.slice(0, 8)}.json`, [session]); },
    exportAll() { download('soleil-all-sessions.json', ls.get(STORE, [])); },
    allSessions: () => ls.get(STORE, [])
  };
})();
