import { parseInfo, serializeInfo } from './parse.js'; // = require('./parse.js');
import { glob } from 'glob'; //const glob = require('glob');

import fs from 'fs'; //const fs = require('node:fs');

try {
  const files = glob.sync('test_data/*.info');
  let firstFile = true;

  let data = {};
  for (const f of files) {
    if (firstFile) {
      data = parseInfo(f, fs.readFileSync(f, 'utf8'));
      firstFile = false;
    }
    else {
      data = parseInfo(f, fs.readFileSync(f, 'utf8'), data, true);
    }
  }
  fs.writeFileSync('merged.info', serializeInfo(data));
} catch (err) {
  console.error(err);
}
