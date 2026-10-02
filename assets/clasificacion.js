import { crestImage, teamCodeFor } from './team-crests.js';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function zone(position, total) {
  if (position === 1) return { row: 'z-green', ball: 'c-green' };
  if (position <= 4) return { row: 'z-yellow', ball: 'c-yellow' };
  if (position <= total - 4) return { row: 'z-blue', ball: 'c-blue' };
  if (position < total) return { row: 'z-red', ball: 'c-red' };
  return { row: 'z-darkred', ball: 'c-darkred' };
}

function goalDifference(value) {
  const cls = value > 0 ? 'gd-pos' : value < 0 ? 'gd-neg' : 'gd-zero';
  return `<span class="${cls}">${value > 0 ? '+' : ''}${value}</span>`;
}

function balance(row) {
  return `<div style="display:flex;gap:4px;justify-content:center"><span class="f-w">${row.won}V</span><span class="f-d">${row.drawn}E</span><span class="f-l">${row.lost}D</span></div>`;
}

function render(rows) {
  const total = rows.length;
  document.getElementById('table-wrap').innerHTML = `<table class="classification-table"><thead><tr><th>#</th><th class="left">Equipo</th><th>PJ</th><th class="hide-sm">V</th><th class="hide-sm">E</th>
    <th class="hide-sm">D</th><th>GF</th><th>GC</th><th>DG</th><th class="hide-sm">Balance</th><th>Pts</th></tr></thead><tbody>${rows.map(row => {
      const colors = zone(row.position, total);
      return `<tr class="${colors.row} ${(row.position === 1 || row.position === 4) ? 'sep-bottom' : ''}"><td><div class="pos-num ${colors.ball}">${row.position}</div></td>
        <td class="left"><span class="team-identity">${crestImage(teamCodeFor(row.team), row.team, 'team-crest table-team-crest')}<span class="team-name">${esc(row.team)}</span></span></td><td>${row.played}</td><td class="hide-sm">${row.won}</td><td class="hide-sm">${row.drawn}</td>
        <td class="hide-sm">${row.lost}</td><td>${row.goalsFor}</td><td>${row.goalsAgainst}</td><td>${goalDifference(row.goalDifference)}</td><td class="hide-sm">${balance(row)}</td>
        <td><span class="pts-cell">${row.points}</span></td></tr>`;
    }).join('')}</tbody></table>`;
  document.getElementById('table-wrap').style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}

fetch('./data/standings.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => render(data.rows)).catch(error => {
  document.getElementById('loading').innerHTML = `<div class="status-panel error">No se pudo cargar la clasificación: ${esc(error.message)}</div>`;
});
