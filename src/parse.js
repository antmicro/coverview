function parseInfo(filename, content, data = {}, enhance = false) {
  console.log("Loading " + filename);
  const content_lines = content.split('\n');
  let curr = null;
  for (const cl of content_lines) {
    const split = cl.split(":");
    if (split[0] == "SF") {
      const file = split[1];
      curr = (enhance && (file in data)) ? data[file] : { lines: {}, file: file };
    }
    else if (split[0] == "end_of_record") {
      data[curr.file] = curr;
    }
    else if (split[0] == "DA") {
      const [line, value] = split[1].split(',');
      if (!(line in curr.lines)) {
        curr.lines[line] = { value: 0, source: new Set() };
      }
      else if (!(curr.lines[line].value)) {
        curr.lines[line].value = 0;
      }
      curr.lines[line].value += parseInt(value);
      curr.lines[line].source.add(filename);
    }
    else if (split[0] == "BRDA") {
      const [line, group, info, value] = split[1].split(',');
      if (!(line in curr.lines)) {
        curr.lines[line] = { source: new Set() };
      }
      if (!('groups' in curr.lines[line])) {
        curr.lines[line].groups = {};
      }
      if (!(group in curr.lines[line].groups)) {
        curr.lines[line].groups[group] = {};
      }
      const val = parseInt(value);
      if (enhance) {
        if (info in curr.lines[line].groups[group]) {
          curr.lines[line].groups[group][info][source].add(filename);
          if (val > 0) curr.lines[line].groups[group][info].value = val;
          continue;
        }
      }
      curr.lines[line].groups[group][info] = { value: val, source: new Set()};
      curr.lines[line].groups[group][info].source.add(filename);
    }
  }
  return data;
}

export { parseInfo };
