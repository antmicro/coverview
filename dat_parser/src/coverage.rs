use std::collections::{BTreeMap, BTreeSet, HashMap};

use serde::Serialize;

/// Aggregated coverage from one or more .dat files, keyed like allFiles[dataset]
#[derive(Default, Debug)]
pub struct CoverageDb {
    pub files: BTreeMap<String, FileCoverage>,
}

#[derive(Default, Debug)]
pub struct FileCoverage {
    pub instances: BTreeSet<String>,
    pub types: BTreeMap<String, TypeCoverage>,
}

#[derive(Default, Debug)]
pub struct TypeCoverage {
    pub lines: BTreeMap<u32, LineCoverage>,
}

#[derive(Default, Debug)]
pub struct LineCoverage {
    pub hits: u64,
    pub instance_hits: BTreeMap<String, u64>,
    /// group name -> subgroup name -> hits
    pub groups: BTreeMap<String, BTreeMap<String, SubGroupCoverage>>,
}

#[derive(Default, Debug)]
pub struct SubGroupCoverage {
    pub hits: u64,
    pub instance_hits: BTreeMap<String, u64>,
}

impl CoverageDb {
    pub fn add_point(
        &mut self,
        file: String,
        cov_type: String,
        line_numbers: &[u32],
        group: Option<(&str, &str)>,
        hierarchy: Option<&str>,
        hits: u64,
    ) {
        if line_numbers.is_empty() {
            return;
        }

        let file_cov = self.files.entry(file).or_default();
        if let Some(hier) = hierarchy.filter(|h| !h.is_empty()) {
            file_cov.instances.insert(hier.to_string());
        }
        let type_cov = file_cov.types.entry(cov_type).or_default();

        for &line_no in line_numbers {
            let line = type_cov.lines.entry(line_no).or_default();
            match group {
                Some((group_name, sub_name)) => {
                    let sub = line
                        .groups
                        .entry(group_name.to_string())
                        .or_default()
                        .entry(sub_name.to_string())
                        .or_default();
                    sub.hits = sub.hits.saturating_add(hits);
                    if let Some(hier) = hierarchy.filter(|h| !h.is_empty()) {
                        *sub.instance_hits.entry(hier.to_string()).or_default() += hits;
                        *line.instance_hits.entry(hier.to_string()).or_default() += hits;
                    }
                    line.hits = line.hits.saturating_add(hits);
                }
                None => {
                    line.hits = line.hits.saturating_add(hits);
                    if let Some(hier) = hierarchy.filter(|h| !h.is_empty()) {
                        *line.instance_hits.entry(hier.to_string()).or_default() += hits;
                    }
                }
            }
        }
    }

    pub fn merge(&mut self, other: CoverageDb) {
        for (file, other_file) in other.files {
            let dest = self.files.entry(file).or_default();
            dest.instances.extend(other_file.instances);
            for (cov_type, other_type) in other_file.types {
                let dest_type = dest.types.entry(cov_type).or_default();
                for (line_no, other_line) in other_type.lines {
                    let dest_line = dest_type.lines.entry(line_no).or_default();
                    dest_line.hits = dest_line.hits.saturating_add(other_line.hits);
                    merge_hits(&mut dest_line.instance_hits, other_line.instance_hits);
                    for (group_name, other_group) in other_line.groups {
                        let dest_group = dest_line.groups.entry(group_name).or_default();
                        for (sub_name, other_sub) in other_group {
                            let dest_sub = dest_group.entry(sub_name).or_default();
                            dest_sub.hits = dest_sub.hits.saturating_add(other_sub.hits);
                            merge_hits(&mut dest_sub.instance_hits, other_sub.instance_hits);
                        }
                    }
                }
            }
        }
    }

    pub fn export(&self) -> HashMap<String, ExportedFile> {
        self.files
            .iter()
            .map(|(name, file)| (name.clone(), file.export()))
            .collect()
    }
}

fn merge_hits(dest: &mut BTreeMap<String, u64>, src: BTreeMap<String, u64>) {
    for (hier, hits) in src {
        *dest.entry(hier).or_default() += hits;
    }
}

impl FileCoverage {
    fn export(&self) -> ExportedFile {
        ExportedFile {
            instances: self.instances.iter().cloned().collect(),
            records: self
                .types
                .iter()
                .map(|(cov_type, type_cov)| (cov_type.clone(), type_cov.export()))
                .collect(),
        }
    }
}

impl TypeCoverage {
    fn export(&self) -> ExportedRecord {
        ExportedRecord {
            lines: self
                .lines
                .iter()
                .map(|(line_no, line)| (line_no.to_string(), line.export()))
                .collect(),
        }
    }
}

impl LineCoverage {
    fn export(&self) -> ExportedLine {
        ExportedLine {
            hits: self.hits,
            instances: self.instance_hits.clone().into_iter().collect(),
            groups: self
                .groups
                .iter()
                .map(|(group_name, group)| {
                    let exported = group
                        .iter()
                        .map(|(sub_name, sub)| {
                            (
                                sub_name.clone(),
                                ExportedSubGroup {
                                    hits: sub.hits,
                                    instances: sub.instance_hits.clone().into_iter().collect(),
                                },
                            )
                        })
                        .collect();
                    (group_name.clone(), exported)
                })
                .collect(),
        }
    }
}

#[derive(Serialize, Debug, Clone, PartialEq)]
pub struct ExportedFile {
    pub instances: Vec<String>,
    pub records: HashMap<String, ExportedRecord>,
}

#[derive(Serialize, Debug, Clone, PartialEq, Default)]
pub struct ExportedRecord {
    pub lines: HashMap<String, ExportedLine>,
}

#[derive(Serialize, Debug, Clone, PartialEq, Default)]
pub struct ExportedLine {
    pub hits: u64,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub instances: HashMap<String, u64>,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub groups: HashMap<String, HashMap<String, ExportedSubGroup>>,
}

#[derive(Serialize, Debug, Clone, PartialEq, Default)]
pub struct ExportedSubGroup {
    pub hits: u64,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub instances: HashMap<String, u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_hits_per_instance() {
        let mut db = CoverageDb::default();
        db.add_point(
            "design/lib/beh_lib.sv".into(),
            "toggle".into(),
            &[22],
            Some(("0", "clk:0->1")),
            Some("TOP.a"),
            3,
        );
        db.add_point(
            "design/lib/beh_lib.sv".into(),
            "toggle".into(),
            &[22],
            Some(("0", "clk:0->1")),
            Some("TOP.b"),
            5,
        );
        db.add_point(
            "design/lib/beh_lib.sv".into(),
            "toggle".into(),
            &[22],
            Some(("0", "clk:0->1")),
            Some("TOP.a"),
            1,
        );

        let file = &db.files["design/lib/beh_lib.sv"];
        assert_eq!(file.instances.len(), 2);
        let sub = &file.types["toggle"].lines[&22].groups["0"]["clk:0->1"];
        assert_eq!(sub.hits, 9);
        assert_eq!(sub.instance_hits["TOP.a"], 4);
        assert_eq!(sub.instance_hits["TOP.b"], 5);
    }
}
