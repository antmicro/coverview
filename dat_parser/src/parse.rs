use crate::coverage::CoverageDb;
use crate::path::{coverage_type_from_fields, parse_linescov, unify_source_path};

const KEY_PREFIX: u8 = 0x01;
const VAL_PREFIX: u8 = 0x02;

/// Parse one Verilator coverage.dat buffer and merge the points into db
///
/// Returns (points_accepted, lines_skipped)
pub fn parse_dat(content: &str, db: &mut CoverageDb) -> ParseStats {
    parse_dat_bytes(content.as_bytes(), db)
}

pub fn parse_dat_bytes(content: &[u8], db: &mut CoverageDb) -> ParseStats {
    let mut stats = ParseStats::default();
    for raw_line in content.split(|b| *b == b'\n') {
        let line = raw_line.trim_ascii();
        if line.is_empty() || line[0] == b'#' {
            continue;
        }
        if line[0] != b'C' {
            stats.skipped += 1;
            continue;
        }
        match parse_c_line(line) {
            Some(point) => {
                apply_point(db, point);
                stats.accepted += 1;
            }
            None => {
                stats.skipped += 1;
            }
        }
    }
    stats
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct ParseStats {
    pub accepted: u32,
    pub skipped: u32,
}

struct CoveragePoint {
    file: String,
    cov_type: String,
    lines: Vec<u32>,
    comment: Option<String>,
    hierarchy: Option<String>,
    hits: u64,
}

fn apply_point(db: &mut CoverageDb, point: CoveragePoint) {
    let group = point.comment.as_deref().and_then(|comment| {
        if point.cov_type == "line" {
            None
        } else {
            Some(("0", comment))
        }
    });
    db.add_point(
        point.file,
        point.cov_type,
        &point.lines,
        group,
        point.hierarchy.as_deref(),
        point.hits,
    );
}

fn parse_c_line(line: &[u8]) -> Option<CoveragePoint> {
    let rest = line[1..].trim_ascii();
    if rest.first() != Some(&b'\'') {
        return None;
    }
    let close = rest.iter().rposition(|b| *b == b'\'')?;
    if close == 0 {
        return None;
    }
    let hits = parse_hits(rest[close + 1..].trim_ascii())?;
    let fields = parse_metadata(&rest[1..close]);

    let file = fields.get("f").map(|s| unify_source_path(s))?;
    let cov_type = coverage_type_from_fields(
        fields.get("t").map(String::as_str),
        fields.get("page").map(String::as_str),
    )?
    .to_string();
    let primary_line = fields.get("l")?.parse::<u32>().ok()?;

    let lines = if cov_type == "line" {
        let mut lines = match fields.get("S") {
            Some(spec) => parse_linescov(spec),
            None => Vec::new(),
        };
        if !lines.contains(&primary_line) {
            lines.push(primary_line);
        }
        lines
    } else {
        vec![primary_line]
    };

    Some(CoveragePoint {
        file,
        cov_type,
        lines,
        comment: fields.get("o").cloned(),
        hierarchy: fields.get("h").cloned(),
        hits,
    })
}

fn parse_metadata(metadata: &[u8]) -> TinyMap {
    let mut fields = TinyMap::new();
    for part in metadata.split(|b| *b == KEY_PREFIX) {
        if part.is_empty() {
            continue;
        }
        let Some(sep) = part.iter().position(|b| *b == VAL_PREFIX) else {
            continue;
        };
        let key = String::from_utf8_lossy(&part[..sep]).into_owned();
        let value = String::from_utf8_lossy(&part[sep + 1..]).into_owned();
        if !key.is_empty() {
            fields.insert(key, value);
        }
    }
    fields
}

fn parse_hits(text: &[u8]) -> Option<u64> {
    if text.is_empty() {
        return None;
    }
    let s = std::str::from_utf8(text).ok()?.trim();
    s.parse().ok()
}

struct TinyMap {
    inner: Vec<(String, String)>,
}

impl TinyMap {
    fn new() -> Self {
        Self { inner: Vec::new() }
    }

    fn insert(&mut self, key: String, value: String) {
        if let Some((_, existing)) = self.inner.iter_mut().find(|(k, _)| k == &key) {
            *existing = value;
        } else {
            self.inner.push((key, value));
        }
    }

    fn get(&self, key: &str) -> Option<&String> {
        self.inner.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY_PREFIX: &str = "\u{01}";
    const VAL_PREFIX: &str = "\u{02}";

    fn kv(pairs: &[(&str, &str)]) -> String {
        let mut out = String::new();
        for (k, v) in pairs {
            out.push_str(KEY_PREFIX);
            out.push_str(k);
            out.push_str(VAL_PREFIX);
            out.push_str(v);
        }
        out
    }

    #[test]
    fn parses_toggle_point_with_instance() {
        let meta = kv(&[
            ("f", "/repo/design/lib/beh_lib.sv"),
            ("l", "22"),
            ("n", "40"),
            ("t", "toggle"),
            ("page", "v_toggle/rvdff"),
            ("o", "clk:0->1"),
            ("h", "TOP.tb_top.rvtop.clk0"),
        ]);
        let content = format!("# SystemC::Coverage-3\nC '{meta}' 12\n");
        let mut db = CoverageDb::default();
        let stats = parse_dat(&content, &mut db);
        assert_eq!(
            stats,
            ParseStats {
                accepted: 1,
                skipped: 0
            }
        );

        let file = &db.files["repo/design/lib/beh_lib.sv"];
        assert!(file.instances.contains("TOP.tb_top.rvtop.clk0"));
        let sub = &file.types["toggle"].lines[&22].groups["0"]["clk:0->1"];
        assert_eq!(sub.hits, 12);
        assert_eq!(sub.instance_hits["TOP.tb_top.rvtop.clk0"], 12);
    }

    #[test]
    fn expands_line_coverage_span() {
        let meta = kv(&[
            ("f", "design/dbg/el2_dbg.sv"),
            ("l", "491"),
            ("t", "line"),
            ("o", "block"),
            ("S", "491-493,495"),
            ("h", "TOP.dbg"),
        ]);
        let content = format!("C '{meta}' 4\n");
        let mut db = CoverageDb::default();
        parse_dat(&content, &mut db);
        let lines = &db.files["design/dbg/el2_dbg.sv"].types["line"].lines;
        assert_eq!(lines[&491].hits, 4);
        assert_eq!(lines[&492].hits, 4);
        assert_eq!(lines[&493].hits, 4);
        assert_eq!(lines[&495].hits, 4);
        assert!(!lines.contains_key(&494));
        assert!(lines[&491].groups.is_empty());
    }

    #[test]
    fn ignores_linescov_span_for_non_line_types() {
        let meta = kv(&[
            ("f", "design/lib/beh_lib.sv"),
            ("l", "22"),
            ("t", "toggle"),
            ("o", "clk:0->1"),
            ("S", "22-24"),
            ("h", "TOP.a"),
        ]);
        let content = format!("C '{meta}' 1\n");
        let mut db = CoverageDb::default();
        parse_dat(&content, &mut db);
        let lines = &db.files["design/lib/beh_lib.sv"].types["toggle"].lines;
        assert!(lines.contains_key(&22));
        assert!(!lines.contains_key(&23));
        assert!(!lines.contains_key(&24));
    }

    #[test]
    fn merges_lines_for_the_same_file() {
        let meta = kv(&[
            ("f", "design/dbg/el2_dbg.sv"),
            ("l", "294"),
            ("t", "expr"),
            ("o", "(clk_override==1) => 1"),
            ("h", "TOP.dbg"),
        ]);
        let a = format!("C '{meta}' 1\n");
        let b = format!("C '{meta}' 2\n");
        let mut db = CoverageDb::default();
        parse_dat(&a, &mut db);
        parse_dat(&b, &mut db);
        let sub = &db.files["design/dbg/el2_dbg.sv"].types["expr"].lines[&294].groups["0"]["(clk_override==1) => 1"];
        assert_eq!(sub.hits, 3);
    }

    #[test]
    fn skips_comments_and_malformed_lines() {
        let content = "# header\n\nnot-a-record\nC 'nope' x\n";
        let mut db = CoverageDb::default();
        let stats = parse_dat(content, &mut db);
        assert_eq!(stats.accepted, 0);
        assert_eq!(stats.skipped, 2);
        assert!(db.files.is_empty());
    }
}
