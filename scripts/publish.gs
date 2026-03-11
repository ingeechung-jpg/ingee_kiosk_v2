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
  // Raw exports (header + rows)
  writeRawSheet_(ss, SHEETS.profile, 'raw/profile.json');
  writeRawSheet_(ss, SHEETS.courses, 'raw/courses.json');
  writeRawSheet_(ss, SHEETS.projects, 'raw/projects.json');
  writeRawSheet_(ss, SHEETS.exhibitions, 'raw/exhibitions.json');
  writeRawSheet_(ss, SHEETS.notes, 'raw/notes.json');
  writeRawSheet_(ss, SHEETS.order, 'raw/order.json');
}

function writeRawSheet_(ss, sheetName, filePath) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    putJson_(filePath, { sheet: sheetName, headers: [], rows: [] });
    return;
  }
  const values = sheet.getDataRange().getValues();
  if (!values || !values.length) {
    putJson_(filePath, { sheet: sheetName, headers: [], rows: [] });
    return;
  }
  const headers = values[0] || [];
  const rows = values.slice(1);
  putJson_(filePath, { sheet: sheetName, headers: headers, rows: rows });
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
