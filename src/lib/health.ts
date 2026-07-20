export type HealthStatus = { status: "ok"; service: "clause"; timestamp: string; requestId: string };

export function healthStatus(requestId: string, now = new Date()): HealthStatus {
  return { status: "ok", service: "clause", timestamp: now.toISOString(), requestId };
}
