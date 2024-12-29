#!/bin/env python3

index_filename = "dist/index.html"
# Add more files + arguments for choosing names when this all works

import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--inject-data')
args = parser.parse_args()

with open(index_filename, 'r+') as f:
    content = f.read()
    import json

    if args.inject_data:
        files = {}

        from  pathlib import Path
        import os
        cwd = os.getcwd()
        os.chdir(args.inject_data)

        p = Path()
        for filename in list(p.glob("*.info")) + ['logo.svg', 'config.json', 'sources.txt']:
            if os.path.isfile(filename):
                files[str(filename)] = open(str(filename), 'r').read()

        os.chdir(cwd)

        content = content.replace('let files = {}', 'let files = ' + json.dumps(files))

    import re
    r = r'(<script type="module" crossorigin src="/(assets/index-[\w\-]+.js)"></script>)'
    matches = re.findall(r, content)
    for m in matches:
        with open('dist/' + m[1], 'r') as sf:
            scriptText = sf.read()
            content = content.replace(m[0], '<script type="module">' + scriptText + '</script>')
    f.seek(0)
    f.write(content)
    f.truncate()
