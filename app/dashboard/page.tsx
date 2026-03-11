'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Bell, Info } from 'lucide-react';

type ChartPoint = {
  timestamp: string;
  label: string;
  usage: number;
  isAnomaly: boolean;
};

// Min/max (kWh) for each hour (0–23). Values outside this range are flagged as abnormality.
const RANGE_BY_HOUR: Record<number, { min: number; max: number }> = {
  0: { min: 0.05, max: 0.25 },
  1: { min: 0.05, max: 0.25 },
  2: { min: 0.05, max: 0.25 },
  3: { min: 0.05, max: 0.25 },
  4: { min: 0.05, max: 0.25 },
  5: { min: 0.08, max: 0.35 },
  6: { min: 0.15, max: 0.45 },
  7: { min: 0.35, max: 0.75 },
  8: { min: 0.5, max: 1.0 },
  9: { min: 0.4, max: 0.85 },
  10: { min: 0.15, max: 0.5 },
  11: { min: 0.1, max: 0.4 },
  12: { min: 0.08, max: 0.35 },
  13: { min: 0.05, max: 0.3 },
  14: { min: 0.08, max: 0.35 },
  15: { min: 0.08, max: 0.35 },
  16: { min: 0.1, max: 0.4 },
  17: { min: 0.15, max: 0.5 },
  18: { min: 0.3, max: 0.7 },
  19: { min: 0.6, max: 1.1 },
  20: { min: 0.8, max: 1.3 },
  21: { min: 0.6, max: 1.0 },
  22: { min: 0.35, max: 0.65 },
  23: { min: 0.1, max: 0.35 },
};

function getHourFromTimestamp(timestamp: string): number {
  const match = timestamp.match(/\s+(\d{2}):/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseTestDataCSV(csvText: string): ChartPoint[] {
  const lines = csvText.trim().split('\n');
  const rows = lines[0]?.toLowerCase().includes('timestamp') || lines[0]?.toLowerCase().includes('kwh')
    ? lines.slice(1)
    : lines;
  const points: ChartPoint[] = [];

  for (const line of rows) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 2) continue;
    const timestamp = parts[0];
    const kWh = parseFloat(parts[1]);
    if (Number.isNaN(kWh)) continue;
    const hour = getHourFromTimestamp(timestamp);
    const range = RANGE_BY_HOUR[hour] ?? { min: 0, max: 2 };
    const isAnomaly = kWh < range.min || kWh > range.max;

    const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = match ? parseInt(match[3], 10) : 0;
    const month = match ? monthNames[parseInt(match[2], 10) - 1] : '';
    const hourStr = match ? parseInt(match[4], 10) : 0;
    const label = match ? `${month} ${day} ${hourStr}:00` : timestamp.slice(0, 16);

    points.push({ timestamp, label, usage: kWh, isAnomaly });
  }

  return points;
}

function computeStats(points: ChartPoint[]) {
  if (points.length === 0) return { mean: 0 };
  const values = points.map((p) => p.usage);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean };
}

const severityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const recentAlerts = [
  { id: 1, type: 'High usage', message: 'Electricity usage above threshold', time: '10 min ago', severity: 'high' as const },
  { id: 2, type: 'Unusual pattern', message: 'No usage detected for 4 hours', time: '1 hour ago', severity: 'medium' as const },
  { id: 3, type: 'Peak alert', message: 'Peak consumption detected', time: '2 hours ago', severity: 'medium' as const },
];

const DATA_URL = '/test_data.csv';

export default function DashboardPage() {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then((res) => res.ok ? res.text() : Promise.reject(new Error('Failed to load')))
      .then((text) => setChartData(parseTestDataCSV(text)))
      .catch(() => setChartData([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeStats(chartData), [chartData]);
  const anomalyCount = chartData.filter((p) => p.isAnomaly).length;
  const peak = chartData.length ? chartData.reduce((best, p) => (p.usage > best.usage ? p : best), chartData[0]) : null;
  const firstLabel = chartData[0]?.label ?? '';
  const lastLabel = chartData[chartData.length - 1]?.label ?? '';

  const explanationPoints = useMemo(() => {
    const list: string[] = [];
    if (chartData.length === 0) return list;
    list.push(`Data: ${chartData.length} hourly readings from ${firstLabel} to ${lastLabel}`);
    if (peak) list.push(`Peak: ${peak.usage.toFixed(2)} kWh at ${peak.label}.`);
    list.push(`Anomalies in this period: ${anomalyCount} point(s) flagged.`);
    return list;
  }, [chartData.length, firstLabel, lastLabel, stats.mean, peak, anomalyCount]);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1> */}

      {/* Explanation of data and graph (in points) */}
      <div className="mb-8 p-5 bg-orange-50 border border-orange-100 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-800">Graph Insights</h2>
        </div>
        <ul className="space-y-2 list-disc list-inside text-gray-700">
          {explanationPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Electricity usage graph – test_data.csv, red dots for out-of-range */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">Electricity Derived Insights</h2>
          </div>
          <div className="p-6">
            {loading && (
              <div className="h-80 flex items-center justify-center text-gray-500">Loading…</div>
            )}
            {!loading && chartData.length > 0 && (
              <>
                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" /> Usage (kWh)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Alert (abnormality)
                  </span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        interval="preserveStartEnd"
                        tickFormatter={(value, i) => (i % 24 === 0 ? value : '')}
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit=" kWh" domain={[0, 'auto']} tickFormatter={(v) => Number(v).toFixed(2)} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                        formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(3)} kWh`]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="usage"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#usageGradient)"
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.isAnomaly && typeof cx === 'number' && typeof cy === 'number') {
                            return <circle cx={cx} cy={cy} r={3} fill="#ef4444" stroke="white" strokeWidth={1.5} />;
                          }
                          return null;
                        }}
                        activeDot={{ r: 5, stroke: '#c2410c', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2">Red dots = abnormality (value out of allowed range for that hour).</p>
              </>
            )}
            {!loading && chartData.length === 0 && (
              <div className="h-80 flex items-center justify-center text-gray-500">No data. Ensure public/test_data.csv exists.</div>
            )}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-800">Recent alerts</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[22rem] overflow-y-auto">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${severityStyles[alert.severity]}`}>
                    {alert.type}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{alert.time}</span>
                </div>
                <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}