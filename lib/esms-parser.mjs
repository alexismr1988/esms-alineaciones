const TEAM_DEFINITIONS = [
  { code: 'ars', abbr: 'ARS', name: 'Arsenal', shortName: 'Arsenal' },
  { code: 'atm', abbr: 'ATM', name: 'Atletico Madrid', shortName: 'Atletico' },
  { code: 'bar', abbr: 'BAR', name: 'FC Barcelona', shortName: 'Barcelona' },
  { code: 'bay', abbr: 'BAY', name: 'Bayern Munich', shortName: 'Bayern' },
  { code: 'bor', abbr: 'BOR', name: 'Borussia Dortmund', shortName: 'Dortmund' },
  { code: 'che', abbr: 'CHE', name: 'Chelsea', shortName: 'Chelsea' },
  { code: 'cit', abbr: 'CIT', name: 'Manchester City', shortName: 'Man City' },
  { code: 'int', abbr: 'INT', name: 'Inter Milan', shortName: 'Inter' },
  { code: 'liv', abbr: 'LIV', name: 'Liverpool', shortName: 'Liverpool' },
  { code: 'man', abbr: 'MAN', name: 'Manchester United', shortName: 'Man Utd' },
  { code: 'nap', abbr: 'NAP', name: 'Napoles', shortName: 'Napoles' },
  { code: 'psg', abbr: 'PSG', name: 'PSG', shortName: 'PSG' },
  { code: 'rma', abbr: 'RMA', name: 'Real Madrid', shortName: 'Real Madrid' },
  { code: 'tot', abbr: 'TOT', name: 'Tottenham', shortName: 'Tottenham' }
];

export const TEAMS = Object.freeze(TEAM_DEFINITIONS.map(Object.freeze));
export const TEAMS_BY_CODE = Object.freeze(Object.fromEntries(TEAMS.map(team => [team.code, team])));

export const COMPETITIONS = Object.freeze([
  { id: 'liga-regular', label: 'Liga Regular', icon: '⚽', roundLabel: 'Jornada' },
  { id: 'copa-sli', label: 'Copa SLI', icon: '🏆', roundLabel: 'Ronda' },
  { id: 'trofeo-midseason', label: 'Trofeo Mid-Season', icon: '⭐', roundLabel: 'Ronda' },
  { id: 'copa-federacion', label: 'Copa Federación', icon: '🏀', roundLabel: 'Ronda' },
  { id: 'copa-desprestigio', label: 'Copa Desprestigio', icon: '💀', roundLabel: 'Ronda' }
]);

const COMPETITION_BY_ID = Object.freeze(Object.fromEntries(COMPETITIONS.map(comp => [comp.id, comp])));

function asInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function displayPlayerName(value = '') {
  return value.replaceAll('_', ' ');
}

export function decodeEsmsBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let text;
  let encoding = 'utf-8';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
    encoding = 'windows-1252';
  }
  return {
    text: text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'),
    encoding
  };
}

export function parseRoster(text, teamCode = '') {
  const players = [];
  const warnings = [];
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Name') || line.startsWith('---')) continue;
    const parts = line.split(/\s+/);
    const ageIndex = parts.findIndex((part, partIndex) => partIndex > 0 && /^\d+$/.test(part));
    if (ageIndex < 1 || parts.length < ageIndex + 26) {
      warnings.push(`Linea ${index + 1}: formato de jugador no reconocido`);
      continue;
    }
    const values = parts.slice(ageIndex);
    const name = parts.slice(0, ageIndex).join('_');
    players.push({
      name,
      displayName: displayPlayerName(name),
      age: asInt(values[0]),
      nat: values[1] || '',
      st: asInt(values[2]),
      tk: asInt(values[3]),
      ps: asInt(values[4]),
      sh: asInt(values[5]),
      ag: asInt(values[6]),
      kab: asInt(values[7]),
      tab: asInt(values[8]),
      pab: asInt(values[9]),
      sab: asInt(values[10]),
      gam: asInt(values[11]),
      sub: asInt(values[12]),
      min: asInt(values[13]),
      mom: asInt(values[14]),
      sav: asInt(values[15]),
      con: asInt(values[16]),
      ktk: asInt(values[17]),
      kps: asInt(values[18]),
      sht: asInt(values[19]),
      gls: asInt(values[20]),
      ass: asInt(values[21]),
      dp: asInt(values[22]),
      inj: asInt(values[23]),
      sus: asInt(values[24]),
      fit: asInt(values[25])
    });
  }
  return { teamCode, players, warnings };
}

export function parseStandings(text) {
  const rows = [];
  const warnings = [];
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Pl') || line.startsWith('---')) continue;
    const parts = line.split(/\s{2,}/);
    if (parts.length < 10) {
      warnings.push(`Línea ${index + 1}: fila de clasificación incompleta`);
      continue;
    }
    const row = {
      position: asInt(parts[0]),
      team: parts[1].trim(),
      played: asInt(parts[2]),
      won: asInt(parts[3]),
      drawn: asInt(parts[4]),
      lost: asInt(parts[5]),
      goalsFor: asInt(parts[6]),
      goalsAgainst: asInt(parts[7]),
      goalDifference: asInt(parts[8]),
      points: asInt(parts[9])
    };
    if (row.played !== row.won + row.drawn + row.lost) warnings.push(`${row.team}: PJ no coincide con V+E+D`);
    if (row.goalDifference !== row.goalsFor - row.goalsAgainst) warnings.push(`${row.team}: DG no coincide con GF-GC`);
    if (row.points !== row.won * 3 + row.drawn) warnings.push(`${row.team}: puntos no coinciden con 3V+E`);
    rows.push(row);
  }
  return { rows, warnings };
}

function parseScoreLine(text) {
  const match = text.match(/^(Marcador|Resultado final)\s*:\s*(.*?)\s+(\d+)\s*-\s*(\d+)\s+(.*?)\s*$/m);
  if (!match) return null;
  return {
    source: match[1],
    homeTeam: match[2].trim(),
    home: asInt(match[3]),
    away: asInt(match[4]),
    awayTeam: match[5].trim()
  };
}

function parsePenaltyShootout(text) {
  const start = text.search(/TANDA DE PENALTIS/i);
  if (start < 0) return null;
  const end = text.indexOf('FINAL', start);
  const block = text.slice(start, end > start ? end : undefined);
  const scores = [...block.matchAll(/^\s*\.\.\.\s+.*?\s+(\d+)\s*-\s*(\d+)\s+.*?\.\.\.\s*$/gm)];
  if (!scores.length) return null;
  const last = scores.at(-1);
  return { home: asInt(last[1]), away: asInt(last[2]) };
}

function parseFormationLine(text) {
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([\d][\d-]+ [A-Z])\s+\|\s+([\d][\d-]+ [A-Z])\s*$/);
    if (match) return { home: match[1], away: match[2] };
  }
  return { home: '', away: '' };
}

function parseLineupPlayer(value, side) {
  const trimmed = value.trim();
  const match = side === 'home'
    ? trimmed.match(/^(.*?)\s+(GK|DF|DM|MF|AM|FW|SUB)\s*$/)
    : trimmed.match(/^(GK|DF|DM|MF|AM|FW|SUB)\s+(.*)$/);
  if (!match) return null;
  const name = side === 'home' ? match[1] : match[2];
  const position = side === 'home' ? match[2] : match[1];
  return { name, displayName: displayPlayerName(name), position, substitute: position === 'SUB' };
}

function parseLineups(text) {
  const home = [];
  const away = [];
  let started = false;
  for (const line of text.split('\n')) {
    if (!started && (/GK\s*\|/.test(line) || /\|\s*GK/.test(line))) started = true;
    if (!started) continue;
    if (/Árbitro|Arbitro/.test(line)) break;
    const pipe = line.indexOf('|');
    if (pipe < 0) continue;
    const homePlayer = parseLineupPlayer(line.slice(0, pipe), 'home');
    const awayPlayer = parseLineupPlayer(line.slice(pipe + 1), 'away');
    if (homePlayer) home.push(homePlayer);
    if (awayPlayer) away.push(awayPlayer);
  }
  return { home, away };
}

function readInfoValue(block, label) {
  const match = block.match(new RegExp(`^${label}\\s*:\\s*(.*?)\\s*$`, 'm'));
  return match?.[1]?.trim() || 'N/A';
}

function parseTeamInfo(text) {
  const headers = [...text.matchAll(/^(.+?)\s+-\s+Informaci[oó]n del partido\s*$/gm)];
  return headers.map((header, index) => {
    const start = header.index + header[0].length;
    const end = headers[index + 1]?.index ?? text.indexOf('Estadísticas del partido', start);
    const block = text.slice(start, end > start ? end : undefined);
    return {
      team: header[1].trim(),
      mvp: readInfoValue(block, 'Mejor jugador'),
      goals: readInfoValue(block, 'Goleadores'),
      sentOff: readInfoValue(block, 'Expulsados'),
      booked: readInfoValue(block, 'Amonestados'),
      injured: readInfoValue(block, 'Lesionados')
    };
  });
}

function parseMatchStats(text) {
  const start = text.search(/Estad[ií]sticas del partido/i);
  if (start < 0) return [];
  const scoreStart = text.slice(start).search(/^(?:Marcador|Resultado final)\s*:/m);
  const block = text.slice(start, scoreStart >= 0 ? start + scoreStart : undefined);
  const stats = [];
  for (const line of block.split('\n')) {
    const match = line.match(/^([^:|]{2,50}):\s*(-?\d+)\s*\|\s*(-?\d+)/);
    if (match) stats.push({ label: match[1].trim(), home: asInt(match[2]), away: asInt(match[3]) });
  }
  return stats;
}

function parsePlayerRow(line) {
  if (!line.includes('|') || /^\s*Name\s+Pos\b/.test(line) || /^\s*-+/.test(line)) return null;
  const [identity, valuesPart] = line.split('|', 2);
  const left = identity.trim().split(/\s+/);
  const right = valuesPart.trim().split(/\s+/);
  if (left.length < 7 || right.length < 9) return null;
  const name = left.slice(0, -6).join('_');
  const [position, st, tk, ps, sh, ag] = left.slice(-6);
  return {
    name,
    displayName: displayPlayerName(name),
    position,
    st: asInt(st), tk: asInt(tk), ps: asInt(ps), sh: asInt(sh), ag: asInt(ag),
    min: asInt(right[0]), sav: asInt(right[1]), ktk: asInt(right[2]), kps: asInt(right[3]),
    ass: asInt(right[4]), sht: asInt(right[5]), gls: asInt(right[6]), yel: asInt(right[7]), red: asInt(right[8])
  };
}

function parsePlayerStats(text) {
  const headers = [...text.matchAll(/^Player Statistics - (.+?)\s*$/gm)];
  return headers.map((header, index) => {
    const start = header.index + header[0].length;
    const end = headers[index + 1]?.index ?? text.length;
    const players = text.slice(start, end).split('\n').map(parsePlayerRow).filter(Boolean);
    return { team: header[1].trim(), players };
  });
}

function eventType(text) {
  if (/GOOOOOL|GOL DE/i.test(text)) return 'goal';
  if (/\(ROJA\)|EXPULSADO/i.test(text)) return 'red';
  if (/\(AMARILLA\)/i.test(text)) return 'yellow';
  if (/sustituye|deja el terreno|va a tener su oportunidad/i.test(text)) return 'substitution';
  if (/lesi[oó]n|se ha hecho da[ñn]o|no puede continuar/i.test(text)) return 'injury';
  return 'play';
}

function parseCommentary(text) {
  const lines = text.split('\n');
  const events = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    current.text = current.lines.join(' ').replace(/\s+/g, ' ').trim();
    current.type = eventType(current.text);
    delete current.lines;
    events.push(current);
    current = null;
  };
  for (const line of lines) {
    const minute = line.match(/^Min\.\s*(\d+)\s*:\(([^)]+)\)\s*(.*)$/);
    if (minute) {
      flush();
      current = { kind: 'event', minute: asInt(minute[1]), teamCode: minute[2], lines: [minute[3].trim()] };
      continue;
    }
    if (/DESCANSO/.test(line)) {
      flush();
      events.push({ kind: 'break', label: 'Descanso' });
      continue;
    }
    if (/\*+\s*FINAL/.test(line)) {
      flush();
      events.push({ kind: 'break', label: 'Final del partido' });
      break;
    }
    if (current && /^\s*\.\.\./.test(line)) current.lines.push(line.replace(/^\s*\.\.\.\s*/, '').trim());
  }
  flush();
  return events;
}

export function roundLabel(competitionId, roundId) {
  if (competitionId === 'liga-regular' && /^j\d+$/.test(roundId)) return `Jornada ${asInt(roundId.slice(1))}`;
  const labels = {
    'r1-ida': '1ª Ronda · Ida', 'r1-vuelta': '1ª Ronda · Vuelta', r1: '1ª Ronda',
    'cuartos-ida': 'Cuartos · Ida', 'cuartos-vuelta': 'Cuartos · Vuelta', cuartos: 'Cuartos',
    'semis-ida': 'Semifinales · Ida', 'semis-vuelta': 'Semifinales · Vuelta', semis: 'Semifinales',
    final: 'Final', 'grupo-j1': 'Grupos · Jornada 1', 'grupo-j2': 'Grupos · Jornada 2', 'grupo-j3': 'Grupos · Jornada 3'
  };
  return labels[roundId] || roundId;
}

export function parseMatch(text, { competitionId, roundId, fileName }) {
  const baseName = fileName.replace(/\.txt$/i, '');
  const [homeCode = '', awayCode = ''] = baseName.split('_');
  const homeTeam = TEAMS_BY_CODE[homeCode]?.name || homeCode.toUpperCase();
  const awayTeam = TEAMS_BY_CODE[awayCode]?.name || awayCode.toUpperCase();
  const score = parseScoreLine(text);
  const penaltyShootout = parsePenaltyShootout(text);
  const halfTimeMatch = text.match(/^Resultado al descanso:\s*(.*?)\s*$/m);
  const refereeMatch = text.match(/^(?:Árbitro|Arbitro):\s*([^\n(]+)(?:\s+\(([^)]+)\))?/m);
  const info = parseTeamInfo(text);
  const playerStats = parsePlayerStats(text);
  const warnings = [];
  if (!score) warnings.push('No se encontro el resultado final');
  if (info.length !== 2) warnings.push(`Se esperaban 2 bloques de informacion y se encontraron ${info.length}`);
  if (playerStats.length !== 2) warnings.push(`Se esperaban 2 bloques de jugadores y se encontraron ${playerStats.length}`);
  return {
    id: `${competitionId}/${roundId}/${baseName}`,
    competitionId,
    competitionLabel: COMPETITION_BY_ID[competitionId]?.label || competitionId,
    roundId,
    roundLabel: roundLabel(competitionId, roundId),
    fileName,
    homeCode,
    awayCode,
    homeTeam,
    awayTeam,
    result: score ? { home: score.home, away: score.away, source: score.source } : null,
    penaltyShootout,
    halfTime: halfTimeMatch?.[1]?.trim() || '',
    formation: parseFormationLine(text),
    referee: refereeMatch ? { name: displayPlayerName(refereeMatch[1].trim()), country: refereeMatch[2] || '' } : null,
    lineups: parseLineups(text),
    info,
    stats: parseMatchStats(text),
    playerStats,
    commentary: parseCommentary(text),
    warnings
  };
}
