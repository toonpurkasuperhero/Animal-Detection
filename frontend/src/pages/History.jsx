import { useEffect, useState } from 'react';
import { getHistory, deleteRecord, exportCSV } from '../services/api';
import AnimalTag from '../components/AnimalTag';
import { formatTimestamp, formatConfidence } from '../utils/animals';

const ANIMALS_LIST = ['', 'tapir', 'jaguarundi', 'maned_wolf', 'puma', 'giant_anteater'];

export default function History() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ animal: '', date_from: '', date_to: '', min_confidence: '' });
    const [deleting, setDeleting] = useState(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.animal) params.animal = filters.animal;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            if (filters.min_confidence) params.min_confidence = parseFloat(filters.min_confidence) / 100;
            const res = await getHistory(params);
            setRecords(res.data.records || []);
        } catch { setRecords([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchHistory(); }, []);
    const applyFilters = () => fetchHistory();

    const handleDelete = async (id) => {
        setDeleting(id);
        try { await deleteRecord(id); setRecords(r => r.filter(x => x.id !== id)); } catch { }
        finally { setDeleting(null); }
    };

    const handleExport = () => {
        const params = {};
        if (filters.animal) params.animal = filters.animal;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;
        if (filters.min_confidence) params.min_confidence = parseFloat(filters.min_confidence) / 100;
        exportCSV(params);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>📋 <span className="gradient-text">Detection History</span></h1>
                <p>Browse and filter all recorded animal detections</p>
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 140px' }}>
                        <label style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>ANIMAL</label>
                        <select className="form-select" value={filters.animal} onChange={e => setFilters(f => ({ ...f, animal: e.target.value }))}>
                            <option value="">All Animals</option>
                            {ANIMALS_LIST.slice(1).map(a => (
                                <option key={a} value={a}>{a.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: '1 1 130px' }}>
                        <label style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>FROM DATE</label>
                        <input type="date" className="form-input" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
                    </div>
                    <div style={{ flex: '1 1 130px' }}>
                        <label style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>TO DATE</label>
                        <input type="date" className="form-input" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                        <label style={{ fontSize: 11, color: '#7a9cc0', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>MIN CONFIDENCE %</label>
                        <input type="number" className="form-input" min={0} max={100} placeholder="e.g. 60"
                            value={filters.min_confidence} onChange={e => setFilters(f => ({ ...f, min_confidence: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" onClick={applyFilters} style={{ whiteSpace: 'nowrap' }}>🔍 Apply</button>
                        <button className="btn-secondary" onClick={() => { setFilters({ animal: '', date_from: '', date_to: '', min_confidence: '' }); setTimeout(fetchHistory, 0); }} style={{ whiteSpace: 'nowrap' }}>✕ Clear</button>
                    </div>
                </div>
            </div>

            {/* Table header toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#7a9cc0' }}>
                    {loading ? 'Loading…' : `${records.length} record${records.length !== 1 ? 's' : ''} found`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" onClick={handleExport} style={{ fontSize: 12, padding: '6px 14px' }}>
                        📥 Export CSV
                    </button>
                    <button className="btn-secondary" onClick={fetchHistory} style={{ fontSize: 12, padding: '6px 14px' }}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#080e1c', borderBottom: '1px solid #1e3050' }}>
                                {['#', 'Thumbnail', 'Animal', 'Confidence', 'Source', 'Timestamp', 'Actions'].map(h => (
                                    <th key={h} style={{
                                        padding: '12px 16px', textAlign: 'left',
                                        fontSize: 10, fontWeight: 700, color: '#4a6a8a',
                                        letterSpacing: 1, textTransform: 'uppercase',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#4a6a8a', fontSize: 13 }}>
                                        Loading records…
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                                        <div style={{ color: '#4a6a8a', fontSize: 13 }}>No records found. Run a detection first.</div>
                                    </td>
                                </tr>
                            ) : records.map((r, i) => (
                                <tr key={r.id} style={{
                                    borderBottom: '1px solid #1e3050',
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)',
                                    transition: 'background 0.15s',
                                }}>
                                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#4a6a8a' }}>{r.id}</td>
                                    <td style={{ padding: '8px 16px' }}>
                                        {r.thumbnail
                                            ? <img src={`data:image/jpeg;base64,${r.thumbnail}`} alt=""
                                                style={{ width: 56, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #1e3050' }} />
                                            : <div style={{ width: 56, height: 40, borderRadius: 6, background: '#1e3050', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐾</div>
                                        }
                                    </td>
                                    <td style={{ padding: '10px 16px' }}><AnimalTag animal={r.animal} /></td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, color: r.confidence >= 0.7 ? '#00ff88' : '#ffd60a', fontSize: 13 }}>
                                                {formatConfidence(r.confidence)}
                                            </span>
                                            <div style={{ width: 48, height: 4, background: '#1e3050', borderRadius: 2 }}>
                                                <div style={{ height: '100%', borderRadius: 2, width: `${r.confidence * 100}%`, background: r.confidence >= 0.7 ? '#00ff88' : '#ffd60a' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{
                                            fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase',
                                            background: r.source === 'webcam' ? 'rgba(0,180,255,0.1)' : 'rgba(124,58,237,0.1)',
                                            color: r.source === 'webcam' ? '#00b4ff' : '#7c3aed',
                                        }}>{r.source}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#7a9cc0' }}>{formatTimestamp(r.timestamp)}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            disabled={deleting === r.id}
                                            style={{
                                                background: 'rgba(255,59,107,0.1)', border: '1px solid rgba(255,59,107,0.3)',
                                                color: '#ff3b6b', borderRadius: 6, padding: '4px 10px',
                                                fontSize: 11, cursor: 'pointer', fontWeight: 600,
                                                opacity: deleting === r.id ? 0.5 : 1,
                                            }}
                                        >
                                            {deleting === r.id ? '…' : '🗑'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
