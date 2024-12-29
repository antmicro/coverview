const parse = require('./parse.js');
const fs = require('node:fs');

try {
  const contents = fs.readFileSync('../test_data/line_all.info', 'utf8');
  const data = parse.parseInfo(contents);
  console.log(JSON.stringify(data));
} catch (err) {
  console.error(err);
}
