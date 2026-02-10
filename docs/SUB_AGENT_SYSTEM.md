# Sub-Agent Orchestration System

## Architecture

### Layer 1: Task Decomposition
```
Large Feature → Component Tasks → File Tasks
(MVP)         → (Gallery, Map) → (write component.tsx)
```

### Layer 2: Autonomous Worker Protocol
Each sub-agent:
1. Receives SINGLE file task (max 200 lines)
2. Writes file
3. Self-verifies (git diff + TypeScript check)
4. Reports success/failure
5. Requests next task or asks for help

### Layer 3: Health Monitoring
- Sub-agents heartbeat every 2 minutes
- Auto-restart on timeout
- Checkpoint system (save progress every 5 min)

## Implementation

### Worker Script
```typescript
// worker.ts
async function executeTask(task: Task) {
  try {
    // 1. Write file
    await writeFile(task.path, task.content);
    
    // 2. Verify
    const verified = await verifyWrite(task.path);
    if (!verified) {
      await retryWrite(task);
    }
    
    // 3. TypeScript check
    const valid = await typeCheck(task.path);
    if (!valid) {
      await fixErrors(task.path);
    }
    
    // 4. Git commit
    await gitCommit(task.path, task.message);
    
    return { status: 'success', commits: 1 };
  } catch (error) {
    return { status: 'failure', error: error.message, needsHelp: true };
  }
}
```

### Task Queue
```typescript
interface Task {
  id: string;
  type: 'write' | 'edit' | 'verify';
  path: string;
  content?: string;
  maxLines: number; // Enforce 200 line limit
  dependencies: string[]; // Other tasks that must complete first
  retries: number;
  checkpointId?: string;
}
```

### Recovery Strategy
1. **Truncation Detection**: Check if response ends mid-code
2. **Incremental Writes**: Write function-by-function, not whole file
3. **Context Management**: Switch to Gemini 3 Flash automatically for files >200 lines
4. **Checkpoint System**: Save state every 5 minutes, resume on restart

## Usage

```typescript
// Orchestrator (me) spawns workers:
const tasks = decomposeFeature('Drive Detail', [
  'PhotoGallery.tsx',    // 150 lines
  'DriveHeader.tsx',     // 120 lines  
  'EngagementBar.tsx',   // 80 lines
  'StopsList.tsx',       // 100 lines
  'CommentsSection.tsx', // 150 lines
  'drive/[id].tsx',      // 200 lines (main screen)
]);

const workers = await spawnWorkers(tasks, { 
  model: 'gemini-3-flash',
  maxRetries: 3,
  checkpointInterval: 5 * 60 * 1000, // 5 min
});

// Monitor and report
workers.on('progress', reportToUser);
workers.on('failure', escalateToMe);
```

## Monitoring

### Real-time Dashboard
- Tasks in queue: X
- Active workers: Y  
- Completed: Z
- Blocked (need help): W

### Auto-escalation Rules
Escalate to me when:
- Same task fails 3 times
- Worker silent >10 minutes
- Git push fails
- TypeScript errors persist after 2 fixes

## Prevention Checklist

- [x] Split files >200 lines
- [x] Use Gemini 3 Flash for coding (1M context)
- [x] Self-verify every write
- [x] Heartbeat monitoring
- [x] Incremental commits
- [x] Checkpoint system
- [x] Auto-retry on truncation
- [x] Explicit failure reporting
