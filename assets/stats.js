const categories = [
  { id: 'gls', icon: '⚽', label: 'Goleadores', desc: 'Más goles marcados', color: '#e8395a' },
  { id: 'ass', icon: '🎯', label: 'Asistencias', desc: 'Más asistencias', color: '#f5a623' },
  { id: 'sht', icon: '🔴', label: 'Disparos', desc: 'Más disparos', color: '#ff6b35' },
  { id: 'sav', icon: '🥊', label: 'Paradas', desc: 'Porteros con más paradas', color: '#3498db', goalkeeper: true },
  { id: 'ktk', icon: '🛡', label: 'Cortes', desc: 'Cortes defensivos', color: '#2ecc71' },
  { id: 'kps', icon: '🔵', label: 'Pases', desc: 'Pases clave', color: '#9b59b6' },
  { id: 'mom', icon: '⭐', label: 'MVP', desc: 'Veces jugador del partido', color: '#ffd700' },
  { id: 'min', icon: '⏱', label: 'Minutos', desc: 'Minutos jugados', color: '#1abc9c' },
  { id: 'con', icon: '🚨', label: 'Goles encajados', desc: 'Porteros con menos GC', color: '#e74c3c', goalkeeper: true, ascending: true },
  { id: 'mpg', icon: '⚡', label: 'Min por gol', desc: 'Menos minutos por gol', color: '#e67e22', ascending: true },
  { id: 'conv', icon: '🏹', label: '% Conversión', desc: 'Goles / disparos', color: '#00d2ff' },
  { id: 'gc90', icon: '🏆', label: 'Portero GC/90', desc: 'Goles encajados por 90 min', color: '#a29bfe', goalkeeper: true, ascending: true },
  { id: 'sus', icon: '🟥', label: 'Sancionados', desc: 'Partidos de sanción pendientes', color: '#e74c3c', list: true },
  { id: 'inj', icon: '🩹', label: 'Lesionados', desc: 'Partidos de baja por lesión', color: '#e67e22', list: true }
];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
let players = [];
let active;

function ranked(category) {
  let list = category.goalkeeper ? players.filter(player => player.st >= 25) : [...players];
  if (category.list) return list.filter(player => player[category.id] > 0).sort((a, b) => b[category.id] - a[category.id]);
  if (category.id === 'mpg') list = list.filter(player => player.gls > 0 && player.min > 0).map(player => ({ ...player, value: Math.round(player.min / player.gls * 10) / 10 }));
  else if (category.id === 'conv') list = list.filter(player => player.sht > 0).map(player => ({ ...player, value: Math.round(player.gls / player.sht * 1000) / 10 }));
  else if (category.id === 'gc90') list = list.filter(player => player.min >= 45).map(player => ({ ...player, value: Math.round(player.con / player.min * 9000) / 100 }));
  else list = list.filter(player => category.id === 'con' ? player.min > 0 : player[category.id] > 0).map(player => ({ ...player, value: player[category.id] }));
  return list.sort((a, b) => category.ascending ? a.value - b.value : b.value - a.value);
}

function renderTable(id) {
  const category = categories.find(item => item.id === id);
  const list = ranked(category);
  const section = document.getElementById('table-section');
  const host = document.getElementById('tbl-wrap');
  document.getElementById('tbl-icon').textContent = category.icon;
  document.getElementById('tbl-title').textContent = category.label;
  document.getElementById('tbl-title').style.color = category.color;
  section.style.display = 'block';
  if (!list.length) {
    host.innerHTML = '<div class="status-panel">No hay jugadores en esta categoría.</div>';
    return;
  }
  if (category.list) {
    host.innerHTML = `<table><thead><tr><th class="left">Jugador</th><th>Equipo</th><th>${category.id === 'sus' ? 'Sanción' : 'Lesión'}</th></tr></thead><tbody>${list.map(player =>
      `<tr><td class="left"><span class="pname">${esc(player.displayName)}</span></td><td>${esc(player.teamName)}</td><td class="r"><span class="main-val" style="color:${category.color}">${player[category.id]}</span></td></tr>`
    ).join('')}</tbody></table>`;
    return;
  }
  const maximum = Math.max(...list.map(player => player.value), 1);
  host.innerHTML = `<table><thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>PJ</th><th>Min</th><th>Progresión</th><th class="r">${esc(category.label)}</th></tr></thead><tbody>${list.map((player, index) => {
    const width = Math.max(2, Math.round(player.value / maximum * 100));
    const value = category.id === 'conv' ? `${player.value}%` : player.value;
    return `<tr class="${index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : ''}"><td><div class="pos ${index < 3 ? `pos${index + 1}` : 'posn'}">${index + 1}</div></td>
      <td><span class="pname">${esc(player.displayName)}</span></td><td><span class="chip" style="color:${category.color};border-color:${category.color}">${esc(player.teamName)}</span></td>
      <td>${player.gam}</td><td>${player.min}</td><td><div class="bar-bg"><div class="bar-fill" style="width:${width}%;background:${category.color}"></div></div></td>
      <td class="r"><span class="main-val" style="color:${category.color}">${value}</span></td></tr>`;
  }).join('')}</tbody></table>`;
}

function selectCategory(id) {
  active = id;
  document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.id === id));
  renderTable(id);
}

function renderCategories() {
  const host = document.getElementById('cats');
  host.innerHTML = categories.map(category => `<button class="cat-btn" type="button" data-id="${category.id}" style="border-color:${category.color}44"><span class="cat-icon">${category.icon}</span>
    <span><strong class="cat-label" style="color:${category.color}">${esc(category.label)}</strong><span class="cat-desc">${esc(category.desc)}</span></span></button>`).join('');
  host.querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.id)));
}

async function init() {
  renderCategories();
  try {
    const response = await fetch('./data/rosters.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    players = data.teams.flatMap(team => data.rosters[team.code].players.map(player => ({ ...player, teamCode: team.code, teamName: team.shortName })));
    document.getElementById('loadbar').style.width = '100%';
    document.getElementById('loadbar').style.background = '#2ecc71';
    selectCategory('gls');
  } catch (error) {
    document.getElementById('tbl-wrap').innerHTML = `<div class="status-panel error">No se pudieron cargar las estadísticas: ${esc(error.message)}</div>`;
    document.getElementById('table-section').style.display = 'block';
  }
}
init();
