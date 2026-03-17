var fs = require('fs');
var path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function parseProfileRaw(raw) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = headerIndexMap(headers);
  if (rows.length) {
    var row = rows[0];
    return {
      name: pickRow(map, row, ['name','이름']) || '',
      email: pickRow(map, row, ['email','메일']) || '',
      instagram: pickRow(map, row, ['instagram','insta','ig','인스타','인스타그램','아이디','instagramid']) || '',
      website: pickRow(map, row, ['website','웹사이트','site']) || ''
    };
  }
  return { name: '', email: '', instagram: '', website: '' };
}

function parseSectionRaw(raw, sectionKey) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = headerIndexMap(headers);
  var all = [];
  var active = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var title = pickRow(map, row, ['title','제목']) || '';
    if (!title) continue;
    var year = pickRow(map, row, ['year','년도','날짜']) || '';
    var code = pickRow(map, row, ['code','코드']) || '';
    var location = pickRow(map, row, ['location','장소']) || '';
    var link = pickRow(map, row, ['link','url','drive','drivelink','링크','주소']) || '';
    var pass = pickRow(map, row, ['pass','password','비밀번호']) || '';
    var show = truthy(pickRow(map, row, ['show','노출']), true);
    var publish = truthy(pickRow(map, row, ['publish','퍼블리시','게시']), true);
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

function parseNotesRaw(raw, opts) {
  var options = opts || {};
  var docIdToTitle = options.docIdToTitle || {};
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = headerIndexMap(headers);
  var all = [];
  var active = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var title = pickRow(map, row, ['title','제목']) || '';
    if (!title) continue;
    var year = pickRow(map, row, ['year','날짜','date']) || '';
    var text = pickRow(map, row, ['text','markdown','본문','마크다운문서','md']) || '';
    var docRefRaw = pickRow(map, row, ['docid','doc_id','doc','document','gdoc','gdocs','문서','독스','docname']) || '';
    var docRef = extractDocId(docRefRaw);
    var pass = pickRow(map, row, ['pass','password','비밀번호']) || '';
    var show = truthy(pickRow(map, row, ['show','노출']), true);
    var publish = truthy(pickRow(map, row, ['publish','퍼블리시','게시']), true);
    if (!publish) continue;

    var mdPath = '';
    var mdInline = '';
    if (docRef) {
      mdPath = 'raw/md/' + sanitizeFileName(docRef) + '.md';
    } else if ((text && /\.md$/i.test(String(text))) || String(text).indexOf('notes/') === 0) {
      mdPath = String(text);
    } else if (String(text).indexOf('http') === 0) {
      mdPath = String(text);
    } else if (String(text).indexOf('docs.google.com') !== -1) {
      mdPath = 'notes/' + sanitizeFileName(title) + '.md';
    } else {
      mdInline = String(text || '');
      mdPath = 'notes/' + sanitizeFileName(title) + '.md';
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

function buildNoteDocTitleMap(raw) {
  var headers = raw.headers || [];
  var rows = raw.rows || [];
  var map = headerIndexMap(headers);
  var out = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var title = pickRow(map, row, ['title','제목']) || '';
    var docRefRaw = pickRow(map, row, ['docid','doc_id','doc','document','gdoc','gdocs','문서','독스','docname']) || '';
    var docRef = extractDocId(docRefRaw);
    if (docRef && title) {
      out[String(docRef).trim()] = String(title).trim();
    }
  }
  return out;
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
  var content = readFileUtf8(filePath);
  var rows = parseCsv(content);
  var headers = rows.length ? rows[0] : [];
  return { headers: headers, rows: rows.slice(1) };
}

function convertSheetsDir(rawSheetsDir, outputDir) {
  var absRaw = path.resolve(rawSheetsDir);
  var absOut = path.resolve(outputDir);
  removeDir(path.join(absOut, 'raw'));
  removeDir(path.join(absOut, 'sections'));
  if (fs.existsSync(path.join(absOut, 'dashboard.json'))) {
    fs.unlinkSync(path.join(absOut, 'dashboard.json'));
  }
  var files = fs.readdirSync(absRaw).filter(function(name) { return /\.csv$/i.test(name); });

  function normalizeSheetKey(name) {
    var base = path.basename(name, path.extname(name)).toLowerCase();
    if (base.indexOf('profile') !== -1 || base.indexOf('프로필') !== -1) return 'profile';
    if (base.indexOf('course') !== -1 || base.indexOf('courses') !== -1 || base.indexOf('강의') !== -1) return 'courses';
    if (base.indexOf('project') !== -1 || base.indexOf('projects') !== -1 || base.indexOf('프로젝트') !== -1) return 'projects';
    if (base.indexOf('exhibition') !== -1 || base.indexOf('exhibitions') !== -1 || base.indexOf('전시') !== -1) return 'exhibitions';
    if (base.indexOf('note') !== -1 || base.indexOf('notes') !== -1 || base.indexOf('노트') !== -1) return 'notes';
    if (base.indexOf('order') !== -1 || base.indexOf('순서') !== -1) return 'order';
    return base;
  }

  var rawMap = {};

  files.forEach(function(name) {
    var sheetKey = normalizeSheetKey(name);
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
  var courses = parseSectionRaw(rawMap.courses || { headers: [], rows: [] }, 'courses');
  var projects = parseSectionRaw(rawMap.projects || { headers: [], rows: [] }, 'projects');
  var exhibitions = parseSectionRaw(rawMap.exhibitions || { headers: [], rows: [] }, 'exhibitions');
  var noteTitleMap = buildNoteDocTitleMap(rawMap.notes || { headers: [], rows: [] });
  var notes = parseNotesRaw(rawMap.notes || { headers: [], rows: [] }, { docIdToTitle: noteTitleMap });
  var order = parseOrderRaw(rawMap.order || { headers: [], rows: [] });
  if (!order.length) order = ['courses','exhibitions','projects','notes'];

  writeJson(path.join(absOut, 'sections', 'courses.json'), { ok: true, items: courses.all });
  writeJson(path.join(absOut, 'sections', 'projects.json'), { ok: true, items: projects.all });
  writeJson(path.join(absOut, 'sections', 'exhibitions.json'), { ok: true, items: exhibitions.all });
  writeJson(path.join(absOut, 'sections', 'notes.json'), { ok: true, items: notes.all });

  writeJson(path.join(absOut, 'dashboard.json'), {
    ok: true,
    profile: profile,
    sectionOrder: order.length ? order : ['courses','exhibitions','projects','notes'],
    courses: courses.active,
    exhibitions: exhibitions.active,
    projects: projects.active,
    notes: notes.active
  });

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
