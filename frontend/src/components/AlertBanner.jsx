import { getAnimalInfo } from '../utils/animals';

export default function AlertBanner({ detections }) {
    const dangerous = detections?.filter(d => getAnimalInfo(d.animal).dangerous) || [];
    if (!dangerous.length) return null;

    return (
        <div className="alert-banner" style={{
            padding: '10px 20px',
            border: '1px solid rgba(255,59,107,0.4)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
        }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
                <div style={{ fontWeight: 700, color: '#ff3b6b', fontSize: 14 }}>
                    DANGEROUS ANIMAL DETECTED
                </div>
                <div style={{ fontSize: 12, color: '#ff6b35' }}>
                    {dangerous.map(d => `${getAnimalInfo(d.animal).label} (${(d.confidence * 100).toFixed(0)}%)`).join(' · ')}
                </div>
            </div>
        </div>
    );
}
