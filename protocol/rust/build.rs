use std::io::Result;

fn main() -> Result<()> {
    // Compile proto files to OUT_DIR (standard location)
    prost_build::compile_protos(&["../proto/the-song.proto"], &["../proto"])?;

    // Re-run if proto files change
    println!("cargo:rerun-if-changed=../proto/the-song.proto");

    Ok(())
}

