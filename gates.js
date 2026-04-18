#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ── Gate definitions ──
const gates = [
  {
    id: 'offer-design',
    name: 'Offer Design',
    description: 'Interviews, skill extraction, market alignment, pricing, positioning, naming',
    checks: [
      { name: 'Vault doc exists', test: () => fileExists(vault('Projects/Self-Build.md')) },
      { name: 'PROGRESS.md updated', test: () => fileContains(vault('Projects/PROGRESS.md'), 'Self Build') },
      { name: 'Discord message drafted', test: () => fileExists(vault('Projects/Self-Build-Discord-Message.md')) },
    ]
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Copy, visuals, persona-tested, form integrated',
    checks: [
      { name: 'index.html exists', test: () => fileExists(local('index.html')) },
      { name: 'Has Self Build content', test: () => fileContains(local('index.html'), 'Self Build') },
      { name: 'Has compounding section', test: () => fileContains(local('index.html'), 'compounds') },
      { name: 'Has intake form', test: () => fileContains(local('index.html'), '<form') },
    ]
  },
  {
    id: 'form-backend',
    name: 'Form Backend',
    description: 'Set up Formspree/Tally. Replace YOUR_FORM_ID. Test submission.',
    checks: [
      { name: 'EmailJS wired up', test: () => fileContains(local('index.html'), 'emailjs.send') && !fileContains(local('index.html'), 'YOUR_FORM_ID') },
      { name: 'Cal.com link set', test: () => !fileContains(local('index.html'), 'YOUR_CAL_LINK') },
    ]
  },
  {
    id: 'deploy',
    name: 'Deploy',
    description: 'Push to GitHub Pages. Verify live at ectsang.github.io.',
    checks: [
      { name: 'Git repo clean (committed)', test: () => gitClean() },
      { name: 'Pushed to remote', test: () => gitPushed() },
    ]
  },
  {
    id: 'beta-recruit',
    name: 'Beta Recruit',
    description: 'Post Discord message. Get 2-3 guinea pigs committed.',
    checks: [
      { name: 'Beta tracker exists', test: () => fileExists(local('beta.json')) },
      { name: 'At least 1 beta signed up', test: () => betaCount() >= 1 },
    ]
  },
  {
    id: 'first-free-build',
    name: 'First Free Build',
    description: 'Interview → Build → Handoff for first beta person. Document before/after.',
    checks: [
      { name: 'At least 1 build completed', test: () => buildCount('free') >= 1 },
    ]
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Concrete numbers: time saved, workflows created, their words.',
    checks: [
      { name: 'Case study file exists', test: () => fileExists(local('case-studies/01.md')) || fileExists(vault('Projects/Self-Build-Case-Studies.md')) },
    ]
  },
  {
    id: 'first-paid',
    name: 'First Paid ($2,500)',
    description: 'Warm referral from beta + handpicked LinkedIn DMs.',
    checks: [
      { name: 'At least 1 paid build', test: () => buildCount('paid') >= 1 },
    ]
  },
  {
    id: 'full-price',
    name: 'Full Price ($5,000)',
    description: 'LinkedIn post with case study. Landing page with testimonial.',
    checks: [
      { name: 'At least 1 full-price build', test: () => buildCount('full') >= 1 },
      { name: 'Testimonial on landing page', test: () => fileContains(local('index.html'), 'testimonial') || fileContains(local('index.html'), 'client-quote') },
    ]
  },
  {
    id: 'scale',
    name: 'Repeat / Scale',
    description: 'Referral engine. Content flywheel. Raise price.',
    checks: [
      { name: '3+ total paid builds', test: () => (buildCount('paid') + buildCount('full')) >= 3 },
    ]
  },
];

// ── Helpers ──
const VAULT = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents/vvv');
const LOCAL = path.join(__dirname);

function vault(p) { return path.join(VAULT, p); }
function local(p) { return path.join(LOCAL, p); }

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function fileContains(p, str) {
  try { return fs.readFileSync(p, 'utf8').includes(str); } catch { return false; }
}

function gitClean() {
  try {
    const { execSync } = require('child_process');
    const out = execSync('git status --porcelain', { cwd: LOCAL, encoding: 'utf8' });
    return out.trim() === '';
  } catch { return false; }
}

function gitPushed() {
  try {
    const { execSync } = require('child_process');
    const local = execSync('git rev-parse HEAD', { cwd: LOCAL, encoding: 'utf8' }).trim();
    const remote = execSync('git rev-parse @{u}', { cwd: LOCAL, encoding: 'utf8' }).trim();
    return local === remote;
  } catch { return false; }
}

function loadBeta() {
  try { return JSON.parse(fs.readFileSync(local('beta.json'), 'utf8')); } catch { return { betas: [], builds: [] }; }
}

function betaCount() { return loadBeta().betas?.length || 0; }

function buildCount(tier) {
  const builds = loadBeta().builds || [];
  if (tier === 'free') return builds.filter(b => b.tier === 'free' && b.status === 'complete').length;
  if (tier === 'paid') return builds.filter(b => b.tier === 'paid' && b.status === 'complete').length;
  if (tier === 'full') return builds.filter(b => b.tier === 'full' && b.status === 'complete').length;
  return 0;
}

// ── Render ──
const W = 30;
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';

console.log('');
console.log(`${bold}SELF BUILD — LAUNCH PIPELINE${reset}`);
console.log('═'.repeat(64));
console.log('');

let currentGateFound = false;
let passedCount = 0;
const totalGates = gates.length;

for (const gate of gates) {
  const results = gate.checks.map(c => ({ ...c, passed: c.test() }));
  const passed = results.every(r => r.passed);
  const partial = results.some(r => r.passed) && !passed;
  const pct = results.length > 0 ? Math.round((results.filter(r => r.passed).length / results.length) * 100) : 0;

  if (passed) passedCount++;

  const filled = Math.round((pct / 100) * W);
  const empty = W - filled;

  let icon, barFill, barEmpty, pctColor;
  if (passed) {
    icon = `${green}✅${reset}`;
    barFill = `${green}${'█'.repeat(filled)}${reset}`;
    barEmpty = dim + '░'.repeat(empty) + reset;
    pctColor = green;
  } else if (partial) {
    icon = `${yellow}🔶${reset}`;
    barFill = `${yellow}${'█'.repeat(filled)}${reset}`;
    barEmpty = dim + '░'.repeat(empty) + reset;
    pctColor = yellow;
  } else {
    icon = `${dim}🔲${reset}`;
    barFill = '';
    barEmpty = dim + '░'.repeat(W) + reset;
    pctColor = dim;
  }

  console.log(` ${icon} ${bold}${gate.name.toUpperCase().padEnd(22)}${reset} ${barFill}${barEmpty}  ${pctColor}${String(pct).padStart(3)}%${reset}`);
  console.log(`    ${dim}${gate.description}${reset}`);

  // Show individual check results for non-passed gates
  if (!passed) {
    for (const r of results) {
      const mark = r.passed ? `${green}✓${reset}` : `${red}✗${reset}`;
      console.log(`    ${mark} ${dim}${r.name}${reset}`);
    }
    if (!currentGateFound) {
      currentGateFound = true;
      console.log(`    ${cyan}^ CURRENT GATE${reset}`);
    }
  }

  console.log('');
}

console.log('═'.repeat(64));
console.log(` ${bold}Progress: ${passedCount}/${totalGates} gates passed${reset}`);

if (!currentGateFound) {
  console.log(` ${green}${bold}All gates passed! 🎉${reset}`);
} else {
  const next = gates.find(g => !g.checks.every(c => c.test()));
  if (next) {
    const failing = next.checks.filter(c => !c.test());
    console.log(` ${cyan}Next: ${failing.map(f => f.name).join(', ')}${reset}`);
  }
}

console.log('');
