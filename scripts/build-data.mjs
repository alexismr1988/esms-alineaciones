import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPETITIONS, TEAMS, decodeEsmsBuffer, parseMatch, parseRoster, parseStandings, roundLabel } from '../lib/esms-parser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const checkOnly = process.argv.includes('--check');

async function readEsmsFile(path) {
  return decodeEsmsBuffer(await readFile(path));
}

async function buildRosters(report) {
  const rosters = {};
  for (const team of TEAMS) {
    const source = join(root, 'rosters', `${team.code}.txt`);
    const decoded = await readEsmsFile(source);
    const parsed = parseRoster(decoded.text, team.code);
    rosters[team.code] = { team, encoding: decoded.encoding, players: parsed.players };
    for (const warning of parsed.warnings) report.warnings.push(`rosters/${team.code}.txt: ${warning}`);
  }
  return { schemaVersion: 1, teams: TEAMS, rosters };
}

async function buildStandings(report) {
  const decoded = await readEsmsFile(join(root, 'clasificacion', 'table.txt'));
  const parsed = parseStandings(decoded.text);
  report.warnings.push(...parsed.warnings.map(warning => `clasificacion/table.txt: ${warning}`));
  return { schemaVersion: 1, rows: parsed.rows };
}

async function buildMatches(report) {
  const matches = [];
  const details = [];
  const competitions = [];
  const competitionEntries = await readdir(join(root, 'partidos'), { withFileTypes: true });
  for (const competitionEntry of competitionEntries.filter(entry => entry.isDirectory())) {
    const competitionId = competitionEntry.name;
    const rounds = [];
    const roundEntries = await readdir(join(root, 'partidos', competitionId), { withFileTypes: true });
    for (const roundEntry of roundEntries.filter(entry => entry.isDirectory())) {
      const roundId = roundEntry.name;
      const files = (await readdir(join(root, 'partidos', competitionId, roundId), { withFileTypes: true }))
        .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
        .map(entry => entry.name)
        .sort();
      const ids = [];
      for (const fileName of files) {
        const source = join(root, 'partidos', competitionId, roundId, fileName);
        const decoded = await readEsmsFile(source);
        const match = parseMatch(decoded.text, { competitionId, roundId, fileName });
        match.sourceEncoding = decoded.encoding;
        const detailPath = `matches/${match.id}.json`;
        details.push({ path: detailPath, match });
        matches.push({
          id: match.id,
          detailPath: `./data/${detailPath}`,
          competitionId: match.competitionId,
          roundId: match.roundId,
          homeCode: match.homeCode,
          awayCode: match.awayCode,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          result: match.result,
          penaltyShootout: match.penaltyShootout,
          formation: match.formation,
          warnings: match.warnings
        });
        ids.push(match.id);
        for (const warning of match.warnings) report.warnings.push(`${relative(root, source)}: ${warning}`);
      }
      rounds.push({ id: roundId, label: roundLabel(competitionId, roundId), matchIds: ids });
    }
    rounds.sort((a, b) => {
      if (/^j\d+$/.test(a.id) && /^j\d+$/.test(b.id)) return Number(a.id.slice(1)) - Number(b.id.slice(1));
      return a.label.localeCompare(b.label, 'es');
    });
    const definition = COMPETITIONS.find(comp => comp.id === competitionId);
    competitions.push({
      id: competitionId,
      label: definition?.label || competitionId,
      icon: definition?.icon || '⚽',
      rounds
    });
  }
  competitions.sort((a, b) => COMPETITIONS.findIndex(c => c.id === a.id) - COMPETITIONS.findIndex(c => c.id === b.id));

  const league = competitions.find(comp => comp.id === 'liga-regular');
  for (const round of league?.rounds || []) {
    if (round.matchIds.length > 0 && round.matchIds.length !== 7) report.warnings.push(`partidos/liga-regular/${round.id}: se esperaban 7 partidos y hay ${round.matchIds.length}`);
  }
  return { index: { schemaVersion: 1, competitions, matches }, details };
}

async function writeJson(name, value) {
  const path = join(dataDir, name);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (checkOnly) {
    const current = await readFile(path, 'utf8').catch(() => '');
    if (current !== content) throw new Error(`${name} no esta actualizado. Ejecuta npm run build.`);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

const report = { schemaVersion: 1, warnings: [] };
const [rosters, standings, matches] = await Promise.all([
  buildRosters(report),
  buildStandings(report),
  buildMatches(report)
]);
report.summary = {
  teams: TEAMS.length,
  players: Object.values(rosters.rosters).reduce((sum, roster) => sum + roster.players.length, 0),
  matches: matches.index.matches.length,
  warnings: report.warnings.length
};

if (!checkOnly) await rm(join(dataDir, 'matches'), { recursive: true, force: true });

await Promise.all([
  writeJson('rosters.json', rosters),
  writeJson('standings.json', standings),
  writeJson('matches.json', matches.index),
  writeJson('quality-report.json', report),
  ...matches.details.map(detail => writeJson(detail.path, detail.match))
]);

console.log(`Datos ${checkOnly ? 'verificados' : 'generados'}: ${report.summary.players} jugadores, ${report.summary.matches} partidos, ${report.summary.warnings} avisos.`);
for (const warning of report.warnings) console.warn(`- ${warning}`);
