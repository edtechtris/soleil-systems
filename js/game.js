/* Starting with Soleil — game engine (v0.2).
   Flow: title → welcome → meet the teams → meet Dana → seasons (steps) → season replay → year end.
   Each step: Arrive (one thing to start with) → Investigate (clues appear) → Decide (actions appear from clues) → Pass it on. */
(function () {
  const C = window.BP_CONTENT, T = window.BP_TRACK;
  const app = document.getElementById('app');
  const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter'];
  const STUCK_MS = 40000;

  /* ---------- helpers ---------- */
  const val = (v, s) => (typeof v === 'function' ? v(s) : v);
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content; };
  const $ = (sel, root = app) => root.querySelector(sel);
  const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
  const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const FACE = f => `${C.ART}dana-${f === 'happy' ? 'neutral' : f}.webp`; // the happy portrait isn't used
  const moodFace = m => m >= 80 ? 'happy' : m >= 60 ? 'neutral' : m >= 45 ? 'meh' : m >= 30 ? 'impatient' : 'angry';
  /* names used in the data, so records in the LRS read plainly */
  const seasonCtx = id => ({ id, name: C.SEASONS[id].name });
  const stepLabel = step => `${C.SEASONS[step.season].name} · ${C.ROLES[step.role].name}`;
  const stepParent = step => ({ path: `step/${step.id}`, name: `${stepLabel(step)}: ${val(step.title, S)}`, type: 'step' });
  const OUTCOME = { caught: 'Checked the information, then chose it', guessed: 'Chose it without checking the information', missed: 'Missed it', avoided: 'Avoided it', fell_for: 'Chose it (a wrong action)' };
  const moodWord = m => m >= 80 ? 'Happy' : m >= 60 ? 'Okay' : m >= 45 ? 'Frustrated' : m >= 30 ? 'Fed up' : 'Upset';

  /* ---------- sound ---------- */
  const SFX = {};
  ['phone_ring', 'text_ping', 'pass_it_on', 'season_change'].forEach(k => { SFX[k] = new Audio(`assets/audio/sfx_${k}.mp3`); SFX[k].preload = 'auto'; });
  let soundOn = true; try { soundOn = localStorage.getItem('soleil_sound') !== 'off'; } catch (e) {}
  let ringLoop = null, voice = null;
  function sfx(k, vol = 0.6) { if (!soundOn) return; const a = SFX[k].cloneNode(); a.volume = vol; a.play().catch(() => {}); }
  function ring(on) {
    clearInterval(ringLoop); ringLoop = null;
    if (on) { sfx('phone_ring', 0.45); ringLoop = setInterval(() => sfx('phone_ring', 0.45), 3200); }
  }
  function stopVoice() { if (voice) { voice.pause(); voice = null; } }

  /* ---------- state ---------- */
  let S;
  function newState() {
    return { mood: C.startMood, days: {}, flags: {}, messages: [], results: [], stepIndex: 0, season: 'spring',
      today: null, rolesPlayed: new Set(), prompts: new Set(), seasonMood: {}, seenTexts: 0 };
  }

  /* ---------- frame ---------- */
  function render(inner, opts = {}) {
    ring(false); stopVoice();
    const season = opts.season || (S && S.season) || 'spring';
    app.className = `season-${season}`;
    app.innerHTML = '';
    app.appendChild(h(`
      <div class="frame ${opts.wide ? 'wide' : ''}">
        <i class="glass tl"></i><i class="glass tr"></i><i class="glass bl"></i><i class="glass br"></i>
        <header class="topbar">
          <div class="brand"><img src="assets/ui/mark.svg" alt=""><b>Soleil Systems</b><span>Starting with Soleil</span></div>
          <div class="topright">
            ${opts.noSeason ? '' : `<span class="season-pill"><img src="${C.SEASONS[season].icon}" alt="">${C.SEASONS[season].name}</span>`}
            <button class="iconbtn" id="sound" aria-pressed="${soundOn}" title="Sound on/off">${soundOn ? '🔊' : '🔈'}</button>
          </div>
        </header>
        <div class="content"></div>
      </div>
      <div class="landscape" aria-hidden="true"></div>`));
    $('.content').appendChild(typeof inner === 'string' ? h(inner) : inner);
    $('#sound').onclick = () => {
      soundOn = !soundOn; try { localStorage.setItem('soleil_sound', soundOn ? 'on' : 'off'); } catch (e) {}
      $('#sound').textContent = soundOn ? '🔊' : '🔈'; $('#sound').setAttribute('aria-pressed', soundOn);
      if (!soundOn) { ring(false); if (voice) voice.muted = true; } else if (voice) voice.muted = false;
    };
    window.scrollTo(0, 0);
  }

  /* ---------- intro ---------- */
  function title() {
    S = newState();
    render(`
      <section class="screen title-screen">
        <div class="title-art"><img src="${C.ART}house-spring-fixed.webp" alt="A house with solar panels, seen from above"></div>
        <div class="title-card">
          <h1>Starting with Soleil</h1>
          <p class="tag">One homeowner. One year. Every team.</p>
          <button class="btn primary big" id="go">Start</button>
          <p class="fine">Soleil Systems is a fictional company. Your choices are saved on this device to help improve the game.</p>
        </div>
      </section>`, { noSeason: true });
    $('#go').onclick = () => { T.track('initialized', 'game', 'Starting with Soleil', null, { screen: `${innerWidth}x${innerHeight}` }); welcome(); };
  }

  function welcome() {
    render(`
      <section class="screen welcome">
        <h2>Welcome to Soleil Systems</h2>
        <p class="lead">Soleil Systems manages home solar systems. We handle repairs, payments and lease contracts for homeowners.</p>
        <div class="goal">
          <img src="${C.ICON}goal-objective.webp" alt="">
          <div>
            <p>In this game, you work in each of our five frontline teams.</p>
            <p>You handle one homeowner's account for one year.</p>
            <p><b>Your goal:</b> solve her problems quickly and keep her informed.</p>
          </div>
        </div>
        <button class="btn primary" id="next">Meet the teams</button>
      </section>`, { noSeason: true });
    $('#next').onclick = meetTeams;
  }

  function meetTeams() {
    const ids = Object.keys(C.ROLES);
    const seen = new Set();
    render(`
      <section class="screen teams">
        <h2>Meet the five frontline teams</h2>
        <p class="sub">Select each team to see what it does.</p>
        <div class="team-ring">
          <div class="team-house"><img src="${C.ART}house-spring-fixed.webp" alt="Dana's house"></div>
          ${ids.map((id, i) => `<button class="team-badge t${i}" data-id="${id}" style="--role:${C.ROLES[id].color}"><img src="${C.ROLES[id].icon}" alt=""><span>${C.ROLES[id].name}</span></button>`).join('')}
          <div class="team-info" hidden></div>
        </div>
        <div class="team-foot">
          <span class="pips">${ids.map(() => '<i></i>').join('')}</span>
          <span id="count">Teams viewed: 0 of ${ids.length}</span>
          <button class="btn primary" id="next" disabled>Continue</button>
        </div>
      </section>`, { noSeason: true });
    $$('.team-badge').forEach(b => b.onclick = () => {
      const id = b.dataset.id, r = C.ROLES[id];
      $$('.team-badge').forEach(x => x.classList.toggle('on', x === b));
      b.classList.add('seen'); seen.add(id);
      const info = $('.team-info'); info.hidden = false; info.style.setProperty('--role', r.color);
      info.innerHTML = `<h3>${r.name}</h3><p>${r.line}</p>`;
      $$('.pips i').forEach((p, i) => p.classList.toggle('on', i < seen.size));
      $('#count').textContent = `Teams viewed: ${seen.size} of ${ids.length}`;
      $('#next').disabled = seen.size < ids.length;
      T.track('viewed', `intro/team/${id}`, `Team intro: ${r.name}`, null, null, { type: 'info', description: r.line });
    });
    $('#next').onclick = meetDana;
  }

  function meetDana() {
    render(`
      <section class="screen meet-dana">
        <div class="ring big"><img src="${FACE('neutral')}" alt="Dana Reyes"></div>
        <div class="dana-intro">
          <p class="kicker">Your customer</p>
          <h2>Dana Reyes</h2>
          <p class="addr">18 Alder Lane</p>
          <p class="addr">Customer since 2019</p>
          <p>Dana leases her solar system. Her lease moved to Soleil Systems from the company that installed the system.</p>
          <p>Dana does not know our teams. To her, every call and every email is from Soleil Systems.</p>
          <p class="watch">During the game, Dana's panel shows her mood, how many days she has had a problem, and her texts to us.</p>
          <button class="btn primary" id="next">Start the year</button>
        </div>
      </section>`, { noSeason: true });
    $('#next').onclick = () => seasonCard('spring');
  }

  /* ---------- season card ---------- */
  function seasonCard(season) {
    S.season = season;
    const se = C.SEASONS[season];
    const roles = [...new Set(C.steps.filter(s => s.season === season).map(s => s.role))];
    render(`
      <section class="screen season-card">
        <img class="season-icon" src="${se.icon}" alt="">
        <p class="kicker">${se.name}</p>
        <h2>${se.event}</h2>
        <div class="relay">${roles.map(r => `<span style="--role:${C.ROLES[r].color}"><img src="${C.ROLES[r].icon}" alt="">${C.ROLES[r].name}</span>`).join('<b>→</b>')}</div>
        ${season === 'spring' ? '' : `<p class="sub">${season === 'summer' ? 'From now on, you see the results of your choices at the end of each season.' : season === 'fall' ? 'There are no more tips. You have more information to check and more actions to choose from.' : 'Problems from earlier seasons can affect this season.'}</p>`}
        <button class="btn primary" id="go">Begin</button>
      </section>`, { season });
    sfx('season_change', 0.55);
    $('#go').onclick = () => playStep(C.steps[S.stepIndex]);
  }

  /* ---------- a step ---------- */
  function playStep(step) {
    S.season = step.season;
    S.today = val(step.today, S);
    if (step.daysAtStart && S.days[step.season] == null) S.days[step.season] = step.daysAtStart;
    if (step.daysNow) S.days[step.season] = Math.max(S.days[step.season] || 0, step.daysNow(S));
    const role = C.ROLES[step.role];
    const firstGame = S.stepIndex === 0;
    const firstRole = !S.rolesPlayed.has(step.role);
    const seasonSteps = C.steps.filter(s => s.season === step.season);
    const pos = seasonSteps.indexOf(step);
    const pressure = step.pressure ? val(step.pressure, S) : '';
    const lastInSeason = pos === seasonSteps.length - 1;
    const picked = new Set(), viewed = new Set(), revealed = [];
    const order = shuffle(step.actions);                    // mixed order, per play
    const started = Date.now(), moodBefore = S.mood;
    let startOpened = false, stuckTimer = null, tipShown = false, callRevealed = false;
    const callFace = step.call ? val(step.call.face, S) : null;

    T.track('experienced', `step/${step.id}`, `${stepLabel(step)}: ${val(step.title, S)}`, null,
      { season: step.season, team: role.name, mood: S.mood, gameDate: C.fmt(S.today) },
      { type: 'step', description: `Choose up to ${step.pick} actions.`, season: seasonCtx(step.season) });

    render(`
      <section class="screen play" style="--role:${role.color}">
        <div class="stephead">
          <span class="role-pill"><img src="${role.icon}" alt="">${role.name}</span>
          <span class="date-pill"><img src="${C.ICON}schedule-visit.webp" alt="">Today · ${C.fmt(S.today)}</span>
          ${pressure ? `<span class="pressure"><img src="${C.ICON}waiting.webp" alt="">${esc(pressure)}</span>` : ''}
          <span class="steps">${seasonSteps.map((s, i) => `<i class="${i < pos ? 'done' : i === pos ? 'now' : ''}"></i>`).join('')}</span>
        </div>
        <h2 class="step-title">${esc(val(step.title, S))}</h2>
        <div class="stage">
          <div class="scene">
            <img class="house" src="${val(step.scene, S)}" alt="Dana's house from above">
            <div class="hotspots"></div>
            <div class="viewer" hidden></div>
          </div>
          <aside class="dana-panel">
            <div class="who">
              <div class="ring"><img id="face" src="${FACE(moodFace(S.mood))}" alt="Dana"></div>
              <div><h3>Dana Reyes</h3><p><img src="${C.ICON}home.webp" alt="">18 Alder Lane</p><p><img src="${C.ICON}solar-panels.webp" alt="">Customer since 2019</p></div>
            </div>
            <div class="meters">
              <div class="mood"><span>Mood</span><div class="moodbar"><i style="width:${S.mood}%"></i></div><b>${moodWord(S.mood)}</b></div>
              <div class="days"><span>Days with this problem</span><b>${S.days[step.season] || 0}</b></div>
            </div>
            <div class="phone">${phoneHtml()}</div>
          </aside>
        </div>
        <div class="desk">
          <div class="casefile">
            <h4>Start here</h4>
            <div class="start"></div>
            <div class="clues"></div>
            <div class="tipslot"></div>
          </div>
          <div class="tray">
            <div class="tray-head">
              <h4>Actions</h4>
              <span class="budget" title="How many actions you can choose">Choose ${step.pick} <span class="dots">${'<i></i>'.repeat(step.pick)}</span></span>
            </div>
            <div class="actions"><p class="empty">Actions appear when you open the information on the left.</p></div>
            <button class="btn primary pass" disabled>${lastInSeason ? 'Finish the season' : 'Send to the next team'}</button>
          </div>
        </div>
      </section>`, { season: step.season });

    if (S.messages.length > S.seenTexts) { setTimeout(() => sfx('text_ping', 0.5), 300); S.seenTexts = S.messages.length; }

    /* --- Arrive: one thing to start with --- */
    const st = step.start;
    const kindIcon = { call: 'answer-call', ticket: 'work-order', order: 'work-order', alert: 'issue-alert', email: 'mail' }[st.kind];
    $('.start').innerHTML = `<button class="start-item ${st.kind}"><img src="${C.ICON}${kindIcon}.webp" alt=""><span><b>${esc(st.label)}</b><small>${esc(val(st.sub, S))}</small></span></button>`;
    if (st.kind === 'call') ring(true);
    prompt(firstGame, 'start', $('.start'), 'Select this to start.');
    $('.start-item').onclick = () => {
      if (startOpened) { openClue(st.opens); return; }
      ring(false);
      startOpened = true;
      $('.start-item').classList.add('opened');
      $('.casefile h4').textContent = 'Case file';
      T.track('viewed', `step/${step.id}/start`, val(st.sub, S), null, { kind: st.kind },
        { type: 'info', description: `${stepLabel(step)}: the item the step starts with`, season: seasonCtx(step.season), parent: stepParent(step) });
      showClueList();
      openClue(st.opens);
      if (firstRole && step.tip && step.season === 'spring') showTip(false);
      if (step.tip && step.season === 'summer') stuckTimer = setTimeout(() => { if (!tipShown) offerTip(); }, STUCK_MS);
    };

    /* --- Investigate --- */
    function showClueList() {
      const list = step.clues.filter(c => c.kind !== 'start');
      $('.clues').innerHTML = list.map(c => `
        <button class="clue new ${c.kind}" data-id="${c.id}">
          <img src="${c.icon}" alt=""><span>${esc(c.label)}</span>${c.kind === 'optional' ? '<em>optional</em>' : ''}<i class="newtag">NEW</i>
        </button>`).join('');
      $$('.clue').forEach(b => b.onclick = () => openClue(b.dataset.id));
      // hotspots on the house (only where the player can see the house: field visits)
      $('.hotspots').innerHTML = step.clues.filter(c => c.hotspot).map(c =>
        `<button class="hotspot" data-id="${c.id}" style="left:${c.hotspot.x}%;top:${c.hotspot.y}%" aria-label="${esc(c.label)}"><i></i></button>`).join('');
      $$('.hotspot').forEach(b => b.onclick = () => openClue(b.dataset.id));
      prompt(firstGame, 'clues', $('.clues'), 'Open each item to see more information. Some items add new actions.');
    }

    function openClue(id) {
      const c = step.clues.find(x => x.id === id);
      const first = !viewed.has(id);
      viewed.add(id);
      T.track('viewed', `step/${step.id}/clue/${id}`, c.label, null, { kind: c.kind, secondsIntoStep: Math.round((Date.now() - started) / 1000), actionsPickedSoFar: picked.size },
        { type: 'info', description: `${stepLabel(step)}: ${c.kind === 'optional' ? 'optional information' : 'information'}`, season: seasonCtx(step.season), parent: stepParent(step) });
      $$('.clue').forEach(b => { b.classList.toggle('on', b.dataset.id === id); if (b.dataset.id === id) b.classList.remove('new'); });
      $$('.hotspot').forEach(b => { if (b.dataset.id === id) b.classList.add('seen'); });
      const v = $('.viewer');
      v.hidden = false;
      if (st.kind === 'call' && id === st.opens) {
        v.innerHTML = `<div class="paper call-view">
          <button class="x" aria-label="Close">×</button>
          <div class="callhead"><div class="ring sm"><img src="${FACE(callFace)}" alt=""></div><div><b>Dana Reyes</b><small>On the call</small></div></div>
          <div class="wave"><button class="play" aria-label="Replay">▶</button><span class="bars">${'<i></i>'.repeat(28)}</span></div>
          <p class="quote">“${esc(val(step.call.text, S))}”</p>
        </div>`;
        $('#face').src = FACE(callFace);
        playVoice();
        $(".play", v).onclick = () => playVoice();
      } else {
        v.innerHTML = `<div class="paper"><button class="x" aria-label="Close">×</button><h3><img src="${c.icon}" alt="">${esc(c.label)}</h3>${val(c.body, S)}</div>`;
        if (first) reveal(id);
      }
      $('.x', v).onclick = () => { v.hidden = true; $$('.clue').forEach(b => b.classList.remove('on')); };
    }

    function playVoice() {
      stopVoice();
      const v = $('.viewer');
      const done = () => {
        v.classList.remove('talking'); v.querySelector('.skip')?.remove();
        if (!callRevealed) { callRevealed = true; reveal(st.opens); }
      };
      v.classList.add('talking');
      voice = new Audio(val(step.call.audio, S));
      voice.muted = !soundOn;
      const mine = voice;
      voice.onended = done;
      voice.onerror = () => setTimeout(() => { if (voice === mine) done(); }, 1200);
      voice.play().catch(() => setTimeout(() => { if (voice === mine) done(); }, 1200));
      if (!callRevealed && !v.querySelector('.skip')) { // don't make people wait if the clip stalls
        v.querySelector('.wave').appendChild(h('<button class="skip">Skip</button>'));
        v.querySelector('.skip').onclick = () => { stopVoice(); done(); };
      }
    }

    /* --- Decide: actions appear from the clue they come from --- */
    function reveal(clueId) {
      const fresh = order.filter(a => a.from === clueId && !revealed.includes(a));
      if (!fresh.length) return;
      revealed.push(...fresh);
      drawActions(fresh.map(a => a.id));
      prompt(firstGame, 'actions', $('.tray-head'), `You can choose ${step.pick} actions. Choose the most important ones.`);
    }

    function drawActions(newIds = []) {
      const box = $('.actions');
      box.innerHTML = revealed.map((a, i) => {
        const on = picked.has(a.id);
        const full = picked.size >= step.pick && !on && !(a.group && [...picked].some(p => step.actions.find(x => x.id === p).group === a.group));
        return `<button class="action ${on ? 'on' : ''} ${newIds.includes(a.id) ? 'fresh' : ''}" data-id="${a.id}" data-pos="${i + 1}" ${full ? 'disabled' : ''} aria-pressed="${on}">
          <i class="tick"></i><span>${esc(val(a.label, S))}</span></button>`;
      }).join('');
      $$('.action').forEach(b => b.onclick = () => toggle(b.dataset.id, +b.dataset.pos));
      $$('.dots i').forEach((d, i) => d.classList.toggle('used', i < picked.size));
      $('.pass').disabled = picked.size === 0;
    }

    function toggle(id, position) {
      const a = step.actions.find(x => x.id === id);
      if (picked.has(id)) { picked.delete(id); T.track('unselected', `step/${step.id}/action/${id}`, val(a.label, S)); }
      else {
        if (a.group) [...picked].forEach(p => { const pa = step.actions.find(x => x.id === p); if (pa.group === a.group) { picked.delete(p); T.track('unselected', `step/${step.id}/action/${p}`, val(pa.label, S), null, { replacedBy: id }); } });
        if (picked.size >= step.pick) return;
        picked.add(id);
        T.track('selected', `step/${step.id}/action/${id}`, val(a.label, S), null, { order: picked.size, position, revealedFrom: a.from, cluesViewed: [...viewed] });
      }
      drawActions();
      if (picked.size >= step.pick) prompt(firstGame, 'pass', $('.tray'), 'When you are done, select the button below.', 'up');
    }

    /* --- tips --- */
    function showTip(asked) {
      tipShown = true;
      const t = step.tip;
      $('.tipslot').innerHTML = `<div class="tip"><img src="${t.img}" alt=""><div><b>${esc(t.who)}</b><small>${esc(t.role)}</small><p>“${esc(t.text)}”</p></div></div>`;
      T.track('viewed', `step/${step.id}/tip`, 'Teammate tip', null, { asked: !!asked, secondsIntoStep: Math.round((Date.now() - started) / 1000) },
        { type: 'info', description: `${stepLabel(step)}: ${step.tip.text}`, season: seasonCtx(step.season), parent: stepParent(step) });
    }
    function offerTip() {
      $('.tipslot').innerHTML = `<button class="ask">Need help? Get a tip</button>`;
      $('.ask').onclick = () => showTip(true);
    }

    $('.pass').onclick = () => {
      clearTimeout(stuckTimer); stopVoice(); ring(false);
      S.rolesPlayed.add(step.role);
      finishStep(step, picked, viewed, started, moodBefore, revealed);
    };
  }

  /* first-time prompts: spring, first step only, each shown once */
  function prompt(on, key, anchor, text, cls = '') {
    if (!on || S.prompts.has(key) || !anchor) return;
    S.prompts.add(key);
    $$('.coach').forEach(c => c.remove());
    const el = h(`<div class="coach ${cls}" role="note">${esc(text)}<button aria-label="Dismiss">×</button></div>`).firstElementChild;
    anchor.appendChild(el);
    el.querySelector('button').onclick = e => { e.stopPropagation(); el.remove(); };
    setTimeout(() => el.remove(), 9000);
  }

  function phoneHtml() {
    const msgs = S.messages.slice(-2);
    if (!msgs.length) return `<p class="quiet"><img src="${C.ICON}notification.webp" alt="">No texts from Dana.</p>`;
    return `<p class="label"><img src="${C.ICON}notification.webp" alt="">Dana's texts</p>` + msgs.map(m => `<div class="sms"><small>${C.fmt(m.at)}</small>${esc(m.x)}</div>`).join('');
  }

  /* ---------- scoring ---------- */
  function scoreDecisions(step, picked, viewed) {
    const out = [];
    (step.decisions || []).forEach(d => {
      if (d.when && !d.when(S)) return;
      const ids = val(d.actions, S);
      const chose = ids.some(id => picked.has(id));
      const sawClue = !d.clues.length || d.clues.some(c => viewed.has(c));
      let outcome;
      if (d.type === 'avoid') outcome = chose ? 'fell_for' : 'avoided';
      else outcome = chose ? (sawClue ? 'caught' : 'guessed') : 'missed';
      out.push({ id: d.id, label: d.label, type: d.type, outcome, sawClue, season: step.season, role: step.role, objective: d.objective,
        actionLabels: ids.map(id => val(step.actions.find(a => a.id === id).label, S)) });
    });
    return out;
  }

  function finishStep(step, picked, viewed, started, moodBefore, revealed) {
    const daysBefore = S.days[S.season] || 0;
    const decisions = scoreDecisions(step, picked, viewed);
    const reaction = step.react ? step.react(S, picked) : null;   // before resolve, against what the player saw
    const res = step.resolve(S, picked);
    const record = {
      stepId: step.id, season: step.season, role: step.role, today: C.fmt(S.today),
      picked: [...picked], pickedLabels: [...picked].map(id => val(step.actions.find(a => a.id === id).label, S)),
      viewed: [...viewed], decisions, lines: res.lines, missed: res.missed,
      moodBefore, moodAfter: S.mood, daysAdded: (S.days[S.season] || 0) - daysBefore, ms: Date.now() - started
    };
    S.results.push(record);
    const order = revealed.map(a => a.id);
    T.track('answered', `step/${step.id}`, `${stepLabel(step)}: ${val(step.title, S)}`,
      { response: record.pickedLabels.join('; '), duration: `PT${Math.round(record.ms / 1000)}S` },
      { season: step.season, team: C.ROLES[step.role].name, choices: record.picked, choicePositions: record.picked.map(id => order.indexOf(id) + 1),
        informationOpened: [...viewed], moodBefore, moodAfter: S.mood, daysAdded: record.daysAdded },
      { type: 'step', season: seasonCtx(step.season) });
    decisions.forEach(d => {
      const ok = d.outcome === 'caught' || d.outcome === 'avoided' || d.outcome === 'guessed';
      T.track(ok ? 'passed' : 'failed', `decision/${d.id}`, d.label,
        { success: ok, response: OUTCOME[d.outcome] },
        { season: d.season, team: C.ROLES[d.role].name, decisionType: d.type, outcome: d.outcome, sawClue: d.sawClue, objective: d.objective },
        { type: 'decision', description: `${stepLabel(step)}. ${d.type === 'do' ? 'Correct action' : 'Wrong action to avoid'}: ${d.actionLabels.join(' / ')}`,
          season: seasonCtx(d.season), parent: stepParent(step), objective: { n: d.objective, text: C.OBJECTIVES[d.objective] } });
    });

    S.stepIndex++;
    const next = C.steps[S.stepIndex];
    const go = () => (!next || next.season !== step.season) ? seasonEnd(step.season) : handoff(step.role, next.role, () => playStep(next));
    if (reaction) react(reaction, go); else go();
  }

  /* spring only: Dana's quick reaction */
  function react(r, done) {
    const pop = h(`<div class="overlay"><div class="reaction ${r.text ? 'as-text' : ''}">
      <div class="ring"><img src="${FACE(r.face)}" alt="Dana"></div>
      <div class="bubble">${r.text ? '<small>Text from Dana</small>' : ''}${esc(r.x)}</div>
      <button class="btn primary">Continue</button></div></div>`).firstElementChild;
    app.appendChild(pop);
    if (r.text) sfx('text_ping', 0.5);
    pop.querySelector('button').onclick = () => { pop.remove(); done(); };
  }

  function handoff(from, to, done) {
    const a = C.ROLES[from], b = C.ROLES[to];
    const pop = h(`<div class="overlay"><div class="handoff">
      <p class="kicker">Next team</p>
      <div class="hand"><span style="--role:${a.color}"><img src="${a.icon}" alt="">${a.name}</span><b class="arrow">→</b><span style="--role:${b.color}"><img src="${b.icon}" alt="">${b.name}</span></div>
      <p>You now work in <b>${b.name}</b>.</p>
      <p>You start with the information the last team recorded.</p>
      <button class="btn primary">Continue</button></div></div>`).firstElementChild;
    app.appendChild(pop);
    sfx('pass_it_on', 0.55);
    pop.querySelector('button').onclick = () => { pop.remove(); done(); };
  }

  /* ---------- season end: the chain replay ---------- */
  function seasonEnd(season) {
    sfx('pass_it_on', 0.4);
    S.seasonMood[season] = S.mood;
    const rows = S.results.filter(r => r.season === season).map(r => {
      const role = C.ROLES[r.role];
      const lines = r.lines.map(l => `<li class="${l.t}">${esc(l.x)}</li>`).join('');
      const missed = r.missed.map(m => `<li class="missed">${esc(m)}</li>`).join('');
      return `
        <div class="chain-step" style="--role:${role.color}">
          <div class="chain-badge"><img src="${role.icon}" alt=""><span>${role.name}</span><small>${r.today}</small></div>
          <div class="chain-body">
            <p class="did"><b>You chose:</b> ${r.pickedLabels.map(esc).join(' · ') || 'nothing'}</p>
            <ul>${lines}${missed}</ul>
          </div>
        </div>`;
    }).join('<div class="chain-link" aria-hidden="true"></div>');
    const days = S.days[season] || 0;
    const texts = S.messages.filter(m => m.season === season);
    T.track('completed', `season/${season}`, `${C.SEASONS[season].name}: ${C.SEASONS[season].event}`, { completion: true },
      { season, mood: S.mood, days, texts: texts.length }, { type: 'season', season: seasonCtx(season) });
    const last = season === 'winter';
    const nextS = SEASON_ORDER[SEASON_ORDER.indexOf(season) + 1];
    render(`
      <section class="screen replay">
        <div class="replay-head">
          <div><p class="kicker">${C.SEASONS[season].name} results</p><h2>What each team did, and what happened</h2></div>
          <div class="replay-dana">
            <div class="ring sm"><img src="${FACE(moodFace(S.mood))}" alt=""></div>
            <div><b>${moodWord(S.mood)}</b><small>${days} days with the problem</small>${texts.length ? `<small>${texts.length} text${texts.length > 1 ? 's' : ''} asking for an update</small>` : ''}</div>
          </div>
        </div>
        <div class="chain">${rows}</div>
        <button class="btn primary" id="next">${last ? 'See the year results' : 'Start ' + C.SEASONS[nextS].name.toLowerCase()}</button>
      </section>`, { season });
    $('#next').onclick = () => last ? yearEnd() : seasonCard(nextS);
  }

  /* ---------- year end ---------- */
  function yearEnd() {
    const all = S.results.flatMap(r => r.decisions);
    const count = k => all.filter(d => d.outcome === k).length;
    const totalDays = SEASON_ORDER.reduce((a, s) => a + (S.days[s] || 0), 0);
    // one score per learning objective, so results read by objective in the LRS
    Object.keys(C.OBJECTIVES).forEach(n => {
      const ds = all.filter(d => d.objective === +n), right = ds.filter(d => d.outcome !== 'missed' && d.outcome !== 'fell_for').length;
      T.track('scored', `objective/${n}`, `Objective ${n}: ${C.OBJECTIVES[n]}`,
        { score: { raw: right, min: 0, max: ds.length, scaled: ds.length ? +(right / ds.length).toFixed(3) : 0 } },
        { objective: +n, right, total: ds.length, guessed: ds.filter(d => d.outcome === 'guessed').length },
        { type: 'objective', description: 'Choices tied to this objective that the player got right, out of those that applied in this game.' });
    });
    const right = all.filter(d => d.outcome !== 'missed' && d.outcome !== 'fell_for').length;
    T.track('completed', 'game', 'Starting with Soleil',
      { completion: true, score: { raw: right, min: 0, max: all.length, scaled: all.length ? +(right / all.length).toFixed(3) : 0 } },
      { mood: S.mood, totalDays, texts: S.messages.length, caught: count('caught'), guessed: count('guessed'), missed: count('missed'), avoided: count('avoided'), fellFor: count('fell_for') });
    const seasons = SEASON_ORDER.map(s => `
      <div class="ye-season">
        <b>${C.SEASONS[s].name}</b>
        <div class="ring sm"><img src="${FACE(moodFace(S.seasonMood[s] ?? S.mood))}" alt=""></div>
        <small>${S.days[s] || 0} days</small>
      </div>`).join('');
    const label = { caught: 'Correct', guessed: 'Correct, but did not check', missed: 'Missed', avoided: 'Correctly avoided', fell_for: 'Wrong choice' };
    const rows = all.map(d => `<li class="o-${d.outcome}"><span>${esc(d.label)}</span><em>${label[d.outcome]}</em></li>`).join('');
    render(`
      <section class="screen year-end">
        <h2>Year results</h2>
        <div class="ye-strip">${seasons}</div>
        <div class="ye-points">
          <p>Dana did not see five teams. She saw one company: <b>Soleil Systems</b>.</p>
          <p>Each team started with the information the team before it recorded.</p>
          ${S.messages.length ? `<p>Dana texted ${S.messages.length} time${S.messages.length > 1 ? 's' : ''} to ask for an update.</p>` : '<p>Dana never had to ask for an update.</p>'}
        </div>
        <div class="ye-cols">
          <div class="ye-stats">
            <div><b>${count('caught') + count('avoided')}</b><span>correct choices</span></div>
            <div><b>${count('guessed')}</b><span>correct, but you did not check the information first</span></div>
            <div><b>${count('missed') + count('fell_for')}</b><span>missed or wrong choices</span></div>
            <div><b>${totalDays}</b><span>days Dana had problems</span></div>
          </div>
          <ul class="ye-list">${rows}</ul>
        </div>
        <div class="ye-actions">
          <button class="btn primary" id="again">Play again</button>
          <button class="btn" id="data">Download my choices</button>
          <a class="btn" href="report.html">Team report</a>
        </div>
        <p class="fine">Soleil Systems is a fictional company. This game is one piece of a larger onboarding.</p>
      </section>`, { season: 'winter', noSeason: true });
    $('#again').onclick = () => { S.stepIndex = 0; title(); };
    $('#data').onclick = () => T.exportSession();
  }

  /* dev/testing: ?step=n jumps to a step with default state */
  const params = new URLSearchParams(location.search);
  if (params.has('step')) { S = newState(); S.stepIndex = +params.get('step'); S.flags.field = { tech: 'ray', date: new Date(2025, 3, 17), part: true }; S.flags.fixDate = new Date(2025, 3, 17); S.days.spring = 6; playStep(C.steps[S.stepIndex]); }
  else title();
})();
