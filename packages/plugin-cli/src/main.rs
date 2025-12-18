//! Launcher Plugin CLI
//!
//! A command-line tool for developing Launcher plugins in Rust or TypeScript.

mod commands;
mod templates;

use clap::{Parser, Subcommand};
use colored::*;

#[derive(Parser)]
#[command(name = "launcher-plugin")]
#[command(about = "CLI tool for developing Launcher plugins", long_about = None)]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new plugin from template
    New {
        /// Plugin name
        name: String,
        /// Programming language (ts or rust)
        #[arg(short, long, default_value = "ts")]
        lang: String,
        /// Output directory (defaults to current directory)
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Build the plugin to WebAssembly
    Build {
        /// Build in release mode
        #[arg(short, long)]
        release: bool,
    },
    /// Build and install plugin locally for development
    Dev,
    /// Package the plugin for distribution
    Package {
        /// Output file path
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Initialize a plugin in the current directory
    Init {
        /// Programming language (ts or rust)
        #[arg(short, long, default_value = "ts")]
        lang: String,
    },
    /// Check the plugin for issues
    Check,
    /// Show plugin information
    Info,
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::New { name, lang, output } => commands::new_plugin(&name, &lang, output.as_deref()),
        Commands::Build { release } => commands::build_plugin(release),
        Commands::Dev => commands::dev_plugin(),
        Commands::Package { output } => commands::package_plugin(output.as_deref()),
        Commands::Init { lang } => commands::init_plugin(&lang),
        Commands::Check => commands::check_plugin(),
        Commands::Info => commands::info_plugin(),
    };

    if let Err(e) = result {
        eprintln!("{} {}", "Error:".red().bold(), e);
        std::process::exit(1);
    }
}


