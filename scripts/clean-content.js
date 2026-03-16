var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CONTENT_DIR = path.join(ROOT, 'build', 'content');

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

removeDir(CONTENT_DIR);
