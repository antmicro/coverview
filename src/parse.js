// returns list of tests
function parseDesc(content, modules, type) {
  console.log("Loading test description files");
  const allTests = new Set();
  const content_lines = content.split('\n');
  let file = null;
  for (const cl of content_lines) {
    const split = cl.split(":");
    if (split[0] == "SN") {
      file = split[1];
    }
    else if (split[0] == "end_of_record") {
      file = null;
    }
    else if (split[0] == "TEST") {
      if (!file) {
        console.log("TEST line outside of a file, ignoring.");
        continue;
      }
      const rest = split[1].split(',');
      const line = rest[0];
      const tests =  rest[1].split(";");
      const spl = file.split('/');
      const filename = spl.pop();
      const module = spl.join('/');
      const lineInModule = modules[module]?.files[filename]?.coverage[type]?.lines[line];
      if (!lineInModule) {
        alert(`No such line ${line} in ${module}:${filename} cov type ${type}, maybe you are loading the wrong file for the wrong coverage type/tool?`);
        return;
      }
      lineInModule.source = new Set();
      for (const t of tests) {
        allTests.add(t);
        lineInModule.source.add(t);
      }
    }
  }
  return allTests;
}

function parseInfo(filename, content, data = {}, enhance = false) {
  console.log("Loading " + filename);
  const content_lines = content.split('\n');
  let curr = null;
  for (const cl of content_lines) {
    if (cl == "end_of_record") {
      data[curr.file] = curr;
      curr = null;
      continue;
    }
    else if (cl == "") {
      continue;
    }
    // We want `entry` to contain substring from the first colon to the end of the line.
    // Using `cl.split[1]` wouldn't work correctly if there are more colon characters,
    // e.g., in BRDA's descriptive `branch` field (`info` below).
    const separatorIndex = cl.indexOf(":");
    if (separatorIndex == -1) {
      alert(`The ${filename} file seems malformed, encountered line without any colon other than "end_of_record": ${cl}`);
      return data;
    }
    const prefix = cl.slice(0, separatorIndex);
    const entry = cl.slice(separatorIndex + 1);
    if (prefix == "SF") {
      const file = entry;
      curr = (enhance && (file in data)) ? data[file] : { lines: {}, file: file };
    }
    else if (prefix == "DA") {
      const [line, value] = entry.split(',');
      const val = parseInt(value);
      if (!(line in curr.lines)) {
        curr.lines[line] = { value: 0, source: new Set(), zeroSource: new Set() };
      }
      else if (!(curr.lines[line].value)) {
        curr.lines[line].value = 0;
      }
      curr.lines[line].value += val;
      val > 0 ? curr.lines[line].source.add(filename) : curr.lines[line].zeroSource.add(filename);
    }
    else if (prefix == "BRDA") {
      const [line, group, info, value] = entry.split(',');
      if (!(line in curr.lines)) {
        curr.lines[line] = { source: new Set(), zeroSource: new Set() };
      }
      if (!('groups' in curr.lines[line])) {
        curr.lines[line].groups = {};
      }
      if (!(group in curr.lines[line].groups)) {
        curr.lines[line].groups[group] = {};
      }
      const val = parseInt(value);
      if (!(info in curr.lines[line].groups[group])) {
        curr.lines[line].groups[group][info] = { value: val, source: new Set(), zeroSource: new Set() };
      }
      else if (enhance && val > 0) {
        curr.lines[line].groups[group][info].value = val;
      }
      val > 0 ? curr.lines[line].groups[group][info].source.add(filename) : curr.lines[line].groups[group][info].zeroSource.add(filename);
    }
  }
  return data;
}

function serializeInfo(data) {
  let output = [];
  for (const d of Object.values(data)) {
    output.push("SF:" + d.file + '\n');
    for (const [number, cov] of Object.entries(d.lines)) {
      if (cov.value) {
        output.push("DA:"+number+','+cov.value);
      }
      if (cov.groups) {
        for (const [name, group] of Object.entries(cov.groups)) {
          for (const [info, data] of Object.entries(group)) {
            output.push("BRDA:"+number+','+name+','+info+','+data.value)
          }
        }
      }
    }
  }
  return output.join('\n');
}

export { parseInfo, parseDesc, serializeInfo };
