// ============================================================
// LINK BABA Admin - Settings Page
// ============================================================

import { auth, db, ref, get, set, update, remove, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  dashboard: `<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>`,
  menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  chart: `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>`,
  money: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  gift: `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
};

function icon(name) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function initIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.querySelector('svg')) return;
    const name = el.getAttribute('data-icon');
    if (name) el.innerHTML = icon(name);
  });
}

// ============ UTILITIES ============
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
  const toastIcons = { success: icon('check'), error: icon('close') };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${toastIcons[type] || ''}</span><span class="toast-msg"></span>`;
  toast.querySelector('.toast-msg').textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 300); }, duration);
}

// ============ AD PREVIEW — bilkul worker page jaisa ============
const PREV_SLOT_INFO = {
  banner1:  { label: 'YE AD — Main Box (sabse upar)' },
  banner2:  { label: 'YE AD — Second Box (timer ke neeche)' },
  banner3:  { label: 'YE AD — Continue ke Neeche' },
  direct:   { label: 'YE AD — Sponsored Boxes' },
  popunder: { label: 'YE CODE — Popunder (click par naya tab)' },
  push:     { label: 'YE CODE — Push Notification' },
  inpage:   { label: 'YE CODE — In-Page Push widget' },
  vignette: { label: 'YE CODE — Vignette / Fullscreen' },
};

function previewBadge(text) {
  return `<div class="preview-badge">&#128205; ${text}</div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseAdSize(code) {
  const c = code || '';
  const kv = re => { const m = c.match(re); return m ? parseInt(m[1]) : null; };
  const atW = kv(/['"]?width['"]?\s*:\s*(\d+)/i);
  const atH = kv(/['"]?height['"]?\s*:\s*(\d+)/i);
  if (atW && atH) return { w: atW, h: atH };
  const aW = kv(/width\s*=\s*["'](\d+)/i);
  const aH = kv(/height\s*=\s*["'](\d+)/i);
  if (aW && aH) return { w: aW, h: aH };
  const KNOWN = [[300, 250], [728, 90], [320, 50], [468, 60], [160, 600], [160, 300], [970, 90], [250, 250], [336, 280], [120, 600], [120, 240], [120, 90]];
  for (const [w, h] of KNOWN) {
    if (c.includes(w + 'x' + h) || c.includes(w + '*' + h) || c.includes(w + ' \u00d7 ' + h) || c.includes(w + ' &times; ' + h)) return { w, h };
  }
  return null;
}

function mockAdBlock(html, url, opts) {
  const size = parseAdSize(html) || parseAdSize(url);
  const o = opts || {};
  const maxW = o.maxW || 500;
  const maxH = o.maxH || 320;
  const text = o.text || 'Ye ad yahan aayega';
  if (size) {
    return '<div class="ad-mock sized" style="width:' + Math.min(size.w, maxW) + 'px;height:' + Math.min(size.h, maxH) + 'px">' +
      '<span class="mock-ad-tag">AD</span><b>' + size.w + ' \u00d7 ' + size.h + '</b>' +
      '<span class="mock-ad-size">' + text + ' — itna bada box milega</span></div>';
  }
  return '<div class="ad-mock fluid"><span class="mock-ad-tag">AD</span><b>Responsive ad</b>' +
    '<span class="mock-ad-size">' + text + ' — code me size nahi likha, isliye poore box me aayega</span></div>';
}

function buildRealPage(key) {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const timer = Math.max(3, parseInt(g('adsTimer')) || 8);
  const fake = Math.max(0, parseInt(g('adsFakeTimer')) || 0);
  const totalWait = timer + fake;
  const dotPages = Math.max(1, parseInt(g('adsPages')) || 4);
  const step = 1;
  const stepDots = Array.from({ length: dotPages }, (_, i) =>
    `<span class="step-dot${i + 1 === step ? ' active' : ''}"></span>`).join('');

  const isTarget = s => key === s;
  const hasMain = !!(g('adsBannerHtml') || '').trim() || !!(g('adsBannerUrl') || '').trim();
  const hasSec = !!(g('adsBanner2Html') || '').trim() || !!(g('adsBanner2Url') || '').trim();
  const hasThird = !!(g('adsBanner3Html') || '').trim() || !!(g('adsBanner3Url') || '').trim();

  let mainCard = `<div class="ad-card${isTarget('banner1') ? ' preview-glow' : ''}">
      ${isTarget('banner1') ? previewBadge(PREV_SLOT_INFO.banner1.label) : ''}
      <div class="ad-tag"><i></i> Advertisement</div>
      <div class="ad-slot ad-slot-main">${hasMain ? mockAdBlock(g('adsBannerHtml'), g('adsBannerUrl'), { text: 'Ye ad (Main Box) yahan aayega', maxW: 500, maxH: 340 }) : (isTarget('banner1') ? '<div class="ad-placeholder"><span>Ye box — is code ka ad yahan aayega</span><small>Upar Ad Code paste karo</small></div>' : '<div class="ad-placeholder"><span>Advertisement</span><small>Yahan ad aayega</small></div>')}</div>
      <div class="earn-note"><span class="pulse"></span> You earn only if you stay until the timer finishes</div>
    </div>`;

  const secondCard = hasSec || isTarget('banner2')
    ? `<div class="ad-card${isTarget('banner2') ? ' preview-glow' : ''}">
      ${isTarget('banner2') ? previewBadge(PREV_SLOT_INFO.banner2.label) : ''}
      <div class="ad-tag"><i></i> Advertisement</div>
      <div class="ad-slot ad-slot-second">${hasSec ? mockAdBlock(g('adsBanner2Html'), g('adsBanner2Url'), { text: 'Ye ad (Second Box) yahan aayega', maxW: 360, maxH: 300 }) : '<div class="ad-placeholder"><span>Ye box — second ad yahan aayega</span><small>Banner 2 me code paste karo</small></div>'}</div>
    </div>`
    : '';

  const directUrls = g('adsDirectList').split('\n').map(s => s.trim()).filter(Boolean);
  const directBoxes = directUrls.map(u => {
    const domain = (u.replace(/^https?:\/\//, '').split('/')[0]) || u;
    return `<div class="ad-card${isTarget('direct') ? ' preview-glow' : ''}"><div class="ad-tag">Sponsored</div><div class="ad-slot ad-slot-second"><div class="ad-mock fluid"><span class="mock-ad-tag">SPONSORED</span><b>${escHtml(domain)}</b><span class="mock-ad-size">${escHtml(u)}<br>Ye sponsored box yahan aayega</span></div></div></div>`;
  }).join('');
  const directBlock = isTarget('direct')
    ? previewBadge(PREV_SLOT_INFO.direct.label) + (directBoxes || '<div class="ad-card preview-glow"><div class="ad-tag">Sponsored</div><div class="ad-slot ad-slot-second"><div class="ad-placeholder"><span>Direct links yahan aayenge</span><small>Direct Links box me har line pe ek URL daalo</small></div></div></div>')
    : directBoxes;

  const thirdCard = hasThird || isTarget('banner3')
    ? `<div class="ad-card ad-card-after-continue${isTarget('banner3') ? ' preview-glow' : ''}">
      ${isTarget('banner3') ? previewBadge(PREV_SLOT_INFO.banner3.label) : ''}
      <div class="ad-tag"><i></i> Advertisement</div>
      <div class="ad-slot ad-slot-second">${hasThird ? mockAdBlock(g('adsBanner3Html'), g('adsBanner3Url'), { text: 'Ye ad (Continue ke neeche) yahan aayega', maxW: 500, maxH: 200 }) : '<div class="ad-placeholder"><span>Ye box — Continue ke neeche ad yahan aayega</span><small>Banner 3 me code paste karo</small></div>'}</div>
    </div>`
    : '';

  const popBadge = isTarget('popunder') ? previewBadge(PREV_SLOT_INFO.popunder.label) : '';
  const pushBadge = isTarget('push') ? previewBadge(PREV_SLOT_INFO.push.label) : '';
  const inpageBadge = isTarget('inpage') ? previewBadge(PREV_SLOT_INFO.inpage.label) : '';
  const vigBadge = isTarget('vignette') ? previewBadge(PREV_SLOT_INFO.vignette.label) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Real Preview &#8212; LINK BABA</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :focus, :focus-visible { outline: none !important; }
    * { -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070B16; color: #fff; overflow-x: hidden; }
    .glow { position: fixed; border-radius: 50%; filter: blur(110px); z-index: 0; pointer-events: none; }
    .g1 { width: 320px; height: 320px; top: -70px; left: -60px; background: #18CBF0; opacity: .16; animation: drift 9s ease-in-out infinite; }
    .g2 { width: 380px; height: 380px; bottom: -90px; right: -70px; background: #00E5C7; opacity: .14; animation: drift 11s ease-in-out infinite reverse; }
    .g3 { width: 300px; height: 300px; top: 45%; left: 50%; margin-left: -150px; margin-top: -150px; background: #3B82F6; opacity: .09; }
    @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 16px); } }
    .page { position: relative; z-index: 1; width: 100%; max-width: 560px; margin: 0 auto; padding: 0 16px 36px; }
    .top { display: flex; align-items: center; justify-content: space-between; padding: 20px 4px 14px; }
    .logo { font-weight: 900; font-size: 1.2rem; letter-spacing: -.3px; }
    .logo span { background: linear-gradient(135deg,#18CBF0,#00E5C7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .steps { display: flex; align-items: center; gap: 8px; font-size: .78rem; color: #9fb0d1; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); padding: 6px 12px; border-radius: 999px; }
    .steps-dots { display: flex; align-items: center; gap: 5px; }
    .step-dot { width: 6px; height: 6px; border-radius: 99px; background: rgba(255,255,255,.16); transition: .3s; }
    .step-dot.active { width: 18px; background: linear-gradient(135deg,#18CBF0,#00E5C7); box-shadow: 0 0 10px rgba(24,203,240,.5); }
    .ad-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 10px; margin-bottom: 16px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,.35); }
    .ad-tag { display: flex; align-items: center; gap: 7px; color: #8b9bb8; font-size: .68rem; text-transform: uppercase; letter-spacing: .14em; margin: 6px 0 10px 8px; }
    .ad-tag i { width: 6px; height: 6px; border-radius: 50%; background: #00E5C7; box-shadow: 0 0 8px #00E5C7; }
    .ad-slot { width: 100%; min-height: 0; background: rgba(255,255,255,.03); border: 1px dashed rgba(255,255,255,.12); border-radius: 14px; overflow: hidden; text-align: center; }
    .ad-slot iframe { margin: 0 auto; display: block; max-width: 100%; }
    .ad-slot-main { min-height: 380px; }
    .ad-slot-second { min-height: 60px; }
    .ad-frame { width: 100%; border: 0; display: block; }
    .ad-placeholder { text-align: center; color: #8892A4; padding: 36px 20px; }
    .ad-placeholder span { display: block; font-size: 1rem; color: #fff; font-weight: 700; margin-top: 10px; }
    .ad-placeholder small { font-size: .8rem; }
    .ad-mock { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin: 0 auto; background: repeating-linear-gradient(45deg, rgba(24,203,240,.05), rgba(24,203,240,.05) 12px, rgba(24,203,240,.10) 12px, rgba(24,203,240,.10) 24px); border: 2px dashed rgba(24,203,240,.6); border-radius: 14px; color: #9fb0d1; text-align: center; padding: 14px; }
    .ad-mock.sized { padding: 12px; }
    .ad-mock.fluid { min-height: 180px; }
    .ad-mock b { font-size: 1rem; color: #fff; word-break: break-all; }
    .mock-ad-tag { font-size: .6rem; letter-spacing: .22em; text-transform: uppercase; color: #18CBF0; background: rgba(24,203,240,.14); border: 1px solid rgba(24,203,240,.35); padding: 3px 10px; border-radius: 999px; }
    .mock-ad-size { font-size: .78rem; line-height: 1.5; }
    .mock-ad-note { font-size: .72rem; color: #5a6b8c; }
    .earn-note { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0 6px; color: #9fb0d1; font-size: .8rem; text-align: center; }
    .earn-note .pulse { width: 8px; height: 8px; border-radius: 50%; background: #00E5C7; animation: pulse 1.2s infinite; box-shadow: 0 0 8px #00E5C7; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .timer-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 22px; margin-bottom: 16px; text-align: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,.35); }
    .timer-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .ring { width: 92px; height: 92px; border-radius: 50%; background: conic-gradient(#18CBF0 0deg, #16233f 0deg); display: grid; place-items: center; position: relative; transition: background .12s linear; box-shadow: 0 0 34px rgba(24,203,240,.18); }
    .ring-inner { width: 74px; height: 74px; border-radius: 50%; background: #0b1222; display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; }
    .ring.done { background: conic-gradient(#00E5C7 360deg, #16233f 0deg); box-shadow: 0 0 44px rgba(0,229,199,.4); }
    .ring.done .ring-inner { color: #00E5C7; }
    .timer-label { color: #8892A4; font-size: .85rem; margin-top: 14px; }
    .progress-track { height: 5px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; margin-top: 18px; }
    .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg,#18CBF0,#00E5C7); border-radius: 99px; transition: width 1s linear; }
    .continue-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; border: none; border-radius: 14px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.05rem; cursor: pointer; text-decoration: none; opacity: .4; pointer-events: none; transition: .25s; box-shadow: 0 10px 30px rgba(24,203,240,.25); }
    .continue-btn.ready { opacity: 1; pointer-events: auto; box-shadow: 0 12px 38px rgba(0,229,199,.4); }
    .continue-btn.ready:hover { transform: translateY(-2px); }
    .continue-btn.ready:active { transform: scale(.98); }
    .hint { display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; color: #5a6b8c; font-size: .8rem; margin-top: 14px; }
    .note { text-align: center; color: #5a6b8c; font-size: .73rem; margin-top: 20px; }
    .ad-card-after-continue { margin-top: 12px; }
    .start-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 22px; padding: 15px 44px; border: none; border-radius: 14px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 40px rgba(24,203,240,.4); transition: .2s; }
    .start-btn:hover { transform: translateY(-2px); }
    .start-btn:active { transform: scale(.96); }
    .start-btn.hidden { display: none; }
    .preview-badge { text-align: center; margin: 6px auto 10px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: .72rem; padding: 6px 12px; border-radius: 999px; width: fit-content; }
    .preview-glow { box-shadow: 0 0 0 2px #18CBF0, 0 0 26px rgba(24,203,240,.5) !important; }
    @media (max-width: 480px) {
      .page { padding: 0 10px 24px; }
      .top { padding: 14px 2px 10px; }
      .logo { font-size: 1.05rem; }
      .steps { font-size: .7rem; padding: 5px 9px; }
      .ad-card { padding: 7px; border-radius: 16px; margin-bottom: 12px; }
      .ad-tag { font-size: .62rem; margin: 4px 0 8px 6px; }
      .ad-slot-main { min-height: 300px; }
      .ad-slot-second { min-height: 60px; }
      .timer-card { padding: 16px; border-radius: 16px; }
      .ring { width: 76px; height: 76px; }
      .ring-inner { width: 60px; height: 60px; font-size: 1.4rem; }
      .continue-btn { padding: 14px; font-size: 1rem; }
      .start-btn { padding: 13px 34px; font-size: 1rem; }
    }
</style>
</head>
<body>
  <div class="glow g1"></div>
  <div class="glow g2"></div>
  <div class="glow g3"></div>
  <div class="page">
    <div class="top">
      <div class="logo">LINK<span>BABA</span></div>
      <div class="steps"><span class="steps-dots">${stepDots}</span> ${step} / ${dotPages}</div>
    </div>
    ${popBadge}
    ${pushBadge}
    ${inpageBadge}
    ${vigBadge}
    ${mainCard}
    <div class="timer-card">
      <div class="timer-wrap">
        <div class="ring" id="ring" style="display:none"><div class="ring-inner" id="count">${timer}</div></div>
        <button class="start-btn" id="startBtn">Click to Continue <span>&#9654;</span></button>
        <div class="timer-label" id="timerLabel">Start the timer to unlock your link</div>
      </div>
      <div class="progress-track" id="progTrack" style="display:none"><div class="progress-fill" id="prog"></div></div>
    </div>
    ${secondCard}
    ${directBlock}
    <a class="continue-btn" id="continueBtn" href="javascript:void(0)">Continue <span>&#8594;</span></a>
    <div class="hint" id="bottomHint" style="display:none"><span>&#8595;</span> Scroll down to continue</div>
    ${thirdCard}
    <div class="note">LINK BABA helps creators earn from every click</div>
  </div>
  <script>
    (function () {
      var total = ${timer};
      var waitMs = ${totalWait} * 1000;
      var count = document.getElementById('count');
      var ring = document.getElementById('ring');
      var prog = document.getElementById('prog');
      var progTrack = document.getElementById('progTrack');
      var btn = document.getElementById('continueBtn');
      var startBtn = document.getElementById('startBtn');
      var timerLabel = document.getElementById('timerLabel');
      var bottomHint = document.getElementById('bottomHint');
      var started = false;
      var done = false;
      var t0 = null;
      var iv = null;
      function start() {
        if (started) return;
        started = true;
        startBtn.classList.add('hidden');
        ring.style.display = 'grid';
        progTrack.style.display = 'block';
        timerLabel.textContent = 'Please wait for the countdown to finish';
        t0 = Date.now();
        tick();
        iv = setInterval(tick, 250);
      }
      function tick() {
        var rate = waitMs / total;
        var elapsed = Math.floor((Date.now() - t0) / rate);
        var left = total - elapsed;
        if (left > 0) {
          render(left, elapsed);
        } else if (!done) {
          done = true;
          clearInterval(iv);
          render(0, total);
          count.textContent = '\\u2713';
          ring.classList.add('done');
          timerLabel.textContent = 'Scroll down and tap Continue';
          bottomHint.style.display = 'flex';
          btn.classList.add('ready');
        }
      }
      function render(left, doneSec) {
        count.textContent = left;
        var deg = Math.round((doneSec / total) * 360);
        ring.style.background = 'conic-gradient(#18CBF0 ' + deg + 'deg, #16233f 0deg)';
        if (prog) prog.style.width = Math.round((doneSec / total) * 100) + '%';
      }
      startBtn.addEventListener('click', start);
    })();
  </script>
</body>
</html>`;
}

function refreshPreview(key) {
  const cont = document.getElementById('prev-' + key);
  if (!cont) return;
  const frame = cont.querySelector('.ad-preview-frame iframe');
  const empty = cont.querySelector('.ad-preview-empty');
  const note = cont.querySelector('.ad-preview-note');
  frame.style.display = 'block';
  empty.style.display = 'none';
  frame.srcdoc = buildRealPage(key);
  if (note) {
    if (key === 'popunder') note.textContent = 'Popunder asli site pe visitor ke pehle click par naya TAB kholta hai. Preview me bas badge dikhta hai — code load nahi hota, taaki preview me asli ads na khulein.';
    else if (key === 'push' || key === 'inpage' || key === 'vignette') note.textContent = 'Ye preview me code load nahi karta — bas badge batata hai ki kahan / kya dikhega. Asli code sirf worker page pe chalega.';
    else note.textContent = 'Ye mock box aapke code se nikaala gaya size dikhata hai — asli ad isi size ka yahan aayega. Code badaloge to size bhi update hoga.';
  }
}

const _prevTimers = {};
function initAdPreviews() {
  document.querySelectorAll('.ad-preview-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.prev;
      const cont = document.getElementById('prev-' + key);
      if (!cont) return;
      const willOpen = cont.hidden;
      cont.hidden = !willOpen;
      btn.classList.toggle('active', willOpen);
      if (willOpen) refreshPreview(key);
    });
  });
  document.querySelectorAll('[data-prev]').forEach(inp => {
    inp.addEventListener('input', () => {
      const key = inp.dataset.prev;
      const cont = document.getElementById('prev-' + key);
      if (!cont || cont.hidden) return;
      clearTimeout(_prevTimers[key]);
      _prevTimers[key] = setTimeout(() => refreshPreview(key), 350);
    });
  });
}

// ============ STATE ============
let confirmAction = null;

// ============ INIT ============
initIcons();
initAdPreviews();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadSettings();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

const topbar = document.querySelector('.dash-topbar');
if (topbar) window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 20));

// ============ LOAD SETTINGS ============
async function loadSettings() {
  try {
    const snap = await get(ref(db, 'settings'));
    if (snap.exists()) {
      const s = snap.val();
      document.getElementById('siteName').value = s.siteName || 'LINK BABA';
      document.getElementById('shortUrl').value = s.shortBaseUrl || 'https://linkbaba.online';
      document.getElementById('linksPerPage').value = s.linksPerPage || 10;

      // Ad system settings
      const ads = s.ads || {};
      document.getElementById('adsEnabled').checked = ads.enabled !== false;
      document.getElementById('adsTimer').value = ads.timerSeconds || 8;
      document.getElementById('adsFakeTimer').value = ads.fakeTimerSeconds || 0;
      document.getElementById('adsPages').value = ads.adPages || 2;
      document.getElementById('adsRate').value = ads.ratePer1000 ?? 0.50;
      document.getElementById('adsBannerUrl').value = ads.bannerUrl || '';
      document.getElementById('adsBannerHtml').value = ads.bannerHtml || '';
      document.getElementById('adsBanner2Url').value = ads.banner2Url || '';
      document.getElementById('adsBanner2Html').value = ads.banner2Html || '';
      document.getElementById('adsBanner3Url').value = ads.banner3Url || '';
      document.getElementById('adsBanner3Html').value = ads.banner3Html || '';
      document.getElementById('adsPopunderUrl').value = ads.popunderUrl || '';
      document.getElementById('adsPopunderCode').value = ads.popunderCode || '';
      document.getElementById('adsPushCode').value = ads.pushCode || '';
      document.getElementById('adsInPagePushCode').value = ads.inPagePushCode || '';
      document.getElementById('adsVignetteCode').value = ads.vignetteCode || '';
      const directList = (Array.isArray(ads.directList) && ads.directList.length)
        ? ads.directList.join('\n')
        : (ads.directLinkUrl || '');
      document.getElementById('adsDirectList').value = directList;

      // Promotion page settings (settings/ads/promo)
      const promo = ads.promo || {};
      document.getElementById('promoEnabled').checked = promo.enabled !== false;
      document.getElementById('promoTitle').value = promo.title || 'Special Offer';
      document.getElementById('promoButtonText').value = promo.buttonText || 'Visit Now';
      document.getElementById('promoDescription').value = promo.description || '';
      document.getElementById('promoUrl').value = promo.url || '';
      document.getElementById('promoImageUrl').value = promo.imageUrl || '';
      document.getElementById('promoTimer').value = promo.timerSeconds || 5;
    }
  } catch (err) {
    console.error(err);
  }

  // Show admin emails (from firebase-config.js ADMIN_UIDS)
  const adminUids = await import('../../firebase/firebase-config.js').then(m => m.ADMIN_UIDS).catch(() => []);
  if (adminUids.length) {
    document.getElementById('adminList').innerHTML = adminUids.map(uid => `
      <div class="admin-email-item">
        <span class="admin-uid">${uid}</span>
        <span class="status-badge status-active">ADMIN</span>
      </div>
    `).join('');
  } else {
    document.getElementById('adminList').innerHTML = '<p class="text-muted">No admins configured. Add UIDs to <code>ADMIN_UIDS</code> in firebase-config.js</p>';
  }
}

// ============ GENERAL FORM ============
document.getElementById('generalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    await set(ref(db, 'settings'), {
      ...existing,
      siteName: document.getElementById('siteName').value.trim(),
      shortBaseUrl: document.getElementById('shortUrl').value.trim(),
      linksPerPage: parseInt(document.getElementById('linksPerPage').value) || 10,
    });
    showToast('Settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save settings.', 'error');
  }
});

// ============ ADS FORM ============
document.getElementById('adsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    const existingAds = existing.ads || {};
    await set(ref(db, 'settings'), {
      ...existing,
      ads: {
        ...existingAds,
        enabled: document.getElementById('adsEnabled').checked,
        timerSeconds: parseInt(document.getElementById('adsTimer').value) || 8,
        fakeTimerSeconds: parseInt(document.getElementById('adsFakeTimer').value) || 0,
        adPages: parseInt(document.getElementById('adsPages').value) || 2,
        ratePer1000: parseFloat(document.getElementById('adsRate').value) || 0,
        bannerUrl: document.getElementById('adsBannerUrl').value.trim(),
        bannerHtml: document.getElementById('adsBannerHtml').value.trim(),
        banner2Url: document.getElementById('adsBanner2Url').value.trim(),
        banner2Html: document.getElementById('adsBanner2Html').value.trim(),
        banner3Url: document.getElementById('adsBanner3Url').value.trim(),
        banner3Html: document.getElementById('adsBanner3Html').value.trim(),
        popunderUrl: document.getElementById('adsPopunderUrl').value.trim(),
        popunderCode: document.getElementById('adsPopunderCode').value.trim(),
        pushCode: document.getElementById('adsPushCode').value.trim(),
        inPagePushCode: document.getElementById('adsInPagePushCode').value.trim(),
        vignetteCode: document.getElementById('adsVignetteCode').value.trim(),
        directList: document.getElementById('adsDirectList').value.split('\n').map(s => s.trim()).filter(Boolean),
        directLinkUrl: '',
      },
    });
    showToast('Ad settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save ad settings.', 'error');
  }
});

// ============ PROMO FORM ============
document.getElementById('promoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    const existingAds = existing.ads || {};
    await set(ref(db, 'settings'), {
      ...existing,
      ads: {
        ...existingAds,
        promo: {
          enabled: document.getElementById('promoEnabled').checked,
          title: document.getElementById('promoTitle').value.trim() || 'Special Offer',
          buttonText: document.getElementById('promoButtonText').value.trim() || 'Visit Now',
          description: document.getElementById('promoDescription').value.trim(),
          url: document.getElementById('promoUrl').value.trim(),
          imageUrl: document.getElementById('promoImageUrl').value.trim(),
          timerSeconds: parseInt(document.getElementById('promoTimer').value) || 5,
        },
      },
    });
    showToast('Promotion settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save promotion settings.', 'error');
  }
});

// ============ DANGER ZONE ============
document.getElementById('clearAllLinks').addEventListener('click', () => {
  document.getElementById('confirmText').textContent = 'Are you sure you want to delete ALL links? This cannot be undone.';
  confirmAction = async () => {
    await remove(ref(db, 'links'));
    showToast('All links deleted.', 'success');
  };
  document.getElementById('confirmModal').classList.add('show');
});

document.getElementById('clearAllUsers').addEventListener('click', () => {
  document.getElementById('confirmText').textContent = 'Are you sure you want to delete ALL users? Your own account will be kept. This cannot be undone.';
  confirmAction = async () => {
    const myUid = auth.currentUser.uid;
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return;
    const users = snap.val();
    const updates = {};
    Object.keys(users).forEach(uid => { if (uid !== myUid) updates[uid] = null; });
    await update(ref(db, 'users'), updates);
    showToast('All other users deleted.', 'success');
  };
  document.getElementById('confirmModal').classList.add('show');
});

document.getElementById('closeConfirmModal').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('cancelConfirm').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('doConfirm').addEventListener('click', async () => {
  if (confirmAction) {
    try {
      await confirmAction();
      document.getElementById('confirmModal').classList.remove('show');
      confirmAction = null;
    } catch (err) {
      showToast('Action failed.', 'error');
    }
  }
});
