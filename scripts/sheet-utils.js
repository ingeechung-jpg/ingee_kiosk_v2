var fs = require('fs');
var path = require('path');

function listFiles(dirPath, ext) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter(function(name) {
    return ext ? name.toLowerCase().endsWith(ext) : true;
  }).map(function(name) {
    return path.join(dirPath, name);
  });
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

function loadSheetCsv(filePath) {
  var content = readFileUtf8(filePath);
  var rows = parseCsv(content);
  var headers = rows.length ? rows[0] : [];
  return { headers: headers, rows: rows.slice(1) };
}

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

function loadNotesTitleMap(rawSheetsDir) {
  var files = listFiles(rawSheetsDir, '.csv');
  var noteFile = null;
  for (var i = 0; i < files.length; i++) {
    var name = path.basename(files[i]).toLowerCase();
    if (name.indexOf('note') !== -1 || name.indexOf('notes') !== -1 || name.indexOf('노트') !== -1) {
      noteFile = files[i];
      break;
    }
  }
  if (!noteFile) return {};
  var rows = parseCsv(readFileUtf8(noteFile));
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

module.exports = {
  extractDocId: extractDocId,
  headerIndexMap: headerIndexMap,
  listFiles: listFiles,
  loadNotesTitleMap: loadNotesTitleMap,
  loadSheetCsv: loadSheetCsv,
  normalizeSheetKey: normalizeSheetKey,
  parseCsv: parseCsv,
  pickRow: pickRow,
  readFileUtf8: readFileUtf8
};
