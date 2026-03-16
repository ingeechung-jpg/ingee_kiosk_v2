/**
 * Publish raw Google Docs/Sheets to GitHub (no conversions).
 */

const CONFIG = {
  SPREADSHEET_ID: '1US6hBNFQIpyEeFpQihP4j37z2_Z5f8mSsGfYOj9aWP4',
  DOCS_FOLDER_ID: '1n-ogSyMLD4tScx8cNul0DFCLV4mbHp42',
  GITHUB_OWNER: 'ingeechung-jpg',
  GITHUB_REPO: 'ingee_kiosk',
  GITHUB_BRANCH: 'main',
  GITHUB_TOKEN: '',
  BASE_PATH: '' // repo root
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
  publishSheets_();
  publishDocs_();
}

function publishSheets_() {
  if (!CONFIG.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is empty.');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const keys = Object.keys(SHEETS);
  keys.forEach(key => {
    const sheetName = SHEETS[key];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const csv = sheetToCsv_(sheet);
    const hash = hashString_(csv);
    const cacheKey = 'sheet:' + sheetName;
    if (isUnchanged_(cacheKey, hash)) return;
    const fileName = sanitizeFileName_(sheetName) + '.csv';
    putText_('raw/sheets/' + fileName, csv);
    setHash_(cacheKey, hash);
  });
}

function publishDocs_() {
  if (!CONFIG.DOCS_FOLDER_ID) return;
  const folder = DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (files.hasNext()) {
    const file = files.next();
    const blob = file.getAs(MimeType.MICROSOFT_WORD);
    const hash = hashBlob_(blob);
    const cacheKey = 'doc:' + file.getId();
    if (isUnchanged_(cacheKey, hash)) continue;
    const name = sanitizeFileName_(file.getName()) + '.docx';
    putBlob_('raw/docs/' + name, blob);
    setHash_(cacheKey, hash);
  }
}

function sheetToCsv_(sheet) {
  const values = sheet.getDataRange().getValues();
  return values.map(row => row.map(csvEscape_).join(',')).join('\n');
}

function csvEscape_(value) {
  const text = String(value == null ? '' : value);
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function sanitizeFileName_(name) {
  return String(name || '')
    .replace(/[\\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .trim() || 'file';
}

function ensureToken_() {
  if (CONFIG.GITHUB_TOKEN) return;
  const token = getTokenFromSecretSheet_();
  if (!token) throw new Error('GitHub token is empty. Check Secrets sheet.');
  CONFIG.GITHUB_TOKEN = token;
}

function getTokenFromSecretSheet_() {
  if (!SECRET_SHEET_ID) return '';
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

function hashString_(text) {
  const bytes = Utilities.newBlob(text).getBytes();
  return digestHex_(bytes);
}

function hashBlob_(blob) {
  return digestHex_(blob.getBytes());
}

function digestHex_(bytes) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function isUnchanged_(key, hash) {
  const props = PropertiesService.getScriptProperties();
  const prev = props.getProperty('hash:' + key);
  return prev && prev === hash;
}

function setHash_(key, hash) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('hash:' + key, hash);
}

function putText_(path, content) {
  putContent_(path, Utilities.base64Encode(content, Utilities.Charset.UTF_8));
}

function putBlob_(path, blob) {
  const bytes = blob.getBytes();
  putContent_(path, Utilities.base64Encode(bytes));
}

function putContent_(path, base64Content) {
  const fullPath = CONFIG.BASE_PATH ? CONFIG.BASE_PATH.replace(/\/$/, '') + '/' + path.replace(/^\//, '') : path;
  const url = 'https://api.github.com/repos/' + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO + '/contents/' + fullPath;
  const token = CONFIG.GITHUB_TOKEN;
  const payload = {
    message: 'publish: ' + fullPath,
    content: base64Content,
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
