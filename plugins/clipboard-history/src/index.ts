/**
 * Clipboard History Plugin
 * 
 * Tracks and manages clipboard history, allowing users to search
 * and access previously copied items.
 */

// Extism host functions
declare const Host: {
  inputString(): string;
  outputString(s: string): void;
};

// Host API functions (provided by Launcher runtime)
declare const hostLog: (level: string, message: string) => void;
declare const hostGetConfig: (key: string) => string | null;
declare const hostSetConfig: (key: string, value: string) => void;
declare const hostGetClipboard: () => string;
declare const hostSetClipboard: (value: string) => void;

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  category?: string;
  action?: {
    type: 'copy' | 'custom';
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

interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: number;
  isPinned: boolean;
  type: 'text' | 'url' | 'code' | 'other';
}

interface AIToolInput {
  tool: string;
  arguments: Record<string, unknown>;
}

// In-memory history (in production, this would persist via host config)
let history: ClipboardEntry[] = [];
let lastClipboardContent = '';
const MAX_HISTORY_SIZE = 100;

/**
 * Initialize the plugin
 */
export function init(): void {
  // Load persisted history from config
  try {
    const savedHistory = hostGetConfig('history');
    if (savedHistory) {
      history = JSON.parse(savedHistory);
    }
  } catch (e) {
    history = [];
  }
  
  hostLog('info', `Clipboard History plugin initialized with ${history.length} entries`);
}

/**
 * Detect content type
 */
function detectContentType(content: string): ClipboardEntry['type'] {
  // URL detection
  if (/^https?:\/\/[^\s]+$/i.test(content.trim())) {
    return 'url';
  }
  
  // Code detection (basic heuristics)
  if (
    content.includes('function ') ||
    content.includes('const ') ||
    content.includes('let ') ||
    content.includes('import ') ||
    content.includes('class ') ||
    /^[\s]*[{[\]}<>]/.test(content) ||
    content.includes('=>') ||
    content.includes('def ') ||
    content.includes('fn ')
  ) {
    return 'code';
  }
  
  return 'text';
}

/**
 * Add a new entry to history
 */
function addToHistory(content: string): void {
  // Don't add duplicates of the most recent entry
  if (history.length > 0 && history[0].content === content) {
    return;
  }
  
  // Check for existing entry (move to top if found)
  const existingIndex = history.findIndex(e => e.content === content);
  if (existingIndex !== -1) {
    const [existing] = history.splice(existingIndex, 1);
    existing.timestamp = Date.now();
    history.unshift(existing);
  } else {
    // Add new entry
    const entry: ClipboardEntry = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      content,
      timestamp: Date.now(),
      isPinned: false,
      type: detectContentType(content),
    };
    history.unshift(entry);
  }
  
  // Trim history (keep pinned items)
  const pinned = history.filter(e => e.isPinned);
  const unpinned = history.filter(e => !e.isPinned);
  
  if (unpinned.length > MAX_HISTORY_SIZE - pinned.length) {
    history = [...pinned, ...unpinned.slice(0, MAX_HISTORY_SIZE - pinned.length)];
  }
  
  // Persist
  saveHistory();
}

/**
 * Save history to persistent storage
 */
function saveHistory(): void {
  try {
    hostSetConfig('history', JSON.stringify(history));
  } catch (e) {
    hostLog('error', `Failed to save clipboard history: ${e}`);
  }
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get icon for content type
 */
function getIcon(entry: ClipboardEntry): string {
  if (entry.isPinned) return '📌';
  
  switch (entry.type) {
    case 'url': return '🔗';
    case 'code': return '💻';
    default: return '📋';
  }
}

/**
 * Truncate content for display
 */
function truncate(content: string, maxLength = 60): string {
  const singleLine = content.replace(/\n/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + '...';
}

/**
 * Search handler - called when the user types a query
 */
export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.toLowerCase().trim();
  
  // Check for new clipboard content
  try {
    const currentClipboard = hostGetClipboard();
    if (currentClipboard && currentClipboard !== lastClipboardContent) {
      lastClipboardContent = currentClipboard;
      addToHistory(currentClipboard);
    }
  } catch (e) {
    // Clipboard access may fail
  }
  
  let results: SearchResult[] = [];
  
  // Filter and search history
  const filtered = query
    ? history.filter(entry => 
        entry.content.toLowerCase().includes(query)
      )
    : history;
  
  // Sort: pinned first, then by timestamp
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
  
  // Convert to search results
  results = sorted.slice(0, 20).map((entry, index) => ({
    id: entry.id,
    title: truncate(entry.content),
    subtitle: `${formatRelativeTime(entry.timestamp)} • ${entry.type}`,
    icon: getIcon(entry),
    score: 100 - index,
    category: 'Clipboard',
    action: {
      type: 'copy' as const,
      value: entry.content,
    },
    metadata: {
      entryId: entry.id,
      isPinned: entry.isPinned,
      fullContent: entry.content,
    },
  }));
  
  // Add helper result if no history
  if (results.length === 0 && !query) {
    results.push({
      id: 'clipboard-empty',
      title: 'No clipboard history yet',
      subtitle: 'Copy something to start building your history',
      icon: '📋',
      score: 1,
      category: 'Clipboard',
    });
  }
  
  // Add search hint if query but no results
  if (results.length === 0 && query) {
    results.push({
      id: 'clipboard-no-results',
      title: `No matches for "${query}"`,
      subtitle: `${history.length} items in history`,
      icon: '🔍',
      score: 1,
      category: 'Clipboard',
    });
  }
  
  const output: SearchOutput = { results };
  return JSON.stringify(output);
}

/**
 * Execute an action
 */
export function execute(): string {
  const inputJson = Host.inputString();
  const input = JSON.parse(inputJson);
  
  if (input.action === 'pin_item' && input.itemId) {
    const entry = history.find(e => e.id === input.itemId);
    if (entry) {
      entry.isPinned = !entry.isPinned;
      saveHistory();
      return JSON.stringify({ success: true, isPinned: entry.isPinned });
    }
  }
  
  if (input.action === 'delete_item' && input.itemId) {
    const index = history.findIndex(e => e.id === input.itemId);
    if (index !== -1) {
      history.splice(index, 1);
      saveHistory();
      return JSON.stringify({ success: true });
    }
  }
  
  if (input.action === 'clear_history') {
    // Keep pinned items
    history = history.filter(e => e.isPinned);
    saveHistory();
    return JSON.stringify({ success: true, remaining: history.length });
  }
  
  return JSON.stringify({ success: false, error: 'Unknown action' });
}

/**
 * AI Tool handler - called when AI invokes a tool
 */
export function ai_tool(): string {
  const inputJson = Host.inputString();
  const input: AIToolInput = JSON.parse(inputJson);
  
  if (input.tool === 'search_clipboard') {
    const query = (input.arguments.query as string || '').toLowerCase();
    const limit = (input.arguments.limit as number) || 10;
    
    const matches = history
      .filter(entry => entry.content.toLowerCase().includes(query))
      .slice(0, limit)
      .map(entry => ({
        content: entry.content.slice(0, 200),
        type: entry.type,
        timestamp: new Date(entry.timestamp).toISOString(),
        isPinned: entry.isPinned,
      }));
    
    return JSON.stringify({
      result: JSON.stringify({
        query,
        matches,
        totalMatches: matches.length,
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'get_recent_clips') {
    const count = (input.arguments.count as number) || 10;
    
    const recent = history
      .slice(0, count)
      .map(entry => ({
        content: entry.content.slice(0, 200),
        type: entry.type,
        timestamp: new Date(entry.timestamp).toISOString(),
        isPinned: entry.isPinned,
      }));
    
    return JSON.stringify({
      result: JSON.stringify({
        count: recent.length,
        entries: recent,
      }),
      isError: false,
    });
  }
  
  return JSON.stringify({
    result: 'Unknown tool',
    isError: true,
  });
}

/**
 * Shutdown handler
 */
export function shutdown(): void {
  saveHistory();
  hostLog('info', 'Clipboard History plugin shutting down');
}

