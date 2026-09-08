mod coverage;
mod parse;
mod path;

pub use coverage::{CoverageDb, ExportedFile, ExportedLine, ExportedRecord, ExportedSubGroup};
pub use parse::{ParseStats, parse_dat, parse_dat_bytes};
pub use path::{parse_linescov, unify_source_path};

#[cfg(target_arch = "wasm32")]
mod wasm_api {
    use super::{CoverageDb, parse_dat, parse_dat_bytes};
    use serde::Serialize;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = console)]
        fn log(s: &str);
    }

    #[wasm_bindgen]
    pub struct DatParser {
        db: CoverageDb,
    }

    #[wasm_bindgen]
    impl DatParser {
        #[wasm_bindgen(constructor)]
        pub fn new() -> DatParser {
            DatParser {
                db: CoverageDb::default(),
            }
        }

        #[wasm_bindgen(js_name = parse)]
        pub fn parse(&mut self, filename: &str, content: &str) {
            let stats = parse_dat(content, &mut self.db);
            log(&format!(
                "Parsed {filename}: {} points, {} skipped",
                stats.accepted, stats.skipped
            ));
        }

        #[wasm_bindgen(js_name = parseBytes)]
        pub fn parse_bytes(&mut self, filename: &str, content: &[u8]) {
            let stats = parse_dat_bytes(content, &mut self.db);
            log(&format!(
                "Parsed {filename}: {} points, {} skipped",
                stats.accepted, stats.skipped
            ));
        }

        #[wasm_bindgen(js_name = intoFiles)]
        pub fn export(&self) -> Result<JsValue, JsValue> {
            let exported = self.db.export();
            let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
            exported
                .serialize(&serializer)
                .map_err(|err| JsValue::from_str(&err.to_string()))
        }
    }
}
