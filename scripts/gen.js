// Generates the profile panel (assets/*.svg + README.md) from the public repos.
// Runs locally or in GitHub Actions (.github/workflows/update-profile.yml).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const W = 840, PAD = 22, IND = 22, VX = 280, L = 34;
const KEY = '#FFBD00', VAL = '#E6E6E6', BG = '#000000';
const FF = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const USER = 'NulledNah';
const PROFILE_REPO = 'NulledNah';
const TOPIC = 'opencode-plugin';
const REPOS_URL = 'https://github.com/NulledNah?tab=repositories';
const TOPIC_URL = 'https://github.com/NulledNah?tab=repositories&q=topic:opencode-plugin';

// Repos that go under Uni (external one is not in the account list)
const UNI_OWN = new Set(['E_ASM']);
const UNI_EXTERNAL = [
  { name: 'progetto-ingegneria', full: 'morelli03/progetto-ingegneria', desc: 'programmazione 2 & ingegneria del software \u00b7 UniVR' },
];

// Short overrides where the API description is too long / noisy
const OVERRIDES = {
  pcremote: 'use your phone as a full PC remote',
  fastdownload: 'audio \u2192 FL Studio project folder (VST3 + desktop)',
  filecompactor: 'adaptive compressor in Zig (beats xz 4.03\u00d7)',
  e_asm: 'x86 production scheduler \u00b7 UniVR lab',
  'progetto-ingegneria': 'programmazione 2 & ingegneria del software \u00b7 UniVR',
};

const MAXLEN = 58;

const open = (h, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">`;
const row = (h, inner) => open(h, '') + `<rect width="${W}" height="${h}" fill="${BG}"/>` + inner + '</svg>\n';

const line = (key, val, ind = 0) =>
  row(L, `<text x="${PAD + ind}" y="${Math.round(L / 2) + 5}" font-family="${FF}" font-size="15">` +
    `<tspan fill="${KEY}" font-weight="700">${esc(key)}</tspan>` +
    `<tspan x="${VX}" fill="${VAL}">${esc(val)}</tspan></text>`);

const section = (label, ind = 0) =>
  row(L, `<text x="${PAD + ind}" y="${Math.round(L / 2) + 5}" font-family="${FF}" font-size="15" font-weight="700" fill="${KEY}">\u25bc ${esc(label)}</text>`);

const HSIZE = 18, HGAP = 17;
const header =
  row(L + HGAP, `<text x="${W / 2}" y="${Math.round(L / 2) + 6}" text-anchor="middle" font-family="${FF}" font-size="${HSIZE}" font-weight="700" fill="${KEY}">NulledNah</text>`);

const BARH = 12, EDGE = 40, BROW = EDGE + BARH + EDGE;
const S = (off, c) => `<stop offset="${off}" stop-color="${c}"/>`;
const STOPS = S('0', '#FFBD00') + S('0.22', '#FFCB1E') + S('0.44', '#FFD96D') +
  S('0.66', '#FFE392') + S('0.84', '#FFF0CB') + S('1', '#FFFFFF');
const STOPS_MIR = S('0', '#FFFFFF') + S('0.16', '#FFF0CB') + S('0.34', '#FFE392') +
  S('0.56', '#FFD96D') + S('0.78', '#FFCB1E') + S('1', '#FFBD00');
const barSvg = stops =>
  open(BROW, 'palette') +
  `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0">` + stops + `</linearGradient></defs>` +
  `<rect width="${W}" height="${BROW}" fill="${BG}"/>` +
  `<rect x="${PAD}" y="${EDGE}" width="${W - PAD * 2}" height="${BARH}" rx="3" fill="url(#b)"/></svg>\n`;

function descOf(key, apiDesc) {
  if (OVERRIDES[key]) return OVERRIDES[key];
  let d = (apiDesc || '').trim();
  if (d.length > MAXLEN) d = d.slice(0, MAXLEN - 1).trimEnd() + '\u2026';
  return d;
}

async function listRepos() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'profile-generator',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

function sortByStars(list) {
  return list.slice().sort((a, b) =>
    (b.stars - a.stars) || a.key.toLowerCase().localeCompare(b.key.toLowerCase()));
}

(async () => {
  const all = await listRepos();
  const repos = all
    .filter(r => !r.fork && !r.archived && r.name !== PROFILE_REPO)
    .map(r => ({
      key: r.name,
      name: r.name,
      stars: r.stargazers_count || 0,
      desc: descOf(r.name.toLowerCase(), r.description),
      href: r.html_url,
      group: UNI_OWN.has(r.name) ? 'uni' : ((r.topics || []).includes(TOPIC) ? 'plugins' : 'repos'),
    }));

  const reposGroup = sortByStars(repos.filter(r => r.group === 'repos'));
  const pluginsGroup = sortByStars(repos.filter(r => r.group === 'plugins'));
  const uniGroup = repos.filter(r => r.group === 'uni').sort((a, b) => a.name.localeCompare(b.name))
    .concat(UNI_EXTERNAL.map(e => ({
      key: e.name, name: e.name, desc: DESC_EXTERNAL(e), href: 'https://github.com/' + e.full,
    })));

  function DESC_EXTERNAL(e) { return OVERRIDES[e.name] || e.desc; }

  const items = [
    { name: 'bar-top', svg: barSvg(STOPS_MIR), alt: '' },
    { name: 'host', svg: header, href: 'https://github.com/NulledNah', alt: 'NulledNah' },
    { name: 'role', svg: line('role', 'CS student @ University of Verona'), href: 'https://www.univr.it/', alt: 'CS student @ University of Verona' },
    { name: 'focus', svg: line('focus', 'systems \u00b7 tooling \u00b7 desktop apps'), alt: 'focus' },
    { name: 'stack', svg: line('stack', 'python \u00b7 typescript \u00b7 javascript \u00b7 assembly \u00b7 zig'), alt: 'stack' },

    { name: 'sec-repos', svg: section('Repos'), href: REPOS_URL, alt: 'Repos' },
    ...reposGroup.map(r => ({ name: r.key, svg: line(r.key, r.desc, IND), href: r.href, alt: r.name })),

    { name: 'sec-plugins', svg: section('Opencode Plugins', IND), href: TOPIC_URL, alt: 'Opencode Plugins' },
    ...pluginsGroup.map(r => ({ name: r.key, svg: line(r.key, r.desc, IND * 2), href: r.href, alt: r.name })),

    { name: 'sec-uni', svg: section('Uni', IND), alt: 'Uni' },
    ...uniGroup.map(r => ({ name: r.key, svg: line(r.key, r.desc, IND * 2), href: r.href, alt: r.name })),

    { name: 'bar', svg: barSvg(STOPS), alt: '' },
  ];

  for (const f of fs.readdirSync(ASSETS)) { if (f.endsWith('.svg')) fs.unlinkSync(path.join(ASSETS, f)); }

  const rows = items.map(it => {
    const hash = crypto.createHash('sha1').update(it.svg).digest('hex').slice(0, 8);
    const file = `${it.name}.${hash}.svg`;
    fs.writeFileSync(path.join(ASSETS, file), it.svg);
    const img = `<img src="assets/${file}" width="${W}" align="absbottom" alt="${esc(it.alt)}">`;
    return it.href
      ? `<div><a href="${it.href}">${img}</a></div>`
      : `<div><picture>${img}</picture></div>`;
  });

  fs.writeFileSync(path.join(ROOT, 'README.md'), rows.join('\n') + '\n');
  console.log(`wrote ${items.length} svg + README (${reposGroup.length} repos, ${pluginsGroup.length} plugins, ${uniGroup.length} uni)`);
})().catch(err => { console.error(err); process.exit(1); });
