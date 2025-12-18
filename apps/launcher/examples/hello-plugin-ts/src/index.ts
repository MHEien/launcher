/**
 * Hello Plugin (TypeScript)
 * 
 * A simple example plugin that demonstrates how to build
 * Launcher plugins using TypeScript and the @launcher/plugin-sdk.
 */

// Types for the plugin SDK
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  category?: string;
  action?: {
    type: 'open_url' | 'copy' | 'run_command' | 'custom';
    value: string;
  };
}

interface SearchInput {
  query: string;
}

interface SearchOutput {
  results: SearchResult[];
}

// Declare Host for Extism
declare const Host: {
  inputString(): string;
  outputString(s: string): void;
};

// Plugin state
let initialized = false;

/**
 * Initialize the plugin
 */
export function init(): void {
  console.log('Hello Plugin (TypeScript) initialized!');
  initialized = true;
}

/**
 * Search handler - called when the user types a query
 */
export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.toLowerCase();
  
  console.log(`Hello Plugin (TS) received search query: ${query}`);
  
  // Only show results if the query contains "hello" or starts with "hi"
  const results: SearchResult[] = [];
  
  if (query.includes('hello') || query.startsWith('hi')) {
    results.push({
      id: 'hello-ts-greeting',
      title: '👋 Hello from TypeScript!',
      subtitle: 'This is a TypeScript plugin',
      icon: '🟦',
      score: 100,
      category: 'Examples',
    });
    
    results.push({
      id: 'hello-ts-docs',
      title: '📚 Plugin SDK Documentation',
      subtitle: 'Learn how to build plugins',
      icon: '📖',
      score: 90,
      category: 'Examples',
      action: {
        type: 'open_url',
        value: 'https://github.com/launcher/launcher',
      },
    });
    
    results.push({
      id: 'hello-ts-copy',
      title: '📋 Copy "Hello World"',
      subtitle: 'Click to copy to clipboard',
      icon: '📝',
      score: 80,
      category: 'Examples',
      action: {
        type: 'copy',
        value: 'Hello World from TypeScript Plugin!',
      },
    });
  }
  
  // Echo back the query
  if (query.length > 0 && !query.includes('hello') && !query.startsWith('hi')) {
    results.push({
      id: 'hello-ts-echo',
      title: `Type "hello" to see TypeScript plugin results`,
      subtitle: `Current query: "${input.query}"`,
      icon: '💡',
      score: 10,
      category: 'Examples',
    });
  }
  
  const output: SearchOutput = { results };
  return JSON.stringify(output);
}

/**
 * Shutdown handler - called when the plugin is unloaded
 */
export function shutdown(): void {
  console.log('Hello Plugin (TypeScript) shutting down...');
  initialized = false;
}


