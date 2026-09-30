#!/usr/bin/env python3

index_filename = "dist/index.html"
index_backup_filename = "dist/index.html.bak"
# Add more files + arguments for choosing names when this all works

import argparse
import base64
import json
import os
from pathlib import Path
import shutil
import re
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--inject-data')
parser.add_argument('--fetch-data')
parser.add_argument('--template-url')
args = parser.parse_args()

if (args.inject_data and args.fetch_data):
    print("Cannot inject data and fetch it in runtime at the same time, the flags are contradictory.")
    sys.exit(1)

original_snippet = 'let originalFiles = {}'

if os.path.exists(index_backup_filename):
    shutil.copy(index_backup_filename, index_filename)
else:
    shutil.copy(index_filename, index_backup_filename)

with open(index_filename, 'r+') as f:
    content = f.read()

    if args.inject_data:
        if os.path.isfile(args.inject_data) and args.inject_data.endswith('.zip'):
            content = content.replace(original_snippet, 'let originalFiles = {}; let embeddedZipArchive = "' +
                                      base64.b64encode(Path(args.inject_data).read_bytes()).decode('ascii') + '"')
        else:
            files = {}

            cwd = os.getcwd()
            os.chdir(args.inject_data)

            p = Path()
            config = {}
            if os.path.isfile('config.json'):
                try:
                    config = json.load(open('config.json', 'r'))
                except json.JSONDecodeError as e:
                    print(f"config.json is not valid JSON: {e}")
                    sys.exit(1)

            config_files = ['config.json'] * bool(config)

            if 'dat' in config:
                if not isinstance(config['dat'], str):
                    print(f"Value '{config['dat']}' linked as 'dat' in config.json is not a string.")
                    sys.exit(1)
                if config['dat'].endswith('.json') and os.path.isfile(config['dat']):
                    config_files.append(config['dat'])
                elif os.path.isdir(config['dat']):
                    dat_files = list(p.glob(f"{config['dat']}/**/*.dat"))
                    if not dat_files:
                        print(f"Directory '{config['dat']}' linked as 'dat' in config.json contains no .dat files.")
                        sys.exit(1)
                    config_files.extend(dat_files)
                else:
                    print(f"'{config['dat']}' linked as 'dat' in config.json is neither a .json file nor a directory.")
                    sys.exit(1)

            info_files_linked = False

            if 'datasets' in config:
                if not isinstance(config['datasets'], dict):
                    print("Value linked as 'datasets' in config.json is not an object.")
                    sys.exit(1)

                allowed = ('.desc',) if 'dat' in config else ('.desc', '.info')
                allowed_names = ' and '.join(allowed)

                for name, dataset in config['datasets'].items():
                    if not isinstance(dataset, dict):
                        print(f"Value linked as 'datasets.{name}' in config.json is not an object.")
                        sys.exit(1)
                    for t, linked_files in dataset.items():
                        if not isinstance(linked_files, list):
                            print(f"Value linked as 'datasets.{name}.{t}' in config.json is not a list.")
                            sys.exit(1)
                        for linked_file in linked_files:
                            if not isinstance(linked_file, str):
                                print(f"Value '{linked_file}' listed in 'datasets.{name}.{t}' in config.json is not a string.")
                                sys.exit(1)
                            if not linked_file.endswith(allowed):
                                reason = "when 'dat' is set" if 'dat' in config else "without 'dat'"
                                print(f"Only {allowed_names} files are allowed in 'datasets' {reason}, found '{linked_file}' in 'datasets.{name}.{t}' in config.json.")
                                sys.exit(1)

                            config_files.append(linked_file)
                            if linked_file.endswith('.info'):
                                info_files_linked = True

            if bool(config) and 'dat' not in config and not info_files_linked:
                print("Neither .info files in 'datasets' nor 'dat' found in config.json, use one of them.")
                sys.exit(1)

            if not config_files:
                config_files.extend(p.glob("*.info"))
                config_files.extend(p.glob("*.desc"))

            config_files.extend(['logo.svg', 'sources.txt'])

            for filename in config_files:
                if os.path.isfile(filename):
                    files[str(filename)] = open(str(filename), 'r').read()

            os.chdir(cwd)

            content = content.replace(original_snippet, 'let originalFiles = ' + json.dumps(files))

    elif args.fetch_data:
        fetch_snippet = 'let originalFiles = {}; let fetchData = "%s";' % args.fetch_data
        if args.template_url: fetch_snippet += 'let templatedFetchUrl = "%s";' % args.template_url
        content = content.replace(original_snippet, fetch_snippet)

    r = r'(<script type="module" crossorigin src="/(assets/index-[\w\-]+.js)"></script>)'
    matches = re.findall(r, content)
    for m in matches:
        with open('dist/' + m[1], 'r') as sf:
            scriptText = sf.read()
            content = content.replace(m[0], '<script type="module">' + scriptText + '</script>')
    f.seek(0)
    f.write(content)
    f.truncate()
