import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area,
} from 'recharts';
import { getAnalytics } from '../services/api';
import { ANIMALS, CHART_COLORS, formatAnimalName } from '../utils/animals';
import { exportCSV } from '../services/api';

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

function InsightCard({ icon, title, value, sub, color }) {
    return (
        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e8f4fd', marginBottom: 4 }}>{value || '—'}</div>
            {sub && <div style={{ fontSize: 11, color: '#4a6a8a' }}>{sub}</div>}
        </div>
    );
}

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getAnalytics();
                setData(res.data);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
        const t = setInterval(fetch, 15000);
        return () => clearInterval(t);
    }, []);

    // Prepare chart data
    const animalData = Object.entries(data?.animal_counts || {}).map(([k, v], i) => ({
        name: formatAnimalName(k),
        detections: v,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const hourlyData = Object.entries(data?.hourly || {}).map(([h, v]) => ({
        hour: `${h.padStart(2, '0')}h`,
        count: v,
    }));

    const dailyData = Object.entries(data?.daily || {}).map(([d, v]) => ({
        date: d.slice(5),
        count: v,
    }));

    const radarData = Object.entries(data?.animal_counts || {}).map(([k, v]) => ({
        species: formatAnimalName(k),
        count: v,
    }));

    // Insight computations
    const mostActive = data?.most_frequent ? formatAnimalName(data.most_frequent) + ' ' + (ANIMALS[data.most_frequent]?.icon || '') : null;
    const peakHour = hourlyData.reduce((best, h) => h.count > (best?.count || 0) ? h : best, null);
    const totalToday = data?.today || 0;
    const webcamVsImage = data?.sources ? `${data.sources.webcam || 0} webcam · ${data.sources.image || 0} image` : null;

    // Heatmap (24 hours x 5 animals) — simulated from hourly totals
    const heatHours = Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, '0')}:00`,
        count: data?.hourly?.[String(h)] || 0,
    }));
    const maxHeat = Math.max(...heatHours.map(h => h.count), 1);

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>📊 <span className="gradient-text">Advanced Analytics</span></h1>
                    <p>Wildlife activity insights and detection patterns</p>
                </div>
                <button className="btn-secondary" onClick={() => exportCSV({})} style={{ fontSize: 12, padding: '8px 16px' }}>
                    📥 Export All Data
                </button>
            </div>

            {/* AI Insight Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <InsightCard icon="🏆" title="Most Active Animal" value={mostActive} sub="Highest detection count" color="#00ff88" />
                <InsightCard icon="⏰" title="Peak Activity Hour" value={peakHour ? peakHour.hour : '—'} sub={`${peakHour?.count || 0} detections`} color="#00b4ff" />
                <InsightCard icon="📅" title="Today's Detections" value={totalToday} sub="Across all sources" color="#7c3aed" />
                <InsightCard icon="📡" title="Detection Sources" value={data ? Object.keys(data.sources || {}).length + ' sources' : '—'} sub={webcamVsImage} color="#ffd60a" />
            </div>

            {/* Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Animal detections bar */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🦁 Species Detection Count</div>
                    {animalData.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a8a', fontSize: 13 }}>
                            No data. Run detections first.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={animalData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                                <XAxis type="number" tick={{ fill: '#7a9cc0', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#7a9cc0', fontSize: 11 }} width={90} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="detections" name="Detections" radius={[0, 4, 4, 0]}>
                                    {animalData.map((entry, i) => (
                                        <rect key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Radar */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🕸️ Species Activity Radar</div>
                    {radarData.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a8a', fontSize: 13 }}>No data yet.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#1e3050" />
                                <PolarAngleAxis dataKey="species" tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                                <PolarRadiusAxis tick={{ fill: '#4a6a8a', fontSize: 9 }} />
                                <Radar name="Detections" dataKey="count" fill="#00ff88" fillOpacity={0.2} stroke="#00ff88" strokeWidth={2} />
                                <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Hourly area */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>⏰ 24h Activity Pattern</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={hourlyData} margin={{ left: -10 }}>
                            <defs>
                                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                            <XAxis dataKey="hour" tick={{ fill: '#7a9cc0', fontSize: 9 }} interval={3} />
                            <YAxis tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" name="Detections" stroke="#00ff88" fill="url(#grad1)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily trend */}
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📅 Daily Detection Trend</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyData} margin={{ left: -10 }}>
                            <defs>
                                <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                            <XAxis dataKey="date" tick={{ fill: '#7a9cc0', fontSize: 9 }} />
                            <YAxis tick={{ fill: '#7a9cc0', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" name="Detections" stroke="#7c3aed" fill="url(#grad2)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🌡️ 24-Hour Activity Heatmap</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {heatHours.map((h, i) => {
                        const intensity = h.count / maxHeat;
                        return (
                            <div key={i} title={`${h.hour}: ${h.count} detections`}
                                style={{
                                    flex: '1 0 30px', height: 48,
                                    borderRadius: 6,
                                    background: intensity > 0
                                        ? `rgba(0, 255, 136, ${0.1 + intensity * 0.9})`
                                        : '#0f1e35',
                                    border: '1px solid #1e3050',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'default',
                                    transition: 'transform 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scaleY(1.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scaleY(1)'; }}
                            >
                                <span style={{ fontSize: 9, color: intensity > 0.5 ? '#050d1a' : '#4a6a8a', fontWeight: 700 }}>
                                    {h.hour.slice(0, 2)}
                                </span>
                                {h.count > 0 && <span style={{ fontSize: 8, color: intensity > 0.5 ? '#020810' : '#7a9cc0' }}>{h.count}</span>}
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: '#4a6a8a' }}>Low</span>
                    <div style={{ height: 6, flex: 1, borderRadius: 3, background: 'linear-gradient(90deg, #0f1e35, rgba(0,255,136,0.3), rgba(0,255,136,0.9))' }} />
                    <span style={{ fontSize: 11, color: '#4a6a8a' }}>High</span>
                </div>
            </div>

            {/* Wildlife Insights Text */}
            <div className="glass-card" style={{ padding: '20px 24px', borderColor: 'rgba(0,255,136,0.2)' }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🤖 AI Wildlife Insights</div>
                {!data || data.total === 0 ? (
                    <div style={{ color: '#4a6a8a', fontSize: 13 }}>
                        No detection data yet. Upload images or run webcam detection to generate insights.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {[
                            {
                                label: 'Most Active Species',
                                value: mostActive,
                                detail: `Detected ${data.animal_counts?.[data.most_frequent] || 0} times in total`,
                                icon: '🏆',
                            },
                            {
                                label: 'Peak Detection Hour',
                                value: peakHour ? `${peakHour.hour}` : 'Insufficient data',
                                detail: `${peakHour?.count || 0} detections recorded`,
                                icon: '⏰',
                            },
                            {
                                label: 'Detection Sessions',
                                value: `${data.sources?.webcam || 0} live · ${data.sources?.image || 0} image`,
                                detail: 'Breakdown by input source',
                                icon: '📡',
                            },
                            {
                                label: 'Monitored Species',
                                value: `${Object.keys(data.animal_counts || {}).length} / 5 species observed`,
                                detail: 'Out of 5 BRA dataset classes',
                                icon: '🦁',
                            },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '14px 16px', background: '#080e1c', borderRadius: 10, border: '1px solid #1e3050' }}>
                                <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
                                <div style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4fd', marginBottom: 2 }}>{item.value || '—'}</div>
                                <div style={{ fontSize: 11, color: '#4a6a8a' }}>{item.detail}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
