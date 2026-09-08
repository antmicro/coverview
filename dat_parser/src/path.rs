/// Collapse `.` / `..` and drop empty components, matching `unifySourcePath` in `parse.js`.
pub fn unify_source_path(path: &str) -> String {
    let mut unified = Vec::new();
    for comp in path.split('/') {
        if comp == ".." && !unified.is_empty() {
            unified.pop();
        } else if comp != "." && !comp.is_empty() {
            unified.push(comp);
        }
    }
    unified.join("/")
}

/// Prefer the explicit `t` field; fall back to the `v_<type>/...` page prefix.
pub fn coverage_type_from_fields<'a>(
    type_field: Option<&'a str>,
    page: Option<&'a str>,
) -> Option<&'a str> {
    type_field.filter(|t| !t.is_empty()).or_else(|| {
        let page = page?;
        let rest = page.strip_prefix("v_")?;
        let kind = rest.split('/').next().unwrap_or(rest);
        if kind.is_empty() { None } else { Some(kind) }
    })
}

/// Parse a Verilator `S` / `linescov` field such as `491-503,505`.
pub fn parse_linescov(spec: &str) -> Vec<u32> {
    let mut lines = Vec::new();
    for part in spec.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((start, end)) = part.split_once('-') {
            let Ok(start) = start.trim().parse::<u32>() else {
                continue;
            };
            let Ok(end) = end.trim().parse::<u32>() else {
                continue;
            };
            lines.extend(start..=end);
        } else if let Ok(line) = part.parse::<u32>() {
            lines.push(line);
        }
    }
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unifies_like_js() {
        assert_eq!(unify_source_path("/a/b/../c"), "a/c");
        assert_eq!(
            unify_source_path("./design/./dbg/el2_dbg.sv"),
            "design/dbg/el2_dbg.sv"
        );
        assert_eq!(
            unify_source_path("/__w/Cores-VeeR-EL2/Cores-VeeR-EL2/design/dbg/el2_dbg.sv"),
            "__w/Cores-VeeR-EL2/Cores-VeeR-EL2/design/dbg/el2_dbg.sv"
        );
    }

    #[test]
    fn parses_linescov() {
        assert_eq!(parse_linescov("491-503,505"), {
            let mut v: Vec<u32> = (491..=503).collect();
            v.push(505);
            v
        });
        assert_eq!(parse_linescov("436"), vec![436]);
        assert_eq!(parse_linescov(""), Vec::<u32>::new());
    }
}
