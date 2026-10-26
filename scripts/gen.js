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
const ABS = 'https://raw.githubusercontent.com/NulledNah/NulledNah/main/assets/';

const UNI_OWN = new Set(['E_ASM']);
const UNI_EXTERNAL = [
  { name: 'progetto-ingegneria', full: 'morelli03/progetto-ingegneria', desc: 'programmazione 2 & ingegneria del software \u00b7 UniVR' },
];

const OVERRIDES = {
  pcremote: 'use your phone as a full PC remote',
  fastdownload: 'audio \u2192 FL Studio project folder (VST3 + desktop)',
  filecompactor: 'adaptive compressor in Zig (beats xz 4.03\u00d7)',
  e_asm: 'x86 production scheduler \u00b7 UniVR lab',
  'progetto-ingegneria': 'programmazione 2 & ingegneria del software \u00b7 UniVR',
};

const MAXLEN = 58;

// ---------- desktop rendering ----------
const open = (h, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">`;
const row = (h, inner) => open(h, '') + `<rect width="${W}" height="${h}" fill="${BG}"/>` + inner + '</svg>\n';
const lineSvg = (key, val, ind = 0) =>
  row(L, `<text x="${PAD + ind}" y="${Math.round(L / 2) + 5}" font-family="${FF}" font-size="15">` +
    `<tspan fill="${KEY}" font-weight="700">${esc(key)}</tspan>` +
    `<tspan x="${VX}" fill="${VAL}">${esc(val)}</tspan></text>`);
const sectionSvg = (label, ind = 0) =>
  row(L, `<text x="${PAD + ind}" y="${Math.round(L / 2) + 5}" font-family="${FF}" font-size="15" font-weight="700" fill="${KEY}">\u25bc ${esc(label)}</text>`);
const HSIZE = 18, HGAP = 17;
const headerSvg =
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

// ---------- mobile rendering (single panel) ----------
function wrapText(text, max) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function mobileSvg(entries) {
  const MW = 360, MPAD = 14, MIND = 16, MFONT = 12, LH = 17, CW = 7.2;
  let body = '';
  let y = 12;

  const t = (x, yy, s, fill, opts = {}) =>
    `<text x="${x}" y="${yy}" font-family="${FF}" font-size="${opts.size || MFONT}"` +
    `${opts.bold ? ' font-weight="700"' : ''} fill="${fill}"` +
    `${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}>${esc(s)}</text>`;

  for (const e of entries) {
    if (e.t === 'bar') {
      const fill = e.mir ? 'url(#mb1)' : 'url(#mb2)';
      body += `<rect x="${MPAD}" y="${y}" width="${MW - MPAD * 2}" height="8" rx="3" fill="${fill}"/>`;
      y += 8 + 12;
    } else if (e.t === 'host') {
      body += t(MW / 2, y + 14, 'NulledNah', KEY, { bold: true, size: 14, anchor: 'middle' });
      y += 26;
    } else if (e.t === 'section') {
      body += t(MPAD + e.ind, y + 12, `\u25bc ${e.label}`, KEY, { bold: true });
      y += LH + 2;
    } else if (e.t === 'kv') {
      const kx = MPAD + e.ind;
      body += t(kx, y + 12, e.key, KEY, { bold: true });
      y += LH;
      const vx = kx + 10;
      const max = Math.floor((MW - vx - MPAD) / CW);
      for (const ln of wrapText(e.val, max)) {
        body += t(vx, y + 12, ln, VAL);
        y += LH;
      }
      y += 2;
    }
  }

  const H = y + 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MW}" height="${H}" viewBox="0 0 ${MW} ${H}" role="img" aria-label="NulledNah">` +
    `<defs>` +
    `<linearGradient id="mb1" x1="0" y1="0" x2="1" y2="0">${STOPS_MIR}</linearGradient>` +
    `<linearGradient id="mb2" x1="0" y1="0" x2="1" y2="0">${STOPS}</linearGradient>` +
    `</defs>` +
    `<rect width="${MW}" height="${H}" fill="${BG}"/>` + body + `</svg>\n`;
}

// ---------- data ----------
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

const byStars = list => list.slice().sort((a, b) =>
  (b.stars - a.stars) || a.key.toLowerCase().localeCompare(b.key.toLowerCase()));

(async () => {
  const all = await listRepos();
  const repos = all
    .filter(r => !r.fork && !r.archived && r.name !== PROFILE_REPO)
    .map(r => ({
      key: r.name,
      stars: r.stargazers_count || 0,
      desc: descOf(r.name.toLowerCase(), r.description),
      href: r.html_url,
      group: UNI_OWN.has(r.name) ? 'uni' : ((r.topics || []).includes(TOPIC) ? 'plugins' : 'repos'),
    }));

  const reposGroup = byStars(repos.filter(r => r.group === 'repos'));
  const pluginsGroup = byStars(repos.filter(r => r.group === 'plugins'));
  const uniGroup = repos.filter(r => r.group === 'uni').sort((a, b) => a.key.localeCompare(b.key))
    .concat(UNI_EXTERNAL.map(e => ({
      key: e.name,
      desc: OVERRIDES[e.name] || e.desc,
      href: 'https://github.com/' + e.full,
    })));

  const entries = [
    { t: 'bar', mir: true },
    { t: 'host' },
    { t: 'kv', key: 'role', val: 'CS student @ University of Verona', ind: 0, href: 'https://www.univr.it/' },
    { t: 'kv', key: 'focus', val: 'systems \u00b7 tooling \u00b7 desktop apps', ind: 0 },
    { t: 'kv', key: 'stack', val: 'python \u00b7 typescript \u00b7 javascript \u00b7 assembly \u00b7 zig', ind: 0 },

    { t: 'section', label: 'Repos', ind: 0, href: REPOS_URL },
    ...reposGroup.map(r => ({ t: 'kv', key: r.key, val: r.desc, ind: IND, href: r.href })),

    { t: 'section', label: 'Opencode Plugins', ind: IND, href: TOPIC_URL },
    ...pluginsGroup.map(r => ({ t: 'kv', key: r.key, val: r.desc, ind: IND * 2, href: r.href })),

    { t: 'section', label: 'Uni', ind: IND },
    ...uniGroup.map(r => ({ t: 'kv', key: r.key, val: r.desc, ind: IND * 2, href: r.href })),

    { t: 'bar', mir: false },
  ];

  const desktopSvg = e => {
    if (e.t === 'bar') return barSvg(e.mir ? STOPS_MIR : STOPS);
    if (e.t === 'host') return headerSvg;
    if (e.t === 'section') return sectionSvg(e.label, e.ind);
    return lineSvg(e.key, e.val, e.ind);
  };
  const altOf = e => (e.t === 'host' ? 'NulledNah' : e.t === 'section' ? e.label : e.t === 'kv' ? e.key : '');

  for (const f of fs.readdirSync(ASSETS)) { if (f.endsWith('.svg')) fs.unlinkSync(path.join(ASSETS, f)); }

  const write = (base, svg) => {
    const hash = crypto.createHash('sha1').update(svg).digest('hex').slice(0, 8);
    const file = `${base}.${hash}.svg`;
    fs.writeFileSync(path.join(ASSETS, file), svg);
    return file;
  };

  const mobileFile = write('view-mobile', mobileSvg(entries));
  const emptyFile = write('view-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>\n');

  const rows = entries.map((e, i) => {
    const file = write(e.t === 'host' ? 'host' : e.t === 'section' ? 'sec-' + e.label.toLowerCase().replace(/\s+/g, '-') : e.t === 'bar' ? 'bar' : e.key.toLowerCase().replace(/[^a-z0-9_-]/g, '-'), desktopSvg(e));
    const img = `<img src="assets/${file}" align="absbottom" alt="${esc(altOf(e))}">`;
    // first element carries the mobile panel; the rest are hidden on mobile
    const src = i === 0 ? ABS + mobileFile : ABS + emptyFile;
    const picture = `<picture><source media="(max-width:700px)" srcset="${src}">${img}</picture>`;
    return e.href ? `<a href="${e.href}">${picture}</a>` : picture;
  });

  fs.writeFileSync(path.join(ROOT, 'README.md'), rows.join('\n') + '\n');
  console.log(`wrote ${entries.length} desktop svg + mobile + README (${reposGroup.length} repos, ${pluginsGroup.length} plugins, ${uniGroup.length} uni)`);
})().catch(err => { console.error(err); process.exit(1); });
