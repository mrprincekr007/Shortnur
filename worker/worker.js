// ============================================================
// Shortnur â€” Cloudflare Worker
// Redirects short URLs, tracks clicks, serves password page,
// and runs the ADVANCED interstitial ad system.
//
// Auth: optionally authenticate every Firebase REST call using a
// Firebase Admin service account. Set the env var
// FIREBASE_SERVICE_ACCOUNT to the JSON service account string to
// enable it. When set, DB requests are made as the service account
// (bypassing rules) so the Realtime Database rules can stay locked
// down. Without it, requests fall back to unauthenticated access
// and rules must permit public writes (not recommended).
// ============================================================

const DEFAULT_DB = "https://link-shortnur-default-rtdb.firebaseio.com";
const FRONTEND_ORIGIN = "https://mrprincekr007.github.io/Shortnur";

let serviceAccount = null;
let firebaseDbUrl = DEFAULT_DB;
let cachedToken = { token: "", expiresAt: 0 };

function setEnv(env) {
  if (!env) return;
  if (env.FIREBASE_SERVICE_ACCOUNT) serviceAccount = env.FIREBASE_SERVICE_ACCOUNT;
  if (env.FIREBASE_DB_URL) firebaseDbUrl = env.FIREBASE_DB_URL;
}

// ============ HELPERS ============

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html;charset=UTF-8", "Access-Control-Allow-Origin": "*" },
  });
}

function redirect(url) {
  return Response.redirect(url, 302);
}

function b64urlEncode(str) {
  let binary = "";
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlEncodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function getAccessToken() {
  if (!serviceAccount) return null;
  if (cachedToken.token && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  let sa;
  try { sa = JSON.parse(serviceAccount); } catch (e) { return null; }
  if (!sa.client_email || !sa.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = b64urlEncode(JSON.stringify(header)) + "." + b64urlEncode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const jwt = unsigned + "." + b64urlEncodeBytes(sig);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + encodeURIComponent(jwt),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000 };
  return cachedToken.token;
}

async function dbReq(path, options) {
  const token = await getAccessToken();
  const url = firebaseDbUrl + "/" + path + ".json" + (token ? "?auth=" + encodeURIComponent(token) : "");
  let res = await fetch(url, options);
  // Agar service account token reject ho jaye (401/403) toh bina token retry karo
  if (token && (res.status === 401 || res.status === 403)) {
    const publicUrl = firebaseDbUrl + "/" + path + ".json";
    res = await fetch(publicUrl, options);
  }
  return res;
}

async function dbGet(path) {
  const res = await dbReq(path);
  if (!res.ok) return null;
  return res.json();
}

async function dbUpdate(path, data) {
  const res = await dbReq(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function dbPush(path, data) {
  const res = await dbReq(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function dbDelete(path) {
  const res = await dbReq(path, { method: "DELETE" });
  return res.ok;
}

function getCountry(request) {
  const cf = request.cf;
  if (cf && cf.country) return cf.country;
  const header = request.headers.get("CF-IPCountry");
  if (header && header !== "XX") return header;
  return "Unknown";
}

function getDevice(request) {
  const ua = request.headers.get("User-Agent") || "";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

function getReferrer(request) {
  return request.headers.get("Referer") || request.headers.get("Referrer") || "Direct";
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function randomToken(len = 24) {
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (v) => c[v % c.length]).join("");
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkPassword(link, entered) {
  if (link.passwordHash) {
    const h = await sha256Hex(entered);
    return h.toLowerCase() === String(link.passwordHash).toLowerCase();
  }
  if (link.password) return entered === link.password;
  return false;
}

const SESSION_TTL = 10 * 60 * 1000;

// ============ AD CONFIG ============

const DEFAULT_ADS = {
  enabled: true,
  timerSeconds: 8,
  adPages: 4,
  bannerUrl: "",
  bannerHtml: "",
  banner2Url: "",
  banner2Html: "",
  popunderUrl: "",
  popunderCode: "",
  pushCode: "",
  inPagePushCode: "",
  vignetteCode: "",
  directLinkUrl: "",
  ratePer1000: 10,
};

async function getAdsConfig() {
  const s = await dbGet("settings/ads");
  return { ...DEFAULT_ADS, ...(s || {}) };
}

// ============ PAGES ============

function landingPage(siteUrl) {
  const base = String(siteUrl || "https://mrprincekr007.github.io/Shortnur").replace(/\/+$/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortnur â€” Shorten Your Links</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060B18; color: #fff; overflow: hidden; }
    .bg-glow { position: fixed; width: 500px; height: 500px; border-radius: 50%; filter: blur(150px); opacity: 0.15; pointer-events: none; }
    .glow-1 { top: -150px; left: -100px; background: #18CBF0; }
    .glow-2 { bottom: -150px; right: -100px; background: #00E5C7; }
    .glow-3 { top: 50%; left: 50%; transform: translate(-50%, -50%); background: #FF5E8A; opacity: 0.08; }
    .container { text-align: center; z-index: 1; padding: 20px; }
    h1 { font-size: 3rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; }
    h1 span { background: linear-gradient(135deg, #18CBF0, #00E5C7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    p { color: #8892A4; font-size: 1.1rem; max-width: 400px; margin: 0 auto 32px; line-height: 1.6; }
    .cta { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: linear-gradient(135deg, #18CBF0, #00E5C7); color: #050A18; font-weight: 700; font-size: 1rem; border-radius: 12px; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; }
    .cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(24, 203, 240, 0.3); }
    .cta:active { transform: scale(0.97); }
  </style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="bg-glow glow-3"></div>
  <div class="container">
    <h1><span>Shortnur</span></h1>
    <p>Shorten your links, track every click, and earn from every share.</p>
    <a href="${escapeAttr(base)}/user/login.html" class="cta">Get Started Free â†’</a>
  </div>
</body>
</html>`;
}

const PASSWORD_PAGE = (code) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected â€” Shortnur</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060B18; color: #fff; }
    .card { background: #0D1526; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; max-width: 400px; width: 90%; text-align: center; }
    .icon { width: 48px; height: 48px; margin: 0 auto 16px; color: #FFB347; }
    h2 { font-size: 1.3rem; margin-bottom: 8px; }
    p { color: #8892A4; font-size: 0.9rem; margin-bottom: 24px; }
    form { display: flex; flex-direction: column; gap: 12px; }
    input { padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 1rem; outline: none; }
    input:focus { border-color: #18CBF0; }
    button { padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #18CBF0, #00E5C7); color: #050A18; font-weight: 700; font-size: 1rem; cursor: pointer; transition: transform 0.2s; }
    button:hover { transform: translateY(-1px); }
    .error { color: #FF5E8A; font-size: 0.85rem; margin-top: 8px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <h2>Password Protected</h2>
    <p>This link is password protected. Enter the password to continue.</p>
    <form method="POST" action="/${code}">
      <input type="password" name="password" placeholder="Enter password" required autofocus>
      <button type="submit">Continue â†’</button>
    </form>
    <div class="error" id="err">Wrong password. Try again.</div>
  </div>
  <script>
    if (new URLSearchParams(window.location.search).get('error') === 'wrong') {
      document.getElementById('err').style.display = 'block';
    }
  </script>
</body>
</html>`;

const ERROR_PAGE = (title, message) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} â€” Shortnur</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060B18; color: #fff; }
    .card { background: #0D1526; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; max-width: 400px; width: 90%; text-align: center; }
    .icon { width: 48px; height: 48px; margin: 0 auto 16px; color: #FF5E8A; }
    h2 { font-size: 1.3rem; margin-bottom: 8px; }
    p { color: #8892A4; font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5; }
    a { display: inline-flex; align-items: center; gap: 6px; padding: 10px 24px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; text-decoration: none; font-weight: 600; transition: background 0.2s; }
    a:hover { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    <h2>${title}</h2>
    <p>${message}</p>
    <a href="/">â† Back to Shortnur</a>
  </div>
</body>
</html>`;

// ============ AD INTERSTITIAL PAGE ============

function adPage(o) {
  const timer = Math.max(3, parseInt(o.timerSeconds) || 8);
  const adSlot = o.bannerHtml
    ? o.bannerHtml
    : o.bannerUrl
      ? `<iframe class="ad-frame" src="${escapeAttr(o.bannerUrl)}" loading="lazy" scrolling="no" frameborder="0" title="Advertisement"></iframe>`
      : `<div class="ad-placeholder"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#5a6b8c" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Advertisement</span><small>Your ad could be here</small></div>`;
  const adSlot2 = o.banner2Html
    ? o.banner2Html
    : o.banner2Url
      ? `<iframe class="ad-frame" src="${escapeAttr(o.banner2Url)}" loading="lazy" scrolling="no" frameborder="0" title="Advertisement"></iframe>`
      : "";
  const secondAd = adSlot2
    ? `<div class="ad-card"><div class="ad-tag">Advertisement</div><div class="ad-slot ad-slot-second">${adSlot2}</div></div>`
    : "";
  const directBox = o.directLinkUrl
    ? `<div class="ad-card"><div class="ad-tag">Sponsored</div><div class="ad-slot ad-slot-second"><iframe class="ad-frame" src="${escapeAttr(o.directLinkUrl)}" loading="lazy" scrolling="no" frameborder="0" title="Advertisement"></iframe></div></div>`
    : "";
  const popUrl = JSON.stringify(o.popunderUrl || "").replace(/</g, "\\u003c");
  const extraAds = [o.popunderCode, o.pushCode, o.inPagePushCode, o.vignetteCode].filter(Boolean).join("\n");
  const href = `/go?t=${o.token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Redirectingâ€¦ â€” Shortnur</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060B18; color: #fff; display: flex; justify-content: center; }
    body.locked { overflow: hidden; }
    .page { width: 100%; max-width: 560px; padding: 16px 16px 32px; }
    .top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .logo { font-weight: 800; font-size: 1.05rem; }
    .logo span { background: linear-gradient(135deg,#18CBF0,#00E5C7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .steps { font-size: .8rem; color: #8892A4; background: rgba(255,255,255,.05); padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.08); }
    .ad-card { background: #0D1526; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 12px; margin-bottom: 18px; }
    .ad-slot { width: 100%; min-height: 400px; background: rgba(255,255,255,.03); border: 1px dashed rgba(255,255,255,.12); border-radius: 12px; overflow: hidden; text-align: center; }
    .ad-slot iframe { margin: 0 auto; display: block; }
    .ad-slot-main { min-height: 520px; }
    .ad-slot-second { min-height: 340px; }
    .ad-tag { text-align: center; color: #5a6b8c; font-size: .7rem; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; }
    .ad-frame { width: 100%; min-height: 340px; border: 0; display: block; }
    .ad-placeholder { text-align: center; color: #8892A4; padding: 40px 20px; }
    .ad-placeholder span { display: block; font-size: 1rem; color: #fff; font-weight: 700; margin-top: 10px; }
    .ad-placeholder small { font-size: .8rem; }
    .earn-note { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0 2px; color: #9fb0d1; font-size: .83rem; text-align: center; }
    .earn-note .pulse { width: 8px; height: 8px; border-radius: 50%; background: #00E5C7; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .timer-card { background: #0D1526; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 20px; margin-bottom: 18px; text-align: center; }
    .timer-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .ring { width: 84px; height: 84px; border-radius: 50%; background: conic-gradient(#18CBF0 0deg,#1a2a4a 0deg); display: grid; place-items: center; transition: background .1s linear; }
    .ring-inner { width: 68px; height: 68px; border-radius: 50%; background: #0D1526; display: grid; place-items: center; font-size: 1.6rem; font-weight: 800; }
    .timer-label { color: #8892A4; font-size: .85rem; }
    .continue-btn { display: block; width: 100%; padding: 15px; border: none; border-radius: 12px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.02rem; cursor: pointer; text-decoration: none; text-align: center; opacity: .45; pointer-events: none; transition: .2s; }
    .continue-btn.ready { opacity: 1; pointer-events: auto; }
    .continue-btn.ready:hover { box-shadow: 0 8px 30px rgba(24,203,240,.35); transform: translateY(-1px); }
    .note { text-align: center; color: #5a6b8c; font-size: .75rem; margin-top: 14px; }
    .lock-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(6,11,24,.95); backdrop-filter: blur(6px); border-bottom: 1px solid rgba(255,255,255,.08); padding: 12px 16px; text-align: center; font-size: .85rem; color: #dfe7f5; transition: transform .3s, opacity .3s; }
    .lock-bar b { color: #18CBF0; }
    .lock-bar.hidden { transform: translateY(-100%); opacity: 0; pointer-events: none; }
    .hint { text-align: center; color: #5a6b8c; font-size: .8rem; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="lock-bar" id="lockBar">ðŸ‘† <b>Tap anywhere</b> to unlock the page â€” then scroll down</div>
  <div class="page">
    <div class="top">
      <div class="logo">Short<span>nur</span></div>
      <div class="steps">Step STEPNUM of TOTALPAGES</div>
    </div>
    <div class="ad-card">
      <div class="ad-slot ad-slot-main">ADSLOT</div>
      <div class="earn-note"><span class="pulse"></span> You earn only if you stay until the timer finishes</div>
    </div>
    <div class="timer-card">
      <div class="timer-wrap">
        <div class="ring" id="ring"><div class="ring-inner" id="count">TIMER</div></div>
        <div class="timer-label">Please wait for the countdown to finish</div>
      </div>
    </div>
    SECONDAD
    DIRECTBOX
    <a class="continue-btn" id="continueBtn" href="HREF">Continue →</a>
    <div class="hint">↓ Scroll up to see the ads again</div>
    <div class="note">Shortnur helps creators earn from every click</div>
  </div>
  EXTRASCRIPTS
  <script>
    (function () {
      var total = TIMER;
      var left = total;
      var count = document.getElementById('count');
      var ring = document.getElementById('ring');
      var btn = document.getElementById('continueBtn');
      var lockBar = document.getElementById('lockBar');
      var unlocked = false;
      function unlock() {
        if (unlocked) return;
        unlocked = true;
        document.body.classList.remove('locked');
        lockBar.classList.add('hidden');
        if (POPURL) {
          try {
            var w = window.open(POPURL, '_blank');
            if (w) w.blur();
          } catch (e) {}
          window.focus();
        }
      }
      document.body.classList.add('locked');
      document.addEventListener('pointerdown', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { passive: true, once: true });
      document.addEventListener('scroll', unlock, { passive: true, once: true });
      function render() {
        count.textContent = left;
        var deg = Math.round(((total - left) / total) * 360);
        ring.style.background = 'conic-gradient(#18CBF0 ' + deg + 'deg, #1a2a4a 0deg)';
      }
      render();
      var iv = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(iv);
          count.textContent = 'âœ“';
          btn.classList.add('ready');
          ring.style.background = 'conic-gradient(#00E5C7 360deg, #1a2a4a 0deg)';
        } else {
          render();
        }
      }, 1000);
    })();
  </script>
</body>
</html>`
    .replace(/STEPNUM/g, () => o.step)
    .replace(/TOTALPAGES/g, () => o.totalPages)
    .replace(/TIMER/g, () => timer)
    .replace(/HREF/g, () => href)
    .replace(/ADSLOT/g, () => adSlot)
    .replace(/SECONDAD/g, () => secondAd)
    .replace(/DIRECTBOX/g, () => directBox)
    .replace(/EXTRASCRIPTS/g, () => extraAds)
    .replace(/POPURL/g, () => popUrl);
}

// ============ TRACKING ============

function trackAdView(code, request, step) {
  dbPush(`adviews/${code}`, {
    linkCode: code,
    timestamp: Date.now(),
    step,
    ip: request.headers.get("CF-Connecting-IP") || "Unknown",
    country: getCountry(request),
    device: getDevice(request),
    referrer: getReferrer(request),
  }).catch(() => {});
}

async function trackConversion(code, link, request, ads, totalPages) {
  let user = null;
  let ratePer1000 = parseFloat(ads.ratePer1000) || 0;

  if (link.uid) {
    user = await dbGet(`users/${link.uid}`).catch(() => null);
    const custom = user && user.customCpm;
    if (custom != null && custom !== "" && !isNaN(parseFloat(custom))) {
      ratePer1000 = parseFloat(custom);
    }
  }

  const earned = ratePer1000 / 1000;
  const clickData = {
    linkCode: code,
    timestamp: Date.now(),
    ip: request.headers.get("CF-Connecting-IP") || "Unknown",
    country: getCountry(request),
    device: getDevice(request),
    referrer: getReferrer(request),
    type: "conversion",
    cpm: ratePer1000,
    earned,
  };
  const currentClicks = link.clicks || 0;
  const currentEarnings = link.earnings || 0;
  Promise.all([
    dbUpdate(`links/${code}`, {
      clicks: currentClicks + 1,
      earnings: currentEarnings + earned,
      adViews: (link.adViews || 0) + (parseInt(totalPages) || 1),
    }),
    dbPush(`clicks/${code}`, clickData),
    updateUserEarnings(link.uid, earned, user),
  ]).catch(() => {});
}

async function updateUserEarnings(uid, earned, cachedUser) {
  if (!uid || earned <= 0) return;
  try {
    const user = cachedUser || await dbGet(`users/${uid}`);
    if (!user) return;
    await dbUpdate(`users/${uid}`, {
      totalEarnings: (user.totalEarnings || 0) + earned,
      monthEarnings: (user.monthEarnings || 0) + earned,
    });
  } catch (e) {}
}

// ============ AD SESSION HANDLING ============

async function handleGo(request, url) {
  const token = url.searchParams.get("t") || "";
  if (!token || token.length > 64 || /[^a-zA-Z0-9_-]/.test(token)) {
    return html(ERROR_PAGE("Invalid Session", "This redirect session is invalid or has expired. Please open the short link again."), 400);
  }

  const session = await dbGet(`adsessions/${token}`);
  if (!session || !session.code) {
    return html(ERROR_PAGE("Session Expired", "This redirect session is invalid or has expired. Please open the short link again."), 400);
  }
  if (Date.now() > (session.expiresAt || 0)) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    return html(ERROR_PAGE("Session Expired", "This redirect session has expired. Please open the short link again."), 400);
  }

  const link = await dbGet(`links/${session.code}`);
  if (!link) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    return html(ERROR_PAGE("Link Not Found", "This short link doesn't exist. It may have been deleted or the URL is incorrect."), 404);
  }
  if (link.disabled || link.status === "disabled") {
    return html(ERROR_PAGE("Link Disabled", "This link has been disabled by the administrator."), 403);
  }
  if (link.expiresAt && Date.now() > link.expiresAt) {
    return html(ERROR_PAGE("Link Expired", "This short link has expired and is no longer active."), 410);
  }

  const longUrl = link.longUrl || link.url || link.destination;
  if (!longUrl) {
    return html(ERROR_PAGE("Error", "This link has no destination URL configured."), 500);
  }

  const ads = await getAdsConfig();
  const totalPages = Math.max(1, parseInt(session.totalPages) || 1);

  if (session.step >= totalPages) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    trackConversion(session.code, link, request, ads, totalPages);
    return redirect(longUrl);
  }

  const nextStep = session.step + 1;
  await dbUpdate(`adsessions/${token}`, { step: nextStep }).catch(() => {});
  trackAdView(session.code, request, nextStep);
  return html(adPage({ step: nextStep, totalPages, timerSeconds: ads.timerSeconds, bannerUrl: ads.bannerUrl, bannerHtml: ads.bannerHtml, banner2Url: ads.banner2Url, banner2Html: ads.banner2Html, popunderUrl: ads.popunderUrl, popunderCode: ads.popunderCode, pushCode: ads.pushCode, inPagePushCode: ads.inPagePushCode, vignetteCode: ads.vignetteCode, directLinkUrl: ads.directLinkUrl, token }));
}

// ============ ROUTER ============

async function scheduled(event, env) {
  setEnv(env);
  const sessions = await dbGet("adsessions");
  if (!sessions) return;
  const now = Date.now();
  const tasks = [];
  for (const [token, s] of Object.entries(sessions)) {
    if (!s || !s.expiresAt || now > s.expiresAt) tasks.push(dbDelete("adsessions/" + token));
  }
  await Promise.all(tasks);
}

// ---- Frontend proxy (GitHub Pages) ----
// linkbaba.online par user panel (GitHub Pages frontend) serve karta hai.
async function serveFrontend(pathname) {
  const target = FRONTEND_ORIGIN + (pathname === "/" ? "/" : pathname);
  const res = await fetch(target);
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env) {
    setEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ---- Root: user panel (frontend) with worker landing fallback ----
    if (path === "/" || path === "") {
      try {
        return await serveFrontend("/");
      } catch (e) {
        return html(landingPage(env.WEBSITE_BASE_URL));
      }
    }

    // ---- Frontend static files (proxy from GitHub Pages) ----
    const isFrontendPath =
      path.startsWith("/admin/") ||
      path.startsWith("/assets/") ||
      path.startsWith("/firebase/") ||
      /\.[a-z0-9]{2,5}$/i.test(path);

    if (isFrontendPath) {
      try {
        return await serveFrontend(path);
      } catch (e) {
        return html(ERROR_PAGE("Error", "Frontend temporarily unavailable. Please try again later."), 502);
      }
    }

    // ---- Favicon ----
    if (path === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // ---- Ad session continue route ----
    if (path === "/go") {
      return handleGo(request, url);
    }

    // ---- Extract short code ----
    const code = path.replace(/^\//, "").replace(/\/$/, "");

    // Basic validation â€” short codes are alphanumeric + hyphens/underscores
    if (!code || code.length > 30 || /[^a-zA-Z0-9_-]/.test(code)) {
      return html(ERROR_PAGE("Not Found", "This link does not exist or has been removed."), 404);
    }

    // ---- Look up link ----
    const link = await dbGet(`links/${code}`);

    if (!link) {
      return html(ERROR_PAGE("Link Not Found", "This short link doesn't exist. It may have been deleted or the URL is incorrect."), 404);
    }

    // ---- Disabled check ----
    if (link.disabled || link.status === "disabled") {
      return html(ERROR_PAGE("Link Disabled", "This link has been disabled by the administrator."), 403);
    }

    // ---- Expired check ----
    if (link.expiresAt && Date.now() > link.expiresAt) {
      return html(ERROR_PAGE("Link Expired", "This short link has expired and is no longer active."), 410);
    }

    const longUrl = link.longUrl || link.url || link.destination;
    if (!longUrl) {
      return html(ERROR_PAGE("Error", "This link has no destination URL configured."), 500);
    }

    // ---- Password protection ----
    if (link.password || link.passwordHash) {
      if (method === "GET") {
        return html(PASSWORD_PAGE(code));
      }
      if (method === "POST") {
        const formData = await request.formData();
        const enteredPassword = formData.get("password") || "";
        if (!(await checkPassword(link, enteredPassword))) {
          return html(
            PASSWORD_PAGE(code).replace(
              '<div class="error" id="err">Wrong password. Try again.</div>',
              '<div class="error" id="err" style="display:block">Wrong password. Try again.</div>'
            )
          );
        }
      }
    }

    // ---- Advanced ad system ----
    const ads = await getAdsConfig();
    const adsEnabled = ads.enabled !== false && link.adsEnabled !== false;
    const totalPages = Math.max(1, parseInt(link.adPages || ads.adPages) || 1);

    if (adsEnabled) {
      const token = randomToken();
      await dbUpdate(`adsessions/${token}`, {
        code,
        step: 1,
        totalPages,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL,
      }).catch(() => {});
      trackAdView(code, request, 1);
      return html(adPage({ step: 1, totalPages, timerSeconds: ads.timerSeconds, bannerUrl: ads.bannerUrl, bannerHtml: ads.bannerHtml, banner2Url: ads.banner2Url, banner2Html: ads.banner2Html, popunderUrl: ads.popunderUrl, popunderCode: ads.popunderCode, pushCode: ads.pushCode, inPagePushCode: ads.inPagePushCode, vignetteCode: ads.vignetteCode, directLinkUrl: ads.directLinkUrl, token }));
    }

    // ---- Direct redirect (no ads) ----
    const clickData = {
      linkCode: code,
      timestamp: Date.now(),
      ip: request.headers.get("CF-Connecting-IP") || "Unknown",
      country: getCountry(request),
      device: getDevice(request),
      referrer: getReferrer(request),
      type: "direct",
    };

    const currentClicks = link.clicks || 0;
    Promise.all([
      dbUpdate(`links/${code}`, { clicks: currentClicks + 1 }),
      dbPush(`clicks/${code}`, clickData),
    ]).catch(() => {});

    return redirect(longUrl);
  },
  scheduled,
};
