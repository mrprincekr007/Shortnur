// ============================================================
// LINK BABA — Cloudflare Worker
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

const CSP_VALUE = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'unsafe-inline' https:; img-src * data: blob:; font-src https: data:; frame-src *; connect-src *; media-src *; base-uri 'none'; form-action 'self'; worker-src 'self' https:";

function html(content, status = 200, opts = {}) {
  const { csp = true, noStore = false, headers = {} } = opts || {};
  const h = {
    "Content-Type": "text/html;charset=UTF-8",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (csp) h["Content-Security-Policy"] = CSP_VALUE;
  if (noStore) h["Cache-Control"] = "no-store, no-cache, max-age=0";
  return new Response(content, { status, headers: { ...h, ...headers } });
}

function redirect(url) {
  return Response.redirect(url, 302);
}

function safeUrl(u) {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? u : null;
  } catch (e) {
    return null;
  }
}

// ============ SECURITY ============

const ALLOWED_ORIGINS = new Set([
  "https://linkbaba.online",
  "https://mrprincekr007.github.io",
]);

const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX = 25;
const rateBuckets = new Map();

const TRACKED_WINDOW_MS = 5 * 60 * 1000;
const CONVERSION_WINDOW_MS = 10 * 60 * 1000;
const trackedViews = new Map();

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
}

function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now - b.start > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, start: now });
    return false;
  }
  b.count++;
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return b.count > RATE_MAX;
}

function isVerifiedBot(request) {
  const cf = request.cf || {};
  const bm = cf.botManagement;
  if (!bm) return false;
  if (bm.verifiedBot) return true;
  if (typeof bm.score === "number" && bm.score <= 5) return true;
  return false;
}

function shouldTrack(ip, key, windowMs) {
  if (!ip) return true;
  const now = Date.now();
  const k = key + ":" + ip;
  const last = trackedViews.get(k);
  if (last && now - last < windowMs) return false;
  trackedViews.set(k, now);
  if (trackedViews.size > 20000) {
    for (const [kk, v] of trackedViews) {
      if (now - v > 2 * 60 * 60 * 1000) trackedViews.delete(kk);
    }
  }
  return true;
}

function corsHeader(request) {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) return { "Access-Control-Allow-Origin": origin, "Vary": "Origin" };
  return {};
}

function httpsRedirect(url) {
  if (url.protocol === "http:") {
    return redirect("https://" + url.host + url.pathname + url.search);
  }
  return null;
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
  const baseUrl = firebaseDbUrl + "/" + path + ".json";
  let res;
  if (token) {
    const headers = new Headers(options && options.headers ? options.headers : {});
    headers.set("Authorization", "Bearer " + token);
    res = await fetch(baseUrl, Object.assign({}, options, { headers }));
  } else {
    res = await fetch(baseUrl, options);
  }
  // Agar service account token reject ho jaye (401/403) toh bina token retry karo
  if (token && (res.status === 401 || res.status === 403)) {
    res = await fetch(baseUrl, options);
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

const DEFAULT_PROMO = {
  enabled: false,
  title: "Special Offer",
  description: "Check out this exclusive offer before you continue.",
  buttonText: "Visit Now",
  url: "",
  imageUrl: "",
  emoji: "🎁",
  timerSeconds: 5,
};

const DEFAULT_ADS = {
  enabled: true,
  timerSeconds: 8,
  fakeTimerSeconds: 0,
  continueWaitSeconds: 0,
  adPages: 4,
  bannerUrl: "",
  bannerHtml: "",
  banner2Url: "",
  banner2Html: "",
  banner3Url: "",
  banner3Html: "",
  popunderUrl: "",
  popunderCode: "",
  pushCode: "",
  inPagePushCode: "",
  vignetteCode: "",
  directLinkUrl: "",
  directList: [],
  ratePer1000: 10,
  promo: DEFAULT_PROMO,
};

async function getAdsConfig() {
  const s = await dbGet("settings/ads");
  const merged = { ...DEFAULT_ADS, ...(s || {}) };
  merged.promo = { ...DEFAULT_PROMO, ...(merged.promo || {}) };
  return merged;
}

// ============ PAGES ============

function landingPage(siteUrl) {
  const base = String(siteUrl || "https://mrprincekr007.github.io/Shortnur").replace(/\/+$/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINK BABA — Shorten Your Links</title>
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
    <h1><span>LINK BABA</span></h1>
    <p>Shorten your links, track every click, and earn from every share.</p>
    <a href="${escapeAttr(base)}/user/login.html" class="cta">Get Started Free →</a>
  </div>
</body>
</html>`;
}

const PASSWORD_PAGE = (code) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected — LINK BABA</title>
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
      <button type="submit">Continue →</button>
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
  <title>${title} — LINK BABA</title>
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
    <a href="/">← Back to LINK BABA</a>
  </div>
</body>
</html>`;

// ============ AD INTERSTITIAL PAGE ============

function adPage(o) {
  const timer = Math.max(3, parseInt(o.timerSeconds) || 8);
  const fakeTimer = Math.max(0, parseInt(o.fakeTimerSeconds) || 0);
  const totalWait = timer + fakeTimer;
  const continueWait = Math.max(0, parseInt(o.continueWaitSeconds) || 0);
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
  const adSlot3 = o.banner3Html
    ? o.banner3Html
    : o.banner3Url
      ? `<iframe class="ad-frame" src="${escapeAttr(o.banner3Url)}" loading="lazy" scrolling="no" frameborder="0" title="Advertisement"></iframe>`
      : "";
  const thirdAd = adSlot3
    ? `<div class="ad-card ad-card-after-continue"><div class="ad-tag">Advertisement</div><div class="ad-slot ad-slot-second">${adSlot3}</div></div>`
    : "";
  const directUrls = [];
  if (o.directLinkUrl) directUrls.push(String(o.directLinkUrl).trim());
  if (Array.isArray(o.directList)) {
    for (const u of o.directList) {
      const t = String(u || "").trim();
      if (t) directUrls.push(t);
    }
  }
  const directBoxes = directUrls
    .map(u => `<div class="ad-card"><div class="ad-tag">Sponsored</div><a class="sponsored-link" href="${escapeAttr(u)}" target="_blank" rel="nofollow noopener sponsored" data-prev="direct">Open Sponsored Offer <span>&#8599;</span></a></div>`)
    .join("\n");
  const dotCount = Math.max(1, parseInt(o.dotPages) || parseInt(o.totalPages) || 1);
  const stepDots = Array.from({ length: dotCount }, (_, i) =>
    `<span class="step-dot${i + 1 === parseInt(o.step) ? " active" : ""}"></span>`
  ).join("");
  const popUrl = JSON.stringify(o.popunderUrl || "").replace(/</g, "\\u003c");
  const extraAds = [o.popunderCode, o.pushCode, o.inPagePushCode, o.vignetteCode].filter(Boolean).join("\n");
  const href = `/go?t=${o.token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Redirecting... &#8212; LINK BABA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :focus, :focus-visible { outline: none !important; }
    * { -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070B16; color: #fff; overflow-x: hidden; }
    body.locked { overflow: hidden; }
    .glow { position: fixed; border-radius: 50%; filter: blur(110px); z-index: 0; pointer-events: none; }
    .g1 { width: 320px; height: 320px; top: -70px; left: -60px; background: #18CBF0; opacity: .16; animation: drift 9s ease-in-out infinite; }
    .g2 { width: 380px; height: 380px; bottom: -90px; right: -70px; background: #00E5C7; opacity: .14; animation: drift 11s ease-in-out infinite reverse; }
    .g3 { width: 300px; height: 300px; top: 45%; left: 50%; margin-left: -150px; margin-top: -150px; background: #3B82F6; opacity: .09; }
    @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 16px); } }
    .lock-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(7, 11, 22, .94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: grid; place-items: center; text-align: center; transition: opacity .5s ease, visibility .5s ease; }
    .lock-overlay.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
    .start-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 22px; padding: 15px 44px; border: none; border-radius: 14px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 40px rgba(24,203,240,.4); transition: .2s; }
    .start-btn:hover { transform: translateY(-2px); }
    .start-btn:active { transform: scale(.96); }
    .start-btn.hidden { display: none; }
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
    .ad-slot-main { min-height: 520px; }
    .ad-slot-second { min-height: 60px; }
    .ad-frame { width: 100%; border: 0; display: block; }
    .ad-slot iframe.ad-frame[src*="highperformanceformat"] { max-width: 320px; }
    .ad-placeholder { text-align: center; color: #8892A4; padding: 46px 20px; }
    .ad-placeholder span { display: block; font-size: 1rem; color: #fff; font-weight: 700; margin-top: 10px; }
    .ad-placeholder small { font-size: .8rem; }
    .earn-note { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0 6px; color: #9fb0d1; font-size: .8rem; text-align: center; }
    .earn-note .pulse { width: 8px; height: 8px; border-radius: 50%; background: #00E5C7; animation: pulse 1.2s infinite; box-shadow: 0 0 8px #00E5C7; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .timer-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 22px; margin-bottom: 16px; text-align: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,.35); }
    .timer-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .ring { width: 92px; height: 92px; border-radius: 50%; background: conic-gradient(#18CBF0 0deg, #16233f 0deg); display: grid; place-items: center; position: relative; transition: background .12s linear; box-shadow: 0 0 34px rgba(24,203,240,.18); }
    .ring-inner { width: 74px; height: 74px; border-radius: 50%; background: #0b1222; display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; }
    .ring.done { background: conic-gradient(#00E5C7 360deg, #16233f 0deg); box-shadow: 0 0 44px rgba(0,229,199,.4); }
    .ring.done .ring-inner { color: #00E5C7; }
    @keyframes breathe { 0%,100% { transform: scale(1); box-shadow: 0 0 44px rgba(0,229,199,.4); } 50% { transform: scale(1.07); box-shadow: 0 0 66px rgba(0,229,199,.7); } }
    .ring.done.wait { animation: breathe 1.1s ease-in-out infinite; }
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
    .sponsored-link { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 54px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px dashed rgba(255,255,255,.18); color: #18CBF0; font-weight: 700; font-size: .9rem; text-decoration: none; transition: .2s; }
    .sponsored-link:hover { background: rgba(24,203,240,.1); border-color: rgba(24,203,240,.45); color: #7ee0ff; }
    .sponsored-link span { font-size: 1.1rem; }
    @media (max-width: 480px) {
      .page { padding: 0 10px 24px; }
      .top { padding: 14px 2px 10px; }
      .logo { font-size: 1.05rem; }
      .steps { font-size: .7rem; padding: 5px 9px; }
      .ad-card { padding: 7px; border-radius: 16px; margin-bottom: 12px; }
      .ad-tag { font-size: .62rem; margin: 4px 0 8px 6px; }
      .ad-slot-main { min-height: 380px; }
      .ad-slot-second { min-height: 60px; }
      .timer-card { padding: 16px; border-radius: 16px; }
      .ring { width: 76px; height: 76px; }
      .ring-inner { width: 60px; height: 60px; font-size: 1.4rem; }
      .continue-btn { padding: 14px; font-size: 1rem; }
      .start-btn { padding: 13px 34px; font-size: 1rem; }
    }
    @media (min-width: 1400px) {
      .page { max-width: 620px; }
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
      <div class="steps"><span class="steps-dots">STEPDOTS</span> STEPNUM / DOTPAGES</div>
    </div>
    <div class="ad-card">
      <div class="ad-tag"><i></i> Advertisement</div>
      <div class="ad-slot ad-slot-main">ADSLOT</div>
      <div class="earn-note"><span class="pulse"></span> You earn only if you stay until the timer finishes</div>
    </div>
    <div class="timer-card">
      <div class="timer-wrap">
        <div class="ring" id="ring" style="display:none"><div class="ring-inner" id="count">TIMER</div></div>
        <button class="start-btn" id="startBtn">Click to Continue <span>&#9654;</span></button>
        <div class="timer-label" id="timerLabel">Start the timer to unlock your link</div>
      </div>
      <div class="progress-track" id="progTrack" style="display:none"><div class="progress-fill" id="prog"></div></div>
    </div>
    SECONDAD
    DIRECTBOX
    <form method="POST" action="HREF" class="continue-form" id="continueForm">
      <input type="hidden" name="p" value="PROOF">
      <button type="submit" class="continue-btn" id="continueBtn" style="font-family:inherit;appearance:none;-webkit-appearance:none"><span id="btnLabel">Continue</span> <span>&#8594;</span></button>
    </form>
    <div class="hint" id="bottomHint" style="display:none"><span>&#8595;</span> Scroll down to continue</div>
    THIRDAD
    <div class="note">LINK BABA helps creators earn from every click</div>
  </div>
  EXTRASCRIPTS
  <script>
    (function () {
      var total = TIMER;
      var waitMs = TOTALWAIT * 1000;
      var continueMs = CONTINUEWAIT * 1000;
      var count = document.getElementById('count');
      var ring = document.getElementById('ring');
      var prog = document.getElementById('prog');
      var progTrack = document.getElementById('progTrack');
      var btn = document.getElementById('continueBtn');
      var btnLabel = document.getElementById('btnLabel');
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
        if (POPURL) {
          try {
            var w = window.open(POPURL, '_blank');
            if (w) w.blur();
          } catch (e) {}
          window.focus();
        }
        t0 = Date.now();
        tick();
        iv = setInterval(tick, 250);
      }
      function tick() {
        // Fake timer: the countdown is slowed down so it takes waitMs real time
        // to reach 0. Each displayed second = waitMs/total real ms. With fake=0
        // it behaves exactly like a normal 1-second-per-tick countdown.
        var rate = waitMs / total;
        var elapsed = Math.floor((Date.now() - t0) / rate);
        var left = total - elapsed;
        if (left > 0) {
          render(left, elapsed);
        } else if (!done) {
          // Countdown finished. If a continue-wait is configured, keep the
          // button locked with a wait animation until continueMs has passed.
          var waited = Date.now() - (t0 + waitMs);
          if (waited < continueMs) {
            render(0, total);
            count.textContent = '\u2713';
            ring.classList.add('done', 'wait');
            timerLabel.textContent = 'Please wait\u2026';
            if (btnLabel) btnLabel.textContent = 'Please wait\u2026';
          } else {
            done = true;
            clearInterval(iv);
            render(0, total);
            count.textContent = '\u2713';
            ring.classList.add('done');
            ring.classList.remove('wait');
            timerLabel.textContent = 'Scroll down and tap Continue';
            if (btnLabel) btnLabel.textContent = 'Continue';
            bottomHint.style.display = 'flex';
            btn.classList.add('ready');
          }
        }
      }
      function render(left, doneSec) {
        count.textContent = left;
        var deg = Math.round((doneSec / total) * 360);
        ring.style.background = 'conic-gradient(#18CBF0 ' + deg + 'deg, #16233f 0deg)';
        if (prog) prog.style.width = Math.round((doneSec / total) * 100) + '%';
      }
      startBtn.addEventListener('click', start);
      var continueForm = document.getElementById('continueForm');
      if (continueForm) continueForm.addEventListener('submit', function (e) {
        if (!btn.classList.contains('ready')) e.preventDefault();
      });
    })();
  </script>
</body>
</html>`
    .replace(/STEPNUM/g, () => o.step)
    .replace(/DOTPAGES/g, () => Math.max(1, parseInt(o.dotPages) || parseInt(o.totalPages) || 1))
    .replace(/STEPDOTS/g, () => stepDots)
    .replace(/TIMER/g, () => timer)
    .replace(/TOTALWAIT/g, () => totalWait)
    .replace(/CONTINUEWAIT/g, () => continueWait)
    .replace(/HREF/g, () => href)
    .replace(/PROOF/g, () => o.proof || "")
    .replace(/ADSLOT/g, () => adSlot)
    .replace(/SECONDAD/g, () => secondAd)
    .replace(/THIRDAD/g, () => thirdAd)
    .replace(/DIRECTBOX/g, () => directBoxes)
    .replace(/EXTRASCRIPTS/g, () => extraAds)
    .replace(/POPURL/g, () => popUrl);
}

// ============ PROMO PAGE (final step) ============

function promoPage(o) {
  const timer = Math.max(3, parseInt(o.timerSeconds) || 5);
  const image = o.imageUrl
    ? `<div class="promo-img"><img src="${escapeAttr(o.imageUrl)}" alt="" onerror="this.parentNode.style.display='none'"></div>`
    : `<div class="promo-icon">${o.emoji || "🎁"}</div>`;
  const visitBtn = o.url
    ? `<a class="visit-btn" href="${escapeAttr(o.url)}" target="_blank" rel="nofollow noopener">${escapeAttr(o.buttonText || "Visit Now")} <span>&#8599;</span></a>`
    : "";
  const href = `/go?t=${o.token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Almost There &#8212; LINK BABA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :focus, :focus-visible { outline: none !important; }
    * { -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070B16; color: #fff; overflow-x: hidden; }
    body.locked { overflow: hidden; }
    .glow { position: fixed; border-radius: 50%; filter: blur(110px); z-index: 0; pointer-events: none; }
    .g1 { width: 320px; height: 320px; top: -70px; left: -60px; background: #18CBF0; opacity: .16; animation: drift 9s ease-in-out infinite; }
    .g2 { width: 380px; height: 380px; bottom: -90px; right: -70px; background: #00E5C7; opacity: .14; animation: drift 11s ease-in-out infinite reverse; }
    .g3 { width: 300px; height: 300px; top: 45%; left: 50%; margin-left: -150px; margin-top: -150px; background: #A78BFA; opacity: .10; }
    @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 16px); } }
    .page { position: relative; z-index: 1; width: 100%; max-width: 560px; margin: 0 auto; padding: 0 16px 36px; }
    .top { display: flex; align-items: center; justify-content: space-between; padding: 20px 4px 14px; }
    .logo { font-weight: 900; font-size: 1.2rem; letter-spacing: -.3px; }
    .logo span { background: linear-gradient(135deg,#18CBF0,#00E5C7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .steps { display: flex; align-items: center; gap: 8px; font-size: .78rem; color: #9fb0d1; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); padding: 6px 12px; border-radius: 999px; }
    .steps-dots { display: flex; align-items: center; gap: 5px; }
    .step-dot { width: 6px; height: 6px; border-radius: 99px; background: rgba(255,255,255,.16); transition: .3s; }
    .step-dot.active { width: 18px; background: linear-gradient(135deg,#18CBF0,#00E5C7); box-shadow: 0 0 10px rgba(24,203,240,.5); }
    .promo-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 28px 20px; margin-bottom: 16px; text-align: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,.35); }
    .promo-img { max-width: 100%; max-height: 220px; overflow: hidden; border-radius: 14px; margin-bottom: 18px; }
    .promo-img img { width: 100%; display: block; }
    .promo-icon { width: 76px; height: 76px; margin: 0 auto 16px; border-radius: 20px; background: rgba(24,203,240,.12); border: 1px solid rgba(24,203,240,.25); display: grid; place-items: center; font-size: 2.4rem; }
    .promo-card h2 { font-size: 1.35rem; margin-bottom: 10px; letter-spacing: -.3px; }
    .promo-card p { color: #9fb0d1; font-size: .95rem; line-height: 1.6; margin-bottom: 20px; }
    .visit-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 30px; border-radius: 13px; background: linear-gradient(135deg,#A78BFA,#F472B6); color: #050A18; font-weight: 800; font-size: .98rem; text-decoration: none; box-shadow: 0 10px 34px rgba(167,139,250,.35); transition: transform .2s; }
    .visit-btn:hover { transform: translateY(-2px); }
    .visit-btn:active { transform: scale(.96); }
    .timer-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 22px; margin-bottom: 16px; text-align: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,.35); }
    .timer-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .ring { width: 92px; height: 92px; border-radius: 50%; background: conic-gradient(#18CBF0 0deg, #16233f 0deg); display: grid; place-items: center; position: relative; transition: background .12s linear; box-shadow: 0 0 34px rgba(24,203,240,.18); }
    .ring-inner { width: 74px; height: 74px; border-radius: 50%; background: #0b1222; display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; }
    .ring.done { background: conic-gradient(#00E5C7 360deg, #16233f 0deg); box-shadow: 0 0 44px rgba(0,229,199,.4); }
    .ring.done .ring-inner { color: #00E5C7; }
    .timer-label { color: #8892A4; font-size: .85rem; margin-top: 14px; }
    .progress-track { height: 5px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; margin-top: 18px; }
    .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg,#18CBF0,#00E5C7); border-radius: 99px; transition: width 1s linear; }
    .start-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; padding: 15px 44px; border: none; border-radius: 14px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 40px rgba(24,203,240,.4); transition: .2s; }
    .start-btn:hover { transform: translateY(-2px); }
    .start-btn:active { transform: scale(.96); }
    .start-btn.hidden { display: none; }
    .continue-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; border: none; border-radius: 14px; background: linear-gradient(135deg,#18CBF0,#00E5C7); color: #050A18; font-weight: 800; font-size: 1.05rem; cursor: pointer; text-decoration: none; opacity: .4; pointer-events: none; transition: .25s; box-shadow: 0 10px 30px rgba(24,203,240,.25); }
    .continue-btn.ready { opacity: 1; pointer-events: auto; box-shadow: 0 12px 38px rgba(0,229,199,.4); }
    .continue-btn.ready:hover { transform: translateY(-2px); }
    .continue-btn.ready:active { transform: scale(.98); }
    .note { text-align: center; color: #5a6b8c; font-size: .73rem; margin-top: 20px; }
    @media (max-width: 480px) {
      .page { padding: 0 10px 24px; }
      .top { padding: 14px 2px 10px; }
      .logo { font-size: 1.05rem; }
      .steps { font-size: .7rem; padding: 5px 9px; }
      .promo-card { padding: 20px 14px; border-radius: 16px; margin-bottom: 12px; }
      .promo-card h2 { font-size: 1.15rem; }
      .promo-card p { font-size: .88rem; }
      .promo-img { max-height: 160px; }
      .timer-card { padding: 16px; border-radius: 16px; }
      .ring { width: 76px; height: 76px; }
      .ring-inner { width: 60px; height: 60px; font-size: 1.4rem; }
      .start-btn { padding: 13px 34px; font-size: 1rem; }
      .continue-btn { padding: 14px; font-size: 1rem; }
    }
    @media (min-width: 1400px) {
      .page { max-width: 620px; }
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
    </div>
    <div class="promo-card">
      IMAGE
      <h2>TITLE</h2>
      <p>DESC</p>
      VISITBTN
    </div>
    <div class="timer-card">
      <div class="timer-wrap">
        <div class="ring" id="ring" style="display:none"><div class="ring-inner" id="count">TIMER</div></div>
        <button class="start-btn" id="startBtn">Click to Continue <span>&#9654;</span></button>
        <div class="timer-label" id="timerLabel">Start the timer to unlock your link</div>
      </div>
      <div class="progress-track" id="progTrack" style="display:none"><div class="progress-fill" id="prog"></div></div>
    </div>
    <form method="POST" action="HREF" class="continue-form" id="continueForm">
      <input type="hidden" name="p" value="PROOF">
      <button type="submit" class="continue-btn" id="continueBtn" style="font-family:inherit;appearance:none;-webkit-appearance:none">Continue <span>&#8594;</span></button>
    </form>
    <div class="note">LINK BABA helps creators earn from every click</div>
  </div>
  <script>
    (function () {
      var total = TIMER;
      var left = total;
      var count = document.getElementById('count');
      var ring = document.getElementById('ring');
      var prog = document.getElementById('prog');
      var progTrack = document.getElementById('progTrack');
      var btn = document.getElementById('continueBtn');
      var startBtn = document.getElementById('startBtn');
      var timerLabel = document.getElementById('timerLabel');
      var started = false;
      var iv = null;
      function start() {
        if (started) return;
        started = true;
        startBtn.classList.add('hidden');
        ring.style.display = 'grid';
        progTrack.style.display = 'block';
        timerLabel.textContent = 'Please wait for the countdown to finish';
        render();
        iv = setInterval(tick, 1000);
      }
      function tick() {
        left--;
        if (left <= 0) {
          clearInterval(iv);
          count.textContent = '\u2713';
          ring.classList.add('done');
          if (prog) prog.style.width = '100%';
          timerLabel.textContent = 'Tap Continue to visit your destination';
          btn.classList.add('ready');
        } else {
          render();
        }
      }
      function render() {
        count.textContent = left;
        var done = total - left;
        var deg = Math.round((done / total) * 360);
        ring.style.background = 'conic-gradient(#18CBF0 ' + deg + 'deg, #16233f 0deg)';
        if (prog) prog.style.width = Math.round((done / total) * 100) + '%';
      }
      startBtn.addEventListener('click', start);
      var continueForm = document.getElementById('continueForm');
      if (continueForm) continueForm.addEventListener('submit', function (e) {
        if (!btn.classList.contains('ready')) e.preventDefault();
      });
    })();
  </script>
</body>
</html>`
    .replace(/TIMER/g, () => timer)
    .replace(/HREF/g, () => href)
    .replace(/PROOF/g, () => o.proof || "")
    .replace(/IMAGE/g, () => image)
    .replace(/TITLE/g, () => escapeAttr(o.title || "Special Offer"))
    .replace(/DESC/g, () => escapeAttr(o.description || ""))
    .replace(/VISITBTN/g, () => visitBtn);
}

// ============ STEP PAGE RENDERER ============

function renderStepPage(step, adPages, totalPages, ads, promo, token, proof) {
  if (step > adPages) {
    return promoPage({
      step,
      totalPages,
      dotPages: adPages,
      timerSeconds: promo.timerSeconds,
      title: promo.title,
      description: promo.description,
      buttonText: promo.buttonText,
      url: promo.url,
      imageUrl: promo.imageUrl,
      emoji: promo.emoji,
      token,
      proof,
    });
  }
  return adPage({
    step,
    totalPages,
    dotPages: adPages,
    timerSeconds: ads.timerSeconds,
    fakeTimerSeconds: ads.fakeTimerSeconds,
    continueWaitSeconds: ads.continueWaitSeconds,
    bannerUrl: ads.bannerUrl,
    bannerHtml: ads.bannerHtml,
    banner2Url: ads.banner2Url,
    banner2Html: ads.banner2Html,
    banner3Url: ads.banner3Url,
    banner3Html: ads.banner3Html,
    popunderUrl: ads.popunderUrl,
    popunderCode: ads.popunderCode,
    pushCode: ads.pushCode,
    inPagePushCode: ads.inPagePushCode,
    vignetteCode: ads.vignetteCode,
    directLinkUrl: ads.directLinkUrl,
    directList: ads.directList,
    token,
    proof,
  });
}

// ============ TRACKING ============

function trackAdView(code, request, step, ctx) {
  const ip = clientIp(request);
  if (isVerifiedBot(request)) return;
  if (!shouldTrack(ip, "av:" + code, TRACKED_WINDOW_MS)) return;
  ctx.waitUntil(dbPush(`adviews/${code}`, {
    linkCode: code,
    timestamp: Date.now(),
    step,
    ip,
    country: getCountry(request),
    device: getDevice(request),
    referrer: getReferrer(request),
  }).catch(() => {}));
}

function trackConversion(code, link, request, ads, totalPages, ctx) {
  const ip = clientIp(request);
  const task = (async () => {
    if (isVerifiedBot(request)) return;
    if (!shouldTrack(ip, "cv:" + code, CONVERSION_WINDOW_MS)) return;
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
      ip,
      country: getCountry(request),
      device: getDevice(request),
      referrer: getReferrer(request),
      type: "conversion",
      cpm: ratePer1000,
      earned,
    };
    const currentClicks = link.clicks || 0;
    const currentEarnings = link.earnings || 0;
    await Promise.all([
      dbUpdate(`links/${code}`, {
        clicks: currentClicks + 1,
        earnings: currentEarnings + earned,
        adViews: (link.adViews || 0) + (parseInt(totalPages) || 1),
      }),
      dbPush(`clicks/${code}`, clickData),
      updateUserEarnings(link.uid, earned, user),
    ]);
  })();
  ctx.waitUntil(task.catch(() => {}));
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

async function handleGo(request, url, ctx) {
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return html(ERROR_PAGE("Too Many Requests", "You are moving too fast. Please wait a moment and try again."), 429);
  }
  const token = url.searchParams.get("t") || "";
  if (!token || token.length > 64 || /[^a-zA-Z0-9_-]/.test(token)) {
    return html(ERROR_PAGE("Invalid Session", "This redirect session is invalid or has expired. Please open the short link again."), 400, { noStore: true });
  }

  const session = await dbGet(`adsessions/${token}`);
  if (!session || !session.code) {
    return html(ERROR_PAGE("Session Expired", "This redirect session is invalid or has expired. Please open the short link again."), 400, { noStore: true });
  }
  if (Date.now() > (session.expiresAt || 0)) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    return html(ERROR_PAGE("Session Expired", "This redirect session has expired. Please open the short link again."), 400, { noStore: true });
  }

  const link = await dbGet(`links/${session.code}`);
  if (!link) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    return html(ERROR_PAGE("Link Not Found", "This short link doesn't exist. It may have been deleted or the URL is incorrect."), 404, { noStore: true });
  }
  if (link.disabled || link.status === "disabled") {
    return html(ERROR_PAGE("Link Disabled", "This link has been disabled by the administrator."), 403);
  }
  if (link.expiresAt && Date.now() > link.expiresAt) {
    return html(ERROR_PAGE("Link Expired", "This short link has expired and is no longer active."), 410);
  }

  const longUrl = link.longUrl || link.url || link.destination;
  if (!longUrl || !safeUrl(longUrl)) {
    return html(ERROR_PAGE("Error", "This link has no valid destination URL configured."), 500);
  }

  const ads = await getAdsConfig();
  const adPages = Math.max(0, parseInt(session.adPages) || 0);
  const totalPages = Math.max(1, parseInt(session.totalPages) || 1);
  const promoEnabled = session.promoEnabled !== false;
  const promo = ads.promo || {};
  const method = request.method;

  const renderCurrent = () =>
    html(renderStepPage(session.step, adPages, totalPages, ads, promo, token, session.proof), 200, { csp: false, noStore: true });

  if (method !== "POST") {
    // A direct visit to any step page (including the final page) can never
    // bypass the flow: delete the session and send the visitor back to the
    // short link itself, which always starts a fresh session from page 1.
    await dbDelete(`adsessions/${token}`).catch(() => {});
    return redirect(url.origin + "/" + session.code);
  }

  let proof = url.searchParams.get("p") || "";
  if (!proof) {
    try {
      const form = await request.formData();
      proof = form.get("p") || "";
    } catch (e) {}
  }
  if (!proof || proof !== (session.proof || "")) {
    return redirect(url.origin + "/" + session.code);
  }

  if (session.step >= totalPages) {
    await dbDelete(`adsessions/${token}`).catch(() => {});
    trackConversion(session.code, link, request, ads, totalPages, ctx);
    return redirect(longUrl);
  }

  const gateSeconds = session.step > adPages
    ? promo.timerSeconds
    : ((parseInt(ads.timerSeconds) || 0) + (parseInt(ads.fakeTimerSeconds) || 0) + (parseInt(ads.continueWaitSeconds) || 0));
  const minWaitMs = Math.max(0, parseInt(gateSeconds) || 0) * 1000;
  const sinceRender = Date.now() - (session.pageAt || 0);
  if (minWaitMs > 0 && sinceRender < minWaitMs) {
    await dbUpdate(`adsessions/${token}`, { pageAt: Date.now() }).catch(() => {});
    return renderCurrent();
  }

  const nextStep = session.step + 1;
  const newProof = randomToken(16);
  await dbUpdate(`adsessions/${token}`, { step: nextStep, proof: newProof, pageAt: Date.now() }).catch(() => {});
  if (nextStep <= adPages) trackAdView(session.code, request, nextStep, ctx);
  return html(renderStepPage(nextStep, adPages, totalPages, ads, promo, token, newProof), 200, { csp: false, noStore: true });
}

// ============ ROUTER ============

async function scheduled(event, env) {
  setEnv(env);
  const now = Date.now();
  const tasks = [];

  const sessions = await dbGet("adsessions");
  if (sessions) {
    for (const [token, s] of Object.entries(sessions)) {
      if (!s || !s.expiresAt || now > s.expiresAt) tasks.push(dbDelete("adsessions/" + token));
    }
  }

  const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  for (const node of ["clicks", "adviews"]) {
    const all = await dbGet(node);
    if (!all) continue;
    for (const [code, entries] of Object.entries(all)) {
      if (!entries || typeof entries !== "object") continue;
      for (const [id, e] of Object.entries(entries)) {
        if (e && e.timestamp && now - e.timestamp > RETENTION_MS) {
          tasks.push(dbDelete(`${node}/${code}/${id}`));
        }
      }
    }
  }

  await Promise.all(tasks);
}

// ---- Frontend proxy (GitHub Pages) ----
// linkbaba.online par user panel (GitHub Pages frontend) serve karta hai.
async function serveFrontend(pathname, request) {
  const target = FRONTEND_ORIGIN + (pathname === "/" ? "/" : pathname);
  const res = await fetch(target);
  const headers = new Headers(res.headers);
  const cors = corsHeader(request);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    setEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const httpsRes = httpsRedirect(url);
    if (httpsRes) return httpsRes;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...corsHeader(request),
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ---- Root: user panel (frontend) with worker landing fallback ----
    if (path === "/" || path === "") {
      try {
        return await serveFrontend("/", request);
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
        return await serveFrontend(path, request);
      } catch (e) {
        return html(ERROR_PAGE("Error", "Frontend temporarily unavailable. Please try again later."), 502);
      }
    }

    // ---- Favicon ----
    if (path === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // ---- Ad session continue route (rate limited) ----
    if (path === "/go") {
      return handleGo(request, url, ctx);
    }

    // ---- Short-code routes: rate limited to stop abuse ----
    if (isRateLimited(clientIp(request))) {
      return html(ERROR_PAGE("Too Many Requests", "You are moving too fast. Please wait a moment and try again."), 429);
    }

    // ---- Extract short code ----
    const code = path.replace(/^\//, "").replace(/\/$/, "");

    // Basic validation — short codes are alphanumeric + hyphens/underscores
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
    if (!longUrl || !safeUrl(longUrl)) {
      return html(ERROR_PAGE("Error", "This link has no valid destination URL configured."), 500);
    }

    // ---- Password protection (with brute-force lockout) ----
    if (link.password || link.passwordHash) {
      if (method === "GET") {
        return html(PASSWORD_PAGE(code), 200, { noStore: true });
      }
      if (method === "POST") {
        const now = Date.now();
        if (link.passwordLockUntil && now < link.passwordLockUntil) {
          return html(ERROR_PAGE("Too Many Attempts", "Too many wrong password attempts. This link is locked for 15 minutes."), 429);
        }
        const formData = await request.formData();
        const enteredPassword = formData.get("password") || "";
        if (await checkPassword(link, enteredPassword)) {
          await dbUpdate(`links/${code}`, { passwordAttempts: 0, passwordLockUntil: 0 }).catch(() => {});
        } else {
          const attempts = (link.passwordAttempts || 0) + 1;
          if (attempts >= 5) {
            await dbUpdate(`links/${code}`, { passwordAttempts: 0, passwordLockUntil: now + 15 * 60 * 1000 }).catch(() => {});
            return html(ERROR_PAGE("Too Many Attempts", "Too many wrong password attempts. This link is locked for 15 minutes."), 429);
          }
          await dbUpdate(`links/${code}`, { passwordAttempts: attempts }).catch(() => {});
          return html(
            PASSWORD_PAGE(code).replace(
              '<div class="error" id="err">Wrong password. Try again.</div>',
              '<div class="error" id="err" style="display:block">Wrong password. Try again.</div>'
            ),
            200,
            { noStore: true }
          );
        }
      }
    }

    // ---- Advanced ad system + final promo page ----
    // Every short link ALWAYS goes through the ad pages (page 1 -> ... -> final)
    // before reaching the destination. No direct redirects, ever.
    const ads = await getAdsConfig();
    const promo = ads.promo || {};
    const promoEnabled = !!(promo && promo.enabled !== false && promo.url);
    const adPages = Math.max(1, parseInt(link.adPages || ads.adPages) || 1);
    const totalPages = adPages + (promoEnabled ? 1 : 0);

    const token = randomToken();
    const proof = randomToken(16);
    await dbUpdate(`adsessions/${token}`, {
      code,
      step: 1,
      adPages,
      totalPages,
      promoEnabled,
      proof,
      pageAt: Date.now(),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    }).catch(() => {});
    trackAdView(code, request, 1, ctx);
    return html(renderStepPage(1, adPages, totalPages, ads, promo, token, proof), 200, { csp: false, noStore: true });
  },
  scheduled,
};
