function parseInfo(content, data = {}, enhance = false) {

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
        curr.lines[line] = { value: 0 };
      }
      if (!(curr.lines[line].value)) {
        curr.lines[line].value = 0;
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
      if (enhance) {
        const index = curr.lines[line].groups[group].map(x => x.info).indexOf(info);
        if (index !== -1) {
          if (parseInt(value) > 0) curr.lines[line].groups[group][index].value = parseInt(value);
          continue;
        }
      }
      curr.lines[line].groups[group].push({ info, value: parseInt(value) });
    }
  }

  return data;
}

export { parseInfo };
