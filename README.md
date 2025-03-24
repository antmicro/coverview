# Coverview

Copyright (c) 2023-2025 [Antmicro](https://www.antmicro.com)

<picture>
  <source srcset="images/Coverview_logotype_black.png" media="(prefers-color-scheme: light)"/>
  <source srcset="images/Coverview_logotype_white.png" media="(prefers-color-scheme: dark)"/>
  <img src="images/Coverview_logotype_black.png"/>
</picture>

Coverview is a tool for generating coverage dashboards.

You can use it to visualize coverage data locally, following the build instructions below, or you can use a version [deployed from the latest commit](https://antmicro.github.io/coverview/index.html#/).

Coverview is line-oriented but can visualize multiple types coverage - you can declare what types are available and applicable for your use case.

It's language-agnostic: you can use it for compilable languages like C, scripting languages like Python or hardware description languages like SystemVerilog.

## Building and deployment

### Install dependencies

Assuming you have node/npm, install Coverview build dependencies with:

```sh
npm install
```

### Dev build (with hot reload)

```sh
npm run dev
```

### Production build (set of static files)

```sh
npm run build
```

### Embedding assets and injecting data

To make this viewer completely standalone, we postprocess the files to embed JS files into it.

To embed just the JS files (after doing a production build), run:

```sh
./embed.py
```

If you want to inject data directly into the page for a complete standalone experience, you can provide a data directory to the `embed.py` invocation:

```sh
./embed.py --inject-data <data_dir>
```

If you don't inject data during build, you can always load a data set via your browser using a `zip` archive.
The data is persistent within the session, but you can click a banner on top of the page to reset it.

Data format of the directory and the `zip` file is described below.

After loading the `zip` file you can load additional `info` and `desc` files on top.

## Data structure

Coverview relies on a data format derived from [LCOV](https://github.com/linux-test-project/lcov).

This data can be embedded via the `embed.py` script mentioned above or loaded via a browser from a `zip` file, or as standalone files.

There are four main sources of data:

* `*.info` files - following the aforementioned LCOV format, with more description at the end of this README. One `info` file describes one type of coverage data.
* `*.desc` files - similar to `info` files, they are used to describe which tests or software runs contributed to each line of coverage.
* `sources.txt` - collapsed collection of all relevant sources in the following format:
  ```
  ### FILE: filename_with_path.c
    <file_contents>
  ### FILE: another_filename_with_path.h
    <file2_contents>
   ...
   ```
* `config.json` - a config file which specifies the available info files and metadata, example below:

  ```
  {
    "title": "title",
    "repo": "repo_or_project_name",
    "branch": "main",
    "commit": "commit_hash",
    "timestamp": "2025-03-24T20:15:43.717+0000",
    "datasets": {
      "dataset_name1": {
        "line": [ "line-set1.info", "line-set1.desc" ],
        "branch": "branch-set1.info"
      },
      "dataset_name2": {
        "line": [ "line-set2.info", "line-set2-additional.info", "line-set2.desc" ],
        "toggle": [ "toggle-set2.info", "toggle-set2.desc" ],
        ...
      },
      ...
    },
    "additional": {
        "any_key": "corresponding_value",
        ...
    },
  }
  ```
  All metadata elements will be displayed in the top bar of the page.
  They are optional and can cover the following:

  * `title` - title of the report, "Dashboard" by default
  * `repo` - name of the code repository or the analyzed project
  * `branch` - branch for which the coverage was created
  * `commit` - specific commit hash of the repository
  * `timestamp` - date and time of coverage in the ISO format
  * `additional` - a set of user-defined key-value pairs for additional information or run parameters

  The `datasets` entry groups coverage info from related runs.
  You can use separate datasets to, e.g., indicate a different runtime, compilation options or used simulation environment.

  Each dataset can include a range of coverage types, and each type has at least one `info` file and optional `desc` files listed in an array.
  If you only provide a single `info` file, you can omit the array square brackets.

* `logo.svg` - an optional logo file to put on top of the dashboard

### `info` file format

The format of `info` files is based on LCOV tracefiles.
You can find the full description of the format in `man geninfo`.

`info` files are text files with each line constructed as `TAG:value,other_value`.
As Coverview aims to support more varied usecases than are typically covered by LCOV, only a subset of possible tags is used and a` single `info` file is responsible for describing one type of presented coverage information (e.g. line or branch coverage).

Each file begins with a test name:

```
TN:<test name>
```

After that, each source file begins with:

```
SF:<full path to the source file matching the entry in sources.info>
```

Then, the coverage data follows.
Two types of coverage entries are supported.

First, for line coverage:
```
DA:<line number>,<execution count>
```

And for more detailed coverage info, like branch or toggle data:
```
BRDA:<line number>,<block>,<description>,<taken>
```

For `BRDA` entries, values with the same `block` value will be displayed next to each other.
This can be used to display corresponding information, e.g. for signal toggle data:
```
BRDA:34,0,reset_0->1,1
BRDA:34,0,reset_1->0,1
```
will indicate that the `reset` signal on line 34 was toggled both from 0 to 1 and from 1 to 0.

Each file denoted with the `SF` entry ends with:
```
end_of_record
```

### `desc` file format

The `desc` file format is similar to `info`.

It includes the following entries:

```
TN:<test name>
SF:<full path to the source file matching the entry in sources.info>
end_of_record
```

An additional entry describes sources for a single coverage line:
```
TEST:<line number>,<semicolon;separated;test;names>
```
Each listed test will be presented in a tooltip for a given line coverage info.

## info-process

For additional processing of `info` files, e.g. merging of separate `info` datasets, path processing or generating the Coverview archive, please see the [info-process](https://github.com/antmicro/info-process) project on Antmicro's GitHub.
