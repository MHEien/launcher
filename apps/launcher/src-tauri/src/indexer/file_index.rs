use super::config::IndexConfig;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{Directory, Index, IndexReader, IndexWriter, ReloadPolicy};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedFile {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub modified: DateTime<Utc>,
    pub is_dir: bool,
}

pub struct FileIndexer {
    index: Index,
    reader: IndexReader,
    writer: Arc<RwLock<IndexWriter>>,
    schema: Schema,
    config: IndexConfig,
    path_field: Field,
    name_field: Field,
    extension_field: Field,
    content_field: Field,
    size_field: Field,
    modified_field: Field,
    is_dir_field: Field,
}

impl FileIndexer {
    pub fn new(index_dir: PathBuf, config: IndexConfig) -> Result<Self, String> {
        let mut schema_builder = Schema::builder();

        let text_options = TextOptions::default()
            .set_indexing_options(
                TextFieldIndexing::default()
                    .set_tokenizer("default")
                    .set_index_option(IndexRecordOption::WithFreqsAndPositions),
            )
            .set_stored();

        let path_field = schema_builder.add_text_field("path", STRING | STORED);
        let name_field = schema_builder.add_text_field("name", text_options.clone());
        let extension_field = schema_builder.add_text_field("extension", STRING | STORED);
        let content_field = schema_builder.add_text_field("content", TEXT);
        let size_field = schema_builder.add_u64_field("size", INDEXED | STORED);
        let modified_field = schema_builder.add_i64_field("modified", INDEXED | STORED);
        let is_dir_field = schema_builder.add_u64_field("is_dir", INDEXED | STORED);

        let schema = schema_builder.build();

        std::fs::create_dir_all(&index_dir).map_err(|e| e.to_string())?;

        let index = if index_dir.join("meta.json").exists() {
            Index::open_in_dir(&index_dir).map_err(|e| e.to_string())?
        } else {
            Index::create_in_dir(&index_dir, schema.clone()).map_err(|e| e.to_string())?
        };

        let writer = index.writer(50_000_000).map_err(|e| e.to_string())?;

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()
            .map_err(|e| e.to_string())?;

        Ok(Self {
            index,
            reader,
            writer: Arc::new(RwLock::new(writer)),
            schema,
            config,
            path_field,
            name_field,
            extension_field,
            content_field,
            size_field,
            modified_field,
            is_dir_field,
        })
    }

    pub fn index_all(&self) -> Result<usize, String> {
        let mut count = 0;

        {
            let mut writer = self.writer.write();
            writer.delete_all_documents().map_err(|e| e.to_string())?;
        }

        for base_path in &self.config.index_paths {
            if !base_path.exists() {
                continue;
            }

            for entry in WalkDir::new(base_path)
                .follow_links(false)
                .into_iter()
                .filter_entry(|e| !self.config.should_exclude(e.path()))
            {
                let entry = match entry {
                    Ok(e) => e,
                    Err(_) => continue,
                };

                let path = entry.path();
                let metadata = match entry.metadata() {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                if metadata.len() > self.config.max_file_size_mb * 1024 * 1024 {
                    continue;
                }

                if let Err(e) = self.index_file(path, &metadata) {
                    eprintln!("Failed to index {}: {}", path.display(), e);
                    continue;
                }

                count += 1;

                if count % 1000 == 0 {
                    let mut writer = self.writer.write();
                    let _ = writer.commit();
                }
            }
        }

        {
            let mut writer = self.writer.write();
            writer.commit().map_err(|e| e.to_string())?;
        }

        Ok(count)
    }

    pub fn index_file(&self, path: &Path, metadata: &std::fs::Metadata) -> Result<(), String> {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = path.extension().map(|e| e.to_string_lossy().to_string());

        let modified = metadata
            .modified()
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(|_| Utc::now());

        let content = if self.config.should_index_content(path) && metadata.is_file() {
            std::fs::read_to_string(path).unwrap_or_default()
        } else {
            String::new()
        };

        let mut doc = tantivy::TantivyDocument::new();
        doc.add_text(self.path_field, path.to_string_lossy());
        doc.add_text(self.name_field, &name);
        doc.add_text(self.extension_field, extension.as_deref().unwrap_or(""));
        doc.add_text(self.content_field, &content);
        doc.add_u64(self.size_field, metadata.len());
        doc.add_i64(self.modified_field, modified.timestamp());
        doc.add_u64(self.is_dir_field, if metadata.is_dir() { 1 } else { 0 });

        let mut writer = self.writer.write();
        writer.add_document(doc).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn remove_file(&self, path: &Path) -> Result<(), String> {
        let term = tantivy::Term::from_field_text(self.path_field, &path.to_string_lossy());
        let mut writer = self.writer.write();
        writer.delete_term(term);
        Ok(())
    }

    pub fn update_file(&self, path: &Path) -> Result<(), String> {
        self.remove_file(path)?;

        if path.exists() {
            if let Ok(metadata) = std::fs::metadata(path) {
                self.index_file(path, &metadata)?;
            }
        }

        Ok(())
    }

    pub fn commit(&self) -> Result<(), String> {
        let mut writer = self.writer.write();
        writer.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<IndexedFile>, String> {
        let searcher = self.reader.searcher();

        let query_parser =
            QueryParser::for_index(&self.index, vec![self.name_field, self.content_field]);

        let query = query_parser
            .parse_query(query_str)
            .map_err(|e| e.to_string())?;

        let top_docs = searcher
            .search(&query, &TopDocs::with_limit(limit))
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();

        for (_score, doc_address) in top_docs {
            let doc: tantivy::TantivyDocument =
                searcher.doc(doc_address).map_err(|e| e.to_string())?;

            let path = doc
                .get_first(self.path_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let name = doc
                .get_first(self.name_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let extension = doc
                .get_first(self.extension_field)
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());

            let size = doc
                .get_first(self.size_field)
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let modified_ts = doc
                .get_first(self.modified_field)
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            let is_dir = doc
                .get_first(self.is_dir_field)
                .and_then(|v| v.as_u64())
                .map(|v| v == 1)
                .unwrap_or(false);

            let modified = DateTime::from_timestamp(modified_ts, 0).unwrap_or_else(|| Utc::now());

            results.push(IndexedFile {
                path,
                name,
                extension,
                size,
                modified,
                is_dir,
            });
        }

        Ok(results)
    }

    pub fn fuzzy_search(&self, query_str: &str, limit: usize) -> Result<Vec<IndexedFile>, String> {
        use fuzzy_matcher::skim::SkimMatcherV2;
        use fuzzy_matcher::FuzzyMatcher;

        let searcher = self.reader.searcher();
        let matcher = SkimMatcherV2::default();

        let all_docs = searcher
            .search(&tantivy::query::AllQuery, &TopDocs::with_limit(10000))
            .map_err(|e| e.to_string())?;

        let mut scored_results: Vec<(i64, IndexedFile)> = Vec::new();

        for (_score, doc_address) in all_docs {
            let doc: tantivy::TantivyDocument =
                searcher.doc(doc_address).map_err(|e| e.to_string())?;

            let name = doc
                .get_first(self.name_field)
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let path = doc
                .get_first(self.path_field)
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let name_score = matcher.fuzzy_match(name, query_str).unwrap_or(0);
            let path_score = matcher.fuzzy_match(path, query_str).unwrap_or(0) / 2;
            let total_score = name_score.max(path_score);

            if total_score > 0 {
                let extension = doc
                    .get_first(self.extension_field)
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty());

                let size = doc
                    .get_first(self.size_field)
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);

                let modified_ts = doc
                    .get_first(self.modified_field)
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);

                let is_dir = doc
                    .get_first(self.is_dir_field)
                    .and_then(|v| v.as_u64())
                    .map(|v| v == 1)
                    .unwrap_or(false);

                let modified =
                    DateTime::from_timestamp(modified_ts, 0).unwrap_or_else(|| Utc::now());

                scored_results.push((
                    total_score,
                    IndexedFile {
                        path: path.to_string(),
                        name: name.to_string(),
                        extension,
                        size,
                        modified,
                        is_dir,
                    },
                ));
            }
        }

        scored_results.sort_by(|a, b| b.0.cmp(&a.0));
        scored_results.truncate(limit);

        Ok(scored_results.into_iter().map(|(_, f)| f).collect())
    }

    pub fn get_stats(&self) -> Result<IndexStats, String> {
        let searcher = self.reader.searcher();
        let num_docs = searcher.num_docs() as usize;

        Ok(IndexStats {
            total_files: num_docs,
            index_paths: self.config.index_paths.clone(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub total_files: usize,
    pub index_paths: Vec<PathBuf>,
}
