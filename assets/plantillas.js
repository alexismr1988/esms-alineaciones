const host = document.getElementById('table-wrap');
const teamsHost = document.getElementById('teams-container');
const loading = document.getElementById('loading');
import { crestImage } from './team-crests.js';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const dataUrl = `./data/rosters.json?v=${Date.now().toString(36)}`;
let data;
let activeTeam;

function skill(value, className) {
  return `<span class="${value > 2 ? className : 'sk-zero'}">${value}</span>`;
}

function renderTable(players) {
  const rows = players.map(player => `<tr>
    <td class="left"><span class="pname">${esc(player.displayName)}</span></td><td><span class="age">${player.age}</span></td><td><span class="nat">${esc(player.nat)}</span></td>
    <td>${skill(player.st, 'sk-gk')}</td><td>${skill(player.tk, 'sk-tk')}</td><td>${skill(player.ps, 'sk-ps')}</td><td>${skill(player.sh, 'sk-sh')}</td>
    <td style="border-right:1px solid #333"><span class="st-hl">${player.ag}</span></td><td>${player.gam || '–'}</td><td>${player.min || '–'}</td>
    <td>${player.mom || '–'}</td><td>${player.sav || '–'}</td><td>${player.con || '–'}</td><td>${player.ktk || '–'}</td><td>${player.kps || '–'}</td>
    <td>${player.sht || '–'}</td><td style="color:#e8395a;font-weight:600">${player.gls || '–'}</td><td style="color:#f5a623;font-weight:600">${player.ass || '–'}</td>
    <td style="border-right:1px solid #333">${player.dp || '–'}</td><td>${player.inj ? `<span class="val-inj">${player.inj}</span>` : '<span class="sk-zero">0</span>'}</td>
    <td>${player.sus ? `<span class="val-susp">${player.sus}</span>` : '<span class="sk-zero">0</span>'}</td><td><span class="${player.fit < 85 ? 'val-lowfit' : 'val-fit'}">${player.fit}</span></td>
  </tr>`).join('');
  host.innerHTML = `<table><thead><tr><th class="left">Jugador</th><th>Edad</th><th>Nac</th><th title="Habilidad Portero">ST</th><th title="Habilidad Defensa">TK</th>
    <th title="Habilidad Pase">PS</th><th title="Habilidad Disparo">SH</th><th title="Agresividad">AG</th><th title="Partidos jugados">PJ</th><th>Min</th><th>MVP</th>
    <th>Sav</th><th>GC</th><th>Ktk</th><th>Kps</th><th>Sht</th><th>Gls</th><th>Ass</th><th>DP</th><th>Inj</th><th>Sus</th><th>Fit</th></tr></thead><tbody>${rows}</tbody></table>`;
  host.style.display = 'block';
}

function loadTeam(id) {
  activeTeam = id;
  document.querySelectorAll('.team-btn').forEach(button => button.classList.toggle('active', button.dataset.id === id));
  renderTable(data.rosters[id]?.players || []);
}
window.loadTeam = loadTeam;

async function init() {
  try {
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    teamsHost.innerHTML = data.teams.map(team => `<button class="team-btn" type="button" data-id="${esc(team.code)}">${crestImage(team.code, team.name)}<span>${esc(team.name)}</span></button>`).join('');
    teamsHost.querySelectorAll('button').forEach(button => button.addEventListener('click', () => loadTeam(button.dataset.id)));
    loading.style.display = 'none';
    loadTeam(data.teams[0].code);
  } catch (error) {
    loading.innerHTML = `<div class="status-panel error">No se pudieron cargar las plantillas: ${esc(error.message)}</div>`;
  }
}
init();
