use clap::Parser;
use dat_parser::{CoverageDb, parse_dat_bytes};
use std::{fs::File, io::Read, path::PathBuf, process::exit};
use zip::ZipArchive;

#[derive(Parser)]
struct Args {
    /// Input file
    #[arg(short = 'i', long = "input", value_name = "FILE")]
    input: PathBuf,

    /// Output file
    #[arg(short = 'o', long = "output", value_name = "FILE")]
    output: PathBuf,
}

fn main() {
    let args = Args::parse();

    let file = match File::open(&args.input) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to read {}: {e}", args.input.display());
            exit(1);
        }
    };

    let mut archive = match ZipArchive::new(file) {
        Ok(archive) => archive,
        Err(e) => {
            eprintln!("Failed to open zip {}: {e}", args.input.display());
            exit(1);
        }
    };

    let mut db = CoverageDb::default();
    for i in 0..archive.len() {
        let mut entry = match archive.by_index(i) {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("Failed to read zip entry {i}: {e}");
                exit(1);
            }
        };

        if !entry.is_file() {
            continue;
        }
        let Some(name) = entry.enclosed_name() else {
            continue;
        };
        let is_dat_file = name.components().any(|c| c.as_os_str() == "dat_files")
            && name.extension().is_some_and(|ext| ext == "dat");
        if !is_dat_file {
            continue;
        }

        let mut contents = Vec::new();
        if let Err(e) = entry.read_to_end(&mut contents) {
            eprintln!("Failed to read {}: {e}", name.display());
            exit(1);
        }

        let stats = parse_dat_bytes(&contents, &mut db);
        println!(
            "Parsed {}: {} points, {} skipped",
            name.to_str().unwrap(),
            stats.accepted,
            stats.skipped
        );
    }

    let exported = db.export();

    let json = match serde_json::to_string(&exported) {
        Ok(json) => json,
        Err(e) => {
            eprintln!("Failed to serialize coverage data: {e}");
            exit(1);
        }
    };

    if let Err(e) = std::fs::write(&args.output, json) {
        eprintln!("Failed to write {}: {e}", args.output.display());
        exit(1);
    }
}
