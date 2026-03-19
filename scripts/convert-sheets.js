var fs = require('fs');
var path = require('path');
var sheetUtils = require('./sheet-utils');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function truthy(val, fallback) {
  if (val === '' || val == null) return fallback;
  if (val === true) return true;
  var s = String(val).toLowerCase().trim();
  return s === 'true' || s === 't' || s === '1' || s === 'y' || s === 'yes' || s === 'o';
}

function makeKey(title, year, idx) {
  var base = (title || 'item') + '-' + (year || '') + '-' + (idx + 1);
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sanitizeFileName(text) {
  var raw = String(text || '').trim();
  if (!raw) return 'note';
  return raw.replace(/\s+/g, '-').replace(/[\\\/:*?"<>|]/g, '').trim() || 'note';
}

function parseProfileRaw(raw) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = sheetUtils.headerIndexMap(headers);
  if (rows.length) {
    var row = rows[0];
    return {
      name: sheetUtils.pickRow(map, row, ['name','이름']) || '',
      email: sheetUtils.pickRow(map, row, ['email','메일']) || '',
      instagram: sheetUtils.pickRow(map, row, ['instagram','insta','ig','인스타','인스타그램','아이디','instagramid']) || '',
      website: sheetUtils.pickRow(map, row, ['website','웹사이트','site']) || ''
    };
  }
  return { name: '', email: '', instagram: '', website: '' };
}

function parseSectionRaw(raw) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = sheetUtils.headerIndexMap(headers);
  var all = [];
  var active = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var title = sheetUtils.pickRow(map, row, ['title','제목']) || '';
    if (!title) continue;
    var year = sheetUtils.pickRow(map, row, ['year','년도','날짜']) || '';
    var code = sheetUtils.pickRow(map, row, ['code','코드']) || '';
    var location = sheetUtils.pickRow(map, row, ['location','장소']) || '';
    var link = sheetUtils.pickRow(map, row, ['link','url','drive','drivelink','링크','주소']) || '';
    var pass = sheetUtils.pickRow(map, row, ['pass','password','비밀번호']) || '';
    var show = truthy(sheetUtils.pickRow(map, row, ['show','노출']), true);
    var publish = truthy(sheetUtils.pickRow(map, row, ['publish','퍼블리시','게시']), true);
    if (!publish) continue;
    var item = {
      itemKey: makeKey(title, year, i),
      title: String(title),
      year: String(year || ''),
      code: String(code || ''),
      location: String(location || ''),
      link: String(link || ''),
      hasDrive: !!link,
      isDrive: /drive\.google\.com/.test(String(link)),
      requiresPassword: !!pass,
      pass: String(pass || '')
    };
    all.push(item);
    if (show) active.push(item);
  }
  return { all: all, active: active };
}

function parseNotesRaw(raw) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = sheetUtils.headerIndexMap(headers);
  var all = [];
  var active = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var title = sheetUtils.pickRow(map, row, ['title','제목']) || '';
    if (!title) continue;
    var year = sheetUtils.pickRow(map, row, ['year','날짜','date']) || '';
    var text = sheetUtils.pickRow(map, row, ['text','markdown','본문','마크다운문서','md']) || '';
    var docRefRaw = sheetUtils.pickRow(map, row, ['docid','doc_id','doc','document','gdoc','gdocs','문서','독스','docname']) || '';
    var docRef = sheetUtils.extractDocId(docRefRaw);
    var pass = sheetUtils.pickRow(map, row, ['pass','password','비밀번호']) || '';
    var show = truthy(sheetUtils.pickRow(map, row, ['show','노출']), true);
    var publish = truthy(sheetUtils.pickRow(map, row, ['publish','퍼블리시','게시']), true);
    if (!publish) continue;

    var mdPath = '';
    var mdInline = '';
    if (docRef) {
      mdPath = 'raw/md/' + sanitizeFileName(docRef) + '.md';
    } else if ((text && /\.md$/i.test(String(text))) || String(text).indexOf('raw/md/') === 0) {
      mdPath = String(text);
    } else if (String(text).indexOf('http') === 0) {
      mdPath = String(text);
    } else {
      mdInline = String(text || '');
      mdPath = 'raw/md/' + sanitizeFileName(title) + '.md';
    }

    var item = {
      itemKey: makeKey(title, year, i),
      title: String(title),
      year: String(year || ''),
      mdPath: mdPath,
      mdInline: mdInline,
      requiresPassword: !!pass,
      pass: String(pass || '')
    };
    all.push(item);
    if (show) active.push(item);
  }
  return { all: all, active: active };
}

function parseOrderRaw(raw) {
  var rows = raw.rows || [];
  var list = [];
  for (var i = 0; i < rows.length; i++) {
    var key = String((rows[i] && rows[i][0]) || '').trim().toLowerCase();
    if (key) list.push(key);
  }
  return list;
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach(function(entry) {
    var target = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removeDir(target);
    } else {
      fs.unlinkSync(target);
    }
  });
  fs.rmdirSync(dirPath);
}

function loadSheetCsv(filePath) {
  return sheetUtils.loadSheetCsv(filePath);
}

function convertSheetsDir(rawSheetsDir, outputDir) {
  var absRaw = path.resolve(rawSheetsDir);
  var absOut = path.resolve(outputDir);
  removeDir(path.join(absOut, 'raw'));
  var files = fs.readdirSync(absRaw).filter(function(name) { return /\.csv$/i.test(name); });

  var rawMap = {};

  files.forEach(function(name) {
    var sheetKey = sheetUtils.normalizeSheetKey(name);
    var raw = loadSheetCsv(path.join(absRaw, name));
    rawMap[sheetKey] = raw;
    writeJson(path.join(absOut, 'raw', sheetKey + '.json'), {
      sheet: sheetKey,
      headers: raw.headers || [],
      rows: raw.rows || []
    });
  });

  var expectedKeys = ['profile', 'courses', 'projects', 'exhibitions', 'notes', 'order'];
  expectedKeys.forEach(function(key) {
    if (!rawMap[key]) {
      rawMap[key] = { headers: [], rows: [] };
      writeJson(path.join(absOut, 'raw', key + '.json'), {
        sheet: key,
        headers: [],
        rows: []
      });
    }
  });

  var profile = parseProfileRaw(rawMap.profile || { headers: [], rows: [] });
  var courses = parseSectionRaw(rawMap.courses || { headers: [], rows: [] });
  var projects = parseSectionRaw(rawMap.projects || { headers: [], rows: [] });
  var exhibitions = parseSectionRaw(rawMap.exhibitions || { headers: [], rows: [] });
  var notes = parseNotesRaw(rawMap.notes || { headers: [], rows: [] });
  var order = parseOrderRaw(rawMap.order || { headers: [], rows: [] });
  if (!order.length) order = ['courses','exhibitions','projects','notes'];

  return {
    profile: profile,
    courses: courses,
    projects: projects,
    exhibitions: exhibitions,
    notes: notes,
    order: order
  };
}

function main() {
  var input = process.argv[2];
  var outDir = process.argv[3];
  if (!input || !outDir) {
    console.error('Usage: node scripts/convert-sheets.js <rawSheetsDir> <outputDir>');
    process.exit(1);
  }
  convertSheetsDir(input, outDir);
}

if (require.main === module) {
  try { main(); } catch (err) { console.error(err); process.exit(1); }
}

module.exports = { convertSheetsDir: convertSheetsDir };
