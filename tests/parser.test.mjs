import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { decodeEsmsBuffer, parseMatch, parseRoster, parseStandings } from '../lib/esms-parser.mjs';

const root = resolve(import.meta.dirname, '..');

async function decoded(...parts) {
  return decodeEsmsBuffer(await readFile(join(root, ...parts)));
}

test('interpreta las columnas de una plantilla ESMS', () => {
  const roster = parseRoster(`
Name         Age Nat St Tk Ps Sh Ag KAb TAb PAb SAb Gam Sub  Min Mom Sav Con Ktk Kps Sht Gls Ass DP Inj Sus Fit
T_Courtois    34 bel 45  2  2  2 24 333 300 300 300  25   0 2408   0 216  48   0   0   0   0   0  0   0   0 100
`, 'rma');
  assert.deepEqual(
    Object.fromEntries(['name', 'age', 'nat', 'st', 'gam', 'min', 'inj', 'sus', 'fit'].map(key => [key, roster.players[0][key]])),
    { name: 'T_Courtois', age: 34, nat: 'bel', st: 45, gam: 25, min: 2408, inj: 0, sus: 0, fit: 100 }
  );
});

test('acepta las plantillas actuales sin depender de sus estadísticas', async () => {
  for (const team of ['ars', 'atm', 'bar', 'bay', 'bor', 'che', 'cit', 'int', 'liv', 'man', 'nap', 'psg', 'rma', 'tot']) {
    const source = await decoded('rosters', `${team}.txt`);
    const roster = parseRoster(source.text, team);
    assert.equal(roster.warnings.length, 0, `${team}: ${roster.warnings.join(', ')}`);
    assert.ok(roster.players.length >= 20, `${team}: plantilla incompleta`);
    assert.ok(roster.players.every(player => player.name && player.age > 0 && player.fit >= 0));
  }
});

test('interpreta la clasificacion y valida sus invariantes', async () => {
  const source = await decoded('clasificacion', 'table.txt');
  const standings = parseStandings(source.text);
  assert.equal(standings.rows.length, 14);
  assert.equal(standings.warnings.length, 0);
  assert.deepEqual(standings.rows.map(row => row.position), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(new Set(standings.rows.map(row => row.team)).size, 14);
  assert.ok(standings.rows.every(row => row.played === row.won + row.drawn + row.lost));
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
