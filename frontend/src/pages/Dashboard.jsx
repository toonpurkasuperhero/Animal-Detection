import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import AnimalTag from '../components/AnimalTag';
import { getAnalytics, getHistory } from '../services/api';
import { ANIMALS, CHART_COLORS, formatAnimalName, formatTimestamp } from '../utils/animals';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: '#0f1e35', border: '1px solid #1e3050', borderRadius: 8, padding: '8px 14px' }}>
                <p style={{ color: '#7a9cc0', fontSize: 12 }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || '#00ff88', fontWeight: 700, fontSize: 14 }}>
                        {p.name}: {p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [aRes, hRes] = await Promise.all([getAnalytics(), getHistory({ limit: 8 })]);
            setAnalytics(aRes.data);
            setRecent(hRes.data.records || []);
        } catch { /* backend may not be running yet */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, []);

    // Build chart data
    const animalChartData = Object.entries(analytics?.animal_counts || {}).map(([k, v]) => ({
        name: formatAnimalName(k), value: v, animal: k,
    }));

    const pieData = animalChartData.map(d => ({ ...d }));

    const hourlyData = Object.entries(analytics?.hourly || {})
        .map(([h, v]) => ({ hour: `${h}:00`, count: v }))
        .filter((_, i) => i % 2 === 0); // every 2h for readability

    const dailyData = Object.entries(analytics?.daily || {}).map(([d, v]) => ({
        date: d.slice(5), count: v,
    }));

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>🌿 <span className="gradient-text">Wildlife Dashboard</span></h1>
                <p>Real-time monitoring of Brazilian road animals · BRA Dataset</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                <StatCard
                    icon="🐾" label="Total Detections"
                    value={analytics?.total ?? '—'}
                    sub="All time"
                    loading={loading}
                    accent="rgba(0,255,136,0.08)"
                />
                <StatCard
                    icon="📅" label="Detections Today"
                    value={analytics?.today ?? '—'}
                    sub={new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    loading={loading}
                    accent="rgba(0,180,255,0.08)"
                />
                <StatCard
                    icon="🏆" label="Most Frequent"
                    value={analytics?.most_frequent ? ANIMALS[analytics.most_frequent]?.icon + ' ' + formatAnimalName(analytics.most_frequent) : '—'}
                    sub="Top detected species"
                    loading={loading}
                    accent="rgba(124,58,237,0.08)"
                />
                <StatCard
                    icon="📡" label="Species Tracked"
                    value={5}
                    sub="Tapir · Puma · Wolf · Anteater · Jaguarundi"
                    loading={loading}
                    accent="rgba(255,107,53,0.08)"
                />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Bar Chart */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                        📊 Animal Detection Frequency
                    </div>
                    {animalChartData.length === 0 ? (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a8a', fontSize: 13 }}>
                            No detections yet. Upload an image or start webcam.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={animalChartData} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                                <XAxis dataKey="name" tick={{ fill: '#7a9cc0', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#7a9cc0', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Detections" radius={[4, 4, 0, 0]}>
                                    {animalChartData.map((entry, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                        🥧 Species Distribution
                    </div>
                    {pieData.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a8a', fontSize: 13 }}>
                            No data yet.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                    style={{ fontSize: 11 }}
                                >
                                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Hourly */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                        ⏰ Hourly Activity Pattern
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={hourlyData} margin={{ left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                            <XAxis dataKey="hour" tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="count" name="Detections" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                        📅 Daily Detection Trend
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={dailyData} margin={{ left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                            <XAxis dataKey="date" tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Detections" fill="#00b4ff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Detections */}
            <div className="glass-card" style={{ padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                    🕒 Recent Detections
                </div>
                {recent.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#4a6a8a', padding: '24px 0', fontSize: 13 }}>
                        No detections recorded yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recent.map(r => (
                            <div key={r.id} style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                                background: '#080e1c', borderRadius: 10, border: '1px solid #1e3050',
                            }}>
                                {r.thumbnail && (
                                    <img src={`data:image/jpeg;base64,${r.thumbnail}`} alt="thumb"
                                        style={{ width: 44, height: 33, borderRadius: 6, objectFit: 'cover', border: '1px solid #1e3050' }} />
                                )}
                                <AnimalTag animal={r.animal} />
                                <span style={{ fontSize: 13, color: '#00ff88', fontWeight: 700 }}>
                                    {(r.confidence * 100).toFixed(1)}%
                                </span>
                                <span style={{ fontSize: 12, color: '#4a6a8a', marginLeft: 'auto' }}>
                                    {formatTimestamp(r.timestamp)}
                                </span>
                                <span style={{
                                    fontSize: 10, padding: '2px 8px', borderRadius: 10,
                                    background: r.source === 'webcam' ? 'rgba(0,180,255,0.15)' : 'rgba(124,58,237,0.15)',
                                    color: r.source === 'webcam' ? '#00b4ff' : '#7c3aed',
                                    fontWeight: 700, textTransform: 'uppercase',
                                }}>
                                    {r.source}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
