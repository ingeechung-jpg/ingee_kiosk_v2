var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var convertDocs = require('./convert-docs');
var convertSheets = require('./convert-sheets');

var ROOT = path.resolve(__dirname, '..');
var RAW_DOCS = path.join(ROOT, 'raw', 'docs');
var RAW_SHEETS = path.join(ROOT, 'raw', 'sheets');
var BUILD_CONTENT = path.join(ROOT, 'build', 'content');
var BUILD_DATA = path.join(ROOT, 'build', 'data');
var INDEX_PATH = path.join(ROOT, '.content-index.json');

function readIndex() {
  if (!fs.existsSync(INDEX_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeIndex(index) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

function hashFile(filePath) {
  var buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function listFiles(dirPath, ext) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter(function(name) {
    return ext ? name.toLowerCase().endsWith(ext) : true;
  }).map(function(name) {
    return path.join(dirPath, name);
  });
}

function keyFor(filePath) {
  var rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  return rel;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function readFileUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseCsv(text) {
  var rows = [];
  var row = [];
  var i = 0;
  var field = '';
  var inQuotes = false;
  while (i < text.length) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function normHeader(h) {
  return String(h || '').toLowerCase().replace(/\s+/g, '');
}

function headerIndexMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[normHeader(headers[i])] = i;
  }
  return map;
}

function pickRow(map, row, keys) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (map[key] !== undefined) return row[map[key]];
  }
  return '';
}

function extractDocId(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var m = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;
  return raw;
}

function loadNotesTitleMap() {
  var files = listFiles(RAW_SHEETS, '.csv');
  var noteFile = null;
  for (var i = 0; i < files.length; i++) {
    var name = path.basename(files[i]).toLowerCase();
    if (name.indexOf('note') !== -1 || name.indexOf('notes') !== -1 || name.indexOf('노트') !== -1) {
      noteFile = files[i];
      break;
    }
  }
  if (!noteFile) return {};
  var content = readFileUtf8(noteFile);
  var rows = parseCsv(content);
  var headers = rows.length ? rows[0] : [];
  var map = headerIndexMap(headers);
  var out = {};
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var title = pickRow(map, row, ['title','제목']) || '';
    var docRef = extractDocId(pickRow(map, row, ['docid','doc_id','doc','document','gdoc','gdocs','문서','독스','docname']) || '');
    if (docRef && title) {
      out[String(docRef).trim()] = String(title).trim();
    }
  }
  return out;
}

async function run() {
  ensureDir(BUILD_CONTENT);
  ensureDir(BUILD_DATA);

  var index = readIndex();
  var updatedIndex = {};

  var docs = listFiles(RAW_DOCS, '.docx');
  var sheets = listFiles(RAW_SHEETS, '.csv');

  var changedDocs = [];
  var changedSheets = [];
  var notesDir = path.join(BUILD_CONTENT, 'notes');
  var forceDocs = !fs.existsSync(notesDir);
  var rawDir = path.join(BUILD_DATA, 'raw');
  var expectedRaw = ['profile.json','courses.json','projects.json','exhibitions.json','notes.json','order.json'];
  var forceSheets = !fs.existsSync(rawDir) || expectedRaw.some(function(name) {
    return !fs.existsSync(path.join(rawDir, name));
  });

  docs.forEach(function(filePath) {
    var key = keyFor(filePath);
    var hash = hashFile(filePath);
    updatedIndex[key] = hash;
    if (forceDocs || index[key] !== hash) changedDocs.push(filePath);
  });

  sheets.forEach(function(filePath) {
    var key = keyFor(filePath);
    var hash = hashFile(filePath);
    updatedIndex[key] = hash;
    if (forceSheets || index[key] !== hash) changedSheets.push(filePath);
  });

  var removedKeys = Object.keys(index).filter(function(key) {
    return !updatedIndex[key];
  });

  if (removedKeys.length) {
    removedKeys.forEach(function(key) {
      if (key.indexOf('raw/docs/') === 0 && key.toLowerCase().endsWith('.docx')) {
        var base = path.basename(key, '.docx') + '.md';
        removeFile(path.join(BUILD_CONTENT, 'notes', base));
      }
    });
  }

  var noteTitleMap = loadNotesTitleMap();
  for (var i = 0; i < changedDocs.length; i++) {
    await convertDocs.convertDoc(changedDocs[i], BUILD_CONTENT, { titleMap: noteTitleMap });
  }

  if (changedSheets.length || removedKeys.some(function(k) { return k.indexOf('raw/sheets/') === 0; })) {
    convertSheets.convertSheetsDir(RAW_SHEETS, BUILD_DATA);
  }

  writeIndex(updatedIndex);
}

run().catch(function(err) {
  console.error(err);
  process.exit(1);
});
