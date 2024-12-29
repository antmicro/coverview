function parseInfo(content) {
  const content_lines = content.split('\n');
  let data = {};
  let curr = { lines: {} };
  for (const cl of content_lines) {
    const split = cl.split(":");
    if (split[0] == "end_of_record") {
      if (curr.file && curr.file in data) {
        for (const l of Object.keys(curr.lines)) {
          data[curr.file].lines[l] = (data[curr.file].lines[l] || 0) + curr.lines[l];
        }
      }
      else {
        data[curr.file] = curr;
        curr = { lines: {} }
      }
    }
    else if (split[0] == "DA") {
      const [line, hits] = split[1].split(',');
      curr.lines[line] = parseInt(hits);
    }
    else if (split[0] == "SF") {
      curr.file = split[1];
    }
  }
  return data;
}

export { parseInfo };
