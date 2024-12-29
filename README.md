# Coverview

Copyright (c) 2023-2024 [Antmicro](https://www.antmicro.com)

Coverview is a tool for generating coverage dashboards.

## Install dependencies

Assuming you have node/npm, do:

```sh
npm install
```

## Dev build (with hot reload)

```sh
npm run dev
```

## Production build (set of static files)

```sh
npm run build
```
## Embedding assets and injecting data

To make this viewer completely standalone, we postprocess the files to embed JS files into it.

To embed just the JS files (after doing a production build):

```sh
./embed.py
```

There is also a flag allowing you to inject data from a directory, with the same structure as a zip file would - see below - for a complete standalone experience!

```sh
./embed.py --inject-data <data_dir>
```

## Loading data from .zip

The viewer allows you to load `.zip` files which reloads the dashboard and shows the data loaded.
The data is persistent within the session, but you can click a banner on top of the page to reset it.

### Zip structure

* `config.json` - config file which specifies the available info files, example below:

```
{
  "datasets": {
    "dataset_name1": {
      "line": "line_all.info",
      "toggle": "toggle_all.info"
    }
  },
  "commit": "commit_hash".
  "title": "title",
  ...
}
```

* `*.info` - info files, should be one per coverage type as described above
* `sources.txt` - the accompanying sources, in the following format

```
### FILE: filename_with_path.sv
<file_contents>
### FILE: another_filename_with_path.sv
<file2_contents>
...
```

* `logo.svg` - an optional logo file to put on top of the dashboard
