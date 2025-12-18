/**
 * Code Snippets Plugin
 * 
 * Store, organize, and quickly access code snippets.
 * Supports multiple languages, tags, and search.
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
  metadata?: Record<string, unknown>;
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

interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  description?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

// Language icons mapping
const LANGUAGE_ICONS: Record<string, string> = {
  javascript: '🟨',
  typescript: '🔷',
  python: '🐍',
  rust: '🦀',
  go: '🐹',
  java: '☕',
  csharp: '🟣',
  cpp: '⚡',
  c: '🔵',
  ruby: '💎',
  php: '🐘',
  swift: '🍎',
  kotlin: '🟠',
  html: '🌐',
  css: '🎨',
  sql: '🗃️',
  bash: '🖥️',
  shell: '🖥️',
  json: '📋',
  yaml: '📄',
  markdown: '📝',
  default: '📄',
};

// State
let snippets: Snippet[] = [];

/**
 * Generate unique ID
 */
function generateId(): string {
  return `snip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Initialize plugin
 */
export function init(): void {
  try {
    const saved = hostGetConfig('snippets');
    if (saved) {
      snippets = JSON.parse(saved);
    }
  } catch (e) {
    snippets = [];
  }
  
  // Add some default snippets if empty
  if (snippets.length === 0) {
    snippets = getDefaultSnippets();
    saveSnippets();
  }
  
  hostLog('info', `Code Snippets plugin initialized with ${snippets.length} snippets`);
}

/**
 * Get default snippets for new users
 */
function getDefaultSnippets(): Snippet[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      title: 'Console Log with Styling',
      code: 'console.log("%c Hello World!", "color: #ff6b6b; font-size: 20px; font-weight: bold;");',
      language: 'javascript',
      description: 'Log styled text to the console',
      tags: ['console', 'debug', 'styling'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'Async/Await Try-Catch',
      code: `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}`,
      language: 'javascript',
      description: 'Fetch data with proper error handling',
      tags: ['async', 'fetch', 'error-handling'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'TypeScript Interface',
      code: `interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}`,
      language: 'typescript',
      description: 'A typical user interface definition',
      tags: ['interface', 'type', 'user'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'React useState Hook',
      code: `const [state, setState] = useState<T>(initialValue);

// With callback for previous state
setState(prev => ({ ...prev, key: newValue }));`,
      language: 'typescript',
      description: 'React useState with TypeScript',
      tags: ['react', 'hooks', 'state'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'Python List Comprehension',
      code: `# Basic
squares = [x**2 for x in range(10)]

# With condition
evens = [x for x in range(20) if x % 2 == 0]

# Nested
matrix = [[i*j for j in range(3)] for i in range(3)]`,
      language: 'python',
      description: 'Common list comprehension patterns',
      tags: ['python', 'list', 'comprehension'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'SQL SELECT with JOINs',
      code: `SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count,
  COALESCE(SUM(o.total), 0) as total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 10;`,
      language: 'sql',
      description: 'Complex SELECT with JOIN, GROUP BY, and aggregations',
      tags: ['sql', 'join', 'aggregate'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'Rust Error Handling',
      code: `fn read_file(path: &str) -> Result<String, std::io::Error> {
    let content = std::fs::read_to_string(path)?;
    Ok(content)
}

// Using match
match read_file("config.toml") {
    Ok(content) => println!("Content: {}", content),
    Err(e) => eprintln!("Error: {}", e),
}

// Using unwrap_or_else
let content = read_file("config.toml")
    .unwrap_or_else(|e| {
        eprintln!("Failed to read: {}", e);
        String::new()
    });`,
      language: 'rust',
      description: 'Rust Result type error handling patterns',
      tags: ['rust', 'error', 'result'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: generateId(),
      title: 'Git Undo Commands',
      code: `# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo staged changes
git reset HEAD <file>

# Discard local changes
git checkout -- <file>

# Revert a specific commit
git revert <commit-hash>`,
      language: 'bash',
      description: 'Common git undo operations',
      tags: ['git', 'undo', 'reset'],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
  ];
}

/**
 * Save snippets to storage
 */
function saveSnippets(): void {
  try {
    hostSetConfig('snippets', JSON.stringify(snippets));
  } catch (e) {
    hostLog('error', `Failed to save snippets: ${e}`);
  }
}

/**
 * Get icon for language
 */
function getLanguageIcon(language: string): string {
  return LANGUAGE_ICONS[language.toLowerCase()] || LANGUAGE_ICONS.default;
}

/**
 * Truncate code for preview
 */
function truncateCode(code: string, maxLines = 2): string {
  const lines = code.split('\n').slice(0, maxLines);
  let preview = lines.join(' ').trim();
  if (preview.length > 80) {
    preview = preview.slice(0, 77) + '...';
  } else if (code.split('\n').length > maxLines) {
    preview += '...';
  }
  return preview;
}

/**
 * Search snippets
 */
function searchSnippets(query: string, language?: string): Snippet[] {
  let results = snippets;
  
  if (language) {
    results = results.filter(s => s.language.toLowerCase() === language.toLowerCase());
  }
  
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q)) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  
  // Sort by usage count, then by most recent
  return results.sort((a, b) => {
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount;
    }
    return b.updatedAt - a.updatedAt;
  });
}

/**
 * Search handler
 */
export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.trim();
  
  const results: SearchResult[] = [];
  
  // Parse query for language filter (e.g., "lang:javascript fetch")
  let searchQuery = query;
  let languageFilter: string | undefined;
  
  const langMatch = query.match(/lang:(\w+)/i);
  if (langMatch) {
    languageFilter = langMatch[1];
    searchQuery = query.replace(langMatch[0], '').trim();
  }
  
  const matches = searchSnippets(searchQuery, languageFilter);
  
  // Convert to results
  for (let i = 0; i < Math.min(matches.length, 20); i++) {
    const snippet = matches[i];
    results.push({
      id: snippet.id,
      title: `${getLanguageIcon(snippet.language)} ${snippet.title}`,
      subtitle: truncateCode(snippet.code),
      icon: getLanguageIcon(snippet.language),
      score: 100 - i,
      category: snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1),
      action: {
        type: 'copy',
        value: snippet.code,
      },
      metadata: {
        snippetId: snippet.id,
        language: snippet.language,
        tags: snippet.tags,
      },
    });
  }
  
  // Add helpful hints
  if (results.length === 0 && query) {
    results.push({
      id: 'no-results',
      title: `No snippets found for "${query}"`,
      subtitle: 'Try different keywords or create a new snippet',
      icon: '🔍',
      score: 1,
      category: 'Snippets',
    });
  }
  
  if (!query && snippets.length === 0) {
    results.push({
      id: 'empty',
      title: 'No snippets yet',
      subtitle: 'Create your first snippet to get started',
      icon: '📝',
      score: 1,
      category: 'Snippets',
    });
  }
  
  // Add language filter hint
  if (!query && !languageFilter) {
    const languages = [...new Set(snippets.map(s => s.language))];
    if (languages.length > 0) {
      results.push({
        id: 'filter-hint',
        title: 'Filter by language',
        subtitle: `Try: lang:${languages[0]} or lang:${languages.slice(0, 3).join(', lang:')}`,
        icon: '💡',
        score: 0,
        category: 'Hint',
      });
    }
  }
  
  return JSON.stringify({ results } as SearchOutput);
}

/**
 * Execute action
 */
export function execute(): string {
  const inputJson = Host.inputString();
  const input = JSON.parse(inputJson);
  
  // Track snippet usage
  if (input.snippetId) {
    const snippet = snippets.find(s => s.id === input.snippetId);
    if (snippet) {
      snippet.usageCount++;
      saveSnippets();
    }
  }
  
  // Create snippet
  if (input.action === 'create_snippet') {
    const newSnippet: Snippet = {
      id: generateId(),
      title: input.title || 'Untitled Snippet',
      code: input.code || '',
      language: input.language || 'text',
      description: input.description,
      tags: input.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    
    snippets.unshift(newSnippet);
    saveSnippets();
    
    return JSON.stringify({ success: true, id: newSnippet.id });
  }
  
  // Edit snippet
  if (input.action === 'edit_snippet' && input.snippetId) {
    const snippet = snippets.find(s => s.id === input.snippetId);
    if (snippet) {
      if (input.title) snippet.title = input.title;
      if (input.code) snippet.code = input.code;
      if (input.language) snippet.language = input.language;
      if (input.description !== undefined) snippet.description = input.description;
      if (input.tags) snippet.tags = input.tags;
      snippet.updatedAt = Date.now();
      
      saveSnippets();
      return JSON.stringify({ success: true });
    }
    return JSON.stringify({ success: false, error: 'Snippet not found' });
  }
  
  // Delete snippet
  if (input.action === 'delete_snippet' && input.snippetId) {
    const index = snippets.findIndex(s => s.id === input.snippetId);
    if (index !== -1) {
      snippets.splice(index, 1);
      saveSnippets();
      return JSON.stringify({ success: true });
    }
    return JSON.stringify({ success: false, error: 'Snippet not found' });
  }
  
  return JSON.stringify({ success: true });
}

/**
 * AI Tool handler
 */
export function ai_tool(): string {
  const inputJson = Host.inputString();
  const input: AIToolInput = JSON.parse(inputJson);
  
  if (input.tool === 'search_snippets') {
    const query = input.arguments.query as string || '';
    const language = input.arguments.language as string | undefined;
    
    const matches = searchSnippets(query, language).slice(0, 10);
    
    return JSON.stringify({
      result: JSON.stringify({
        query,
        language: language || 'all',
        count: matches.length,
        snippets: matches.map(s => ({
          id: s.id,
          title: s.title,
          language: s.language,
          code: s.code.slice(0, 500),
          tags: s.tags,
        })),
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'create_snippet') {
    const { title, code, language, description, tags } = input.arguments as {
      title: string;
      code: string;
      language: string;
      description?: string;
      tags?: string[];
    };
    
    const newSnippet: Snippet = {
      id: generateId(),
      title,
      code,
      language: language.toLowerCase(),
      description,
      tags: tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    
    snippets.unshift(newSnippet);
    saveSnippets();
    
    return JSON.stringify({
      result: JSON.stringify({
        success: true,
        id: newSnippet.id,
        message: `Created snippet "${title}"`,
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'list_snippets') {
    const language = input.arguments.language as string | undefined;
    const limit = (input.arguments.limit as number) || 20;
    
    let results = snippets;
    if (language) {
      results = results.filter(s => s.language.toLowerCase() === language.toLowerCase());
    }
    results = results.slice(0, limit);
    
    return JSON.stringify({
      result: JSON.stringify({
        total: snippets.length,
        filtered: results.length,
        snippets: results.map(s => ({
          id: s.id,
          title: s.title,
          language: s.language,
          tags: s.tags,
          usageCount: s.usageCount,
        })),
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
  saveSnippets();
  hostLog('info', 'Code Snippets plugin shutting down');
}

