/**
 * Minimal in-process, concurrency-limited job queue. Deliberately not
 * BullMQ/Redis for Phase 1 (per the build plan) — this interface (`enqueue`)
 * is the seam to swap in a real queue later without touching callers.
 * Runs inside the Next.js server process, so jobs survive across requests
 * as long as the process stays up (fine for a single-instance Phase 1 deploy).
 */
type Job = () => Promise<void>;

class InProcessQueue {
  private queue: Job[] = [];
  private running = 0;
  constructor(private readonly concurrency: number) {}

  enqueue(job: Job): void {
    this.queue.push(job);
    this.tryStart();
  }

  private tryStart(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.running++;
      job()
        .catch((err) => {
          console.error("[queue] job failed", err);
        })
        .finally(() => {
          this.running--;
          this.tryStart();
        });
    }
  }
}

const globalForQueue = globalThis as unknown as { auditQueue?: InProcessQueue };

export const auditQueue = globalForQueue.auditQueue ?? new InProcessQueue(2);

if (process.env.NODE_ENV !== "production") {
  globalForQueue.auditQueue = auditQueue;
}
