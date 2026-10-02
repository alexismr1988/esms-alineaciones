import { crestImage } from './team-crests.js';

const manifestUrl = './data/matches.json';
const state = { manifest: null, competition: null, round: null, summaries: [], detailCache: new Map() };

const byId = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[char]);

function setStatus(message, error = false) {
  const host = byId('partidos-content');
  host.innerHTML = `<div class="status-panel${error ? ' error' : ''}">${esc(message)}</div>`;
}

function competitionById(id) {
  return state.manifest.competitions.find(comp => comp.id === id);
}

function summaryById(id) {
  return state.manifest.matches.find(match => match.id === id);
}

function renderCompetitions() {
  const grid = byId('comp-grid');
  grid.innerHTML = state.manifest.competitions.map(comp =>
    `<button class="comp-btn" type="button" data-id="${esc(comp.id)}">${esc(comp.icon)} ${esc(comp.label)}</button>`
  ).join('');
  grid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectCompetition(button.dataset.id)));
}

function selectCompetition(id) {
  state.competition = id;
  state.round = null;
  document.querySelectorAll('.comp-btn').forEach(button => button.classList.toggle('active', button.dataset.id === id));
  const competition = competitionById(id);
  const grid = byId('jornadas-grid');
  grid.innerHTML = competition.rounds.map(round => {
    const empty = round.matchIds.length === 0;
    return `<button class="jornada-btn" type="button" data-id="${esc(round.id)}"${empty ? ' disabled' : ''}>${esc(round.label)}${empty ? ' · Próximamente' : ''}</button>`;
  }).join('');
  grid.querySelectorAll('button:not(:disabled)').forEach(button => button.addEventListener('click', () => selectRound(button.dataset.id)));
  byId('jornadas-section').style.display = 'block';
  byId('partidos-section').style.display = 'none';
  byId('visor').style.display = 'none';
}

function scoreText(summary) {
  if (!summary.result) return 'Resultado no disponible';
  let value = `${summary.result.home} - ${summary.result.away}`;
  if (summary.penaltyShootout) value += ` · pen. ${summary.penaltyShootout.home}-${summary.penaltyShootout.away}`;
  return value;
}

function renderMatchCards(summaries) {
  const host = byId('partidos-content');
  if (!summaries.length) {
    setStatus('No hay partidos disponibles en esta ronda.');
    return;
  }
  host.innerHTML = `<div class="partidos-grid">${summaries.map(summary => `
    <article class="partido-card" data-id="${esc(summary.id)}">
      <div class="partido-teams">
        <span class="team-name team-identity">${crestImage(summary.homeCode, summary.homeTeam)}<span>${esc(summary.homeTeam)}</span></span>
        <button class="score-box score-hidden" type="button" data-score="${esc(scoreText(summary))}" data-revealed="0" aria-label="Mostrar resultado"></button>
        <span class="team-name team-identity right"><span>${esc(summary.awayTeam)}</span>${crestImage(summary.awayCode, summary.awayTeam)}</span>
      </div>
      <div class="eye-hint">Pulsa el marcador para evitar spoilers · <button class="open-match" type="button">Ver partido</button></div>
    </article>`).join('')}</div>`;

  host.querySelectorAll('.score-box').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const revealed = button.dataset.revealed === '1';
    button.textContent = revealed ? '' : button.dataset.score;
    button.dataset.revealed = revealed ? '0' : '1';
    button.classList.toggle('score-hidden', revealed);
    button.setAttribute('aria-label', revealed ? 'Mostrar resultado' : 'Ocultar resultado');
  }));

  host.querySelectorAll('.partido-card').forEach(card => {
    const open = () => openViewer(summaryById(card.dataset.id));
    card.querySelector('.open-match').addEventListener('click', open);
  });
}

function selectRound(id) {
  state.round = id;
  const competition = competitionById(state.competition);
  const round = competition.rounds.find(item => item.id === id);
  document.querySelectorAll('.jornada-btn').forEach(button => button.classList.toggle('active', button.dataset.id === id));
  state.summaries = round.matchIds.map(summaryById).filter(Boolean);
  byId('partidos-section').style.display = 'block';
  byId('visor').style.display = 'none';
  renderMatchCards(state.summaries);
}

function renderLineup(team, players, color, formation) {
  const tacticNames = { A: 'Ofensiva', D: 'Defensiva', N: 'Normal', L: 'Balones en largo', C: 'Contraataque', P: 'Pases', E: 'Europea', T: 'Aleatoria' };
  const tactic = formation?.slice(-1);
  let substitutes = false;
  const rows = players.map(player => {
    const separator = player.substitute && !substitutes ? '<div class="lineup-sep">— Suplentes —</div>' : '';
    if (player.substitute) substitutes = true;
    const positionClass = `pos-${esc((player.position || 'mf').toLowerCase())}`;
    return `${separator}<div class="lineup-player"><span class="pos-badge ${positionClass}">${esc(player.position)}</span><span>${esc(player.displayName)}</span></div>`;
  }).join('');
  const tacticHtml = tacticNames[tactic] ? `<div class="data-note">${esc(formation)} · ${esc(tacticNames[tactic])}</div>` : '';
  return `<section class="lineup-box"><h3 style="color:${color}">${esc(team)}</h3>${tacticHtml}${rows}</section>`;
}

function renderInfo(info, color) {
  if (!info) return '';
  const rows = [
    ['⭐ MVP', info.mvp], ['⚽ Goles', info.goals], ['🟨 Amarillas', info.booked],
    ['🟥 Expulsados', info.sentOff], ['🩹 Lesionados', info.injured]
  ];
  return `<section class="info-box"><h3 style="color:${color}">${esc(info.team)}</h3>${rows.map(([label, value]) =>
    `<div class="info-row"><span class="info-label">${label}</span><span class="info-val">${esc(String(value).replaceAll('_', ' '))}</span></div>`
  ).join('')}</section>`;
}

function renderStats(rows) {
  if (!rows.length) return '';
  return `<section class="stats-box"><h3>📈 Estadísticas del partido</h3>${rows.map(row => {
    const total = row.home + row.away || 1;
    const homeWidth = Math.round(row.home / total * 100);
    const awayWidth = Math.round(row.away / total * 100);
    return `<div class="stat-row"><span class="stat-val" style="color:#e8395a;text-align:right">${row.home}</span>
      <div class="bar-wrap"><div class="bar-l" style="width:${homeWidth}%;margin-left:auto"></div><div class="bar-r" style="width:${awayWidth}%"></div></div>
      <span class="stat-val" style="color:#3498db">${row.away}</span><span class="stat-label">${esc(row.label)}</span></div>`;
  }).join('')}</section>`;
}

function renderCommentary(events) {
  if (!events.length) return '<p class="msg">Sin relato disponible.</p>';
  return events.map(event => {
    if (event.kind === 'break') return `<div class="ev-break">${esc(event.label.toUpperCase())}</div>`;
    const cls = { goal: ' ev-gol', red: ' ev-red', yellow: ' ev-yellow' }[event.type] || '';
    return `<div class="evento${cls}"><span class="min-tag">${event.minute}'</span> ${esc(event.text).replaceAll('_', ' ')}</div>`;
  }).join('');
}

function renderPlayerStats(group, color) {
  if (!group?.players?.length) return '';
  const cell = value => value || '–';
  return `<section class="pstats"><h3 style="color:${color}">${esc(group.team)} — Estadísticas individuales</h3>
    <table><thead><tr><th>Jugador</th><th>Pos</th><th>Min</th><th>Sav</th><th>Ktk</th><th>Kps</th><th>Ass</th><th>Sht</th><th>Gls</th><th>🟨</th><th>🟥</th></tr></thead>
    <tbody>${group.players.map(player => `<tr class="${player.min === 0 ? 'np' : ''}"><td>${esc(player.displayName)}</td><td>${esc(player.position)}</td>
      <td>${cell(player.min)}</td><td>${cell(player.sav)}</td><td>${cell(player.ktk)}</td><td>${cell(player.kps)}</td><td>${cell(player.ass)}</td>
      <td>${cell(player.sht)}</td><td>${cell(player.gls)}</td><td>${cell(player.yel)}</td><td>${cell(player.red)}</td></tr>`).join('')}</tbody></table></section>`;
}

function renderViewer(match) {
  const result = scoreText(match);
  const infoByTeam = Object.fromEntries(match.info.map(info => [info.team, info]));
  const playerGroups = Object.fromEntries(match.playerStats.map(group => [group.team, group]));
  const referee = match.referee ? `${match.referee.name}${match.referee.country ? ` · ${match.referee.country}` : ''}` : 'No disponible';
  byId('visor-content').innerHTML = `
    <header class="match-header"><div class="match-comp">${esc(match.competitionLabel)} · ${esc(match.roundLabel)}</div>
      <div class="match-teams-row"><div class="match-team team-identity">${crestImage(match.homeCode, match.homeTeam, 'team-crest match-team-crest')}<span>${esc(match.homeTeam)}</span></div>
        <div><button class="match-score visor-score-box" id="visor-score" type="button" data-score="${esc(result)}" data-revealed="0" aria-label="Mostrar resultado">👁</button>
        <div class="match-score-sub" id="visor-ht" hidden>${match.halfTime ? `Descanso: ${esc(match.halfTime)}` : ''}</div></div>
        <div class="match-team team-identity right"><span>${esc(match.awayTeam)}</span>${crestImage(match.awayCode, match.awayTeam, 'team-crest match-team-crest')}</div></div>
      <div class="match-tactics"><span>${esc(match.formation.home)}</span><span style="color:var(--muted)">vs</span><span>${esc(match.formation.away)}</span></div>
      <div class="data-note">⚖ ${esc(referee)}</div></header>
    <div class="lineups">${renderLineup(match.homeTeam, match.lineups.home, '#e8395a', match.formation.home)}${renderLineup(match.awayTeam, match.lineups.away, '#3498db', match.formation.away)}</div>
    <section class="relato-box"><h3>🎤 Relato del partido</h3>${renderCommentary(match.commentary)}</section>
    <div class="info-grid">${renderInfo(infoByTeam[match.homeTeam], '#e8395a')}${renderInfo(infoByTeam[match.awayTeam], '#3498db')}</div>
    ${renderStats(match.stats)}
    ${renderPlayerStats(playerGroups[match.homeTeam], '#e8395a')}
    ${renderPlayerStats(playerGroups[match.awayTeam], '#3498db')}`;

  const score = byId('visor-score');
  score.addEventListener('click', () => {
    const revealed = score.dataset.revealed === '1';
    score.textContent = revealed ? '👁' : score.dataset.score;
    score.dataset.revealed = revealed ? '0' : '1';
    score.setAttribute('aria-label', revealed ? 'Mostrar resultado' : 'Ocultar resultado');
    if (match.halfTime) byId('visor-ht').hidden = revealed;
  });
}

async function openViewer(summary) {
  byId('partidos-section').style.display = 'none';
  byId('jornadas-section').style.display = 'none';
  byId('visor').style.display = 'block';
  byId('visor-content').innerHTML = '<div class="spinner"></div>';
  try {
    let match = state.detailCache.get(summary.id);
    if (!match) {
      const response = await fetch(summary.detailPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      match = await response.json();
      state.detailCache.set(summary.id, match);
    }
    renderViewer(match);
  } catch (error) {
    byId('visor-content').innerHTML = `<div class="status-panel error">No se pudo cargar el partido. ${esc(error.message)}</div>`;
  }
}

byId('visor-back').addEventListener('click', () => {
  byId('visor').style.display = 'none';
  byId('jornadas-section').style.display = 'block';
  byId('partidos-section').style.display = 'block';
});

async function init() {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.manifest = await response.json();
    renderCompetitions();
    const league = competitionById('liga-regular') || state.manifest.competitions[0];
    selectCompetition(league.id);
    const latest = [...league.rounds].reverse().find(round => round.matchIds.length);
    if (latest) selectRound(latest.id);
  } catch (error) {
    byId('comp-grid').innerHTML = `<div class="status-panel error">No se pudieron cargar los datos: ${esc(error.message)}</div>`;
  }
}

init();
