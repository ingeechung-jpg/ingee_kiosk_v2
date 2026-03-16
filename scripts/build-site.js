var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SITE_SRC = path.join(ROOT, 'site', 'web');
var BUILD_SITE = path.join(ROOT, 'build', 'site');
var BUILD_DATA = path.join(ROOT, 'build', 'data');
var BUILD_CONTENT = path.join(ROOT, 'build', 'content');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  var entries = fs.readdirSync(src, { withFileTypes: true });
  entries.forEach(function(entry) {
    var from = path.join(src, entry.name);
    var to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      copyFile(from, to);
    }
  });
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

function buildSite() {
  if (!fs.existsSync(SITE_SRC)) throw new Error('Missing site/web');
  removeDir(BUILD_SITE);
  copyDir(SITE_SRC, BUILD_SITE);
  copyDir(BUILD_DATA, path.join(BUILD_SITE, 'data'));

  if (fs.existsSync(BUILD_CONTENT)) {
    copyDir(BUILD_CONTENT, path.join(BUILD_SITE, 'data'));
  }
}

buildSite();
