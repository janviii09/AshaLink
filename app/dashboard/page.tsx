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
import { Zap, Bell, Info, Brain, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type ChartPoint = {
  timestamp: string;
  label: string;
  usage: number;
  isAnomaly: boolean;
  zScore?: number;
};

type HourlyStats = {
  mean: number;
  stdDev: number;
  count: number;
  min: number;
  max: number;
};

type HistoricalReading = {
  timestamp: string;
  hour: number;
  kWh: number;
};

// ─── Fallback Ranges (used when < 3 readings exist for an hour) ──────────

const FALLBACK_RANGE_BY_HOUR: Record<number, { min: number; max: number }> = {
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

// ─── Statistical Functions ────────────────────────────────────────────────

/**
 * Compute mean and standard deviation for a set of values.
 * Uses Bessel's correction (n-1) for sample standard deviation.
 */
function computeMeanStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length < 2) return { mean, stdDev: 0 };
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Calculate the Z-score: how many standard deviations a value is from the mean.
 * A |Z-score| > 2 means the value is statistically unusual (~95% confidence).
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Compute adaptive thresholds for each hour (0–23) from historical data.
 * Groups all historical readings by hour, then computes mean ± 2σ for each.
 * Falls back to FALLBACK_RANGE_BY_HOUR when < 3 readings exist for an hour.
 */
function computeAdaptiveRanges(
  history: HistoricalReading[]
): { ranges: Record<number, HourlyStats>; adaptiveHours: number; fallbackHours: number } {
  // Group readings by hour
  const byHour: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) byHour[h] = [];
  for (const r of history) {
    byHour[r.hour]?.push(r.kWh);
  }

  const ranges: Record<number, HourlyStats> = {};
  let adaptiveHours = 0;
  let fallbackHours = 0;

  for (let h = 0; h < 24; h++) {
    const values = byHour[h];
    if (values.length >= 3) {
      // Enough data → use statistical model
      const { mean, stdDev } = computeMeanStdDev(values);
      ranges[h] = {
        mean,
        stdDev,
        count: values.length,
        min: Math.max(0, mean - 2 * stdDev), // Can't be negative kWh
        max: mean + 2 * stdDev,
      };
      adaptiveHours++;
    } else {
      // Insufficient data → fallback to hardcoded
      const fb = FALLBACK_RANGE_BY_HOUR[h];
      const fbMean = (fb.min + fb.max) / 2;
      const fbStdDev = (fb.max - fb.min) / 4; // treat range as ≈ 4σ
      ranges[h] = {
        mean: fbMean,
        stdDev: fbStdDev,
        count: values.length,
        min: fb.min,
        max: fb.max,
      };
      fallbackHours++;
    }
  }

  return { ranges, adaptiveHours, fallbackHours };
}

/**
 * Merge new data points into localStorage history, deduplicating by timestamp.
 */
function mergeAndStoreHistory(newReadings: HistoricalReading[]): HistoricalReading[] {
  let existing: HistoricalReading[] = [];
  try {
    const saved = localStorage.getItem('electricity_history');
    if (saved) existing = JSON.parse(saved);
  } catch { /* ignore */ }

  // Deduplicate by timestamp
  const seen = new Set(existing.map((r) => r.timestamp));
  for (const r of newReadings) {
    if (!seen.has(r.timestamp)) {
      existing.push(r);
      seen.add(r.timestamp);
    }
  }

  // Keep only last 30 days of data (720 hourly readings max)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  existing = existing.filter((r) => new Date(r.timestamp) >= cutoff);

  localStorage.setItem('electricity_history', JSON.stringify(existing));
  return existing;
}

function getHourFromTimestamp(timestamp: string): number {
  const match = timestamp.match(/\s+(\d{2}):/);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────

function parseTestDataCSV(
  csvText: string,
  adaptiveRanges: Record<number, HourlyStats>
): { points: ChartPoint[]; readings: HistoricalReading[] } {
  const lines = csvText.trim().split('\n');
  const rows =
    lines[0]?.toLowerCase().includes('timestamp') || lines[0]?.toLowerCase().includes('kwh')
      ? lines.slice(1)
      : lines;
  const points: ChartPoint[] = [];
  const readings: HistoricalReading[] = [];

  for (const line of rows) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 2) continue;
    const timestamp = parts[0];
    const kWh = parseFloat(parts[1]);
    if (Number.isNaN(kWh)) continue;

    const hour = getHourFromTimestamp(timestamp);
    const stats = adaptiveRanges[hour];
    const zScore = calculateZScore(kWh, stats.mean, stats.stdDev);
    const isAnomaly = Math.abs(zScore) > 2; // Flag if Z-score exceeds ±2

    const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = match ? parseInt(match[3], 10) : 0;
    const month = match ? monthNames[parseInt(match[2], 10) - 1] : '';
    const hourStr = match ? parseInt(match[4], 10) : 0;
    const label = match ? `${month} ${day} ${hourStr}:00` : timestamp.slice(0, 16);

    points.push({ timestamp, label, usage: kWh, isAnomaly, zScore: Math.round(zScore * 100) / 100 });
    readings.push({ timestamp, hour, kWh });
  }

  return { points, readings };
}

function computeOverallStats(points: ChartPoint[]) {
  if (points.length === 0) return { mean: 0 };
  const values = points.map((p) => p.usage);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean };
}

// ─── Alert Data ───────────────────────────────────────────────────────────

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

// ─── Main Component ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [adaptiveInfo, setAdaptiveInfo] = useState<{
    adaptiveHours: number;
    fallbackHours: number;
    ranges: Record<number, HourlyStats>;
    totalReadings: number;
  } | null>(null);
  const [showThresholds, setShowThresholds] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Step 1: Load existing history from localStorage
        let history: HistoricalReading[] = [];
        try {
          const saved = localStorage.getItem('electricity_history');
          if (saved) history = JSON.parse(saved);
        } catch { /* ignore */ }

        // Step 2: Compute adaptive ranges from ALL historical data
        const { ranges, adaptiveHours, fallbackHours } = computeAdaptiveRanges(history);

        // Step 3: Fetch new CSV data
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to load');
        const text = await res.text();

        // Step 4: Parse with adaptive thresholds
        const { points, readings } = parseTestDataCSV(text, ranges);

        // Step 5: Merge new readings into history and re-compute
        const updatedHistory = mergeAndStoreHistory(readings);
        const updated = computeAdaptiveRanges(updatedHistory);

        // Step 6: Re-parse with updated ranges (now includes the new data)
        const { points: finalPoints } = parseTestDataCSV(text, updated.ranges);

        setChartData(finalPoints);
        setAdaptiveInfo({
          adaptiveHours: updated.adaptiveHours,
          fallbackHours: updated.fallbackHours,
          ranges: updated.ranges,
          totalReadings: updatedHistory.length,
        });
      } catch {
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => computeOverallStats(chartData), [chartData]);
  const anomalyCount = chartData.filter((p) => p.isAnomaly).length;
  const peak = chartData.length ? chartData.reduce((best, p) => (p.usage > best.usage ? p : best), chartData[0]) : null;
  const firstLabel = chartData[0]?.label ?? '';
  const lastLabel = chartData[chartData.length - 1]?.label ?? '';

  const isAdaptiveMode = adaptiveInfo ? adaptiveInfo.adaptiveHours > 0 : false;

  const explanationPoints = useMemo(() => {
    const list: string[] = [];
    if (chartData.length === 0) return list;
    list.push(`Data: ${chartData.length} hourly readings from ${firstLabel} to ${lastLabel}`);
    if (peak) list.push(`Peak: ${peak.usage.toFixed(2)} kWh at ${peak.label}.`);
    list.push(`Anomalies in this period: ${anomalyCount} point(s) flagged using ${isAdaptiveMode ? 'Z-score statistical model' : 'fallback thresholds'}.`);
    if (adaptiveInfo) {
      list.push(`Model trained on ${adaptiveInfo.totalReadings} historical readings across ${adaptiveInfo.adaptiveHours}/24 hours with adaptive thresholds.`);
    }
    return list;
  }, [chartData.length, firstLabel, lastLabel, peak, anomalyCount, adaptiveInfo, isAdaptiveMode]);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Model Status Badge */}
      {adaptiveInfo && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm border ${isAdaptiveMode
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
            {isAdaptiveMode ? (
              <><Brain className="w-4 h-4" /> 🧠 Adaptive Mode — Z-Score Statistical Model</>
            ) : (
              <><BarChart3 className="w-4 h-4" /> 📊 Fallback Mode — Hardcoded Thresholds</>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {adaptiveInfo.adaptiveHours}/24 hours with learned thresholds · {adaptiveInfo.totalReadings} total readings stored
          </span>
        </div>
      )}

      {/* Explanation of data and graph */}
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
        {/* Electricity usage graph */}
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
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Anomaly (|Z| &gt; 2)
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
                        formatter={(value: any, _name: any, props: any) => {
                          const payload = props?.payload as ChartPoint | undefined;
                          const zLabel = payload?.zScore !== undefined ? ` (Z: ${payload.zScore})` : '';
                          return [`${Number(value ?? 0).toFixed(3)} kWh${zLabel}`];
                        }}
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
                <p className="text-sm text-gray-500 mt-2">Red dots = statistical anomaly (Z-score &gt; ±2 standard deviations from learned mean).</p>
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

      {/* ── Learned Thresholds Table (collapsible) ───────────────────── */}
      {adaptiveInfo && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowThresholds(!showThresholds)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">Learned Thresholds Per Hour</h2>
              <span className="text-xs text-gray-400 ml-2">
                {isAdaptiveMode ? 'Computed from historical data' : 'Using fallback ranges'}
              </span>
            </div>
            {showThresholds ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showThresholds && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Hour</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Mean (kWh)</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Std Dev</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Min (μ−2σ)</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Max (μ+2σ)</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Readings</th>
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 24 }, (_, h) => {
                      const s = adaptiveInfo.ranges[h];
                      const isAdaptive = s.count >= 3;
                      return (
                        <tr key={h} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-gray-800">{String(h).padStart(2, '0')}:00</td>
                          <td className="py-2 px-3 text-gray-700">{s.mean.toFixed(3)}</td>
                          <td className="py-2 px-3 text-gray-700">{s.stdDev.toFixed(3)}</td>
                          <td className="py-2 px-3 text-gray-700">{s.min.toFixed(3)}</td>
                          <td className="py-2 px-3 text-gray-700">{s.max.toFixed(3)}</td>
                          <td className="py-2 px-3 text-gray-700">{s.count}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAdaptive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                              {isAdaptive ? '🧠 Learned' : '📊 Fallback'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                <strong>How it works:</strong> For each hour, we collect all historical electricity readings and compute the mean (μ) and standard deviation (σ).
                A reading is flagged as anomalous when it deviates by more than ±2σ from the mean (Z-score &gt; 2), which corresponds to ~95% confidence
                that the reading is unusual. Hours with fewer than 3 historical readings use hardcoded fallback thresholds.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}