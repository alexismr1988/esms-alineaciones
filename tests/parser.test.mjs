import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { decodeEsmsBuffer, parseMatch, parseRoster, parseStandings } from '../lib/esms-parser.mjs';

const root = resolve(import.meta.dirname, '..');

async function decoded(...parts) {
  return decodeEsmsBuffer(await readFile(join(root, ...parts)));
}

test('interpreta una plantilla ESMS completa', async () => {
  const source = await decoded('rosters', 'rma.txt');
  const roster = parseRoster(source.text, 'rma');
  assert.equal(roster.warnings.length, 0);
  assert.equal(roster.players.length, 25);
  assert.deepEqual(
    Object.fromEntries(['name', 'age', 'nat', 'st', 'gam', 'min', 'inj', 'sus', 'fit'].map(key => [key, roster.players[0][key]])),
    { name: 'T_Courtois', age: 34, nat: 'bel', st: 45, gam: 24, min: 2312, inj: 0, sus: 0, fit: 100 }
  );
});

test('interpreta la clasificacion y valida sus invariantes', async () => {
  const source = await decoded('clasificacion', 'table.txt');
  const standings = parseStandings(source.text);
  assert.equal(standings.rows.length, 14);
  assert.equal(standings.warnings.length, 0);
  assert.deepEqual(standings.rows[0], {
    position: 1, team: 'PSG', played: 23, won: 14, drawn: 4, lost: 5,
    goalsFor: 54, goalsAgainst: 26, goalDifference: 28, points: 46
  });
});

test('mantiene correctamente un empate a cero', async () => {
  const source = await decoded('partidos', 'liga-regular', 'j23', 'int_rma.txt');
  const match = parseMatch(source.text, { competitionId: 'liga-regular', roundId: 'j23', fileName: 'int_rma.txt' });
  assert.equal(source.encoding, 'windows-1252');
  assert.deepEqual(match.result, { home: 0, away: 0, source: 'Resultado final' });
  assert.equal(match.referee.name, 'Rafa Guerrero');
  assert.equal(match.info.length, 2);
  assert.equal(match.playerStats[0].players[0].min, 96);
  assert.equal(match.playerStats[1].players[0].sav, 5);
});

test('separa el resultado del partido de la tanda de penaltis', async () => {
  const source = await decoded('partidos', 'copa-sli', 'r1-vuelta', 'bor_man.txt');
  const match = parseMatch(source.text, { competitionId: 'copa-sli', roundId: 'r1-vuelta', fileName: 'bor_man.txt' });
  assert.deepEqual(match.result, { home: 1, away: 0, source: 'Resultado final' });
  assert.deepEqual(match.penaltyShootout, { home: 4, away: 3 });
  assert.deepEqual(match.info.map(info => info.team), ['Borussia Dortmund', 'Manchester United']);
});

test('acepta los informes antiguos que utilizan Marcador', async () => {
  const source = await decoded('partidos', 'liga-regular', 'j1', 'bar_tot.txt');
  const match = parseMatch(source.text, { competitionId: 'liga-regular', roundId: 'j1', fileName: 'bar_tot.txt' });
  assert.equal(match.result.source, 'Marcador');
  assert.equal(match.playerStats.length, 2);
});
