var fs = require('fs');
var path = require('path');
var mammoth = require('mammoth');
var sharp = require('sharp');
var rules = require('./docx-rules');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeFileName(text) {
  var raw = String(text || '').trim();
  if (!raw) return 'note';
  return raw
    .replace(/\s+/g, '-')
    .replace(/[\\\/:*?"<>|]/g, '')
    .trim() || 'note';
}

function writeImage(image, outDir, baseName, index) {
  var fileName = baseName + '-img-' + index + '.webp';
  var imgDir = path.join(outDir, 'notes', 'img');
  ensureDir(imgDir);
  return image.read('base64').then(function(base64) {
    var outPath = path.join(imgDir, fileName);
    var buffer = Buffer.from(base64, 'base64');
    return sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
      .then(function(outBuffer) {
        fs.writeFileSync(outPath, outBuffer);
        return { src: 'notes/img/' + fileName };
      });
  });
}

async function convertDoc(inputPath, outputDir) {
  var absInput = path.resolve(inputPath);
  var baseName = path.basename(absInput, path.extname(absInput));
  var safeBase = sanitizeFileName(baseName);
  var outDir = path.resolve(outputDir);
  var notesDir = path.join(outDir, 'notes');
  var outPath = path.join(notesDir, safeBase + '.md');
  var imageIndex = 0;
  var stat = fs.statSync(absInput);
  var date = '';
  if (stat && stat.mtime) {
    var d = new Date(stat.mtime);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    date = yyyy + '-' + mm + '-' + dd;
  }

  var result = await mammoth.convertToMarkdown(
    { path: absInput },
    {
      convertImage: mammoth.images.inline(function(image) {
        imageIndex += 1;
        return writeImage(image, outDir, safeBase, imageIndex);
      })
    }
  );
  var markdown = result && result.value ? result.value : '';
  var finalMd = rules.applyDocRules(markdown, {
    inputPath: absInput,
    outputPath: outPath,
    baseName: safeBase,
    title: baseName,
    date: date
  });

  ensureDir(notesDir);
  fs.writeFileSync(outPath, finalMd, 'utf8');
  return outPath;
}

async function main() {
  var input = process.argv[2];
  var outDir = process.argv[3];
  if (!input || !outDir) {
    console.error('Usage: node scripts/convert-docs.js <input.docx> <outputDir>');
    process.exit(1);
  }
  await convertDoc(input, outDir);
}

if (require.main === module) {
  main().catch(function(err) {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { convertDoc: convertDoc };
