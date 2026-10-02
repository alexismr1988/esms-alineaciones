export const teams = [
  { code: 'ars', name: 'Arsenal' },
  { code: 'atm', name: 'Atlético Madrid' },
  { code: 'bar', name: 'FC Barcelona' },
  { code: 'bay', name: 'Bayern Munich' },
  { code: 'bor', name: 'Borussia Dortmund' },
  { code: 'che', name: 'Chelsea' },
  { code: 'cit', name: 'Manchester City' },
  { code: 'int', name: 'Inter de Milán' },
  { code: 'liv', name: 'Liverpool' },
  { code: 'man', name: 'Manchester United' },
  { code: 'nap', name: 'Nápoles' },
  { code: 'psg', name: 'Paris Saint-Germain' },
  { code: 'rma', name: 'Real Madrid' },
  { code: 'tot', name: 'Tottenham' }
];

const aliases = new Map();
const normalize = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const names = {
  ars: ['arsenal'], atm: ['atletico', 'atleticomadrid'], bar: ['barcelona', 'fcbarcelona', 'barca'],
  bay: ['bayern', 'bayernmunich'], bor: ['dortmund', 'borussiadortmund'], che: ['chelsea'],
  cit: ['mancity', 'manchestercity'], int: ['inter', 'intermilan', 'interdemilan'], liv: ['liverpool', 'liverpoolfc'],
  man: ['manutd', 'manchesterutd', 'manchesterunited'], nap: ['napoles', 'napoli'],
  psg: ['psg', 'parissaintgermain'], rma: ['realmadrid'], tot: ['tottenham', 'tottenhamhotspur']
};

for (const team of teams) {
  aliases.set(normalize(team.code), team.code);
  aliases.set(normalize(team.name), team.code);
  for (const name of names[team.code]) aliases.set(normalize(name), team.code);
}

export function teamCodeFor(value) {
  return aliases.get(normalize(value)) || '';
}

export function crestPath(value) {
  const code = teamCodeFor(value);
  return code ? `./assets/crests/${code}.svg` : '';
}

export function crestImage(value, teamName = '', className = 'team-crest') {
  const src = crestPath(value);
  return src ? `<img class="${className}" src="${src}" alt="" loading="lazy" decoding="async" aria-hidden="true">` : '';
}
