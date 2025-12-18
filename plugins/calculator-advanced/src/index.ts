/**
 * Advanced Calculator Plugin
 * 
 * Features:
 * - Basic arithmetic (+, -, *, /, ^, %)
 * - Scientific functions (sin, cos, tan, log, ln, sqrt, etc.)
 * - Unit conversions (length, weight, temperature, etc.)
 * - Currency conversion (approximate rates)
 * - Expression history
 */

declare const Host: {
  inputString(): string;
  outputString(s: string): void;
};

declare const hostLog: (level: string, message: string) => void;
declare const hostGetConfig: (key: string) => string | null;
declare const hostSetConfig: (key: string, value: string) => void;

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  category?: string;
  action?: {
    type: 'copy';
    value: string;
  };
}

interface SearchInput {
  query: string;
}

interface SearchOutput {
  results: SearchResult[];
}

interface AIToolInput {
  tool: string;
  arguments: Record<string, unknown>;
}

// Math constants
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  phi: 1.618033988749895, // Golden ratio
  φ: 1.618033988749895,
  sqrt2: Math.SQRT2,
  sqrt3: 1.7320508075688772,
};

// Unit conversion factors (to base unit)
const UNITS: Record<string, Record<string, { factor: number; base: string }>> = {
  // Length (base: meters)
  length: {
    m: { factor: 1, base: 'm' },
    meter: { factor: 1, base: 'm' },
    meters: { factor: 1, base: 'm' },
    km: { factor: 1000, base: 'm' },
    kilometer: { factor: 1000, base: 'm' },
    kilometers: { factor: 1000, base: 'm' },
    cm: { factor: 0.01, base: 'm' },
    centimeter: { factor: 0.01, base: 'm' },
    mm: { factor: 0.001, base: 'm' },
    millimeter: { factor: 0.001, base: 'm' },
    mi: { factor: 1609.344, base: 'm' },
    mile: { factor: 1609.344, base: 'm' },
    miles: { factor: 1609.344, base: 'm' },
    yd: { factor: 0.9144, base: 'm' },
    yard: { factor: 0.9144, base: 'm' },
    yards: { factor: 0.9144, base: 'm' },
    ft: { factor: 0.3048, base: 'm' },
    foot: { factor: 0.3048, base: 'm' },
    feet: { factor: 0.3048, base: 'm' },
    in: { factor: 0.0254, base: 'm' },
    inch: { factor: 0.0254, base: 'm' },
    inches: { factor: 0.0254, base: 'm' },
    nm: { factor: 1852, base: 'm' },
    'nautical mile': { factor: 1852, base: 'm' },
  },
  // Weight (base: kilograms)
  weight: {
    kg: { factor: 1, base: 'kg' },
    kilogram: { factor: 1, base: 'kg' },
    kilograms: { factor: 1, base: 'kg' },
    g: { factor: 0.001, base: 'kg' },
    gram: { factor: 0.001, base: 'kg' },
    grams: { factor: 0.001, base: 'kg' },
    mg: { factor: 0.000001, base: 'kg' },
    milligram: { factor: 0.000001, base: 'kg' },
    lb: { factor: 0.453592, base: 'kg' },
    lbs: { factor: 0.453592, base: 'kg' },
    pound: { factor: 0.453592, base: 'kg' },
    pounds: { factor: 0.453592, base: 'kg' },
    oz: { factor: 0.0283495, base: 'kg' },
    ounce: { factor: 0.0283495, base: 'kg' },
    ounces: { factor: 0.0283495, base: 'kg' },
    ton: { factor: 1000, base: 'kg' },
    tons: { factor: 1000, base: 'kg' },
    tonne: { factor: 1000, base: 'kg' },
    st: { factor: 6.35029, base: 'kg' },
    stone: { factor: 6.35029, base: 'kg' },
  },
  // Volume (base: liters)
  volume: {
    l: { factor: 1, base: 'l' },
    liter: { factor: 1, base: 'l' },
    liters: { factor: 1, base: 'l' },
    litre: { factor: 1, base: 'l' },
    litres: { factor: 1, base: 'l' },
    ml: { factor: 0.001, base: 'l' },
    milliliter: { factor: 0.001, base: 'l' },
    gal: { factor: 3.78541, base: 'l' },
    gallon: { factor: 3.78541, base: 'l' },
    gallons: { factor: 3.78541, base: 'l' },
    qt: { factor: 0.946353, base: 'l' },
    quart: { factor: 0.946353, base: 'l' },
    pt: { factor: 0.473176, base: 'l' },
    pint: { factor: 0.473176, base: 'l' },
    cup: { factor: 0.236588, base: 'l' },
    cups: { factor: 0.236588, base: 'l' },
    floz: { factor: 0.0295735, base: 'l' },
    'fl oz': { factor: 0.0295735, base: 'l' },
  },
  // Time (base: seconds)
  time: {
    s: { factor: 1, base: 's' },
    sec: { factor: 1, base: 's' },
    second: { factor: 1, base: 's' },
    seconds: { factor: 1, base: 's' },
    ms: { factor: 0.001, base: 's' },
    millisecond: { factor: 0.001, base: 's' },
    min: { factor: 60, base: 's' },
    minute: { factor: 60, base: 's' },
    minutes: { factor: 60, base: 's' },
    h: { factor: 3600, base: 's' },
    hr: { factor: 3600, base: 's' },
    hour: { factor: 3600, base: 's' },
    hours: { factor: 3600, base: 's' },
    day: { factor: 86400, base: 's' },
    days: { factor: 86400, base: 's' },
    week: { factor: 604800, base: 's' },
    weeks: { factor: 604800, base: 's' },
    month: { factor: 2592000, base: 's' },
    months: { factor: 2592000, base: 's' },
    year: { factor: 31536000, base: 's' },
    years: { factor: 31536000, base: 's' },
  },
  // Data (base: bytes)
  data: {
    b: { factor: 1, base: 'b' },
    byte: { factor: 1, base: 'b' },
    bytes: { factor: 1, base: 'b' },
    kb: { factor: 1024, base: 'b' },
    kilobyte: { factor: 1024, base: 'b' },
    mb: { factor: 1048576, base: 'b' },
    megabyte: { factor: 1048576, base: 'b' },
    gb: { factor: 1073741824, base: 'b' },
    gigabyte: { factor: 1073741824, base: 'b' },
    tb: { factor: 1099511627776, base: 'b' },
    terabyte: { factor: 1099511627776, base: 'b' },
  },
};

// Currency rates (approximate, USD as base)
const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CNY: 7.24,
  INR: 83.12,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  KRW: 1320,
  BRL: 4.97,
  MXN: 17.15,
  SEK: 10.42,
  NOK: 10.65,
  DKK: 6.87,
  NZD: 1.64,
  SGD: 1.34,
  HKD: 7.82,
  RUB: 92.50,
  ZAR: 18.75,
};

// History
let history: Array<{ expression: string; result: string }> = [];
const MAX_HISTORY = 50;

/**
 * Initialize plugin
 */
export function init(): void {
  try {
    const savedHistory = hostGetConfig('history');
    if (savedHistory) {
      history = JSON.parse(savedHistory);
    }
  } catch (e) {
    history = [];
  }
  hostLog('info', 'Advanced Calculator plugin initialized');
}

/**
 * Save history
 */
function saveHistory(): void {
  try {
    hostSetConfig('history', JSON.stringify(history));
  } catch (e) {
    // Ignore
  }
}

/**
 * Add to history
 */
function addToHistory(expression: string, result: string): void {
  history.unshift({ expression, result });
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
  saveHistory();
}

/**
 * Tokenize expression
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    
    if (/[+\-*/^%()=,]/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
      continue;
    }
    
    current += char;
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
}

/**
 * Evaluate mathematical expression
 */
function evaluate(expr: string): number {
  // Replace constants
  let processed = expr.toLowerCase();
  for (const [name, value] of Object.entries(CONSTANTS)) {
    processed = processed.replace(new RegExp(`\\b${name}\\b`, 'gi'), value.toString());
  }
  
  // Handle percentage
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, (_, p, n) => {
    return `(${p}/100*${n})`;
  });
  
  // Handle scientific functions
  const functions: Record<string, (x: number) => number> = {
    sin: (x) => Math.sin(x * Math.PI / 180), // degrees
    cos: (x) => Math.cos(x * Math.PI / 180),
    tan: (x) => Math.tan(x * Math.PI / 180),
    asin: (x) => Math.asin(x) * 180 / Math.PI,
    acos: (x) => Math.acos(x) * 180 / Math.PI,
    atan: (x) => Math.atan(x) * 180 / Math.PI,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    log: Math.log10,
    log10: Math.log10,
    ln: Math.log,
    log2: Math.log2,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    exp: Math.exp,
    factorial: (n) => {
      if (n < 0 || !Number.isInteger(n)) return NaN;
      if (n === 0 || n === 1) return 1;
      let result = 1;
      for (let i = 2; i <= n; i++) result *= i;
      return result;
    },
  };
  
  // Replace function calls
  for (const [name, fn] of Object.entries(functions)) {
    const regex = new RegExp(`${name}\\(([^)]+)\\)`, 'gi');
    processed = processed.replace(regex, (_, arg) => {
      try {
        const value = evaluate(arg);
        return fn(value).toString();
      } catch {
        return 'NaN';
      }
    });
  }
  
  // Handle power (^)
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/g, (_, base, exp) => {
    return Math.pow(parseFloat(base), parseFloat(exp)).toString();
  });
  
  // Handle factorial (!)
  processed = processed.replace(/(\d+)!/g, (_, n) => {
    const num = parseInt(n);
    if (num < 0 || num > 170) return 'NaN';
    let result = 1;
    for (let i = 2; i <= num; i++) result *= i;
    return result.toString();
  });
  
  // Evaluate using Function (safe for math expressions)
  try {
    // Only allow safe characters
    if (!/^[\d+\-*/().%e\s]+$/i.test(processed)) {
      throw new Error('Invalid expression');
    }
    
    // Replace % with modulo operator context
    processed = processed.replace(/(\d+)\s*%\s*(\d+)/g, '($1%$2)');
    
    const result = new Function(`return (${processed})`)();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  } catch (e) {
    return NaN;
  }
}

/**
 * Convert units
 */
function convertUnits(value: number, from: string, to: string): { result: number; formatted: string } | null {
  from = from.toLowerCase();
  to = to.toLowerCase();
  
  // Handle temperature separately (not linear conversion)
  if (['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'].includes(from)) {
    let celsius: number;
    
    // Convert to Celsius first
    if (from === 'c' || from === 'celsius') {
      celsius = value;
    } else if (from === 'f' || from === 'fahrenheit') {
      celsius = (value - 32) * 5/9;
    } else if (from === 'k' || from === 'kelvin') {
      celsius = value - 273.15;
    } else {
      return null;
    }
    
    // Convert from Celsius to target
    let result: number;
    let unit: string;
    
    if (to === 'c' || to === 'celsius') {
      result = celsius;
      unit = '°C';
    } else if (to === 'f' || to === 'fahrenheit') {
      result = celsius * 9/5 + 32;
      unit = '°F';
    } else if (to === 'k' || to === 'kelvin') {
      result = celsius + 273.15;
      unit = 'K';
    } else {
      return null;
    }
    
    return {
      result,
      formatted: `${formatNumber(result)} ${unit}`,
    };
  }
  
  // Find unit categories
  let fromCategory: string | null = null;
  let toCategory: string | null = null;
  
  for (const [category, units] of Object.entries(UNITS)) {
    if (from in units) fromCategory = category;
    if (to in units) toCategory = category;
  }
  
  if (!fromCategory || !toCategory || fromCategory !== toCategory) {
    return null;
  }
  
  const fromUnit = UNITS[fromCategory][from];
  const toUnit = UNITS[fromCategory][to];
  
  // Convert: value * fromFactor / toFactor
  const result = value * fromUnit.factor / toUnit.factor;
  
  return {
    result,
    formatted: `${formatNumber(result)} ${to}`,
  };
}

/**
 * Convert currency
 */
function convertCurrency(amount: number, from: string, to: string): { result: number; formatted: string } | null {
  from = from.toUpperCase();
  to = to.toUpperCase();
  
  if (!(from in CURRENCY_RATES) || !(to in CURRENCY_RATES)) {
    return null;
  }
  
  // Convert to USD, then to target currency
  const usdAmount = amount / CURRENCY_RATES[from];
  const result = usdAmount * CURRENCY_RATES[to];
  
  return {
    result,
    formatted: `${formatNumber(result)} ${to}`,
  };
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  
  // Round to reasonable precision
  const precision = Math.abs(num) < 1 ? 6 : 4;
  return parseFloat(num.toPrecision(precision)).toLocaleString(undefined, {
    maximumFractionDigits: 10,
  });
}

/**
 * Parse unit conversion query
 */
function parseConversionQuery(query: string): { value: number; from: string; to: string } | null {
  // Patterns like "100 km to miles", "50 usd in eur", "32 f to c"
  const patterns = [
    /^([\d.]+)\s*(\w+)\s+(?:to|in|as|=)\s+(\w+)$/i,
    /^([\d.]+)\s*(\w+)\s*=\s*\?\s*(\w+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        value: parseFloat(match[1]),
        from: match[2],
        to: match[3],
      };
    }
  }
  
  return null;
}

/**
 * Search handler
 */
export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.trim();
  
  const results: SearchResult[] = [];
  
  if (!query) {
    // Show history
    for (let i = 0; i < Math.min(5, history.length); i++) {
      const item = history[i];
      results.push({
        id: `history-${i}`,
        title: `${item.expression} = ${item.result}`,
        subtitle: 'From history',
        icon: '🕐',
        score: 100 - i,
        category: 'Calculator',
        action: { type: 'copy', value: item.result },
      });
    }
    
    if (results.length === 0) {
      results.push({
        id: 'calc-hint',
        title: 'Type a calculation',
        subtitle: 'e.g., 2+2, sqrt(16), 100 km to miles',
        icon: '🧮',
        score: 1,
        category: 'Calculator',
      });
    }
    
    return JSON.stringify({ results } as SearchOutput);
  }
  
  // Check for unit/currency conversion
  const conversion = parseConversionQuery(query);
  if (conversion) {
    // Try unit conversion
    const unitResult = convertUnits(conversion.value, conversion.from, conversion.to);
    if (unitResult) {
      results.push({
        id: 'unit-conversion',
        title: unitResult.formatted,
        subtitle: `${conversion.value} ${conversion.from} = ${unitResult.formatted}`,
        icon: '📐',
        score: 100,
        category: 'Conversion',
        action: { type: 'copy', value: formatNumber(unitResult.result) },
      });
    }
    
    // Try currency conversion
    const currencyResult = convertCurrency(conversion.value, conversion.from, conversion.to);
    if (currencyResult) {
      results.push({
        id: 'currency-conversion',
        title: currencyResult.formatted,
        subtitle: `${conversion.value} ${conversion.from.toUpperCase()} ≈ ${currencyResult.formatted} (approximate)`,
        icon: '💱',
        score: 99,
        category: 'Currency',
        action: { type: 'copy', value: formatNumber(currencyResult.result) },
      });
    }
  }
  
  // Try mathematical evaluation
  try {
    const result = evaluate(query);
    if (!isNaN(result) && isFinite(result)) {
      const formatted = formatNumber(result);
      
      results.unshift({
        id: 'calc-result',
        title: formatted,
        subtitle: `${query} =`,
        icon: '🧮',
        score: 100,
        category: 'Calculator',
        action: { type: 'copy', value: result.toString() },
      });
      
      // Add to history
      addToHistory(query, formatted);
    }
  } catch (e) {
    // Not a valid expression
  }
  
  // If no results, show hint
  if (results.length === 0) {
    results.push({
      id: 'calc-invalid',
      title: 'Invalid expression',
      subtitle: 'Try: 2+2, sqrt(16), sin(45), 100 km to miles',
      icon: '❓',
      score: 1,
      category: 'Calculator',
    });
  }
  
  return JSON.stringify({ results } as SearchOutput);
}

/**
 * AI Tool handler
 */
export function ai_tool(): string {
  const inputJson = Host.inputString();
  const input: AIToolInput = JSON.parse(inputJson);
  
  if (input.tool === 'calculate') {
    const expression = input.arguments.expression as string;
    try {
      const result = evaluate(expression);
      if (isNaN(result) || !isFinite(result)) {
        return JSON.stringify({
          result: JSON.stringify({ error: 'Invalid expression' }),
          isError: true,
        });
      }
      return JSON.stringify({
        result: JSON.stringify({ expression, result, formatted: formatNumber(result) }),
        isError: false,
      });
    } catch (e) {
      return JSON.stringify({
        result: JSON.stringify({ error: 'Calculation failed' }),
        isError: true,
      });
    }
  }
  
  if (input.tool === 'convert_units') {
    const { value, from, to } = input.arguments as { value: number; from: string; to: string };
    const result = convertUnits(value, from, to);
    if (!result) {
      return JSON.stringify({
        result: JSON.stringify({ error: 'Unknown units or incompatible conversion' }),
        isError: true,
      });
    }
    return JSON.stringify({
      result: JSON.stringify({
        value,
        from,
        to,
        result: result.result,
        formatted: result.formatted,
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'convert_currency') {
    const { amount, from, to } = input.arguments as { amount: number; from: string; to: string };
    const result = convertCurrency(amount, from, to);
    if (!result) {
      return JSON.stringify({
        result: JSON.stringify({ error: 'Unknown currency code' }),
        isError: true,
      });
    }
    return JSON.stringify({
      result: JSON.stringify({
        amount,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        result: result.result,
        formatted: result.formatted,
        note: 'Rates are approximate',
      }),
      isError: false,
    });
  }
  
  return JSON.stringify({ result: 'Unknown tool', isError: true });
}

/**
 * Shutdown
 */
export function shutdown(): void {
  saveHistory();
  hostLog('info', 'Advanced Calculator plugin shutting down');
}

