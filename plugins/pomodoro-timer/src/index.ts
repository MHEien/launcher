/**
 * Pomodoro Timer Plugin
 * 
 * Stay focused with the Pomodoro Technique:
 * - 25 minute work sessions
 * - 5 minute short breaks
 * - 15 minute long breaks after 4 sessions
 * 
 * Commands:
 *   pomo:start   - Start a work session
 *   pomo:break   - Start a short break
 *   pomo:pause   - Pause the timer
 *   pomo:reset   - Reset the timer
 *   pomo:status  - Show current status
 *   pomo:stats   - Show today's statistics
 */

declare const Host: {
  inputString(): string;
  outputString(s: string): void;
};

declare const hostLog: (level: string, message: string) => void;
declare const hostGetConfig: (key: string) => string | null;
declare const hostSetConfig: (key: string, value: string) => void;
declare const hostShowNotification: (title: string, body: string) => void;

// Types
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  category?: string;
  action?: {
    type: string;
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

interface WidgetRenderInput {
  widget_id: string;
  width: number;
  height: number;
  config?: Record<string, unknown>;
}

interface WidgetOutput {
  type: 'stat' | 'custom';
  title?: string;
  value?: string;
  subtitle?: string;
  html?: string;
}

// Timer states
type TimerState = 'idle' | 'working' | 'short_break' | 'long_break' | 'paused';

interface TimerData {
  state: TimerState;
  previousState: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  pomodorosCompleted: number;
  startedAt: number | null;
  pausedAt: number | null;
}

interface DailyStats {
  date: string;
  pomodorosCompleted: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
}

// Configuration
const CONFIG = {
  workDuration: 25 * 60,      // 25 minutes
  shortBreakDuration: 5 * 60, // 5 minutes
  longBreakDuration: 15 * 60, // 15 minutes
  pomodorosUntilLongBreak: 4,
};

// State
let timer: TimerData = {
  state: 'idle',
  previousState: 'idle',
  remainingSeconds: CONFIG.workDuration,
  totalSeconds: CONFIG.workDuration,
  pomodorosCompleted: 0,
  startedAt: null,
  pausedAt: null,
};

let todayStats: DailyStats = {
  date: new Date().toISOString().split('T')[0],
  pomodorosCompleted: 0,
  totalFocusMinutes: 0,
  totalBreakMinutes: 0,
};

let weeklyStats: DailyStats[] = [];

// Helper functions
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getStateEmoji(state: TimerState): string {
  switch (state) {
    case 'working': return '🍅';
    case 'short_break': return '☕';
    case 'long_break': return '🧘';
    case 'paused': return '⏸️';
    default: return '⏹️';
  }
}

function getStateLabel(state: TimerState): string {
  switch (state) {
    case 'working': return 'Focus Time';
    case 'short_break': return 'Short Break';
    case 'long_break': return 'Long Break';
    case 'paused': return 'Paused';
    default: return 'Ready';
  }
}

function getProgressPercentage(): number {
  if (timer.totalSeconds === 0) return 0;
  return Math.round(((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100);
}

function loadState(): void {
  try {
    const savedTimer = hostGetConfig('timer');
    const savedToday = hostGetConfig('todayStats');
    const savedWeekly = hostGetConfig('weeklyStats');
    
    if (savedTimer) {
      const parsed = JSON.parse(savedTimer);
      // Recalculate remaining time if timer was running
      if (parsed.state === 'working' || parsed.state === 'short_break' || parsed.state === 'long_break') {
        if (parsed.startedAt) {
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
          parsed.remainingSeconds = Math.max(0, parsed.totalSeconds - elapsed);
          if (parsed.remainingSeconds === 0) {
            // Timer completed while app was closed
            parsed.state = 'idle';
            parsed.startedAt = null;
          }
        }
      }
      timer = parsed;
    }
    
    if (savedToday) {
      const parsed = JSON.parse(savedToday);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date === today) {
        todayStats = parsed;
      }
    }
    
    if (savedWeekly) {
      weeklyStats = JSON.parse(savedWeekly);
      // Keep only last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weeklyStats = weeklyStats.filter(s => new Date(s.date) >= weekAgo);
    }
  } catch (e) {
    hostLog('error', `Failed to load state: ${e}`);
  }
}

function saveState(): void {
  try {
    hostSetConfig('timer', JSON.stringify(timer));
    hostSetConfig('todayStats', JSON.stringify(todayStats));
    hostSetConfig('weeklyStats', JSON.stringify(weeklyStats));
  } catch (e) {
    hostLog('error', `Failed to save state: ${e}`);
  }
}

function startWork(customMinutes?: number): void {
  const duration = customMinutes ? customMinutes * 60 : CONFIG.workDuration;
  timer = {
    ...timer,
    state: 'working',
    previousState: timer.state,
    remainingSeconds: duration,
    totalSeconds: duration,
    startedAt: Date.now(),
    pausedAt: null,
  };
  saveState();
  hostLog('info', 'Started work session');
}

function startShortBreak(): void {
  timer = {
    ...timer,
    state: 'short_break',
    previousState: timer.state,
    remainingSeconds: CONFIG.shortBreakDuration,
    totalSeconds: CONFIG.shortBreakDuration,
    startedAt: Date.now(),
    pausedAt: null,
  };
  saveState();
  hostLog('info', 'Started short break');
}

function startLongBreak(): void {
  timer = {
    ...timer,
    state: 'long_break',
    previousState: timer.state,
    remainingSeconds: CONFIG.longBreakDuration,
    totalSeconds: CONFIG.longBreakDuration,
    startedAt: Date.now(),
    pausedAt: null,
  };
  saveState();
  hostLog('info', 'Started long break');
}

function pause(): void {
  if (timer.state === 'paused') {
    // Resume
    const pausedDuration = timer.pausedAt ? Date.now() - timer.pausedAt : 0;
    timer = {
      ...timer,
      state: timer.previousState,
      startedAt: timer.startedAt ? timer.startedAt + pausedDuration : Date.now(),
      pausedAt: null,
    };
  } else if (timer.state !== 'idle') {
    // Pause
    timer = {
      ...timer,
      previousState: timer.state,
      state: 'paused',
      pausedAt: Date.now(),
    };
  }
  saveState();
}

function reset(): void {
  timer = {
    state: 'idle',
    previousState: 'idle',
    remainingSeconds: CONFIG.workDuration,
    totalSeconds: CONFIG.workDuration,
    pomodorosCompleted: timer.pomodorosCompleted,
    startedAt: null,
    pausedAt: null,
  };
  saveState();
}

function completeSession(): void {
  const wasWorking = timer.state === 'working' || timer.previousState === 'working';
  
  if (wasWorking) {
    timer.pomodorosCompleted++;
    todayStats.pomodorosCompleted++;
    todayStats.totalFocusMinutes += Math.round(timer.totalSeconds / 60);
    
    // Update weekly stats
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = weeklyStats.findIndex(s => s.date === today);
    if (todayIndex >= 0) {
      weeklyStats[todayIndex] = { ...todayStats };
    } else {
      weeklyStats.push({ ...todayStats });
    }
    
    try {
      hostShowNotification(
        '🍅 Pomodoro Complete!',
        `Great work! You've completed ${timer.pomodorosCompleted} pomodoro${timer.pomodorosCompleted > 1 ? 's' : ''} today.`
      );
    } catch (e) {
      // Notifications might not be available
    }
    
    // Start appropriate break
    if (timer.pomodorosCompleted % CONFIG.pomodorosUntilLongBreak === 0) {
      startLongBreak();
    } else {
      startShortBreak();
    }
  } else {
    // Break completed
    const breakMinutes = Math.round(timer.totalSeconds / 60);
    todayStats.totalBreakMinutes += breakMinutes;
    
    try {
      hostShowNotification(
        '☕ Break Over!',
        'Time to get back to work. Stay focused!'
      );
    } catch (e) {
      // Notifications might not be available
    }
    
    reset();
  }
  
  saveState();
}

function updateTimer(): void {
  if (timer.state === 'idle' || timer.state === 'paused' || !timer.startedAt) {
    return;
  }
  
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  timer.remainingSeconds = Math.max(0, timer.totalSeconds - elapsed);
  
  if (timer.remainingSeconds === 0) {
    completeSession();
  }
}

// Plugin exports
export function init(): void {
  loadState();
  hostLog('info', 'Pomodoro Timer plugin initialized');
}

export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.toLowerCase().trim();
  
  updateTimer();
  
  const results: SearchResult[] = [];
  
  // Handle pomo: command prefix
  if (query.startsWith('pomo:') || query === 'pomo') {
    const subCommand = query.replace('pomo:', '').trim();
    
    // Always show status first
    results.push({
      id: 'pomo-status',
      title: `${getStateEmoji(timer.state)} ${getStateLabel(timer.state)}`,
      subtitle: timer.state === 'idle' 
        ? 'Ready to start a focus session'
        : `${formatTime(timer.remainingSeconds)} remaining • ${timer.pomodorosCompleted} pomodoros today`,
      icon: '🍅',
      score: 100,
      category: 'Pomodoro',
    });
    
    // Show relevant actions based on state
    if (timer.state === 'idle') {
      if (!subCommand || 'start'.includes(subCommand)) {
        results.push({
          id: 'pomo-start',
          title: '▶️ Start Focus Session',
          subtitle: '25 minutes of focused work',
          icon: '🍅',
          score: 90,
          category: 'Pomodoro',
          action: { type: 'execute', value: 'start_work' },
        });
      }
    } else if (timer.state === 'paused') {
      results.push({
        id: 'pomo-resume',
        title: '▶️ Resume',
        subtitle: `Continue ${getStateLabel(timer.previousState).toLowerCase()}`,
        icon: '▶️',
        score: 90,
        category: 'Pomodoro',
        action: { type: 'execute', value: 'pause' },
      });
    } else {
      if (!subCommand || 'pause'.includes(subCommand)) {
        results.push({
          id: 'pomo-pause',
          title: '⏸️ Pause',
          subtitle: 'Pause the current session',
          icon: '⏸️',
          score: 85,
          category: 'Pomodoro',
          action: { type: 'execute', value: 'pause' },
        });
      }
    }
    
    if (timer.state !== 'idle') {
      if (!subCommand || 'skip'.includes(subCommand)) {
        results.push({
          id: 'pomo-skip',
          title: '⏭️ Skip',
          subtitle: 'Skip to next phase',
          icon: '⏭️',
          score: 80,
          category: 'Pomodoro',
          action: { type: 'execute', value: 'skip' },
        });
      }
      
      if (!subCommand || 'reset'.includes(subCommand)) {
        results.push({
          id: 'pomo-reset',
          title: '🔄 Reset',
          subtitle: 'Reset the timer',
          icon: '🔄',
          score: 75,
          category: 'Pomodoro',
          action: { type: 'execute', value: 'reset' },
        });
      }
    }
    
    if (!subCommand || 'break'.includes(subCommand)) {
      results.push({
        id: 'pomo-break',
        title: '☕ Take a Break',
        subtitle: timer.pomodorosCompleted > 0 && timer.pomodorosCompleted % CONFIG.pomodorosUntilLongBreak === 0
          ? '15 minute long break'
          : '5 minute short break',
        icon: '☕',
        score: 70,
        category: 'Pomodoro',
        action: { type: 'execute', value: 'start_break' },
      });
    }
    
    if (!subCommand || 'stats'.includes(subCommand)) {
      results.push({
        id: 'pomo-stats',
        title: '📊 Today\'s Stats',
        subtitle: `${todayStats.pomodorosCompleted} pomodoros • ${todayStats.totalFocusMinutes} min focus • ${todayStats.totalBreakMinutes} min breaks`,
        icon: '📊',
        score: 60,
        category: 'Pomodoro',
      });
    }
  } else if (query.includes('pomodoro') || query.includes('timer') || query.includes('focus')) {
    // Generic search
    results.push({
      id: 'pomo-quick',
      title: `${getStateEmoji(timer.state)} Pomodoro Timer`,
      subtitle: timer.state === 'idle'
        ? `Type "pomo:" to start • ${todayStats.pomodorosCompleted} completed today`
        : `${formatTime(timer.remainingSeconds)} - ${getStateLabel(timer.state)}`,
      icon: '🍅',
      score: 50,
      category: 'Pomodoro',
    });
  }
  
  const output: SearchOutput = { results };
  return JSON.stringify(output);
}

export function execute(): string {
  const inputJson = Host.inputString();
  const input = JSON.parse(inputJson);
  
  updateTimer();
  
  const action = input.action || input.action_id;
  
  switch (action) {
    case 'start_work':
      startWork(input.duration_minutes);
      break;
    case 'start_break':
      if (timer.pomodorosCompleted > 0 && timer.pomodorosCompleted % CONFIG.pomodorosUntilLongBreak === 0) {
        startLongBreak();
      } else {
        startShortBreak();
      }
      break;
    case 'pause':
      pause();
      break;
    case 'reset':
      reset();
      break;
    case 'skip':
      completeSession();
      break;
    default:
      return JSON.stringify({ success: false, error: 'Unknown action' });
  }
  
  return JSON.stringify({ 
    success: true, 
    state: timer.state,
    remainingSeconds: timer.remainingSeconds,
  });
}

export function render_widget(): string {
  const inputJson = Host.inputString();
  const input: WidgetRenderInput = JSON.parse(inputJson);
  
  updateTimer();
  
  if (input.widget_id === 'pomodoro-timer') {
    const progress = getProgressPercentage();
    const stateColor = timer.state === 'working' ? '#ef4444' 
                     : timer.state === 'short_break' ? '#22c55e'
                     : timer.state === 'long_break' ? '#3b82f6'
                     : '#6b7280';
    
    // Circular progress timer
    const size = Math.min(input.width, input.height);
    const radius = size * 0.35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress / 100);
    
    const html = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-family: system-ui, sans-serif; padding: 12px;">
        <svg width="${size * 0.8}" height="${size * 0.8}" viewBox="0 0 ${size} ${size}">
          <!-- Background circle -->
          <circle
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
          />
          <!-- Progress circle -->
          <circle
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            fill="none"
            stroke="${stateColor}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90 ${size / 2} ${size / 2})"
            style="transition: stroke-dashoffset 1s linear;"
          />
          <!-- Time text -->
          <text
            x="${size / 2}"
            y="${size / 2}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="currentColor"
            font-size="${size * 0.15}px"
            font-weight="bold"
            font-family="monospace"
          >
            ${formatTime(timer.remainingSeconds)}
          </text>
          <!-- State text -->
          <text
            x="${size / 2}"
            y="${size / 2 + size * 0.12}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="rgba(255,255,255,0.6)"
            font-size="${size * 0.06}px"
          >
            ${getStateLabel(timer.state)}
          </text>
        </svg>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          ${timer.state === 'idle' ? `
            <button onclick="executeAction('start_work')" style="padding: 6px 12px; border-radius: 6px; background: ${stateColor}; color: white; border: none; cursor: pointer; font-size: 12px;">
              ▶️ Start
            </button>
          ` : timer.state === 'paused' ? `
            <button onclick="executeAction('pause')" style="padding: 6px 12px; border-radius: 6px; background: #22c55e; color: white; border: none; cursor: pointer; font-size: 12px;">
              ▶️ Resume
            </button>
          ` : `
            <button onclick="executeAction('pause')" style="padding: 6px 12px; border-radius: 6px; background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; font-size: 12px;">
              ⏸️
            </button>
          `}
          ${timer.state !== 'idle' ? `
            <button onclick="executeAction('reset')" style="padding: 6px 12px; border-radius: 6px; background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; font-size: 12px;">
              🔄
            </button>
          ` : ''}
        </div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 8px;">
          🍅 ${timer.pomodorosCompleted} today
        </div>
      </div>
    `;
    
    const output: WidgetOutput = { type: 'custom', html };
    return JSON.stringify(output);
  }
  
  if (input.widget_id === 'pomodoro-stats') {
    const weekTotal = weeklyStats.reduce((sum, s) => sum + s.pomodorosCompleted, 0);
    const weekFocus = weeklyStats.reduce((sum, s) => sum + s.totalFocusMinutes, 0);
    
    // Create bar chart for weekly stats
    const maxPomodoros = Math.max(...weeklyStats.map(s => s.pomodorosCompleted), 1);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    
    const html = `
      <div style="display: flex; flex-direction: column; height: 100%; font-family: system-ui, sans-serif; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-weight: 600; font-size: 14px;">📊 Pomodoro Stats</span>
          <span style="font-size: 12px; color: rgba(255,255,255,0.6);">This Week</span>
        </div>
        
        <div style="display: flex; justify-content: space-around; margin-bottom: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${todayStats.pomodorosCompleted}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Today</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${weekTotal}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">This Week</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${Math.round(weekFocus / 60)}h</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Focus Time</div>
          </div>
        </div>
        
        <div style="flex: 1; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 8px;">
          ${days.map((day, i) => {
            const dayDate = new Date();
            dayDate.setDate(dayDate.getDate() - (today - i + 7) % 7);
            const dateStr = dayDate.toISOString().split('T')[0];
            const stat = weeklyStats.find(s => s.date === dateStr);
            const count = stat?.pomodorosCompleted || 0;
            const height = maxPomodoros > 0 ? (count / maxPomodoros) * 60 : 0;
            const isToday = i === today;
            
            return `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="width: 20px; height: ${height}px; background: ${isToday ? '#ef4444' : 'rgba(255,255,255,0.2)'}; border-radius: 4px; min-height: 4px;"></div>
                <span style="font-size: 10px; color: ${isToday ? '#ef4444' : 'rgba(255,255,255,0.4)'};">${day}</span>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 12px;">
          🎯 ${timer.pomodorosCompleted % CONFIG.pomodorosUntilLongBreak}/${CONFIG.pomodorosUntilLongBreak} until long break
        </div>
      </div>
    `;
    
    const output: WidgetOutput = { type: 'custom', html };
    return JSON.stringify(output);
  }
  
  return JSON.stringify({ type: 'stat', title: 'Unknown Widget', value: '?' });
}

export function ai_tool(): string {
  const inputJson = Host.inputString();
  const input: AIToolInput = JSON.parse(inputJson);
  
  updateTimer();
  
  if (input.tool === 'get_timer_status') {
    return JSON.stringify({
      result: JSON.stringify({
        state: timer.state,
        stateLabel: getStateLabel(timer.state),
        remainingTime: formatTime(timer.remainingSeconds),
        remainingSeconds: timer.remainingSeconds,
        pomodorosCompletedToday: timer.pomodorosCompleted,
        progress: `${getProgressPercentage()}%`,
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'start_pomodoro') {
    const type = input.arguments.type as string;
    const duration = input.arguments.duration_minutes as number | undefined;
    
    switch (type) {
      case 'work':
        startWork(duration);
        break;
      case 'short_break':
        startShortBreak();
        break;
      case 'long_break':
        startLongBreak();
        break;
      default:
        return JSON.stringify({ result: `Unknown session type: ${type}`, isError: true });
    }
    
    return JSON.stringify({
      result: JSON.stringify({
        started: type,
        duration: formatTime(timer.totalSeconds),
        message: `Started ${getStateLabel(timer.state)}. Stay focused!`,
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'get_stats') {
    const period = (input.arguments.period as string) || 'today';
    
    if (period === 'today') {
      return JSON.stringify({
        result: JSON.stringify({
          period: 'today',
          date: todayStats.date,
          pomodorosCompleted: todayStats.pomodorosCompleted,
          totalFocusMinutes: todayStats.totalFocusMinutes,
          totalBreakMinutes: todayStats.totalBreakMinutes,
          focusHours: (todayStats.totalFocusMinutes / 60).toFixed(1),
        }),
        isError: false,
      });
    }
    
    if (period === 'week') {
      const weekTotal = weeklyStats.reduce((sum, s) => sum + s.pomodorosCompleted, 0);
      const weekFocus = weeklyStats.reduce((sum, s) => sum + s.totalFocusMinutes, 0);
      
      return JSON.stringify({
        result: JSON.stringify({
          period: 'week',
          totalPomodoros: weekTotal,
          totalFocusMinutes: weekFocus,
          focusHours: (weekFocus / 60).toFixed(1),
          averagePerDay: (weekTotal / 7).toFixed(1),
          dailyBreakdown: weeklyStats,
        }),
        isError: false,
      });
    }
    
    return JSON.stringify({ result: `Unknown period: ${period}`, isError: true });
  }
  
  return JSON.stringify({ result: 'Unknown tool', isError: true });
}

export function shutdown(): void {
  saveState();
  hostLog('info', 'Pomodoro Timer plugin shutting down');
}

