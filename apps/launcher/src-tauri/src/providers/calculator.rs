use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use std::collections::HashMap;

/// Unit conversion definitions
struct UnitConverter {
    conversions: HashMap<(&'static str, &'static str), f64>,
    unit_aliases: HashMap<&'static str, &'static str>,
    unit_names: HashMap<&'static str, &'static str>,
}

impl UnitConverter {
    fn new() -> Self {
        let mut conversions = HashMap::new();
        let mut unit_aliases = HashMap::new();
        let mut unit_names = HashMap::new();

        // Length conversions (base: meters)
        conversions.insert(("m", "km"), 0.001);
        conversions.insert(("km", "m"), 1000.0);
        conversions.insert(("m", "cm"), 100.0);
        conversions.insert(("cm", "m"), 0.01);
        conversions.insert(("m", "mm"), 1000.0);
        conversions.insert(("mm", "m"), 0.001);
        conversions.insert(("m", "mi"), 0.000621371);
        conversions.insert(("mi", "m"), 1609.344);
        conversions.insert(("m", "ft"), 3.28084);
        conversions.insert(("ft", "m"), 0.3048);
        conversions.insert(("m", "in"), 39.3701);
        conversions.insert(("in", "m"), 0.0254);
        conversions.insert(("m", "yd"), 1.09361);
        conversions.insert(("yd", "m"), 0.9144);
        conversions.insert(("km", "mi"), 0.621371);
        conversions.insert(("mi", "km"), 1.60934);
        conversions.insert(("ft", "in"), 12.0);
        conversions.insert(("in", "ft"), 1.0 / 12.0);
        conversions.insert(("ft", "cm"), 30.48);
        conversions.insert(("cm", "ft"), 1.0 / 30.48);

        // Weight conversions (base: kg)
        conversions.insert(("kg", "g"), 1000.0);
        conversions.insert(("g", "kg"), 0.001);
        conversions.insert(("kg", "mg"), 1_000_000.0);
        conversions.insert(("mg", "kg"), 0.000001);
        conversions.insert(("kg", "lb"), 2.20462);
        conversions.insert(("lb", "kg"), 0.453592);
        conversions.insert(("kg", "oz"), 35.274);
        conversions.insert(("oz", "kg"), 0.0283495);
        conversions.insert(("lb", "oz"), 16.0);
        conversions.insert(("oz", "lb"), 0.0625);
        conversions.insert(("lb", "g"), 453.592);
        conversions.insert(("g", "lb"), 0.00220462);

        // Temperature (special handling needed)
        conversions.insert(("c", "f"), 0.0); // Special marker
        conversions.insert(("f", "c"), 0.0);
        conversions.insert(("c", "k"), 0.0);
        conversions.insert(("k", "c"), 0.0);
        conversions.insert(("f", "k"), 0.0);
        conversions.insert(("k", "f"), 0.0);

        // Volume conversions (base: liters)
        conversions.insert(("l", "ml"), 1000.0);
        conversions.insert(("ml", "l"), 0.001);
        conversions.insert(("l", "gal"), 0.264172);
        conversions.insert(("gal", "l"), 3.78541);
        conversions.insert(("l", "qt"), 1.05669);
        conversions.insert(("qt", "l"), 0.946353);
        conversions.insert(("l", "pt"), 2.11338);
        conversions.insert(("pt", "l"), 0.473176);
        conversions.insert(("l", "cup"), 4.22675);
        conversions.insert(("cup", "l"), 0.236588);
        conversions.insert(("l", "floz"), 33.814);
        conversions.insert(("floz", "l"), 0.0295735);

        // Time conversions (base: seconds)
        conversions.insert(("s", "ms"), 1000.0);
        conversions.insert(("ms", "s"), 0.001);
        conversions.insert(("s", "min"), 1.0 / 60.0);
        conversions.insert(("min", "s"), 60.0);
        conversions.insert(("min", "hr"), 1.0 / 60.0);
        conversions.insert(("hr", "min"), 60.0);
        conversions.insert(("hr", "day"), 1.0 / 24.0);
        conversions.insert(("day", "hr"), 24.0);
        conversions.insert(("day", "wk"), 1.0 / 7.0);
        conversions.insert(("wk", "day"), 7.0);

        // Data size conversions (base: bytes)
        conversions.insert(("b", "kb"), 1.0 / 1024.0);
        conversions.insert(("kb", "b"), 1024.0);
        conversions.insert(("kb", "mb"), 1.0 / 1024.0);
        conversions.insert(("mb", "kb"), 1024.0);
        conversions.insert(("mb", "gb"), 1.0 / 1024.0);
        conversions.insert(("gb", "mb"), 1024.0);
        conversions.insert(("gb", "tb"), 1.0 / 1024.0);
        conversions.insert(("tb", "gb"), 1024.0);

        // Unit aliases
        unit_aliases.insert("meters", "m");
        unit_aliases.insert("meter", "m");
        unit_aliases.insert("kilometres", "km");
        unit_aliases.insert("kilometers", "km");
        unit_aliases.insert("kilometre", "km");
        unit_aliases.insert("kilometer", "km");
        unit_aliases.insert("centimeters", "cm");
        unit_aliases.insert("centimeter", "cm");
        unit_aliases.insert("millimeters", "mm");
        unit_aliases.insert("millimeter", "mm");
        unit_aliases.insert("miles", "mi");
        unit_aliases.insert("mile", "mi");
        unit_aliases.insert("feet", "ft");
        unit_aliases.insert("foot", "ft");
        unit_aliases.insert("inches", "in");
        unit_aliases.insert("inch", "in");
        unit_aliases.insert("yards", "yd");
        unit_aliases.insert("yard", "yd");
        unit_aliases.insert("kilograms", "kg");
        unit_aliases.insert("kilogram", "kg");
        unit_aliases.insert("grams", "g");
        unit_aliases.insert("gram", "g");
        unit_aliases.insert("milligrams", "mg");
        unit_aliases.insert("milligram", "mg");
        unit_aliases.insert("pounds", "lb");
        unit_aliases.insert("pound", "lb");
        unit_aliases.insert("lbs", "lb");
        unit_aliases.insert("ounces", "oz");
        unit_aliases.insert("ounce", "oz");
        unit_aliases.insert("celsius", "c");
        unit_aliases.insert("fahrenheit", "f");
        unit_aliases.insert("kelvin", "k");
        unit_aliases.insert("liters", "l");
        unit_aliases.insert("liter", "l");
        unit_aliases.insert("litres", "l");
        unit_aliases.insert("litre", "l");
        unit_aliases.insert("milliliters", "ml");
        unit_aliases.insert("milliliter", "ml");
        unit_aliases.insert("millilitres", "ml");
        unit_aliases.insert("millilitre", "ml");
        unit_aliases.insert("gallons", "gal");
        unit_aliases.insert("gallon", "gal");
        unit_aliases.insert("quarts", "qt");
        unit_aliases.insert("quart", "qt");
        unit_aliases.insert("pints", "pt");
        unit_aliases.insert("pint", "pt");
        unit_aliases.insert("cups", "cup");
        unit_aliases.insert("seconds", "s");
        unit_aliases.insert("second", "s");
        unit_aliases.insert("sec", "s");
        unit_aliases.insert("milliseconds", "ms");
        unit_aliases.insert("millisecond", "ms");
        unit_aliases.insert("minutes", "min");
        unit_aliases.insert("minute", "min");
        unit_aliases.insert("hours", "hr");
        unit_aliases.insert("hour", "hr");
        unit_aliases.insert("h", "hr");
        unit_aliases.insert("days", "day");
        unit_aliases.insert("weeks", "wk");
        unit_aliases.insert("week", "wk");
        unit_aliases.insert("bytes", "b");
        unit_aliases.insert("byte", "b");
        unit_aliases.insert("kilobytes", "kb");
        unit_aliases.insert("kilobyte", "kb");
        unit_aliases.insert("megabytes", "mb");
        unit_aliases.insert("megabyte", "mb");
        unit_aliases.insert("gigabytes", "gb");
        unit_aliases.insert("gigabyte", "gb");
        unit_aliases.insert("terabytes", "tb");
        unit_aliases.insert("terabyte", "tb");

        // Unit display names
        unit_names.insert("m", "meters");
        unit_names.insert("km", "kilometers");
        unit_names.insert("cm", "centimeters");
        unit_names.insert("mm", "millimeters");
        unit_names.insert("mi", "miles");
        unit_names.insert("ft", "feet");
        unit_names.insert("in", "inches");
        unit_names.insert("yd", "yards");
        unit_names.insert("kg", "kg");
        unit_names.insert("g", "g");
        unit_names.insert("mg", "mg");
        unit_names.insert("lb", "lb");
        unit_names.insert("oz", "oz");
        unit_names.insert("c", "°C");
        unit_names.insert("f", "°F");
        unit_names.insert("k", "K");
        unit_names.insert("l", "L");
        unit_names.insert("ml", "mL");
        unit_names.insert("gal", "gal");
        unit_names.insert("qt", "qt");
        unit_names.insert("pt", "pt");
        unit_names.insert("cup", "cups");
        unit_names.insert("floz", "fl oz");
        unit_names.insert("s", "s");
        unit_names.insert("ms", "ms");
        unit_names.insert("min", "min");
        unit_names.insert("hr", "hr");
        unit_names.insert("day", "days");
        unit_names.insert("wk", "weeks");
        unit_names.insert("b", "B");
        unit_names.insert("kb", "KB");
        unit_names.insert("mb", "MB");
        unit_names.insert("gb", "GB");
        unit_names.insert("tb", "TB");

        Self {
            conversions,
            unit_aliases,
            unit_names,
        }
    }

    fn normalize_unit(&self, unit: &str) -> Option<&'static str> {
        let lower = unit.to_lowercase();
        let lower_ref: &str = &lower;

        // Check if it's already a canonical unit
        if self.unit_names.contains_key(lower_ref) {
            // Find the static reference
            for (key, _) in &self.unit_names {
                if *key == lower_ref {
                    return Some(*key);
                }
            }
        }

        // Check aliases
        if let Some(&canonical) = self.unit_aliases.get(lower_ref) {
            return Some(canonical);
        }

        None
    }

    fn get_unit_name<'a>(&self, unit: &'a str) -> &'a str
    where
        Self: 'a,
    {
        self.unit_names.get(unit).copied().unwrap_or(unit)
    }

    fn convert(&self, value: f64, from: &str, to: &str) -> Option<f64> {
        // Handle temperature specially
        if (from == "c" || from == "f" || from == "k")
            && (to == "c" || to == "f" || to == "k")
        {
            return Some(self.convert_temperature(value, from, to));
        }

        // Direct conversion
        if let Some(&factor) = self.conversions.get(&(from, to)) {
            return Some(value * factor);
        }

        // Try indirect conversion through a common base
        // For now, just use direct conversions
        None
    }

    fn convert_temperature(&self, value: f64, from: &str, to: &str) -> f64 {
        // Convert to Celsius first, then to target
        let celsius = match from {
            "c" => value,
            "f" => (value - 32.0) * 5.0 / 9.0,
            "k" => value - 273.15,
            _ => value,
        };

        match to {
            "c" => celsius,
            "f" => celsius * 9.0 / 5.0 + 32.0,
            "k" => celsius + 273.15,
            _ => celsius,
        }
    }

    /// Try to parse a unit conversion query like "100 km to miles" or "50kg in lb"
    fn parse_conversion(&self, query: &str) -> Option<(f64, &'static str, &'static str)> {
        let query_lower = query.to_lowercase();
        let query_ref: &str = &query_lower;

        // Patterns: "X unit to unit", "X unit in unit", "X unit -> unit", "X unit = unit"
        let patterns = [" to ", " in ", " -> ", " => ", " = "];

        for pattern in patterns {
            if let Some(pos) = query_ref.find(pattern) {
                let left = query_ref[..pos].trim();
                let right = query_ref[pos + pattern.len()..].trim();

                // Parse left side: "100 km" or "100km"
                if let Some((value, from_unit)) = self.parse_value_unit(left) {
                    if let Some(from) = self.normalize_unit(from_unit) {
                        if let Some(to) = self.normalize_unit(right) {
                            return Some((value, from, to));
                        }
                    }
                }
            }
        }

        None
    }

    fn parse_value_unit<'a>(&self, s: &'a str) -> Option<(f64, &'a str)> {
        let s = s.trim();
        
        // Find where numbers end and unit begins
        let mut num_end = 0;
        let mut found_digit = false;
        
        for (i, c) in s.char_indices() {
            if c.is_ascii_digit() || c == '.' || c == '-' || (c == '+' && !found_digit) {
                num_end = i + c.len_utf8();
                if c.is_ascii_digit() {
                    found_digit = true;
                }
            } else if found_digit {
                break;
            }
        }

        if !found_digit {
            return None;
        }

        let num_str = s[..num_end].trim();
        let unit_str = s[num_end..].trim();

        if unit_str.is_empty() {
            return None;
        }

        let value: f64 = num_str.parse().ok()?;
        Some((value, unit_str))
    }
}

pub struct CalculatorProvider {
    converter: UnitConverter,
}

impl CalculatorProvider {
    pub fn new() -> Self {
        Self {
            converter: UnitConverter::new(),
        }
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

    fn format_number(num: f64) -> String {
        if num.fract() == 0.0 && num.abs() < 1e15 {
            format!("{}", num as i64)
        } else {
            format!("{:.6}", num)
                .trim_end_matches('0')
                .trim_end_matches('.')
                .to_string()
        }
    }
}

impl SearchProvider for CalculatorProvider {
    fn id(&self) -> &str {
        "calculator"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        let mut results = Vec::new();

        // Try unit conversion first
        if let Some((value, from, to)) = self.converter.parse_conversion(query) {
            if let Some(converted) = self.converter.convert(value, from, to) {
                let from_name = self.converter.get_unit_name(from);
                let to_name = self.converter.get_unit_name(to);
                let formatted = Self::format_number(converted);

                results.push(SearchResult {
                    id: format!("calc:{} {}", formatted, to_name),
                    title: format!("{} {}", formatted, to_name),
                    subtitle: Some(format!("{} {} = {} {}", Self::format_number(value), from_name, formatted, to_name)),
                    icon: ResultIcon::Emoji("📐".to_string()),
                    category: ResultCategory::Calculator,
                    score: 1000.0,
                });

                return results;
            }
        }

        // Try math expression
        if Self::is_math_expression(query) {
            if let Ok(result) = meval::eval_str(query) {
                let formatted = Self::format_number(result);

                results.push(SearchResult {
                    id: format!("calc:{}", formatted),
                    title: formatted,
                    subtitle: Some(format!("= {}", query)),
                    icon: ResultIcon::Emoji("🔢".to_string()),
                    category: ResultCategory::Calculator,
                    score: 1000.0,
                });
            }
        }

        results
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if let Some(value) = result_id.strip_prefix("calc:") {
            // In a real implementation, this would copy to clipboard
            println!("Copy to clipboard: {}", value);
            Ok(())
        } else {
            Err("Invalid calculator result".to_string())
        }
    }
}
