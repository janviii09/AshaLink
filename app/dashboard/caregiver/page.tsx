'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  Heart, Zap, Pill, Brain, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, BellOff, Bell, Download, Users,
} from 'lucide-react';
import HealthAlerts from '../../components/HealthAlerts';

// ─── Types ────────────────────────────────────────────────────────────────

interface MoodPoint {
  date: string;
  score: number;
  sentiment: string;
}

interface AnomalyDay {
  date: string;
  count: number;
  label: string;
}

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  timing: string[];
  purpose: string;
}

interface Caregiver {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface CaregiverSettings {
  elderName: string;
  caregivers: Caregiver[];
}

// ─── Data Loaders ─────────────────────────────────────────────────────────

function loadMoodData(): MoodPoint[] {
  try {
    const saved = localStorage.getItem('avatar_messages');
    if (!saved) return [];
    const messages = JSON.parse(saved) as {
      role: string;
      timestamp: string;
      sentiment?: { score: number; sentiment: string };
    }[];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return messages
      .filter((m) => m.role === 'user' && m.sentiment && new Date(m.timestamp) >= cutoff)
      .map((m) => ({
        date: new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score: m.sentiment!.score,
        sentiment: m.sentiment!.sentiment,
      }));
  } catch {
    return [];
  }
}

function loadAnomalyData(): AnomalyDay[] {
  try {
    const saved = localStorage.getItem('electricity_history');
    if (!saved) return [];
    const history = JSON.parse(saved) as { timestamp: string; hour: number; kWh: number }[];

    // Group by date
    const byDate: Record<string, { timestamp: string; hour: number; kWh: number }[]> = {};
    for (const r of history) {
      const date = r.timestamp.split(' ')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(r);
    }

    // For each day, compute a simple anomaly count using the same Z-score approach
    // We need per-hour stats across all days
    const byHour: Record<number, number[]> = {};
    for (let h = 0; h < 24; h++) byHour[h] = [];
    for (const r of history) byHour[r.hour]?.push(r.kWh);

    const hourMeans: Record<number, { mean: number; stdDev: number }> = {};
    for (let h = 0; h < 24; h++) {
      const vals = byHour[h];
      if (vals.length < 2) {
        hourMeans[h] = { mean: 0.3, stdDev: 0.15 };
        continue;
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
      hourMeans[h] = { mean, stdDev: Math.sqrt(variance) };
    }

    const results: AnomalyDay[] = [];
    const sortedDates = Object.keys(byDate).sort();

    for (const date of sortedDates) {
      const readings = byDate[date];
      let anomalies = 0;
      for (const r of readings) {
        const { mean, stdDev } = hourMeans[r.hour];
        if (stdDev > 0 && Math.abs((r.kWh - mean) / stdDev) > 2) {
          anomalies++;
        }
      }
      const d = new Date(date);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      results.push({ date, count: anomalies, label });
    }

    return results;
  } catch {
    return [];
  }
}

function loadMedicineCompliance(): { medicines: Medicine[]; reminders: Record<string, boolean> } {
  try {
    const savedMeds = localStorage.getItem('user_medicines');
    const savedReminders = localStorage.getItem('medicine_reminders');
    const medicines = savedMeds ? JSON.parse(savedMeds) : [];
    const reminders = savedReminders ? JSON.parse(savedReminders) : {};
    return { medicines, reminders };
  } catch {
    return { medicines: [], reminders: {} };
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CaregiverDashboardPage() {
  const [moodData, setMoodData] = useState<MoodPoint[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyDay[]>([]);
  const [medData, setMedData] = useState<{ medicines: Medicine[]; reminders: Record<string, boolean> }>({
    medicines: [],
    reminders: {},
  });
  const [caregiverInfo, setCaregiverInfo] = useState<CaregiverSettings>({ elderName: '', caregivers: [] });

  useEffect(() => {
    setMoodData(loadMoodData());
    setAnomalyData(loadAnomalyData());
    setMedData(loadMedicineCompliance());

    // Load caregiver names from localStorage
    try {
      const saved = localStorage.getItem('caregiver_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Handle both old format and new array format
        if (parsed.caregivers) {
          setCaregiverInfo(parsed);
        } else if (parsed.name) {
          setCaregiverInfo({ elderName: parsed.elderName || '', caregivers: [{ id: '1', name: parsed.name, phone: parsed.phone, relationship: 'Family' }] });
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Mood stats
  const moodStats = useMemo(() => {
    if (moodData.length === 0) return null;
    const scores = moodData.map((d) => d.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lowest = Math.min(...scores);
    const highest = Math.max(...scores);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avg;
    const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avg;
    const trend = secondAvg > firstAvg + 0.5 ? 'improving' : secondAvg < firstAvg - 0.5 ? 'declining' : 'stable';
    return { avg, lowest, highest, trend, count: scores.length };
  }, [moodData]);

  // Medicine compliance
  const complianceScore = useMemo(() => {
    if (medData.medicines.length === 0) return null;
    const tracked = medData.medicines.filter((m) => medData.reminders[m.id]).length;
    return Math.round((tracked / medData.medicines.length) * 100);
  }, [medData]);

  // Download report
  const handleDownloadReport = () => {
    let report = `AshaLink — Caregiver Weekly Report\nGenerated: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

    report += `=== MOOD SUMMARY ===\n`;
    if (moodStats) {
      report += `Average Score: ${moodStats.avg.toFixed(1)}/10\n`;
      report += `Lowest: ${moodStats.lowest}/10 | Highest: ${moodStats.highest}/10\n`;
      report += `Trend: ${moodStats.trend}\n`;
      report += `Messages Analyzed: ${moodStats.count}\n\n`;
    } else {
      report += `No mood data available.\n\n`;
    }

    report += `=== ANOMALY SUMMARY ===\n`;
    if (anomalyData.length > 0) {
      const totalAnomalies = anomalyData.reduce((s, d) => s + d.count, 0);
      report += `Total anomalies this week: ${totalAnomalies}\n`;
      anomalyData.forEach((d) => {
        report += `  ${d.label}: ${d.count} anomalies\n`;
      });
      report += '\n';
    } else {
      report += `No electricity data available.\n\n`;
    }

    report += `=== MEDICATION COMPLIANCE ===\n`;
    if (medData.medicines.length > 0) {
      report += `Compliance Score: ${complianceScore}%\n`;
      medData.medicines.forEach((m) => {
        const tracked = medData.reminders[m.id] ? '✅ Tracked' : '⚠️ Not tracked';
        report += `  ${m.name} (${m.dosage}) — ${m.timing.join(', ')} — ${tracked}\n`;
      });
    } else {
      report += `No medicines registered.\n`;
    }

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashalink_caregiver_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-6 py-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Caregiver Dashboard</h1>
            <p className="text-sm text-gray-500">
              {caregiverInfo.elderName
                ? <>Monitoring <span className="font-medium text-gray-700">{caregiverInfo.elderName}</span>&apos;s well-being</>
                : <>Weekly overview of your loved one&apos;s well-being</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Caregiver Names */}
          {caregiverInfo.caregivers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-purple-500" />
              {caregiverInfo.caregivers.map(cg => (
                <span key={cg.id} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {cg.name} ({cg.relationship})
                </span>
              ))}
            </div>
          )}
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ══════ Section A: Mood Trend ══════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-gray-800">Mood Trend (Last 7 Days)</h2>
            </div>
            {moodStats && (
              <div className="flex items-center gap-1.5">
                {moodStats.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {moodStats.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {moodStats.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  moodStats.trend === 'improving' ? 'bg-green-100 text-green-700'
                    : moodStats.trend === 'declining' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {moodStats.trend.charAt(0).toUpperCase() + moodStats.trend.slice(1)}
                </span>
              </div>
            )}
          </div>
          <div className="p-6">
            {moodData.length > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moodData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                        formatter={(value: any) => [`${value}/10`, 'Mood Score']}
                      />
                      <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alert', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 10 }} />
                      <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, fill: '#ec4899' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {moodStats && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">{moodStats.avg.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Avg Score</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-red-600">{moodStats.lowest}</p>
                      <p className="text-xs text-gray-500">Lowest</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{moodStats.highest}</p>
                      <p className="text-xs text-gray-500">Highest</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                <Heart className="w-10 h-10 mb-2 text-gray-300" />
                <p className="font-medium">No mood data yet</p>
                <p className="text-sm">Conversations with the AI Companion will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════ Section B: Anomaly Count Per Day ══════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">Daily Anomaly Count</h2>
          </div>
          <div className="p-6">
            {anomalyData.length > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={anomalyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                        formatter={(value: any) => [`${value} anomalies`, 'Count']}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {anomalyData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.count >= 4 ? '#ef4444' : entry.count >= 2 ? '#f59e0b' : '#22c55e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-4 text-xs text-gray-500 justify-center">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> 0-1 Normal</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> 2-3 Warning</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> 4+ Critical</span>
                </div>
              </>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                <Zap className="w-10 h-10 mb-2 text-gray-300" />
                <p className="font-medium">No electricity data yet</p>
                <p className="text-sm">Visit the main dashboard to load electricity readings</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════ Section C: Medication Compliance ══════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-800">Medication Compliance</h2>
            </div>
            {complianceScore !== null && (
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                complianceScore >= 80 ? 'bg-green-100 text-green-700'
                  : complianceScore >= 50 ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {complianceScore}%
              </span>
            )}
          </div>
          <div className="p-6">
            {medData.medicines.length > 0 ? (
              <div className="space-y-3">
                {medData.medicines.map((med) => {
                  const isTracked = medData.reminders[med.id];
                  return (
                    <div
                      key={med.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                        isTracked
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isTracked ? (
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{med.name}</p>
                          <p className="text-xs text-gray-500">{med.dosage} · {med.timing.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTracked ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <Bell className="w-3.5 h-3.5" /> Tracked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                            <BellOff className="w-3.5 h-3.5" /> Not tracked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                <Pill className="w-10 h-10 mb-2 text-gray-300" />
                <p className="font-medium">No medicines registered</p>
                <p className="text-sm">Add medicines on the Medicines page</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════ Section D: Health Keyword Alerts ══════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-800">Health Keyword Alerts</h2>
          </div>
          <div className="p-6">
            <HealthAlerts compact />
          </div>
        </div>
      </div>
    </div>
  );
}
