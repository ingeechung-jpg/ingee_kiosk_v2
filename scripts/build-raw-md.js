var fs = require('fs');
var path = require('path');
var convertDocs = require('./convert-docs');
var sheetUtils = require('./sheet-utils');

var ROOT = path.resolve(__dirname, '..');
var RAW_DOCS = path.join(ROOT, 'raw', 'docs');
var RAW_SHEETS = path.join(ROOT, 'raw', 'sheets');

function loadNotesTitleMap() {
  return sheetUtils.loadNotesTitleMap(RAW_SHEETS);
}

async function run() {
  var docs = sheetUtils.listFiles(RAW_DOCS, '.docx');
  var titleMap = loadNotesTitleMap();
  for (var i = 0; i < docs.length; i++) {
    await convertDocs.convertDoc(docs[i], path.join(ROOT, 'raw'), {
      titleMap: titleMap,
      outputSubdir: 'md',
      writeImages: false
    });
  }
}

run().catch(function(err) {
  console.error(err);
  process.exit(1);
});
