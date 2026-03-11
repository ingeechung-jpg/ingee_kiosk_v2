/**
 * Publish Google Sheets/Docs to GitHub (static data)
 * 시트/독스 데이터를 GitHub로 배포하는 Publish 스크립트
 */

const CONFIG = {
  SPREADSHEET_ID: '1US6hBNFQIpyEeFpQihP4j37z2_Z5f8mSsGfYOj9aWP4',
  GITHUB_OWNER: 'ingeechung-jpg',
  GITHUB_REPO: 'ingee_kiosk',
  GITHUB_BRANCH: 'main',
  GITHUB_TOKEN: '',
  BASE_PATH: 'public/data' // repo path
};

const SECRET_SHEET_ID = '1MG9o_zfaZwjf8Ln7T125xdjt4Ku-D5moIvXFO90qLBs';
const SECRET_SHEET_NAME = 'Secrets';
const SECRET_TOKEN_KEY = 'github_token';

const SHEETS = {
  profile: 'Profile',
  courses: 'Courses',
  projects: 'Projects',
  exhibitions: 'Exhibitions',
  notes: 'Note',
  order: 'Order'
};

function publishAll() {
  ensureToken_();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const profile = readProfile_(ss);
  const courses = readSection_(ss, SHEETS.courses);
  const projects = readSection_(ss, SHEETS.projects);
  const exhibitions = readSection_(ss, SHEETS.exhibitions);
  const notes = readNotes_(ss, SHEETS.notes);

  const sectionOrder = readSectionOrder_(ss) || ['courses','exhibitions','projects','notes'];

  const dashboard = {
    ok: true,
    profile: profile,
    sectionOrder: sectionOrder,
    courses: courses.active,
    exhibitions: exhibitions.active,
    projects: projects.active,
    notes: notes.active
  };

  putJson_('dashboard.json', dashboard);
  putJson_('sections/courses.json', { ok: true, items: courses.all });
  putJson_('sections/exhibitions.json', { ok: true, items: exhibitions.all });
  putJson_('sections/projects.json', { ok: true, items: projects.all });
  putJson_('sections/notes.json', { ok: true, items: notes.all });

  // note markdown files
  notes.files.forEach(function(f) {
    putText_('notes/' + f.fileName, f.content);
  });
}

function ensureToken_() {
  if (CONFIG.GITHUB_TOKEN) return;
  const token = getTokenFromSecretSheet_();
  if (!token) throw new Error('GitHub token is empty. Check Secrets sheet.');
  CONFIG.GITHUB_TOKEN = token;
}

function getTokenFromSecretSheet_() {
  const ss = SpreadsheetApp.openById(SECRET_SHEET_ID);
  const sheet = ss.getSheetByName(SECRET_SHEET_NAME);
  if (!sheet) return '';
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return '';
  const values = sheet.getRange(1, 1, lastRow, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key === SECRET_TOKEN_KEY) {
      return String(values[i][1] || '').trim();
    }
  }
  return '';
}

function readProfile_(ss) {
  const sheet = ss.getSheetByName(SHEETS.profile);
  if (!sheet) return { name: '', email: '', instagram: '', website: '' };
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { name: '', email: '', instagram: '', website: '' };

  // Try header-based
  const headers = normalizeHeaders_(values[0]);
  if (headers.length > 1) {
    const row = values[1] || [];
    return {
      name: pickByHeader_(headers, row, ['name','이름']) || '',
      email: pickByHeader_(headers, row, ['email','메일']) || '',
      instagram: pickByHeader_(headers, row, ['instagram','insta','ig','인스타','인스타그램','아이디']) || '',
      website: pickByHeader_(headers, row, ['website','웹사이트','site']) || ''
    };
  }

  // Fallback: label/value rows
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const label = String(values[i][0] || '').trim().toLowerCase();
    const val = String(values[i][1] || '').trim();
    if (!label) continue;
    map[label] = val;
  }
  return {
    name: map['name'] || map['이름'] || '',
    email: map['email'] || map['메일'] || '',
    instagram: map['instagram'] || map['insta'] || map['ig'] || map['인스타'] || map['인스타그램'] || map['아이디'] || '',
    website: map['website'] || map['웹사이트'] || map['site'] || ''
  };
}

function readSection_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { active: [], all: [] };
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { active: [], all: [] };

  const headers = normalizeHeaders_(values[0]);
  const rows = values.slice(1);
  const all = [];
  const active = [];
  const showIdx = findHeaderIndex_(headers, ['show','노출']);
  const publishIdx = findHeaderIndex_(headers, ['publish','퍼블리시','게시']);

  rows.forEach(function(row, idx) {
    const rawTitle = pickByHeader_(headers, row, ['title','제목']) || '';
    const title = stripMdExt_(rawTitle);
    const year = pickByHeader_(headers, row, ['year','년도','날짜']) || '';
    const code = pickByHeader_(headers, row, ['code','코드']) || '';
    const location = pickByHeader_(headers, row, ['location','장소']) || '';
    const link = pickByHeader_(headers, row, ['link','url','drive','링크','주소']) || '';
    const pass = pickByHeader_(headers, row, ['pass','password','비밀번호']) || '';
    const show = (showIdx === -1) ? true : isTrue_(row[showIdx]);
    const publish = (publishIdx === -1) ? true : isTrue_(row[publishIdx]);
    if (!publish) return;

    const itemKey = makeKey_(title, year, idx);
    const isDrive = /drive\.google\.com/.test(String(link));
    const item = {
      itemKey: itemKey,
      title: title,
      year: String(year || ''),
      code: String(code || ''),
      location: String(location || ''),
      link: String(link || ''),
      hasDrive: !!link,
      isDrive: !!isDrive,
      requiresPassword: !!pass,
      pass: String(pass || '')
    };
    all.push(item);
    if (show) active.push(item);
  });

  return { active: active, all: all };
}

function readNotes_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { active: [], all: [], files: [] };
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { active: [], all: [], files: [] };

  const headers = normalizeHeaders_(values[0]);
  const rows = values.slice(1);
  const all = [];
  const active = [];
  const files = [];
  const showIdx = findHeaderIndex_(headers, ['show','노출']);
  const publishIdx = findHeaderIndex_(headers, ['publish','퍼블리시','게시']);

  rows.forEach(function(row, idx) {
    const rawTitle = pickByHeader_(headers, row, ['title','제목']) || '';
    const title = stripMdExt_(rawTitle);
    const year = pickByHeader_(headers, row, ['year','날짜','date']) || '';
    const textRef = pickByHeader_(headers, row, ['text','markdown','본문','마크다운문서','md']) || '';
    const pass = pickByHeader_(headers, row, ['pass','password','비밀번호']) || '';
    const show = (showIdx === -1) ? true : isTrue_(row[showIdx]);
    const publish = (publishIdx === -1) ? true : isTrue_(row[publishIdx]);
    if (!publish) return;

    const itemKey = makeKey_(title, year, idx);
    const mdSource = String(textRef || '').trim();
    const mdPathFromSheet = looksLikePath_(mdSource) ? mdSource : '';
    const mdText = mdPathFromSheet ? '' : resolveMarkdown_(mdSource);
    const fileName = itemKey + '.md';
    let mdPath = mdPathFromSheet || buildNotePathFromTitle_(title);
    if (mdPathFromSheet && /^notes\/\d{4}-\d{2}-\d{2}-/.test(mdPathFromSheet)) {
      mdPath = buildNotePathFromTitle_(title);
    }

    if (mdText) files.push({ fileName: fileName, content: mdText || '' });
    const item = {
      itemKey: itemKey,
      title: title,
      year: normalizeDate_(year),
      mdPath: mdPath,
      requiresPassword: !!pass,
      pass: String(pass || '')
    };
    all.push(item);
    if (show) active.push(item);
  });

  return { active: active, all: all, files: files };
}

function resolveMarkdown_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.indexOf('http') === 0) {
    const fileId = extractDriveId_(raw);
    if (fileId) {
      return DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
    }
  }
  return raw;
}

function looksLikePath_(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  if (v.indexOf('http') === 0) return false;
  return /\\.md$/i.test(v) || v.indexOf('notes/') === 0 || v.indexOf('public/data/notes/') === 0;
}

function buildNotePathFromTitle_(title) {
  const base = sanitizeFileName_(title || 'note');
  return 'notes/' + base + '.md';
}

function sanitizeFileName_(text) {
  const raw = String(text || '').trim();
  if (!raw) return 'note';
  return raw.replace(/\\s+/g, '-').replace(/[\\\\\\/:*?"<>|]/g, '').trim() || 'note';
}

function extractDriveId_(url) {
  const m = String(url || '').match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

function normalizeHeaders_(row) {
  return row.map(function(h) {
    return String(h || '').trim().toLowerCase();
  });
}

function findHeaderIndex_(headers, candidates) {
  for (let i = 0; i < headers.length; i++) {
    if (candidates.indexOf(headers[i]) !== -1) return i;
  }
  return -1;
}

function pickByHeader_(headers, row, candidates) {
  for (let i = 0; i < headers.length; i++) {
    if (candidates.indexOf(headers[i]) !== -1) return row[i];
  }
  return '';
}

function isTrue_(val) {
  if (val === true) return true;
  const s = String(val || '').toLowerCase().trim();
  return s === 'true' || s === 't' || s === '1' || s === 'y' || s === 'yes' || s === 'o';
}

function makeKey_(title, year, idx) {
  const base = (title || 'item') + '-' + (year || '') + '-' + (idx + 1);
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function stripMdExt_(title) {
  return String(title || '').replace(/\.md$/i, '');
}

function normalizeDate_(val) {
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy.MM.dd');
  }
  return String(val || '').replace(/\s+/g, ' ').trim();
}

function readSectionOrder_(ss) {
  const sheet = ss.getSheetByName(SHEETS.order);
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim().toLowerCase();
    if (key) list.push(key);
  }
  return list.length ? list : null;
}

function putJson_(path, obj) {
  putText_(path, JSON.stringify(obj, null, 2));
}

function putText_(path, content) {
  const fullPath = CONFIG.BASE_PATH.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  const url = 'https://api.github.com/repos/' + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO + '/contents/' + fullPath;
  const token = CONFIG.GITHUB_TOKEN;
  const payload = {
    message: 'publish: ' + fullPath,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: CONFIG.GITHUB_BRANCH
  };

  const existing = UrlFetchApp.fetch(url + '?ref=' + CONFIG.GITHUB_BRANCH, {
    method: 'get',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (existing.getResponseCode() === 200) {
    const data = JSON.parse(existing.getContentText());
    payload.sha = data.sha;
  }

  UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(payload)
  });
}
