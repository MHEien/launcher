use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};

pub struct CalculatorProvider;

impl CalculatorProvider {
    pub fn new() -> Self {
        Self
    }

    fn is_math_expression(query: &str) -> bool {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return false;
        }

        let has_operator = trimmed.contains('+')
            || trimmed.contains('-')
            || trimmed.contains('*')
            || trimmed.contains('/')
            || trimmed.contains('^')
            || trimmed.contains('%')
            || trimmed.contains('(');

        let has_math_func = trimmed.starts_with("sqrt")
            || trimmed.starts_with("sin")
            || trimmed.starts_with("cos")
            || trimmed.starts_with("tan")
            || trimmed.starts_with("log")
            || trimmed.starts_with("ln")
            || trimmed.starts_with("abs")
            || trimmed.starts_with("floor")
            || trimmed.starts_with("ceil");

        has_operator || has_math_func
    }
}

impl SearchProvider for CalculatorProvider {
    fn id(&self) -> &str {
        "calculator"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if !Self::is_math_expression(query) {
            return vec![];
        }

        match meval::eval_str(query) {
            Ok(result) => {
                let formatted = if result.fract() == 0.0 && result.abs() < 1e15 {
                    format!("{}", result as i64)
                } else {
                    format!("{:.10}", result)
                        .trim_end_matches('0')
                        .trim_end_matches('.')
                        .to_string()
                };

                vec![SearchResult {
                    id: format!("calc:{}", formatted),
                    title: formatted,
                    subtitle: Some(format!("= {}", query)),
                    icon: ResultIcon::Emoji("🔢".to_string()),
                    category: ResultCategory::Calculator,
                    score: 1000.0,
                }]
            }
            Err(_) => vec![],
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if let Some(value) = result_id.strip_prefix("calc:") {
            println!("Copy to clipboard: {}", value);
            Ok(())
        } else {
            Err("Invalid calculator result".to_string())
        }
    }
}
