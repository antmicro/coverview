use clap::Parser;
use dat_parser::{CoverageDb, parse_dat_bytes};
use std::{
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    process::exit,
};
use walkdir::WalkDir;
use zip::ZipArchive;

#[derive(Parser)]
struct Args {
    /// Input directory or zip file
    #[arg(short = 'i', long = "input", value_name = "DIR|ZIP")]
    input: PathBuf,

    /// Output file
    #[arg(short = 'o', long = "output", value_name = "FILE")]
    output: PathBuf,
}

fn parse_and_report(name: &Path, contents: &[u8], db: &mut CoverageDb) {
    let stats = parse_dat_bytes(contents, db);
    println!(
        "Parsed {}: {} points, {} skipped",
        name.display(),
        stats.accepted,
        stats.skipped
    );
}

fn load_dir(dir: &Path, db: &mut CoverageDb) {
    for entry in WalkDir::new(dir).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        if !path.extension().is_some_and(|ext| ext == "dat") {
            continue;
        }

        let contents = std::fs::read(path).unwrap_or_else(|e| {
            eprintln!("Failed to read {}: {e}", path.display());
            exit(1);
        });

        parse_and_report(path, &contents, db);
    }
}

fn load_zip(path: &Path, db: &mut CoverageDb) {
    let file = File::open(path).unwrap_or_else(|e| {
        eprintln!("Failed to read {}: {e}", path.display());
        exit(1);
    });

    let mut archive = ZipArchive::new(file).unwrap_or_else(|e| {
        eprintln!("Failed to open zip {}: {e}", path.display());
        exit(1);
    });

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).unwrap_or_else(|e| {
            eprintln!("Failed to read zip entry {i}: {e}");
            exit(1);
        });

        if !entry.is_file() {
            continue;
        }

        let Some(name) = entry.enclosed_name() else {
            continue;
        };

        if !name.extension().is_some_and(|ext| ext == "dat") {
            continue;
        }

        let mut contents = Vec::new();
        if let Err(e) = entry.read_to_end(&mut contents) {
            eprintln!("Failed to read {}: {e}", name.display());
            exit(1);
        }

        parse_and_report(&name, &contents, db);
    }
}

fn main() {
    let args = Args::parse();

    let mut db = CoverageDb::default();

    if args.input.is_dir() {
        load_dir(&args.input, &mut db);
    } else {
        load_zip(&args.input, &mut db);
    }

    let json = serde_json::to_string(&db.export()).unwrap_or_else(|e| {
        eprintln!("Failed to serialize coverage data: {e}");
        exit(1);
    });

    if let Err(e) = std::fs::write(&args.output, json) {
        eprintln!("Failed to write {}: {e}", args.output.display());
        exit(1);
    }
}
