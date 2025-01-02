function parseInfo(content) {
  const content_lines = content.split('\n');
  let data = {};
  let curr = { lines: {} };
  for (const cl of content_lines) {
    const split = cl.split(":");
    if (split[0] == "end_of_record") {
      data[curr.file] = curr;
      curr = { lines: {} }
    }
    else if (split[0] == "DA") {
      const [line, value] = split[1].split(',');
      if (!(line in curr.lines)) {
        curr.lines[line] = { value: 0 };
      }
      curr.lines[line].value += parseInt(value);
    }
    else if (split[0] == "BRDA") {
      const [line, group, info, value] = split[1].split(',');
      if (!(line in curr.lines)) {
        curr.lines[line] = {};
      }
      if (!('groups' in curr.lines[line])) {
        curr.lines[line].groups = {};
      }
      if (!(group in curr.lines[line].groups)) {
        curr.lines[line].groups[group] = [];
      }
      curr.lines[line].groups[group].push({ info, value: parseInt(value) });
    }
    else if (split[0] == "SF") {
      curr.file = split[1];
    }
  }
  return data;
}

export { parseInfo };
