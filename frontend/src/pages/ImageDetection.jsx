import { useState, useRef, useCallback } from 'react';
import { detectImage } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import AnimalTag from '../components/AnimalTag';
import { formatConfidence } from '../utils/animals';

export default function ImageDetection() {
    const [dragging, setDragging] = useState(false);
    const [detections, setDetections] = useState([]);
    const [annotatedImg, setAnnotatedImg] = useState(null);
    const [originalImg, setOriginalImg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const fileRef = useRef(null);

    const processFile = useCallback(async (file) => {
        if (!file?.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
        setError(null);
        setLoading(true);
        setDetections([]);
        setAnnotatedImg(null);

        // Show original preview
        const reader = new FileReader();
        reader.onload = (e) => setOriginalImg(e.target.result);
        reader.readAsDataURL(file);

        try {
            const res = await detectImage(file);
            setDetections(res.data.detections || []);
            if (res.data.annotated_image) {
                setAnnotatedImg(`data:image/jpeg;base64,${res.data.annotated_image}`);
            }
        } catch (err) {
            setError('Detection failed. Is the backend running at localhost:8000?');
        } finally {
            setLoading(false);
        }
    }, []);

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const reset = () => {
        setDetections([]);
        setAnnotatedImg(null);
        setOriginalImg(null);
        setError(null);
        setShowOriginal(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const displayImg = showOriginal ? originalImg : (annotatedImg || originalImg);

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>🖼️ <span className="gradient-text">Image Detection</span></h1>
                <p>Upload an image to detect Brazilian road animals with ONNX model</p>
            </div>

            <AlertBanner detections={detections} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* Upload / Image area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Drop zone */}
                    {!originalImg && (
                        <div
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            style={{
                                border: `2px dashed ${dragging ? '#00ff88' : '#1e3050'}`,
                                borderRadius: 16,
                                padding: '72px 40px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: dragging ? 'rgba(0,255,136,0.04)' : 'rgba(10,22,40,0.5)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🦁</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8f4fd', marginBottom: 8 }}>
                                Drop an image here
                            </div>
                            <div style={{ fontSize: 13, color: '#7a9cc0', marginBottom: 20 }}>
                                or click to browse your files
                            </div>
                            <div style={{
                                display: 'inline-block', padding: '8px 20px',
                                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
                                borderRadius: 8, fontSize: 12, color: '#00ff88', fontWeight: 600,
                            }}>
                                📁 Browse Files
                            </div>
                            <div style={{ fontSize: 11, color: '#4a6a8a', marginTop: 12 }}>
                                Supported: JPG, PNG, WEBP, BMP
                            </div>
                        </div>
                    )}

                    {/* Image display */}
                    {originalImg && (
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: '12px 16px', borderBottom: '1px solid #1e3050',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                {loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed' }}>
                                        <div className="spinner" style={{ width: 14, height: 14, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>Running ONNX inference…</span>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 13, fontWeight: 600, color: detections.length > 0 ? '#00ff88' : '#7a9cc0' }}>
                                        {detections.length > 0 ? `✓ ${detections.length} animal${detections.length > 1 ? 's' : ''} detected` : '✗ No animals detected'}
                                    </span>
                                )}
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    {annotatedImg && (
                                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }}
                                            onClick={() => setShowOriginal(s => !s)}>
                                            {showOriginal ? '🔍 Show Annotated' : '📷 Show Original'}
                                        </button>
                                    )}
                                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={reset}>
                                        🗑 Reset
                                    </button>
                                    {annotatedImg && (
                                        <a href={annotatedImg} download={`detection_${Date.now()}.jpg`} className="btn-primary" style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none' }}>
                                            💾 Save
                                        </a>
                                    )}
                                </div>
                            </div>
                            <img src={displayImg} alt="detection"
                                style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'contain', background: '#020810' }} />
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '12px 16px', background: 'rgba(255,59,107,0.1)', border: '1px solid rgba(255,59,107,0.3)', borderRadius: 10, color: '#ff3b6b', fontSize: 13 }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Results panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card" style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>🔍 Detection Results</div>
                        {!originalImg ? (
                            <div style={{ color: '#4a6a8a', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                                Upload an image to see results
                            </div>
                        ) : loading ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div className="spinner" style={{ width: 28, height: 28, border: '3px solid #1e3050', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 12px' }} />
                                <div style={{ color: '#7a9cc0', fontSize: 13 }}>Analyzing...</div>
                            </div>
                        ) : detections.length === 0 ? (
                            <div style={{ color: '#4a6a8a', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                                No animals detected.<br />Try a clearer image.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {detections.map((d, i) => (
                                    <div key={i} style={{
                                        padding: '12px 14px', background: '#080e1c', borderRadius: 12,
                                        border: '1px solid #1e3050',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <AnimalTag animal={d.animal} />
                                            <span style={{ fontSize: 16, fontWeight: 800, color: '#00ff88' }}>
                                                {formatConfidence(d.confidence)}
                                            </span>
                                        </div>
                                        <div style={{ height: 5, background: '#1e3050', borderRadius: 3, marginBottom: 6 }}>
                                            <div style={{
                                                height: '100%', borderRadius: 3,
                                                width: `${d.confidence * 100}%`,
                                                background: d.confidence > 0.7 ? 'linear-gradient(90deg, #00ff88, #00b4ff)' : 'linear-gradient(90deg, #ffd60a, #ff6b35)',
                                            }} />
                                        </div>
                                        <div style={{ fontSize: 11, color: '#4a6a8a' }}>
                                            📍 BBox: x1={d.bbox?.[0]} y1={d.bbox?.[1]} x2={d.bbox?.[2]} y2={d.bbox?.[3]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upload another */}
                    {originalImg && (
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }}>
                            📤 Upload Another Image
                        </button>
                    )}

                    {/* Info */}
                    <div className="glass-card" style={{ padding: '14px 18px', borderColor: 'rgba(0,255,136,0.15)' }}>
                        <div style={{ fontSize: 12, color: '#7a9cc0', lineHeight: 1.7 }}>
                            <div style={{ fontWeight: 700, color: '#00ff88', marginBottom: 4 }}>Detectable Animals</div>
                            🦏 Tapir &nbsp;·&nbsp; 🐱 Jaguarundi<br />
                            🐺 Maned Wolf &nbsp;·&nbsp; 🐆 Puma<br />
                            🐜 Giant Anteater
                        </div>
                    </div>
                </div>
            </div>

            <input type="file" ref={fileRef} style={{ display: 'none' }}
                accept="image/*" onChange={onFileChange} />
        </div>
    );
}
