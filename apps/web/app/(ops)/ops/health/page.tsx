'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  uptime: number;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  database: {
    connections: number;
    maxConnections: number;
    poolUtilization: number;
    replicaLagMs: number;
  };
  redis: {
    hitRate: number;
    memoryUsedMb: number;
    memoryMaxMb: number;
    connectedClients: number;
  };
  errorRate: number;
  requestsPerMinute: number;
  p99LatencyMs: number;
  timestamp: string;
}

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };
  return (
    <span className={`inline-block h-3 w-3 rounded-full ${colors[status]}`} />
  );
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const styles = {
    healthy: 'bg-green-500/20 text-green-400 ring-green-500/30',
    degraded: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
    down: 'bg-red-500/20 text-red-400 ring-red-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status]}`}
    >
      <StatusDot status={status} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  color = 'violet',
}: {
  value: number;
  max: number;
  color?: 'violet' | 'green' | 'yellow' | 'red';
}) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = {
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  return (
    <div className="h-2 w-full rounded-full bg-gray-800">
      <div
        className={`h-2 rounded-full transition-all ${colorMap[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/health');
      if (!res.ok) throw new Error('Failed to fetch health data');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">Loading health data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-400">{error || 'Failed to load health data'}</div>
      </div>
    );
  }

  const poolPct = data.database.poolUtilization * 100;
  const poolColor = poolPct > 80 ? 'red' : poolPct > 50 ? 'yellow' : 'violet';
  const memPct = (data.redis.memoryUsedMb / data.redis.memoryMaxMb) * 100;
  const memColor = memPct > 80 ? 'red' : memPct > 50 ? 'yellow' : 'violet';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Platform Health</h2>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Service Grid */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Services
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.services.map((svc) => (
            <div
              key={svc.name}
              className="rounded-lg border border-gray-800 bg-gray-900 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{svc.name}</span>
                <StatusDot status={svc.status} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Latency</span>
                  <span className="font-mono text-gray-300">{svc.latencyMs}ms</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Uptime</span>
                  <span className="font-mono text-gray-300">{svc.uptime}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database + Redis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Database Section */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Database
          </h3>
          <div className="space-y-4">
            {/* Connection Pool */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-500">Connection Pool</span>
                <span className="font-mono text-gray-300">
                  {data.database.connections} / {data.database.maxConnections}
                </span>
              </div>
              <ProgressBar
                value={data.database.connections}
                max={data.database.maxConnections}
                color={poolColor}
              />
              <p className="mt-1 text-right text-[10px] text-gray-600">
                {poolPct.toFixed(0)}% utilized
              </p>
            </div>

            {/* Replica Lag */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Replica Lag</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    data.database.replicaLagMs < 50
                      ? 'bg-green-500'
                      : data.database.replicaLagMs < 200
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="font-mono text-xs text-gray-300">
                  {data.database.replicaLagMs}ms
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Redis Section */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Redis
          </h3>
          <div className="space-y-4">
            {/* Hit Rate */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-500">Cache Hit Rate</span>
                <span className="font-mono text-gray-300">
                  {(data.redis.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                value={data.redis.hitRate * 100}
                max={100}
                color={data.redis.hitRate > 0.9 ? 'green' : data.redis.hitRate > 0.7 ? 'yellow' : 'red'}
              />
            </div>

            {/* Memory Usage */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-500">Memory Usage</span>
                <span className="font-mono text-gray-300">
                  {data.redis.memoryUsedMb}MB / {data.redis.memoryMaxMb}MB
                </span>
              </div>
              <ProgressBar
                value={data.redis.memoryUsedMb}
                max={data.redis.memoryMaxMb}
                color={memColor}
              />
              <p className="mt-1 text-right text-[10px] text-gray-600">
                {memPct.toFixed(0)}% used
              </p>
            </div>

            {/* Connected Clients */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Connected Clients</span>
              <span className="font-mono text-xs text-gray-300">
                {data.redis.connectedClients}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs text-gray-500">Requests / min</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {data.requestsPerMinute.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs text-gray-500">Error Rate (1h)</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                data.errorRate > 5 ? 'text-red-400' : data.errorRate > 1 ? 'text-yellow-400' : 'text-green-400'
              }`}
            >
              {data.errorRate}%
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs text-gray-500">P99 Latency</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                data.p99LatencyMs > 500 ? 'text-red-400' : data.p99LatencyMs > 200 ? 'text-yellow-400' : 'text-white'
              }`}
            >
              {data.p99LatencyMs}ms
            </p>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
        </span>
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}
