const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const jsPath = path.join(__dirname, '..', 'public', 'script.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

// Extract all data-scripture values from index.html
const matches = html.match(/data-scripture="([^"]+)"/g) || [];
const tags = matches.map(m => m.replace('data-scripture="', '').replace('"', ''));

console.log(`Found ${tags.length} scripture proof tags in index.html:\n`);

// Extract SCRIPTURE_TEXTS dictionary from script.js
const dictMatch = js.match(/const SCRIPTURE_TEXTS = (\{[\s\S]*?\});/);
if (!dictMatch) {
  console.error('❌ Could not parse SCRIPTURE_TEXTS from script.js');
  process.exit(1);
}

let SCRIPTURE_TEXTS = {};
eval('SCRIPTURE_TEXTS = ' + dictMatch[1]);

function getScriptureVerse(ref) {
  const raw = (ref || '').trim();
  if (SCRIPTURE_TEXTS[raw]) return SCRIPTURE_TEXTS[raw];
  const norm = raw.replace(/[\u2013\u2014-]/g, '-').toLowerCase();
  for (const [k, v] of Object.entries(SCRIPTURE_TEXTS)) {
    if (k.replace(/[\u2013\u2014-]/g, '-').toLowerCase() === norm) {
      return v;
    }
  }
  return null;
}

let passed = 0;
tags.forEach(tag => {
  const verse = getScriptureVerse(tag);
  if (verse) {
    console.log(`✅ [PASS] "${tag}" -> "${verse.substring(0, 60)}..."`);
    passed++;
  } else {
    console.log(`❌ [FAIL] "${tag}" -> NOT FOUND IN DICTIONARY`);
  }
});

console.log(`\n==================================================`);
console.log(`📊 Scripture Resolution Test: ${passed} / ${tags.length} PASSED`);
console.log(`==================================================`);

if (passed === tags.length) {
  process.exit(0);
} else {
  process.exit(1);
}
