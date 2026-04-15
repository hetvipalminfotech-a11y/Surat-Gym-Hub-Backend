const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function removeComments(content) {
  // 1. Remove multiline comments /* ... */
  let output = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Remove single line comments // ...
  const lines = output.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return '';
    
    // Simple inline comment removal
    const commentIndex = line.indexOf('//');
    if (commentIndex > -1) {
      const before = line.substring(0, commentIndex);
      if (!before.trim().endsWith(':')) {
         const quoteCount = (before.match(/'|"/g) || []).length;
         if (quoteCount % 2 === 0) {
           return before.trimEnd();
         }
      }
    }
    return line;
  });

  output = processedLines.join('\n');
  // Clean up whitespace: 3+ newlines -> 2 newlines
  output = output.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return output.trimEnd() + '\n';
}

walk(srcDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.sql')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeComments(content);
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log('Cleaned: ' + path.relative(srcDir, filePath));
    }
  }
});
