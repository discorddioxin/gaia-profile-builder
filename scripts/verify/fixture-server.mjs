/**
 * Fixture server for the background-fidelity check.
 *
 * Serves a Gaia-like V2 profile whose styling mirrors how real profiles work:
 *   • linked theme CSS (`/css/gaia_theme.css`) — like Gaia's own stylesheets
 *   • a third-party library (`/css/thirdparty/animate.css`)
 *   • a profile <style> block that pulls another sheet in with @import
 *   • the page background defined as CSS (`html`/`body` rules + a relative url)
 *
 * Usage: node scripts/verify/fixture-server.mjs [port]
 */
import http from 'node:http';
import zlib from 'node:zlib';

const PORT = Number(process.argv[2] || 4599);

/* ---------------------------------- PNG ---------------------------------- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Solid-colour PNG so a screenshot pixel can prove the image painted. */
function solidPng(width, height, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Distinct colour: any pixel matching this can only come from the background image.
export const STARFIELD_RGB = [14, 122, 107];
const STARFIELD_PNG = solidPng(16, 16, STARFIELD_RGB);

/* --------------------------------- assets -------------------------------- */
const THEME_CSS = `/* Gaia-like theme stylesheet (served like gaiaonline.com/css/...) */
body {
  margin: 0;
  font-family: 'Trebuchet MS', Verdana, sans-serif;
  font-size: 12px;
  color: #d8e0f0;
  background-color: #0b1026;
}
a { color: #7fd1ff; text-decoration: none; }
#columns {
  width: 1000px;
  margin: 0 auto;
  zoom: 1;
}
#columns:after { content: ''; display: block; clear: both; }
.column { float: left; width: 320px; padding: 0 6px; box-sizing: border-box; }
.panel { margin-bottom: 12px; background: rgba(9, 14, 34, 0.82); border: 1px solid #26325c; }
.panel h2 { margin: 0; padding: 6px 8px; font-size: 13px; background: #16204a; border-bottom: 1px solid #26325c; }
.panel .postcontent { padding: 8px; }
.clear { clear: both; }
`;

const THIRD_PARTY_CSS = `/* Third-party library stand-in (same shape as animate.css / hover.css) */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.animated { animation-duration: 1s; animation-fill-mode: both; }
.fadeInUp { animation-name: fadeInUp; }
`;

const IMPORTED_CSS = `/* Sheet pulled in through @import by the profile CSS */
#id_details .postcontent { letter-spacing: 0.01em; }
#id_details .details-avatar { border: 2px solid #7fd1ff; }
.imported-marker { color: #14e07f; }
`;

const PROFILE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Fixture Gaia Profile</title>
<link rel="stylesheet" href="/css/gaia_theme.css">
<link rel="stylesheet" href="/css/thirdparty/animate.css">
<style>
@import url("/css/profile_import.css");

/* Page surface: a CSS rule with a relative background image (never an <img>). */
html {
  background: #0b1026 url('/img/starfield.png') repeat fixed center;
}
body {
  background-image: linear-gradient(180deg, rgba(11, 16, 38, 0.25), rgba(11, 16, 38, 0.85));
  background-repeat: repeat;
  min-height: 100%;
}
#column_1 { width: 330px; }
</style>
</head>
<body id="viewer" class="js profile-page">
<div id="columns">
  <div id="column_1" class="column focus_column">
    <div class="panel details_panel" id="id_details">
      <h2 id="details_title" class="animated fadeInUp">Details</h2>
      <div class="postcontent">
        <img class="details-avatar" src="/img/avatar.png" width="64" height="64" alt="avatar">
        <p class="imported-marker">Last seen: fixture</p>
      </div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_2" class="column focus_column">
    <div class="panel comments_panel" id="id_comments">
      <h2 id="comments_title">Comments</h2>
      <div class="postcontent"><p>Fixture comment body.</p></div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_3" class="column focus_column">
    <div class="panel friends_panel" id="id_friends">
      <h2 id="friends_title">Friends</h2>
      <ul class="style2"><li>Fixture friend</li></ul>
      <div class="clear"></div>
    </div>
  </div>
</div>
</body>
</html>`;

const AVATAR_PNG = solidPng(8, 8, [220, 90, 150]);

const PROFILE_GRADIENT_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Fixture Gradient Profile</title>
<link rel="stylesheet" href="/css/gaia_theme.css">
<link rel="stylesheet" href="/css/thirdparty/animate.css">
<style>
/* Two image layers, a gradient, per-layer size/position and a fixed surface. */
html {
  background: #05060f url('/img/starfield.png') repeat fixed;
}
body {
  background-image: linear-gradient(160deg, rgba(20, 0, 60, 0.55), rgba(0, 0, 0, 0.9)), url('/img/avatar.png');
  background-repeat: no-repeat, repeat;
  background-size: cover, 32px 32px;
  background-position: center top, left top;
  background-attachment: scroll, scroll;
}
</style>
</head>
<body id="viewer" class="js profile-page">
<div id="columns">
  <div id="column_1" class="column focus_column">
    <div class="panel details_panel" id="id_details">
      <h2 id="details_title" class="animated fadeInUp">Details</h2>
      <div class="postcontent"><p>Gradient fixture.</p></div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_2" class="column focus_column">
    <div class="panel comments_panel" id="id_comments">
      <h2 id="comments_title">Comments</h2>
      <div class="postcontent"><p>Gradient fixture comment.</p></div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_3" class="column focus_column">
    <div class="panel friends_panel" id="id_friends">
      <h2 id="friends_title">Friends</h2>
      <div class="postcontent"><p>Gradient fixture friend.</p></div>
      <div class="clear"></div>
    </div>
  </div>
</div>
</body>
</html>`;

const routes = {
  '/profile.html': { body: PROFILE_HTML, type: 'text/html; charset=utf-8' },
  '/profile-gradient.html': { body: PROFILE_GRADIENT_HTML, type: 'text/html; charset=utf-8' },
  '/css/gaia_theme.css': { body: THEME_CSS, type: 'text/css; charset=utf-8' },
  '/css/thirdparty/animate.css': { body: THIRD_PARTY_CSS, type: 'text/css; charset=utf-8' },
  '/css/profile_import.css': { body: IMPORTED_CSS, type: 'text/css; charset=utf-8' },
  '/img/starfield.png': { body: STARFIELD_PNG, type: 'image/png' },
  '/img/avatar.png': { body: AVATAR_PNG, type: 'image/png' },
};

export function startFixtureServer(port = PORT) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const route = routes[url.pathname];
    if (!route) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': route.type,
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    });
    res.end(route.body);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

/* Exported for the verify script so it can assert on the served CSS. */
export const FIXTURE = {
  PROFILE_GRADIENT_HTML,
  THEME_CSS,
  THIRD_PARTY_CSS,
  IMPORTED_CSS,
  PROFILE_HTML,
  PROFILE_URL: `http://127.0.0.1:${PORT}/profile.html`,
};

if (process.argv[1] && process.argv[1].endsWith('fixture-server.mjs')) {
  startFixtureServer().then(() => {
    console.log(`fixture server on http://127.0.0.1:${PORT}/profile.html`);
  });
}
