var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var ROOT = path.resolve(__dirname, '..');
var SITE_SRC = path.join(ROOT, 'site', 'web');
var BUILD_SITE = path.join(ROOT, 'build', 'site');
var BACKGROUND_SRC = path.join(SITE_SRC, 'data', 'background.json');
var BACKGROUND_BUILD = path.join(BUILD_SITE, 'data', 'background.json');
var PORT = Number(process.env.STUDIO_PORT || 8123);

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  var body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readBackgroundConfig() {
  return JSON.parse(fs.readFileSync(BACKGROUND_SRC, 'utf8'));
}

function writeBackgroundConfig(payload) {
  var body = JSON.stringify(payload, null, 2) + '\n';
  ensureDir(path.dirname(BACKGROUND_SRC));
  fs.writeFileSync(BACKGROUND_SRC, body, 'utf8');
  ensureDir(path.dirname(BACKGROUND_BUILD));
  fs.writeFileSync(BACKGROUND_BUILD, body, 'utf8');
}

function tryFile(filePath) {
  try {
    var stat = fs.statSync(filePath);
    if (stat.isFile()) return filePath;
  } catch (_) {}
  return null;
}

function resolveStaticFile(pathname) {
  var safePath = pathname === '/' ? '/index.html' : pathname;
  var normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, '');
  var stripped = normalized.replace(/^[/\\]+/, '');
  var candidates = [
    path.join(BUILD_SITE, stripped),
    path.join(SITE_SRC, stripped)
  ];
  for (var i = 0; i < candidates.length; i++) {
    var found = tryFile(candidates[i]);
    if (found) return found;
  }
  return null;
}

function serveFile(res, filePath) {
  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';
  var data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': data.length
  });
  res.end(data);
}

function handleRequest(req, res) {
  var parsed = url.parse(req.url || '/', true);
  var pathname = parsed.pathname || '/';

  if (pathname === '/__studio/background-config') {
    if (req.method === 'GET') {
      sendJson(res, 200, readBackgroundConfig());
      return;
    }
    if (req.method === 'POST') {
      var body = '';
      req.on('data', function(chunk) { body += chunk; });
      req.on('end', function() {
        try {
          var payload = JSON.parse(body || '{}');
          writeBackgroundConfig(payload);
          sendJson(res, 200, { ok: true });
        } catch (err) {
          sendJson(res, 400, { ok: false, message: String(err.message || err) });
        }
      });
      return;
    }
    sendJson(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  var filePath = resolveStaticFile(pathname);
  if (!filePath) {
    sendText(res, 404, 'Not found');
    return;
  }
  serveFile(res, filePath);
}

http.createServer(handleRequest).listen(PORT, function() {
  console.log('Studio server running on http://localhost:' + PORT);
});
