function buildFrontMatter(context) {
  var title = (context && context.title) ? String(context.title) : 'Untitled';
  var date = (context && context.date) ? String(context.date) : '';
  return [
    '---',
    'title: ' + title,
    'date: ' + date,
    'show: true',
    'publish: true',
    'pass: ""',
    '---'
  ].join('\n');
}

function normalizeMarkdownForSheet(markdown) {
  var text = String(markdown || '').trim();
  text = text.replace(/https:\/\/drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9_-]+)[^\s)]*/g,
    'https://lh3.googleusercontent.com/d/$1');
  text = text.replace(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view[^\s)]*/g,
    'https://lh3.googleusercontent.com/d/$1');
  text = text.replace(/https:\/\/drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)[^\s)]*/g,
    'https://lh3.googleusercontent.com/d/$1');
  return text;
}

function renumberOrderedLists(markdown) {
  var lines = String(markdown || '').split('\n');
  var inList = false;
  var counter = 1;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (match) {
      if (!inList) { counter = 1; inList = true; }
      lines[i] = match[1] + counter + '. ' + match[2];
      counter += 1;
      continue;
    }
    if (line.trim() === '') {
      inList = false;
      counter = 1;
      continue;
    }
    inList = false;
    counter = 1;
  }
  return lines.join('\n');
}

function applyDocRules(markdown, context) {
  var body = String(markdown || '');
  body = normalizeMarkdownForSheet(body);
  body = body.replace(/\r\n?/g, '\n');
  body = body.replace(/[ \t]+$/gm, '');
  body = body.replace(/\\([^\w\s])/g, '$1');
  body = body.replace(/\\\s/g, ' ');
  body = body.replace(/\\([_*~`])/g, '$1');
  body = renumberOrderedLists(body);
  var frontMatter = buildFrontMatter(context);
  var text = (frontMatter + '\n\n' + body).trim();
  if (text && !text.endsWith('\n')) text += '\n';
  return text;
}

module.exports = { applyDocRules: applyDocRules };
