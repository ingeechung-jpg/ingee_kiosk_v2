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
        removeFile(path.join(BUILD_CONTENT, base));
      }
    });
  }

  for (var i = 0; i < changedDocs.length; i++) {
    await convertDocs.convertDoc(changedDocs[i], BUILD_CONTENT);
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
