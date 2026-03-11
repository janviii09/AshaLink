'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

/**
 * MoodChart — Recharts-based mood trend visualization
 * 
 * This component renders a line chart showing the user's mood scores over time.
 * 
 * WHY color-coded zones?
 *   - Green (7-10): Happy — caregiver can see their loved one is doing well
 *   - Yellow (4-6): Neutral — normal range, no action needed
 *   - Red (1-3):   Needs attention — caregiver should consider reaching out
 * 
 * The chart also shows emoji dots at each data point so it's easy
 * for elderly users or caregivers to quickly glance and understand mood.
 * 
 * Props:
 *   data: Array of mood data points with timestamp, score, and sentiment label
 */

interface MoodDataPoint {
    timestamp: string;
    score: number;
    sentiment: string;
}

interface MoodChartProps {
    data: MoodDataPoint[];
}

// Map sentiment labels to emojis for data point labels
const SENTIMENT_EMOJI: Record<string, string> = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
    distressed: '😰',
};

// Custom tooltip that shows detailed info when hovering over a point
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MoodDataPoint }> }) {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;
    const emoji = SENTIMENT_EMOJI[data.sentiment] || '😐';
    const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(data.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400">{date} at {time}</p>
            <p className="text-lg font-bold">
                {emoji} {data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1)}
            </p>
            <p className="text-sm text-gray-600">Score: {data.score}/10</p>
        </div>
    );
}

// Custom dot that shows emoji at each data point
function CustomDot(props: { cx?: number; cy?: number; payload?: MoodDataPoint }) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const emoji = SENTIMENT_EMOJI[payload.sentiment] || '😐';

    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={14}>
            {emoji}
        </text>
    );
}

export default function MoodChart({ data }: MoodChartProps) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 italic">
                Mood data will appear here as you chat...
            </div>
        );
    }

    // Format timestamps for the X axis
    const formattedData = data.map(d => ({
        ...d,
        timeLabel: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {/* Color-coded background zones */}
                    <ReferenceArea y1={7} y2={10} fill="#dcfce7" fillOpacity={0.5} /> {/* Green: Happy */}
                    <ReferenceArea y1={4} y2={7} fill="#fef9c3" fillOpacity={0.5} />  {/* Yellow: Neutral */}
                    <ReferenceArea y1={1} y2={4} fill="#fee2e2" fillOpacity={0.5} />   {/* Red: Needs attention */}

                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="timeLabel"
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        domain={[1, 10]}
                        ticks={[1, 4, 7, 10]}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#4ade80"
                        strokeWidth={2.5}
                        dot={<CustomDot />}
                        activeDot={{ r: 6, fill: '#22c55e' }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-200" /> Happy (7-10)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-200" /> Neutral (4-6)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-200" /> Needs Attention (1-3)
                </span>
            </div>
        </div>
    );
}
