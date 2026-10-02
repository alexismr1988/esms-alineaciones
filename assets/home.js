import { teams, crestImage } from './team-crests.js';

document.getElementById('club-strip').innerHTML = teams
  .map(team => `<span title="${team.name}">${crestImage(team.code, team.name)}</span>`)
  .join('');
