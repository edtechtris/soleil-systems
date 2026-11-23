/* Starting with Soleil — game content (v0.2).
   Soleil Systems is a fictional company. Policies, fees and timelines here are
   game assumptions based on general industry practice, not any real company's process.

   Step schema
   - id, season, role, title
   - today(s): the date shown as "Today"
   - scene(s): house art
   - start: the one thing the step opens with { kind: 'call'|'ticket'|'alert'|'email'|'order', label, sub(s), opens }
       Opening it opens clue `opens` (and, for calls, plays Dana's voice).
   - call: { audio(s), text(s), face(s) }   Care steps only
   - clues: [{ id, label, icon, kind: 'start'|'key'|'optional', body(s) -> html, hotspot? }]
       Clues appear once the start item is open. Actions appear as the clue they come from is opened.
   - actions: [{ id, from: clueId, label(s), group?, show?(s) }]
   - pick: how many actions there is time for
   - tip: { who, img, role, text }   spring: shown the first time a role is played. summer: only if stuck.
   - pressure(s): small chip text (deadline, fee date)
   - react(s, picked): spring only. Dana's quick reaction right after the step.
   - decisions: what the data tracks. type 'do' or 'avoid'. clues = where the evidence is.
   - resolve(s, picked) -> { lines: [{t:'good'|'bad'|'info', x}], missed: [text] }
*/
(function () {
  const P = (picked, id) => picked.has(id);
  const mood = (s, n) => { s.mood = Math.max(0, Math.min(100, s.mood + n)); };
  const wait = (s, n) => { s.days[s.season] = (s.days[s.season] || 0) + n; };
  const text = (s, x) => s.messages.push({ x, season: s.season, at: s.today });

  /* Calendar. Weekdays match a real calendar (Apr 14 is a Monday). The year is never shown. */
  const D = (m, d) => new Date(2025 + (m < 3 ? 1 : 0), m, d);
  const fmt = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayDiff = (a, b) => Math.round((b - a) / 86400000);
  const nextMonday = d => { const x = new Date(d); x.setDate(x.getDate() + ((8 - x.getDay()) % 7 || 7)); return x; };

  const ART = 'assets/art/', ICON = 'assets/icons/';
  const ROLES = {
    care: { name: 'Customer Care', icon: ICON + 'team-customer-care.webp', color: '#2B7C76',
      line: 'Answers homeowner calls and emails. Keeps homeowners updated.' },
    dispatch: { name: 'Dispatch & Scheduling', icon: ICON + 'team-dispatch-scheduling.webp', color: '#6B5AA6',
      line: 'Schedules service visits. Assigns the right technician and parts.' },
    field: { name: 'Field Service', icon: ICON + 'team-field-service.webp', color: '#C4553A',
      line: 'Repairs, removes and reinstalls solar systems at homes.' },
    billing: { name: 'Billing & Collections', icon: ICON + 'team-billing-collections.webp', color: '#B5832A',
      line: 'Manages monthly payments, failed payments and final bills.' },
    accounts: { name: 'Account Services', icon: ICON + 'team-account-services.webp', color: '#3F6E9E',
      line: 'Manages lease contracts, including transfers when a home is sold.' }
  };
  const LEADS = {
    care: { who: 'Imani Okafor', role: 'Care lead', img: ART + 'imani-okafor.webp' },
    dispatch: { who: 'Teddy Albright', role: 'Dispatch lead', img: ART + 'teddy-albright.webp' },
    field: { who: 'Rosa Delgado', role: 'Field lead', img: ART + 'rosa-delgado.webp' }
  };
  const TEAM_TIP = role => ({ who: 'A teammate', role: ROLES[role].name, img: ROLES[role].icon });

  const SEASONS = {
    spring: { name: 'Spring', event: "Dana's solar system stops working", icon: ICON + 'production-stopped.webp', tint: '#7FAF5B' },
    summer: { name: 'Summer', event: "Dana's payment fails", icon: ICON + 'expired.webp', tint: '#D9A23A' },
    fall:   { name: 'Fall', event: 'Dana gets a new roof', icon: ICON + 'solar-panels.webp', tint: '#C4663A' },
    winter: { name: 'Winter', event: 'Dana sells her house', icon: ICON + 'home.webp', tint: '#5A86A8' }
  };

  const chart = (vals, labels, unit, hi) => {
    const max = Math.max(...vals, 1);
    return `<div class="chart" role="img" aria-label="Production chart">` +
      vals.map((v, i) => `<div class="bar"><span style="height:${Math.max(3, Math.round((v / max) * 100))}%" class="${v === 0 ? 'zero' : (hi && hi(v) ? 'low' : '')}"></span><em>${labels[i] || ''}</em></div>`).join('') +
      `</div><p class="unit">${unit}</p>`;
  };
  const card = (title, rows) => `<div class="doc"><h4>${title}</h4>${rows.map(r => `<p>${r}</p>`).join('')}</div>`;
  const img = (src, alt, cls = '') => `<img class="clueimg ${cls}" src="${src}" alt="${alt}">`;

  const sinceFriday = s => dayDiff(D(3, 11), s.today); // spring: Dana's system stopped Fri, Apr 11
  const steps = [
  /* ============================ SPRING ============================ */
  {
    id: 'spring-care', season: 'spring', role: 'care',
    today: () => D(3, 14),
    daysAtStart: 3, // the system stopped on Friday
    title: 'Dana is calling. Her app shows zero.',
    scene: () => ART + 'house-spring-fault.webp',
    start: { kind: 'call', label: 'Answer the call', sub: () => 'Incoming call · Dana Reyes', opens: 'call' },
    call: { audio: () => 'assets/audio/spring_care_call.mp3', face: () => 'neutral',
      text: () => "Hi, this is Dana Reyes on Alder Lane. My solar app has said zero since Friday. I already closed and reopened the app. Oh, and the little box on the side of the garage has a red light blinking, if that matters. Can someone come take a look?" },
    clues: [
      { id: 'call', label: "Dana's call", icon: ICON + 'answer-call.webp', kind: 'start' },
      { id: 'monitoring', label: 'Monitoring', icon: ICON + 'monitoring.webp', kind: 'optional', body: () =>
        chart([3.8, 4.2, 4.0, 0, 0, 0, 0], ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'], 'Peak output, kW') +
        `<p><b>Last check-in:</b> 9 minutes ago.</p><p>Output dropped to 0 on Friday at 2:10 PM.</p>` }
    ],
    pick: 2,
    tip: Object.assign({}, LEADS.care, { text: "Check Monitoring first. It shows if the system is still online." }),
    actions: [
      { id: 'photo', from: 'call', label: 'Ask Dana to text a photo of the box’s lights' },
      { id: 'breaker', from: 'call', label: 'Walk Dana through a breaker reset' },
      { id: 'wifi', from: 'call', label: 'Troubleshoot Dana’s home Wi-Fi' },
      { id: 'next', from: 'call', label: 'Tell Dana what happens next, and when' }
    ],
    decisions: [
      { id: 'spring.care.photo', label: 'Asked for a photo of the inverter lights', type: 'do', actions: ['photo'], clues: ['call'] },
      { id: 'spring.care.wifi', label: 'Skipped Wi-Fi troubleshooting', type: 'avoid', actions: ['wifi'], clues: ['monitoring'] },
      { id: 'spring.care.next', label: 'Told Dana what happens next', type: 'do', actions: ['next'], clues: [] }
    ],
    react(s, p) {
      if (P(p, 'photo')) return { face: 'neutral', x: 'Sending it now. The little screen says E-21.' };
      if (P(p, 'wifi')) return { face: 'confused', x: 'My Wi-Fi’s been fine all week, but okay…' };
      if (!P(p, 'next')) return { face: 'confused', x: 'So… is someone going to call me?' };
      return { face: 'neutral', x: 'Okay. I’ll watch for a call from scheduling.' };
    },
    resolve(s, p) {
      const L = [], M = [];
      s.days.spring = 3; // Fri to Mon
      s.flags.photo = P(p, 'photo'); s.flags.expectSpring = P(p, 'next');
      if (s.flags.photo) L.push({ t: 'good', x: "Dana's photo shows fault code E-21 on an SX-7 inverter. That tells Dispatch which part to send." });
      else M.push('Dana mentioned a red light. A photo would have shown the fault code.');
      if (P(p, 'wifi')) L.push({ t: 'bad', x: 'Twenty minutes on Wi-Fi. Monitoring showed the system was still checking in, so Wi-Fi was never the problem.' });
      if (P(p, 'breaker')) L.push({ t: 'info', x: 'Dana reset the breaker. Nothing changed.' });
      if (s.flags.expectSpring) { L.push({ t: 'good', x: 'Dana knows scheduling will call her by Wednesday.' }); mood(s, 5); }
      else M.push('Nobody told Dana what happens next.');
      return { lines: L, missed: M };
    }
  },
  {
    id: 'spring-dispatch', season: 'spring', role: 'dispatch',
    daysNow: sinceFriday,
    today: () => D(3, 15),
    title: 'A new repair ticket is waiting.',
    scene: () => ART + 'house-spring-fault.webp',
    start: { kind: 'ticket', label: 'Open ticket #4471', sub: () => 'No production · 18 Alder Lane', opens: 'ticket' },
    clues: [
      { id: 'ticket', label: 'Ticket #4471', icon: ICON + 'work-order.webp', kind: 'start', body: s =>
        card('Ticket #4471 · opened Mon, Apr 14', [
          '<b>Issue:</b> no production since Fri. Red light on the inverter.',
          s.flags.photo ? '<b>Photo attached:</b> SX-7 inverter, display reads <b>E-21</b>.' : '<b>Photo:</b> none.',
          s.flags.expectSpring ? '<b>Care told Dana:</b> scheduling will call by Wed.' : '<b>Care notes:</b> none.'
        ]) + (s.flags.photo ? img(ART + 'inverter-fault-e21.webp', 'Inverter showing fault E-21', 'small') : '') },
      { id: 'board', label: 'Tech board', icon: ICON + 'schedule-visit.webp', kind: 'key', body: () =>
        `<div class="week">${['Mon 14', 'Tue 15', 'Wed 16', 'Thu 17', 'Fri 18'].map((d, i) =>
          `<div class="${i === 1 ? 'today' : ''}"><b>${d}</b>${i === 2 ? '<span class="slot">Mia</span>' : ''}${i === 3 ? '<span class="slot">Ray</span>' : ''}</div>`).join('')}</div>` +
        `<div class="people"><div>${img(ICON + 'technician-1.webp', '')}<p><b>Ray Brennan</b><br>SX-7 certified<br>Next opening: Thu, Apr 17</p></div>` +
        `<div>${img(ICON + 'technician-3.webp', '')}<p><b>Mia Torres</b><br>General service<br>Next opening: Wed, Apr 16</p></div></div>` },
      { id: 'parts', label: 'Parts', icon: ICON + 'parts-inventory.webp', kind: 'optional', body: () =>
        card('SX-7 inverter', ['2 in stock at the warehouse.', 'Only <b>SX-7-certified</b> techs may replace this unit.', 'Parts go on the truck when the visit is booked with the fault code.']) }
    ],
    pick: 2,
    tip: Object.assign({}, LEADS.dispatch, { text: 'Read the ticket before you book a technician. The first open time is not always the best choice.' }),
    actions: [
      { id: 'confirm', from: 'ticket', label: 'Call Dana to confirm she’ll be home' },
      { id: 'urgent', from: 'ticket', label: 'Mark the ticket urgent and wait for an earlier opening' },
      { id: 'ray', from: 'board', group: 'tech', label: s => s.flags.photo ? 'Book Ray · Thu, Apr 17, with a replacement SX-7' : 'Book Ray · Thu, Apr 17' },
      { id: 'mia', from: 'board', group: 'tech', label: 'Book Mia · Wed, Apr 16 (first opening)' }
    ],
    decisions: [
      { id: 'spring.dispatch.ray', label: 'Booked the certified tech', type: 'do', actions: ['ray'], clues: ['parts'] },
      { id: 'spring.dispatch.mia', label: "Didn't book the first opening just because it was first", type: 'avoid', actions: ['mia'], clues: ['parts'] },
      { id: 'spring.dispatch.confirm', label: 'Confirmed the visit with Dana', type: 'do', actions: ['confirm'], clues: [] }
    ],
    react(s, p) {
      if (P(p, 'confirm')) return { face: 'happy', x: (P(p, 'mia') ? 'Wednesday? I’m at work, but my neighbor can open the gate.' : 'Thursday works, I’m home all day.') + ' Gate code is 4410. Biscuit barks, but he’s friendly.' };
      if (!s.flags.expectSpring) return { face: 'impatient', text: true, x: 'Is anyone coming? Nobody’s called me.' };
      return null;
    },
    resolve(s, p) {
      const L = [], M = [];
      s.flags.confirm = P(p, 'confirm');
      let first = null, fixDate = null;
      if (P(p, 'ray')) {
        first = 'ray';
        L.push({ t: 'good', x: 'Ray is SX-7 certified. ' + (s.flags.photo ? 'The replacement inverter is on his truck.' : 'Without the fault code, no part went on the truck.') });
      } else if (P(p, 'mia')) {
        first = 'mia';
        L.push({ t: 'bad', x: 'Mia came first, but she isn’t certified on the SX-7. ' + (s.flags.confirm ? 'She read the fault code' : 'Nobody was home, so the visit was wasted') + ' and the job went to Ray’s next opening: Thu, Apr 24.' });
        mood(s, s.flags.confirm ? -5 : -15);
        s.flags.photo = s.flags.photo || s.flags.confirm; // Mia read E-21 if she got in
      } else {
        L.push({ t: 'bad', x: 'No tech was booked. The ticket sat until Ray’s next opening: Thu, Apr 24.' });
        mood(s, -10);
      }
      if (P(p, 'urgent')) L.push({ t: 'info', x: 'Marked urgent. No earlier opening came up.' });
      s.flags.field = first === 'ray' ? { tech: 'ray', date: D(3, 17), part: s.flags.photo } : { tech: 'ray', date: D(3, 24), part: !!s.flags.photo, delayed: true };
      if (s.flags.confirm) { L.push({ t: 'good', x: 'Dana confirmed she’d be home and gave the gate code.' }); mood(s, 5); }
      else if (!s.flags.expectSpring) { L.push({ t: 'bad', x: 'Dana texted: "Is anyone coming? Nobody’s called me."' }); M.push('Nobody told Dana what was happening, so she felt ignored.'); mood(s, -10); text(s, 'Is anyone coming? Nobody’s called me.'); }
      else M.push('Nobody confirmed the visit with Dana.');
      return { lines: L, missed: M };
    }
  },
  {
    id: 'spring-field', season: 'spring', role: 'field',
    daysNow: sinceFriday,
    today: s => s.flags.field.date,
    title: s => s.flags.field.delayed ? 'Ray visits Dana’s house a week later.' : 'You are at Dana’s house.',
    scene: () => ART + 'house-spring-fault.webp',
    start: { kind: 'order', label: 'Read the work order', sub: s => `Ray Brennan · ${fmt(s.flags.field.date)}`, opens: 'order' },
    clues: [
      { id: 'order', label: 'Work order', icon: ICON + 'work-order.webp', kind: 'start', body: s =>
        card('Work order · 18 Alder Lane', [
          '<b>Issue:</b> no production since Fri, Apr 11.',
          '<b>On the truck:</b> ' + (s.flags.field.part ? 'replacement SX-7 inverter.' : 'standard kit. No inverter.'),
          '<b>Site notes:</b> ' + (s.flags.confirm ? 'gate code 4410, friendly dog (Biscuit), Dana home.' : 'none.')
        ]) },
      { id: 'inverter', label: 'Inverter', icon: ICON + 'inverter.webp', kind: 'key', hotspot: { x: 78.7, y: 48 }, body: () =>
        img(ART + 'inverter-fault-e21.webp', 'Inverter close-up: red light, display reads E-21') + '<p>Red light. Display: <b>E-21</b>. Model SX-7.</p>' },
      { id: 'manual', label: 'SX-7 manual', icon: ICON + 'resources-help.webp', kind: 'optional', body: () =>
        card('SX-7 fault codes', ['<b>E-21:</b> internal power stage failure.', 'Power-cycling does not clear it.', 'Replace the unit.']) }
    ],
    pick: 2,
    tip: Object.assign({}, LEADS.field, { text: 'Before you leave, check that the system works.' }),
    actions: [
      { id: 'test', from: 'order', label: 'Test production before you leave' },
      { id: 'clean', from: 'order', label: 'Clean the panels while you’re up there' },
      { id: 'replace', from: 'inverter', label: s => s.flags.field.part ? 'Replace the inverter' : 'Order the inverter and book a return visit' },
      { id: 'reset', from: 'inverter', label: 'Power-cycle the inverter and see if it clears' }
    ],
    decisions: [
      { id: 'spring.field.replace', label: 'Replaced the faulty inverter', type: 'do', actions: ['replace'], clues: ['inverter'] },
      { id: 'spring.field.test', label: 'Tested before leaving', type: 'do', actions: ['test'], clues: [] },
      { id: 'spring.field.reset', label: "Didn't count on a reset", type: 'avoid', actions: ['reset'], clues: ['manual'] },
      { id: 'spring.field.clean', label: "Didn't spend the visit cleaning panels", type: 'avoid', actions: ['clean'], clues: [] }
    ],
    react(s, p) {
      if (P(p, 'replace') && s.flags.field.part) return { face: P(p, 'test') ? 'happy' : 'neutral', text: true, x: P(p, 'test') ? 'The app shows power again! Thank you!' : 'The app shows something now. Is it supposed to be this low?' };
      return { face: 'impatient', text: true, x: 'The tech left and the app still says zero.' };
    },
    resolve(s, p) {
      const L = [], M = [];
      let fixed = s.flags.field.date;
      if (P(p, 'replace')) {
        if (s.flags.field.part) L.push({ t: 'good', x: 'Inverter replaced. E-21 is gone.' });
        else { fixed = new Date(fixed); fixed.setDate(fixed.getDate() + 7); L.push({ t: 'bad', x: `No inverter on the truck. A second visit on ${fmt(fixed)}.` }); M.push('With a photo of the fault code, the part would have been on the first truck.'); mood(s, -8); }
        s.flags.fixed = true;
      } else {
        fixed = new Date(fixed); fixed.setDate(fixed.getDate() + 7);
        L.push({ t: 'bad', x: `The inverter wasn't replaced. Dana called back, and Ray returned on ${fmt(fixed)}.` }); mood(s, -12); s.flags.fixed = true;
      }
      if (P(p, 'reset')) L.push({ t: 'bad', x: 'The reset cleared the light for 20 minutes. Then E-21 came back.' });
      if (P(p, 'clean')) L.push({ t: 'info', x: 'Forty minutes cleaning panels. Not the problem.' });
      if (P(p, 'test')) L.push({ t: 'good', x: 'Production tested. Output is back to normal.' });
      else { s.flags.partial = true; L.push({ t: 'bad', x: 'Nobody tested. A loose connector left the system at about 60%.' }); }
      s.flags.fixDate = fixed;
      s.days.spring = dayDiff(D(3, 11), fixed);
      if (s.days.spring > 10) mood(s, -5);
      return { lines: L, missed: M };
    }
  },
  {
    id: 'spring-care-2', season: 'spring', role: 'care',
    today: s => nextMonday(s.flags.fixDate),
    title: 'Dana is calling back.',
    scene: s => s.flags.partial ? ART + 'house-spring-fixed.webp' : ART + 'house-spring-fixed.webp',
    start: { kind: 'call', label: 'Answer the call', sub: () => 'Incoming call · Dana Reyes', opens: 'call' },
    call: {
      calm: s => s.days.spring <= 7 && s.mood >= 55,
      audio: s => s.days.spring <= 7 && s.mood >= 55 ? 'assets/audio/spring_followup_calm.mp3' : 'assets/audio/spring_followup_upset.mp3',
      face: s => s.days.spring <= 7 && s.mood >= 55 ? 'happy' : 'disappointed',
      text: s => s.days.spring <= 7 && s.mood >= 55
        ? "Hi, it's Dana again. The app is showing power, so thank you! Just checking that everything is good now?"
        : "Hi, it's Dana. It's been almost two weeks. Someone came out, but nobody told me what they did. Is it actually fixed?" },
    clues: [
      { id: 'call', label: "Dana's call", icon: ICON + 'answer-call.webp', kind: 'start' },
      { id: 'monitoring', label: 'Monitoring', icon: ICON + 'monitoring.webp', kind: 'key', body: s => {
        const v = s.flags.partial ? [0, 0, 2.4, 2.5, 2.3, 2.4, 2.5] : [0, 0, 4.1, 4.0, 4.2, 3.9, 4.1];
        return chart(v, ['', '', 'Fix', '+1', '+2', '+3', 'Today'], 'Peak output, kW. Expected: about 4.0', x => x < 3.2) +
          `<p><b>Since the repair:</b> ${s.flags.partial ? 'about 60% of expected.' : 'normal.'}</p>`; } },
      { id: 'closeout', label: 'Close-out', icon: ICON + 'details-logs.webp', kind: 'optional', body: s =>
        card('Work order · complete', ['<b>Work done:</b> replaced SX-7 inverter (fault E-21).', '<b>Tested:</b> ' + (s.flags.partial ? 'not recorded.' : 'yes, producing normally.')]) }
    ],
    pick: 2,
    actions: [
      { id: 'close', from: 'call', label: 'Close the ticket. The work order says complete.' },
      { id: 'confirmprod', from: 'monitoring', label: 'Confirm the system is producing normally' },
      { id: 'recheck', from: 'monitoring', label: 'Book a production check for next week' },
      { id: 'explain', from: 'closeout', label: 'Explain what the tech replaced' }
    ],
    decisions: [
      { id: 'spring.care2.monitor', label: 'Answered from what monitoring showed', type: 'do', actions: s => s.flags.partial ? ['recheck'] : ['confirmprod'], clues: ['monitoring'] },
      { id: 'spring.care2.explain', label: 'Explained the repair', type: 'do', actions: ['explain'], clues: ['closeout'] },
      { id: 'spring.care2.close', label: "Didn't just close the ticket", type: 'avoid', actions: ['close'], clues: ['monitoring'] }
    ],
    react(s, p) {
      if (P(p, 'confirmprod') && s.flags.partial) return { face: 'confused', x: 'Normal? It looks lower than last year…' };
      if (P(p, 'close')) return { face: 'meh', x: 'Okay. I guess that’s it, then.' };
      if (P(p, 'explain')) return { face: 'happy', x: 'A new inverter! That makes sense. Thanks for explaining.' };
      return { face: 'neutral', x: 'Okay, thanks for checking.' };
    },
    resolve(s, p) {
      const L = [], M = [];
      if (P(p, 'confirmprod')) {
        if (!s.flags.partial) { L.push({ t: 'good', x: 'Monitoring confirms that output is normal.' }); mood(s, 4); }
        else { L.push({ t: 'bad', x: 'Monitoring showed 60%, but you told Dana the system was normal.' }); mood(s, -5); }
      }
      if (P(p, 'recheck')) {
        if (s.flags.partial) { L.push({ t: 'good', x: 'The production check found the loose connector. Fixed the next week.' }); s.flags.partial = false; wait(s, 7); }
        else L.push({ t: 'info', x: 'A production check found nothing wrong.' });
      }
      if (P(p, 'explain')) { L.push({ t: 'good', x: 'Dana knows exactly what was fixed.' }); mood(s, 5); }
      if (P(p, 'close')) { L.push({ t: 'bad', x: 'Ticket closed without checking. Dana was not sure the problem was fixed.' }); mood(s, -8); }
      if (s.flags.partial) { s.flags.lowOutput = true; M.push('Output stayed at 60%. This problem will come up again later.'); }
      return { lines: L, missed: M };
    }
  },

  /* ============================ SUMMER ============================ */
  {
    id: 'summer-billing', season: 'summer', role: 'billing',
    today: () => D(6, 7),
    title: "Dana's July payment didn't go through.",
    scene: () => ART + 'house-summer.webp',
    start: { kind: 'alert', label: 'Open the payment alert', sub: () => 'Payment failed · $138.40', opens: 'alert' },
    pressure: () => 'Late fee in 10 days',
    clues: [
      { id: 'alert', label: 'Payment alert', icon: ICON + 'issue-alert.webp', kind: 'start', body: () =>
        card('Autopay failed · Jul 1', ['<b>Reason:</b> card ending 0623 expired (06/25).', '<b>History:</b> autopay paid on time every month since 2019.', '<b>Automatic email:</b> "Your payment failed" sent Jul 2.']) },
      { id: 'history', label: 'Account history', icon: ICON + 'details-logs.webp', kind: 'key', body: s =>
        card('Dana Reyes · since 2019', [
          `<b>Spring:</b> system down ${s.days.spring} days. ${s.flags.lowOutput ? 'Output still low.' : 'Fixed.'}`,
          '<b>Best contact:</b> ' + (s.flags.confirm ? 'phone, home Tue and Thu.' : 'not recorded.')
        ]) },
      { id: 'policy', label: 'Fee policy', icon: ICON + 'information.webp', kind: 'optional', body: () =>
        card('Late fees', ['$25 late fee after 15 days unpaid (Jul 16).', 'Automatic reminders go out on days 2 and 9.', 'One courtesy waiver per year.']) }
    ],
    pick: 3,
    tip: Object.assign(TEAM_TIP('billing'), { text: 'Check whether Dana knows about the problem. Check whether your fix also covers next month.' }),
    actions: [
      { id: 'call', from: 'alert', label: 'Call Dana about the failed payment' },
      { id: 'wait', from: 'alert', label: 'Let the automatic reminders run' },
      { id: 'onetime', from: 'alert', label: 'Take a one-time payment by phone' },
      { id: 'autopay', from: 'alert', label: 'Update the card on autopay' },
      { id: 'note', from: 'history', label: 'Add a note to the account for Care' }
    ],
    decisions: [
      { id: 'summer.billing.call', label: 'Reached out to Dana', type: 'do', actions: ['call'], clues: ['alert'] },
      { id: 'summer.billing.wait', label: "Didn't just wait on automatic reminders", type: 'avoid', actions: ['wait'], clues: ['policy'] },
      { id: 'summer.billing.autopay', label: 'Fixed autopay, not just this month', type: 'do', actions: ['autopay'], clues: ['alert'] },
      { id: 'summer.billing.note', label: 'Left a note for Care', type: 'do', actions: ['note'], clues: ['history'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      const reached = P(p, 'call');
      if (reached) { L.push({ t: 'good', x: 'Dana had no idea her card had expired. She was glad you called.' }); mood(s, 5); }
      if ((P(p, 'onetime') || P(p, 'autopay')) && !reached) L.push({ t: 'bad', x: "You couldn't update a card without reaching Dana." });
      s.flags.autopayFixed = reached && P(p, 'autopay');
      s.flags.julyPaid = reached && (P(p, 'onetime') || P(p, 'autopay'));
      if (s.flags.autopayFixed) L.push({ t: 'good', x: 'New card on autopay. August will go through.' });
      else if (reached && P(p, 'onetime')) { L.push({ t: 'bad', x: 'July is paid, but the expired card is still on autopay. August will fail too.' }); M.push('Updating autopay would have fixed August as well.'); }
      if (P(p, 'wait')) L.push({ t: 'info', x: 'Reminders went out on schedule.' });
      if (!reached) { M.push('Nobody talked to Dana. She found out from a second email and a late fee.'); mood(s, -12); wait(s, 15); s.flags.lateFee = true; text(s, 'Two "payment failed" emails and now a late fee? Nobody called me.'); }
      s.flags.noteSummer = P(p, 'note');
      if (!s.flags.noteSummer) M.push('No note was added. If Dana calls Care, Care will not know what happened.');
      wait(s, 3);
      return { lines: L, missed: M };
    }
  },
  {
    id: 'summer-care', season: 'summer', role: 'care',
    today: () => D(6, 10),
    title: 'Dana is calling about a billing email.',
    scene: () => ART + 'house-summer.webp',
    start: { kind: 'call', label: 'Answer the call', sub: () => 'Incoming call · Dana Reyes', opens: 'call' },
    call: {
      audio: s => s.flags.autopayFixed ? 'assets/audio/summer_care_calm.mp3' : 'assets/audio/summer_care_upset.mp3',
      face: s => s.flags.autopayFixed ? 'confused' : 'angry',
      text: s => s.flags.autopayFixed
        ? "Hi, it's Dana. I talked to someone from billing yesterday, but I just got an email saying my payment failed. Is that old, or is something still wrong?"
        : "Hi, it's Dana. I got a payment-failed email and a late fee. I've paid you every month for six years. What is going on?" },
    clues: [
      { id: 'call', label: "Dana's call", icon: ICON + 'answer-call.webp', kind: 'start' },
      { id: 'notes', label: 'Account notes', icon: ICON + 'notes-clues.webp', kind: 'key', body: s =>
        s.flags.noteSummer
          ? card('Note from Billing · Jul 7', [`Card expired. ${s.flags.autopayFixed ? 'Talked to Dana. New card on autopay.' : s.flags.julyPaid ? 'One-time payment taken. Autopay card not updated.' : 'Could not reach Dana.'}`])
          : card('Account notes', ['No notes since April.']) },
      { id: 'payments', label: 'Payments', icon: ICON + 'meter-usage.webp', kind: 'key', body: s =>
        card('Payments', [
          `<b>Card on autopay:</b> ${s.flags.autopayFixed ? 'updated Jul 7' : 'expired (06/25)'}`,
          `<b>July:</b> ${s.flags.julyPaid ? 'paid' : 'unpaid'}`,
          '<b>Reminder emails:</b> Jul 2, Jul 9',
          s.flags.lateFee ? '<b>Late fee:</b> $25 applied' : '<b>Late fee:</b> none'
        ]) },
      { id: 'policy', label: 'Fee policy', icon: ICON + 'information.webp', kind: 'optional', body: s =>
        card('Late fees', ['One courtesy waiver per year.', 'Dana has used: none.']) }
    ],
    pick: 2,
    tip: Object.assign({}, LEADS.care, { text: 'Check the account before you answer Dana.' }),
    actions: [
      { id: 'transfer', from: 'call', label: 'Transfer Dana to Billing' },
      { id: 'explain', from: 'notes', label: 'Explain the email went out before the card was updated' },
      { id: 'updatecard', from: 'payments', label: 'Update her card on autopay now' },
      { id: 'recap', from: 'payments', label: 'Recap her account: card, autopay, next payment' },
      { id: 'waive', from: 'policy', label: 'Waive the late fee' }
    ],
    decisions: [
      { id: 'summer.care.fix', label: 'Gave the right answer for the account', type: 'do', actions: s => s.flags.autopayFixed ? ['explain'] : ['updatecard'], clues: ['notes', 'payments'] },
      { id: 'summer.care.transfer', label: 'Handled it without a transfer', type: 'avoid', actions: ['transfer'], clues: ['notes'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      if (P(p, 'explain')) {
        if (s.flags.autopayFixed) { L.push({ t: 'good', x: 'Dana understood. The email was sent before the card was updated.' }); mood(s, 5); }
        else { L.push({ t: 'bad', x: 'The card was never updated. Dana got another failure email in August.' }); mood(s, -10); }
      }
      if (P(p, 'updatecard')) {
        if (!s.flags.autopayFixed) { L.push({ t: 'good', x: 'Card updated on autopay. July and August are covered.' }); s.flags.autopayFixed = true; s.flags.julyPaid = true; mood(s, 5); }
        else L.push({ t: 'info', x: 'The card was already updated. Dana read her number out again anyway.' });
      }
      if (P(p, 'transfer')) { L.push({ t: 'bad', x: 'Dana waited on hold for Billing. Then she explained everything again.' }); mood(s, -8); }
      if (P(p, 'waive')) { if (s.flags.lateFee) { L.push({ t: 'good', x: 'Late fee waived. Dana was grateful.' }); s.flags.lateFee = false; mood(s, 5); } else L.push({ t: 'info', x: 'There was no fee to waive.' }); }
      if (P(p, 'recap')) { L.push({ t: 'good', x: 'Dana knows her card, autopay and next payment date.' }); mood(s, 3); }
      if (!s.flags.autopayFixed) { M.push('Autopay still has the expired card.'); wait(s, 30); }
      if (s.flags.lateFee) M.push('The late fee is still on Dana’s account.');
      return { lines: L, missed: M };
    }
  },

  /* ============================ FALL ============================ */
  {
    id: 'fall-care', season: 'fall', role: 'care',
    today: () => D(8, 29),
    title: 'Dana is getting a new roof.',
    scene: () => ART + 'house-fall.webp',
    start: { kind: 'call', label: 'Answer the call', sub: () => 'Incoming call · Dana Reyes', opens: 'call' },
    call: {
      audio: s => s.mood >= 50 ? 'assets/audio/fall_care_calm.mp3' : 'assets/audio/fall_care_wary.mp3',
      face: s => s.mood >= 50 ? 'happy' : 'meh',
      text: s => (s.mood >= 50 ? "Hi, it's Dana! We're finally replacing the roof." : "Hi, it's Dana. I'm hoping this one goes smoother. We're replacing the roof.") +
        " The roofer, Peak Roofing, starts October 14th. He said I need to call you about the panels?" },
    clues: [
      { id: 'call', label: "Dana's call", icon: ICON + 'answer-call.webp', kind: 'start' },
      { id: 'lease', label: 'Lease', icon: ICON + 'details-logs.webp', kind: 'key', body: () =>
        card('Lease · Section 9', ['Only Soleil Systems or its approved crews may remove or reinstall the system.', '<b>Removal and reinstall fee:</b> $650, paid by the homeowner.', 'Damage from removal by others is not covered.']) },
      { id: 'system', label: 'System', icon: ICON + 'solar-panels.webp', kind: 'key', body: s =>
        card('System at 18 Alder Lane', ['22 panels on two roof faces.', 'SX-7 inverter, replaced in spring.', s.flags.lowOutput ? '<b>Output:</b> about 60% of expected since spring.' : '<b>Output:</b> normal.']) },
      { id: 'jobs', label: 'Past roof jobs', icon: ICON + 'status-results.webp', kind: 'optional', body: () =>
        card('Removal and reinstall · last 12 months', ['Average panels-off time: 8 days.', 'Most common complaint: "Nobody told me when they’d go back up."']) }
    ],
    pick: 3,
    actions: [
      { id: 'date', from: 'call', label: "Note the roofer's start date and contact" },
      { id: 'roofer', from: 'call', label: 'Let Dana know her roofer can take the panels off' },
      { id: 'expect', from: 'call', label: 'Tell Dana how long the panels will be off' },
      { id: 'fee', from: 'lease', label: 'Explain the removal and reinstall fee' },
      { id: 'both', from: 'system', group: 'request', label: 'Open removal and reinstall requests together' },
      { id: 'removal', from: 'system', group: 'request', label: 'Open a removal request' }
    ],
    decisions: [
      { id: 'fall.care.both', label: 'Opened both requests', type: 'do', actions: ['both'], clues: ['system'] },
      { id: 'fall.care.roofer', label: "Didn't let the roofer remove the panels", type: 'avoid', actions: ['roofer'], clues: ['lease'] },
      { id: 'fall.care.fee', label: 'Explained the fee up front', type: 'do', actions: ['fee'], clues: ['lease'] },
      { id: 'fall.care.date', label: 'Captured the roofer’s date and contact', type: 'do', actions: ['date'], clues: ['call'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      s.flags.rooferDate = P(p, 'date'); s.flags.feeExplained = P(p, 'fee'); s.flags.expectFall = P(p, 'expect');
      s.flags.removalOpen = P(p, 'both') || P(p, 'removal'); s.flags.reinstallOpen = P(p, 'both');
      if (P(p, 'roofer')) { s.flags.rooferRemoved = true; L.push({ t: 'bad', x: 'The lease says only Soleil Systems crews can remove the panels.' }); }
      if (P(p, 'both')) L.push({ t: 'good', x: 'Dispatch received both the removal and reinstall requests.' });
      else if (P(p, 'removal')) M.push('Only removal was opened. Nobody asked for the panels to go back up.');
      else { L.push({ t: 'bad', x: 'No request was opened.' }); M.push('Without a request, Dispatch never sees this job.'); }
      if (s.flags.rooferDate) L.push({ t: 'good', x: 'Saved: Peak Roofing, starts Tue, Oct 14, about 5 days.' });
      else M.push('The roofer’s date and contact weren’t saved.');
      if (s.flags.feeExplained) L.push({ t: 'good', x: 'Dana knows about the $650 fee up front.' });
      else M.push('Nobody told Dana about the $650 fee.');
      if (s.flags.expectFall) { L.push({ t: 'good', x: 'Dana knows the panels will be off for about a week.' }); mood(s, 4); }
      wait(s, 1);
      return { lines: L, missed: M };
    }
  },
  {
    id: 'fall-dispatch', season: 'fall', role: 'dispatch',
    today: () => D(8, 30),
    title: 'Schedule the panel removal and reinstall.',
    scene: () => ART + 'house-fall.webp',
    start: { kind: 'ticket', label: 'Open the new requests', sub: s => s.flags.removalOpen ? (s.flags.reinstallOpen ? '2 requests · 18 Alder Lane' : '1 request · 18 Alder Lane') : 'Note from Care · 18 Alder Lane', opens: 'requests' },
    clues: [
      { id: 'requests', label: 'Requests', icon: ICON + 'work-order.webp', kind: 'start', body: s =>
        card('Requests · 18 Alder Lane', [
          `<b>Removal:</b> ${s.flags.removalOpen ? 'open' : 'none'}`,
          `<b>Reinstall:</b> ${s.flags.reinstallOpen ? 'open' : 'none'}`,
          `<b>Roof work:</b> ${s.flags.rooferDate ? 'starts Tue, Oct 14' : 'date not recorded'}`
        ]) },
      { id: 'crews', label: 'Crew calendar', icon: ICON + 'schedule-visit.webp', kind: 'key', body: () =>
        `<div class="week wide">${[['Fri', 'Oct 10', 1], ['Mon', 'Oct 13', 1], ['Tue', 'Oct 14', 1], ['Tue', 'Oct 21', 1], ['Tue', 'Nov 4', 1]].map(([w, d]) =>
          `<div><b>${w} ${d}</b><span class="slot">Ray + helper</span></div>`).join('')}</div><p>Next openings for a two-person crew.</p>` },
      { id: 'roofer', label: 'Roofer', icon: ICON + 'location-map.webp', kind: 'key', body: s =>
        s.flags.rooferDate ? card('Peak Roofing', ['Phone on file.', 'Starts Tue, Oct 14. Estimates done by <b>Sun, Oct 19</b>.']) : card('Roofer', ['No roofer details on file.']) },
      { id: 'jobs', label: 'Past roof jobs', icon: ICON + 'status-results.webp', kind: 'optional', body: () =>
        card('Team notes', ['When the reinstall waits for the roofer to call, panels sit off the roof for 2–3 weeks on average.']) }
    ],
    pick: 3,
    pressure: () => 'Roof work starts Tue, Oct 14',
    actions: [
      { id: 'confirm', from: 'requests', label: 'Confirm both dates with Dana' },
      { id: 'r13', from: 'crews', group: 'removal', label: 'Book removal · Mon, Oct 13' },
      { id: 'r14', from: 'crews', group: 'removal', label: 'Book removal · Tue, Oct 14' },
      { id: 'i21', from: 'crews', group: 'reinstall', label: 'Book reinstall · Tue, Oct 21' },
      { id: 'iwait', from: 'crews', group: 'reinstall', label: "Book the reinstall once the roofer says he's done" },
      { id: 'callroofer', from: 'roofer', label: 'Call the roofer to line up dates' }
    ],
    decisions: [
      { id: 'fall.dispatch.removal', label: 'Removal before the roof starts', type: 'do', actions: ['r13'], clues: ['requests', 'roofer'] },
      { id: 'fall.dispatch.reinstall', label: 'Booked the reinstall in advance', type: 'do', actions: ['i21'], clues: ['crews'] },
      { id: 'fall.dispatch.wait', label: "Didn't wait to book the reinstall", type: 'avoid', actions: ['iwait'], clues: ['jobs'] },
      { id: 'fall.dispatch.confirm', label: 'Confirmed dates with Dana', type: 'do', actions: ['confirm'], clues: [] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      if (s.flags.rooferRemoved) { L.push({ t: 'bad', x: 'The roofer removed the panels himself. Two cracked, and the lease doesn’t cover them.' }); mood(s, -12); s.flags.cracked = true; }
      if (P(p, 'r13')) L.push({ t: 'good', x: 'Removal set for the day before the roofer starts.' });
      else if (P(p, 'r14')) { L.push({ t: 'bad', x: 'The crew and the roofer arrived the same morning. The roofer lost a day of work.' }); wait(s, 1); mood(s, -5); }
      else if (!s.flags.rooferRemoved) { L.push({ t: 'bad', x: 'No removal was booked. The roofer arrived and the panels were still on.' }); wait(s, 7); mood(s, -10); }
      if (P(p, 'i21')) { L.push({ t: 'good', x: s.flags.reinstallOpen ? 'Reinstall set for Oct 21, two days after the roof is done.' : 'You noticed there was no reinstall request and booked one anyway.' }); wait(s, 8); }
      else { L.push({ t: 'bad', x: 'The roof was done Oct 19. The next crew opening was Nov 4. The panels sat in the garage for over two weeks.' }); wait(s, 22); mood(s, -10); s.flags.lateReinstall = true; }
      if (P(p, 'callroofer')) L.push({ t: s.flags.rooferDate ? 'good' : 'info', x: s.flags.rooferDate ? 'The roofer confirmed: done by Oct 19.' : 'No roofer number on file.' });
      if (P(p, 'confirm')) { L.push({ t: 'good', x: 'Dana has both dates on her calendar.' }); mood(s, 5); }
      else if (!s.flags.expectFall) { L.push({ t: 'bad', x: 'Dana texted: "Does anyone know when they’re going back up?"' }); M.push('Nobody told Dana when the panels would go back up.'); mood(s, -10); text(s, 'The panels are in my garage. Does anyone know when they’re going back up?'); }
      return { lines: L, missed: M };
    }
  },
  {
    id: 'fall-field', season: 'fall', role: 'field',
    today: () => D(9, 13),
    title: 'Remove the panels, then reinstall them.',
    scene: () => ART + 'house-fall-roofwork.webp',
    start: { kind: 'order', label: 'Read the work orders', sub: () => 'Ray Brennan + helper · Oct 13 and Oct 21', opens: 'orders' },
    clues: [
      { id: 'orders', label: 'Work orders', icon: ICON + 'work-order.webp', kind: 'start', body: s =>
        card('Work orders · 18 Alder Lane', ['<b>Visit 1, Mon, Oct 13:</b> remove 22 panels before roof work.', '<b>Visit 2:</b> reinstall and restart.', s.flags.cracked ? '<b>Note:</b> two panels cracked by the roofer.' : '']) },
      { id: 'roof', label: 'Roof', icon: ICON + 'home.webp', kind: 'key', hotspot: { x: 50, y: 30 }, body: () =>
        img(ART + 'house-fall-roofwork.webp', 'Roof with shingles stripped') + '<p>New underlayment and shingles. New roofs often need new mounting points, and every new hole needs sealing.</p>' },
      { id: 'forecast', label: 'Forecast', icon: ICON + 'information.webp', kind: 'key', body: () =>
        card('Forecast', ['Dry through October.', '<b>Heavy rain</b> expected the first week of November.']) },
      { id: 'site', label: 'Site', icon: ICON + 'location-map.webp', kind: 'optional', body: () =>
        card('Site notes', ['The roofer’s dumpster and delivery trucks use the driveway Oct 14–19.', 'The garage is clear.']) }
    ],
    pick: 3,
    actions: [
      { id: 'layout', from: 'orders', label: 'Photograph and label the panel layout before removal' },
      { id: 'driveway', from: 'orders', label: 'Stack the panels by the driveway for a quick reinstall' },
      { id: 'test', from: 'orders', label: 'Test production after reinstall' },
      { id: 'notes', from: 'orders', label: 'Write close-out notes for Care' },
      { id: 'mounts', from: 'roof', label: 'Walk the roof with the roofer to plan mounting points' },
      { id: 'seal', from: 'roof', label: 'Check flashing and seals on reinstall' }
    ],
    decisions: [
      { id: 'fall.field.layout', label: 'Labeled the layout before removal', type: 'do', actions: ['layout'], clues: [] },
      { id: 'fall.field.seal', label: 'Checked the seals', type: 'do', actions: ['seal'], clues: ['roof', 'forecast'] },
      { id: 'fall.field.driveway', label: "Didn't leave panels by the driveway", type: 'avoid', actions: ['driveway'], clues: ['site'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      if (P(p, 'layout')) L.push({ t: 'good', x: 'Every panel went back exactly where it was.' });
      else { s.flags.fallLow = true; L.push({ t: 'bad', x: 'No layout photos. Two strings were wired back wrong. Output is 15% low.' }); }
      if (P(p, 'driveway')) { L.push({ t: 'bad', x: 'A roofing delivery truck clipped the stack. One panel cracked.' }); s.flags.cracked = true; mood(s, -5); }
      if (P(p, 'mounts')) L.push({ t: 'good', x: 'You and the roofer agreed on mounting points. The roof needed fewer new holes.' });
      if (P(p, 'seal')) L.push({ t: 'good', x: 'Seals checked. The roof stayed dry in the November rain.' });
      else { s.flags.leak = true; L.push({ t: 'bad', x: 'A missed seal leaked in the first November rain.' }); mood(s, -15); text(s, 'There’s a water stain on the ceiling right under the panels.'); wait(s, 5); }
      if (P(p, 'test')) { L.push({ t: 'good', x: s.flags.fallLow ? 'The test caught the 15% drop. You fixed the wiring before leaving.' : 'Production is back to normal.' }); s.flags.fallLow = false; }
      else if (s.flags.fallLow) M.push('A production test would have caught the 15% drop.');
      s.flags.notesFall = P(p, 'notes');
      if (!s.flags.notesFall) M.push('No close-out notes for Care.');
      if (!s.flags.feeExplained) { L.push({ t: 'bad', x: "Dana got a $650 invoice she didn't expect." }); mood(s, -10); text(s, 'I just got a $650 bill for the panels. Nobody said this would cost anything.'); }
      if (s.flags.fallLow) s.flags.lowOutput = true;
      return { lines: L, missed: M };
    }
  },

  /* ============================ WINTER ============================ */
  {
    id: 'winter-accounts', season: 'winter', role: 'accounts',
    today: () => D(0, 6),
    title: 'Dana is selling the house.',
    scene: () => ART + 'house-winter-sold.webp',
    start: { kind: 'email', label: "Open Dana's email", sub: () => 'Re: selling the house', opens: 'email' },
    pressure: () => 'Closing: Fri, Jan 30 · 24 days',
    clues: [
      { id: 'email', label: "Dana's email", icon: ICON + 'mail.webp', kind: 'start', body: () =>
        `<blockquote>"Hi! We accepted an offer on the house. Closing is <b>January 30</b>. The buyer is <b>Sam Patel</b>, and his agent and the title company are copied. What do we need to do about the solar lease?"</blockquote>` },
      { id: 'rules', label: 'Transfer rules', icon: ICON + 'details-logs.webp', kind: 'key', body: () =>
        card('Lease transfer', ['The buyer applies and must be approved.', 'Approval takes <b>2–3 weeks</b> after a complete application.', 'The seller can also buy out the lease.']) },
      { id: 'account', label: 'Account', icon: ICON + 'notes-clues.webp', kind: 'key', body: s => {
        const open = [];
        if (s.flags.leak) open.push('roof leak under the panels (fall)');
        if (s.flags.lowOutput) open.push('output below expected');
        if (s.flags.cracked) open.push('cracked panels (fall)');
        if (s.flags.lateFee) open.push('unpaid late fee (summer)');
        return card('Dana Reyes · 18 Alder Lane', open.length ? ['<b>Open issues:</b>'].concat(open.map(o => '• ' + o)) : ['No open issues.']); } },
      { id: 'title', label: 'Title company', icon: ICON + 'mail.webp', kind: 'optional', body: () =>
        card('Bayview Title', ['"We need lease transfer approval by <b>Tue, Jan 27</b> to close on time."']) }
    ],
    pick: 3,
    actions: [
      { id: 'packet', from: 'email', label: "Send the transfer packet to Dana and the buyer's agent today" },
      { id: 'title', from: 'email', label: 'Add the title company and closing date to the file' },
      { id: 'buyout', from: 'email', label: 'Send Dana a buyout quote as an option' },
      { id: 'buyerapp', from: 'rules', label: "Start Sam's application as soon as you have his info" },
      { id: 'waittitle', from: 'rules', label: 'Wait for the title company to request the paperwork' },
      { id: 'issues', from: 'account', label: s => (s.flags.leak || s.flags.lowOutput || s.flags.cracked || s.flags.lateFee) ? 'Get the open issues fixed before closing' : 'Schedule a pre-sale system inspection' }
    ],
    decisions: [
      { id: 'winter.accounts.packet', label: 'Started the transfer right away', type: 'do', actions: ['packet'], clues: ['rules'] },
      { id: 'winter.accounts.wait', label: "Didn't wait on the title company", type: 'avoid', actions: ['waittitle'], clues: ['rules', 'title'] },
      { id: 'winter.accounts.title', label: 'Recorded the closing details', type: 'do', actions: ['title'], clues: ['email'] },
      { id: 'winter.accounts.issues', label: 'Cleared open issues before closing', type: 'do', actions: ['issues'], clues: ['account'], when: s => s.flags.leak || s.flags.lowOutput || s.flags.cracked || s.flags.lateFee }
    ],
    resolve(s, p) {
      const L = [], M = [];
      const openIssues = s.flags.leak || s.flags.lowOutput || s.flags.cracked || s.flags.lateFee;
      let doneDay = P(p, 'packet') ? (P(p, 'buyerapp') ? 18 : 23) : (P(p, 'waittitle') ? 35 : 28);
      if (P(p, 'packet')) L.push({ t: 'good', x: 'Transfer packet sent on day one.' });
      if (P(p, 'buyerapp')) L.push({ t: 'good', x: "Sam's application went in the same week." });
      if (openIssues && !P(p, 'issues')) { doneDay += 4; L.push({ t: 'bad', x: "The buyer's inspector flagged the open issues. Four days of back-and-forth." }); mood(s, -5); }
      if (openIssues && P(p, 'issues')) { L.push({ t: 'good', x: 'Open issues fixed before the buyer asked.' }); s.flags.leak = s.flags.lowOutput = s.flags.cracked = s.flags.lateFee = false; }
      if (!openIssues && P(p, 'issues')) L.push({ t: 'info', x: 'The inspection found nothing. It used a full day of a technician’s time.' });
      s.flags.transferOnTime = doneDay <= 21;
      if (s.flags.transferOnTime) { L.push({ t: 'good', x: `Transfer approved on day ${doneDay}. The closing can happen on time.` }); mood(s, 8); wait(s, doneDay); }
      else { L.push({ t: 'bad', x: `Transfer approved on day ${doneDay}. The closing had to be pushed back.` }); mood(s, -20); wait(s, doneDay); text(s, 'Our closing got pushed because the solar transfer isn’t done. Please help.'); M.push('The transfer needed to start right away to finish before the closing date.'); }
      s.flags.titleKnown = P(p, 'title');
      if (!s.flags.titleKnown) M.push('No closing date or title contact in the file. Billing will have to guess.');
      if (P(p, 'buyout')) L.push({ t: 'info', x: 'Dana said no thanks. Sam wants the solar.' });
      return { lines: L, missed: M };
    }
  },
  {
    id: 'winter-billing', season: 'winter', role: 'billing',
    today: () => D(0, 26),
    title: 'The house is sold. Close Dana’s account and set up the buyer’s account.',
    scene: () => ART + 'house-winter-sold.webp',
    start: { kind: 'alert', label: 'Open the transfer approval', sub: () => 'Transfer approved · 18 Alder Lane', opens: 'transfer' },
    pressure: s => s.flags.transferOnTime ? 'Closing: Fri, Jan 30 · 4 days' : 'Closing pushed back',
    clues: [
      { id: 'transfer', label: 'Transfer', icon: ICON + 'complete-task.webp', kind: 'start', body: s =>
        card('Transfer approved', [`<b>Effective date:</b> ${s.flags.titleKnown ? 'closing date, Fri, Jan 30' : 'not recorded'}`, '<b>New owner:</b> Sam Patel.']) },
      { id: 'dana', label: "Dana's account", icon: ICON + 'customer.webp', kind: 'key', body: s =>
        card("Dana's billing", [`Autopay on (${s.flags.autopayFixed ? 'card updated in July' : 'card on file'}).`, 'Bills on the 1st of the month.']) },
      { id: 'sam', label: "Sam's account", icon: ICON + 'customer.webp', kind: 'key', body: () =>
        img(ART + 'sam-patel.webp', 'Sam Patel', 'face') + card("Sam Patel's account", ['Created by Account Services.', '<b>Payment method:</b> none yet.']) },
      { id: 'policy', label: 'Billing rules', icon: ICON + 'information.webp', kind: 'optional', body: () =>
        card('Ownership changes', ['Final bills are prorated to the effective date.', 'Autopay keeps running until someone turns it off.', 'The lease stays with the house.']) }
    ],
    pick: 3,
    actions: [
      { id: 'final', from: 'transfer', label: "Set Dana's final bill to the closing date" },
      { id: 'cancel', from: 'transfer', label: "Cancel Dana's lease" },
      { id: 'notecare', from: 'transfer', label: 'Add a note to the account for Care' },
      { id: 'stopauto', from: 'dana', label: "Turn off Dana's autopay after the final bill" },
      { id: 'samsetup', from: 'sam', label: "Set up Sam's account and autopay" },
      { id: 'nextmonth', from: 'sam', label: 'Start billing Sam next month' }
    ],
    decisions: [
      { id: 'winter.billing.final', label: 'Set the final bill date', type: 'do', actions: ['final'], clues: ['transfer'] },
      { id: 'winter.billing.stopauto', label: "Stopped Dana's autopay", type: 'do', actions: ['stopauto'], clues: ['policy'] },
      { id: 'winter.billing.sam', label: "Set up Sam's payments", type: 'do', actions: ['samsetup'], clues: ['sam'] },
      { id: 'winter.billing.cancel', label: "Didn't cancel the lease", type: 'avoid', actions: ['cancel'], clues: ['policy'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      if (P(p, 'final')) L.push({ t: 'good', x: s.flags.titleKnown ? "Dana's final bill ends Jan 30." : 'No closing date was on file, so you used the end of the month.' });
      else M.push("Dana's account was never closed out.");
      s.flags.danaCharged = !P(p, 'stopauto');
      if (s.flags.danaCharged) { L.push({ t: 'bad', x: "Dana was charged for February on a house she doesn't own anymore." }); mood(s, -15); text(s, 'Why was I charged for February? We sold the house!'); }
      else L.push({ t: 'good', x: "Dana's autopay stops after the final bill." });
      s.flags.samFail = !P(p, 'samsetup');
      if (s.flags.samFail) M.push("Sam's first bill will fail. There's no payment method.");
      else L.push({ t: 'good', x: "Sam's autopay is ready for March." });
      if (P(p, 'nextmonth')) L.push({ t: 'info', x: 'Sam gets the first days of February free.' });
      if (P(p, 'cancel')) { L.push({ t: 'bad', x: 'Cancelling the lease would have left Sam with no agreement. Account Services caught it and reversed it.' }); wait(s, 3); }
      s.flags.noteWinter = P(p, 'notecare');
      return { lines: L, missed: M };
    }
  },
  {
    id: 'winter-care', season: 'winter', role: 'care',
    today: () => D(1, 9),
    title: 'Dana calls after the sale.',
    scene: () => ART + 'house-winter-sold.webp',
    start: { kind: 'call', label: 'Answer the call', sub: () => 'Incoming call · Dana Reyes', opens: 'call' },
    call: {
      audio: s => s.flags.danaCharged ? 'assets/audio/winter_care_charged.mp3' : 'assets/audio/winter_care_calm.mp3',
      face: s => s.flags.danaCharged ? 'angry' : 'happy',
      text: s => s.flags.danaCharged
        ? "Hi, it's Dana. We closed last week, and you still charged me for February. I just want to be done with this."
        : "Hi, it's Dana. We closed last week! I just want to make sure everything is wrapped up on my end." },
    clues: [
      { id: 'call', label: "Dana's call", icon: ICON + 'answer-call.webp', kind: 'start' },
      { id: 'notes', label: 'Account notes', icon: ICON + 'notes-clues.webp', kind: 'key', body: s =>
        s.flags.noteWinter ? card('Note from Billing', [`Dana: final bill Jan 30. ${s.flags.danaCharged ? 'Autopay still on.' : 'Autopay off.'}`, `Sam: ${s.flags.samFail ? 'no payment method yet.' : 'set up.'}`]) : card('Account notes', ['No notes since the transfer.']) },
      { id: 'charges', label: "Dana's charges", icon: ICON + 'meter-usage.webp', kind: 'key', body: s =>
        card("Dana's charges", ['<b>Jan:</b> paid', s.flags.danaCharged ? '<b>Feb 1:</b> $138.40 charged' : '<b>Feb:</b> none']) },
      { id: 'sam', label: 'Voicemail from Sam', icon: ICON + 'notification.webp', kind: 'key', body: () =>
        img(ART + 'sam-patel.webp', 'Sam Patel', 'face') + '<blockquote>"Hi, this is Sam Patel. I just bought 18 Alder Lane. How do I see what the panels are doing?"</blockquote>' }
    ],
    pick: 3,
    actions: [
      { id: 'survey', from: 'call', label: 'Send both of them a survey' },
      { id: 'confirmfinal', from: 'notes', label: "Confirm Dana's final bill and that autopay is off" },
      { id: 'transfer', from: 'notes', label: 'Transfer Dana to Billing' },
      { id: 'refund', from: 'charges', label: "Refund Dana's February charge" },
      { id: 'welcome', from: 'sam', label: 'Call Sam back and set up his monitoring app' },
      { id: 'lease', from: 'sam', label: 'Walk Sam through every term of his lease' }
    ],
    decisions: [
      { id: 'winter.care.refund', label: 'Refunded the wrong charge', type: 'do', actions: ['refund'], clues: ['charges'], when: s => s.flags.danaCharged },
      { id: 'winter.care.confirm', label: 'Confirmed Dana’s account is closed', type: 'do', actions: ['confirmfinal'], clues: ['notes', 'charges'] },
      { id: 'winter.care.welcome', label: 'Welcomed the new owner', type: 'do', actions: ['welcome'], clues: ['sam'] },
      { id: 'winter.care.transfer', label: 'Handled it without a transfer', type: 'avoid', actions: ['transfer'], clues: ['notes'] }
    ],
    resolve(s, p) {
      const L = [], M = [];
      if (s.flags.danaCharged) {
        if (P(p, 'refund')) { L.push({ t: 'good', x: 'February refunded and autopay turned off.' }); mood(s, 10); }
        else { M.push('The February charge was never refunded.'); mood(s, -10); }
      } else if (P(p, 'refund')) L.push({ t: 'info', x: 'There was nothing to refund.' });
      if (P(p, 'confirmfinal')) { L.push({ t: 'good', x: "Dana knows her account is closed." }); mood(s, 6); }
      if (P(p, 'welcome')) L.push({ t: 'good', x: "Sam is set up and can see his system's production." });
      else M.push("Nobody returned Sam's call. He is a new customer.");
      if (P(p, 'lease')) L.push({ t: 'info', x: 'Sam was polite, but it was a 40-minute call.' });
      if (P(p, 'transfer')) { L.push({ t: 'bad', x: 'Dana explained everything again to Billing.' }); mood(s, -8); }
      if (P(p, 'survey')) L.push({ t: 'info', x: 'Surveys sent.' });
      return { lines: L, missed: M };
    }
  }
  ];

  window.BP_CONTENT = { ROLES, LEADS, SEASONS, steps, startMood: 70, fmt, ART, ICON };
})();
