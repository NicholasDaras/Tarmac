/**
 * Sub-Agent Monitor
 * 
 * Health checks, progress tracking, and auto-recovery for sub-agents
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

interface SubAgentConfig {
  sessionKey: string;
  task: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  checkpointIntervalMs: number;
}

interface SubAgentStatus {
  sessionKey: string;
  state: 'idle' | 'working' | 'completed' | 'failed' | 'stalled';
  progress: number;
  lastHeartbeat: number;
  retries: number;
  error?: string;
}

class SubAgentMonitor extends EventEmitter {
  private agents: Map<string, SubAgentStatus> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private checkIntervalMs: number = 120000) { // 2 min default
    super();
  }

  /**
   * Register a new sub-agent for monitoring
   */
  register(config: SubAgentConfig): string {
    const status: SubAgentStatus = {
      sessionKey: config.sessionKey,
      state: 'idle',
      progress: 0,
      lastHeartbeat: Date.now(),
      retries: 0,
    };

    this.agents.set(config.sessionKey, status);
    this.startMonitoring();

    return config.sessionKey;
  }

  /**
   * Update sub-agent progress
   */
  heartbeat(sessionKey: string, progress: number, state?: SubAgentStatus['state']) {
    const agent = this.agents.get(sessionKey);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.progress = progress;
      if (state) agent.state = state;
      
      this.emit('progress', { sessionKey, progress, state: agent.state });
    }
  }

  /**
   * Mark sub-agent as failed
   */
  fail(sessionKey: string, error: string) {
    const agent = this.agents.get(sessionKey);
    if (agent) {
      agent.state = 'failed';
      agent.error = error;
      agent.retries++;
      
      this.emit('failure', { sessionKey, error, retries: agent.retries });
      
      // Auto-retry if under max retries
      if (agent.retries < 3) {
        this.emit('retry', { sessionKey, attempt: agent.retries });
      } else {
        this.emit('escalate', { sessionKey, error, attempts: agent.retries });
      }
    }
  }

  /**
   * Mark sub-agent as completed
   */
  complete(sessionKey: string, result: any) {
    const agent = this.agents.get(sessionKey);
    if (agent) {
      agent.state = 'completed';
      agent.progress = 100;
      this.emit('complete', { sessionKey, result });
    }
  }

  /**
   * Start health check monitoring
   */
  private startMonitoring() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [sessionKey, agent] of this.agents) {
        // Check for stalled agents
        if (agent.state === 'working' && 
            now - agent.lastHeartbeat > this.checkIntervalMs) {
          agent.state = 'stalled';
          this.emit('stalled', { sessionKey, lastSeen: agent.lastHeartbeat });
          
          // Auto-restart stalled agents
          if (agent.retries < 3) {
            agent.retries++;
            this.emit('restart', { sessionKey, attempt: agent.retries });
          }
        }
      }
    }, this.checkIntervalMs);
  }

  /**
   * Get status summary
   */
  getSummary() {
    const summary: Record<string, number> = {
      total: this.agents.size,
      idle: 0,
      working: 0,
      completed: 0,
      failed: 0,
      stalled: 0,
    };

    for (const agent of this.agents.values()) {
      summary[agent.state]++;
    }

    return summary;
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const monitor = new SubAgentMonitor();
