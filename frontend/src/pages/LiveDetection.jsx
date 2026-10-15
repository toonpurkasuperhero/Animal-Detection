import { useEffect, useRef, useState, useCallback } from 'react';
import { detectFrame, getSensorLatest } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import AnimalTag from '../components/AnimalTag';
import { v4 as uuidv4 } from 'uuid';

const SESSION_ID = uuidv4();
const DETECT_INTERVAL_MS = 400;
const SENSOR_POLL_MS = 2000;
const DISTANCE_THRESHOLD = 20; // cm — matches backend

export default function LiveDetection() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const sensorTimerRef = useRef(null);

    // Camera state
    const [running, setRunning] = useState(false);
    const [detections, setDetections] = useState([]);
    const [fps, setFps] = useState(0);
    const [cameraId, setCameraId] = useState(0);
    const [cameras, setCameras] = useState([]);
    const [frameCount, setFrameCount] = useState(0);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(true);
    const fpsCountRef = useRef(0);

    // Sensor state
    const [sensor, setSensor] = useState(null);           // { distance_cm, pir, triggered }
    const [sensorError, setSensorError] = useState(false);
    const autoStartedRef = useRef(false);                 // was camera started by sensor auto-trigger?
    const manualRef = useRef(false);                     // user clicked "Start Manually"?
    const runningRef = useRef(false);                    // keep a sync ref for the sensor callback

    // Sync running state → ref (for sensor callback closure)
    useEffect(() => { runningRef.current = running; }, [running]);

    // ----- Camera helpers -----
    const startDetection = useCallback(async (camId = cameraId, isAutoStart = false) => {
        setError(null);
        try {
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: cameras[camId]?.deviceId ? { exact: cameras[camId].deviceId } : undefined,
                    width: 640, height: 480,
                },
            });
            streamRef.current = stream;
            if (videoRef.current) { videoRef.current.srcObject = stream; }
            autoStartedRef.current = isAutoStart;
            setRunning(true);
            intervalRef.current = setInterval(captureAndDetect, DETECT_INTERVAL_MS);
        } catch {
            setError('Camera access denied. Please allow webcam permissions.');
        }
    }, [cameras, cameraId]);   // captureAndDetect added below via ref trick

    const stopDetection = useCallback(() => {
        clearInterval(intervalRef.current);
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoRef.current) { videoRef.current.srcObject = null; }
        if (overlayRef.current) {
            const ctx = overlayRef.current.getContext('2d');
            ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
        autoStartedRef.current = false;
        manualRef.current = false;
        setRunning(false);
        setDetections([]);
    }, []);

    const captureAndDetect = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

        try {
            const res = await detectFrame(b64, SESSION_ID, saving);
            const dets = res.data.detections || [];
            setDetections(dets);
            fpsCountRef.current += 1;
            setFrameCount(c => c + 1);

            if (res.data.annotated_frame && overlayRef.current) {
                const img = new Image();
                img.onload = () => {
                    const oc = overlayRef.current;
                    if (!oc) return;
                    oc.width = video.videoWidth || 640;
                    oc.height = video.videoHeight || 480;
                    oc.getContext('2d').drawImage(img, 0, 0, oc.width, oc.height);
                };
                img.src = `data:image/jpeg;base64,${res.data.annotated_frame}`;
            }
        } catch { /* skip frame */ }
    }, [saving]);

    // ----- Sensor poller -----
    const pollSensor = useCallback(async () => {
        try {
            const res = await getSensorLatest();
            const data = res.data;
            setSensor(data);
            setSensorError(false);

            if (data.triggered && !runningRef.current) {
                // Auto-start because distance < threshold
                await startDetection(undefined, true);
            } else if (!data.triggered && runningRef.current && autoStartedRef.current && !manualRef.current) {
                // Auto-stop: sensor cleared, camera was auto-started, user hasn't taken manual control
                stopDetection();
            }
        } catch {
            setSensorError(true);
        }
    }, [startDetection, stopDetection]);

    // ----- Lifecycle -----
    useEffect(() => {
        navigator.mediaDevices?.enumerateDevices().then(devs => {
            setCameras(devs.filter(d => d.kind === 'videoinput'));
        });

        // FPS counter
        const fpsTimer = setInterval(() => {
            setFps(fpsCountRef.current);
            fpsCountRef.current = 0;
        }, 1000);

        // Start sensor polling immediately
        pollSensor();
        sensorTimerRef.current = setInterval(pollSensor, SENSOR_POLL_MS);

        return () => {
            clearInterval(fpsTimer);
            clearInterval(sensorTimerRef.current);
            stopDetection();
        };
    }, []);   // pollSensor / stopDetection stable via useCallback

    const switchCamera = () => {
        const next = (cameraId + 1) % Math.max(cameras.length, 1);
        setCameraId(next);
        if (running) { stopDetection(); setTimeout(() => startDetection(next), 300); }
    };

    const captureSnapshot = () => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const link = document.createElement('a');
        link.download = `wildguard_${Date.now()}.jpg`;
        link.href = overlay.toDataURL('image/jpeg', 0.95);
        link.click();
    };

    // Manual camera start (user-initiated)
    const handleManualStart = () => {
        manualRef.current = true;
        startDetection(cameraId, false);
    };

    // ---- Derived sensor display values ----
    const distanceCm = sensor?.distance_cm;
    const pirStatus = sensor?.pir ?? '—';
    const sensorTriggered = sensor?.triggered ?? false;
    const pirMotion = pirStatus.toLowerCase().includes('motion detected');

    const distanceColor =
        distanceCm === null || distanceCm === undefined ? '#4a6a8a'
        : distanceCm < DISTANCE_THRESHOLD ? '#ff3b6b'
        : distanceCm < 50 ? '#ffb300'
        : '#00ff88';

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>📹 <span className="gradient-text">Live Detection</span></h1>
                <p>Real-time animal detection via webcam · Sensor-triggered auto-recording</p>
            </div>

            <AlertBanner detections={detections} />

            {/* Sensor triggered banner */}
            {sensorTriggered && (
                <div style={{
                    marginBottom: 16, padding: '12px 20px',
                    background: 'rgba(255,59,107,0.12)',
                    border: '1px solid rgba(255,59,107,0.4)',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 12,
                    animation: 'pulse 1.5s ease-in-out infinite',
                }}>
                    <span style={{ fontSize: 20 }}>🚨</span>
                    <div>
                        <div style={{ color: '#ff3b6b', fontWeight: 700, fontSize: 14 }}>
                            ANIMAL NEARBY — Distance: {distanceCm?.toFixed(1)} cm  · Camera Auto-Started!
                        </div>
                        <div style={{ color: '#ff7095', fontSize: 12, marginTop: 2 }}>
                            Camera will stop automatically once the animal moves away (&gt;{DISTANCE_THRESHOLD} cm).
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                {/* Video area */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                    {/* Status bar */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        background: 'linear-gradient(0deg, transparent, rgba(5,13,26,0.9))',
                        padding: '12px 18px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        zIndex: 10,
                    }}>
                        <div className={`status-dot ${running ? 'active' : 'inactive'}`} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: running ? '#00ff88' : '#4a6a8a' }}>
                            {running
                                ? `LIVE · ${fps} FPS · Frame ${frameCount}${autoStartedRef.current ? ' · AUTO' : ' · MANUAL'}`
                                : 'OFFLINE'}
                        </span>
                        {running && <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginLeft: 'auto' }}>
                            {detections.length} detection{detections.length !== 1 ? 's' : ''}
                        </span>}
                    </div>

                    <div style={{ position: 'relative', minHeight: 400, background: '#020810' }}>
                        <video ref={videoRef} autoPlay playsInline muted
                            style={{ width: '100%', display: 'block', opacity: 0, position: 'absolute' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <canvas ref={overlayRef} style={{ width: '100%', display: 'block', minHeight: 380 }} />
                        {!running && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: 16,
                            }}>
                                <div style={{ fontSize: 48 }}>📷</div>
                                <div style={{ color: '#4a6a8a', fontSize: 14 }}>Camera feed offline</div>
                                <div style={{ color: '#7a9cc0', fontSize: 12 }}>
                                    {sensorTriggered
                                        ? 'Starting automatically — animal detected!'
                                        : 'Auto-starts when distance < 20 cm · or start manually below'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls bar */}
                    <div style={{
                        padding: '16px 18px',
                        borderTop: '1px solid #1e3050',
                        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                    }}>
                        {!running ? (
                            <button className="btn-primary" id="btn-manual-start" onClick={handleManualStart}>
                                📷 Start Camera Manually
                            </button>
                        ) : (
                            <button className="btn-danger" id="btn-stop" onClick={stopDetection}>
                                ⏹ Stop Camera
                            </button>
                        )}
                        <button className="btn-secondary" onClick={switchCamera} disabled={!running && cameras.length <= 1}>
                            🔄 Switch Camera
                        </button>
                        <button className="btn-secondary" onClick={captureSnapshot} disabled={!running}>
                            📸 Snapshot
                        </button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7a9cc0', marginLeft: 'auto', cursor: 'pointer' }}>
                            <input type="checkbox" checked={saving} onChange={e => setSaving(e.target.checked)}
                                style={{ accentColor: '#00ff88' }} />
                            Save to History
                        </label>
                    </div>
                    {error && <div style={{ padding: '8px 18px 12px', color: '#ff3b6b', fontSize: 13 }}>{error}</div>}
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* ── Sensor Monitor ── */}
                    <div className="glass-card" style={{
                        padding: '18px 20px',
                        border: sensorTriggered
                            ? '1px solid rgba(255,59,107,0.5)'
                            : '1px solid rgba(0,255,136,0.15)',
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            📡 Sensor Monitor
                            <span style={{
                                marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 20,
                                background: sensorError ? 'rgba(255,180,0,0.15)' : 'rgba(0,255,136,0.1)',
                                color: sensorError ? '#ffb300' : '#00ff88',
                            }}>
                                {sensorError ? '⚠ NO SIGNAL' : '● LIVE'}
                            </span>
                        </div>

                        {/* Distance */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: '#4a6a8a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Ultrasonic Distance
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontSize: 32, fontWeight: 800, color: distanceColor, lineHeight: 1 }}>
                                    {distanceCm !== null && distanceCm !== undefined ? distanceCm.toFixed(1) : '—'}
                                </span>
                                <span style={{ fontSize: 14, color: '#4a6a8a' }}>cm</span>
                            </div>
                            {/* Distance bar */}
                            <div style={{ marginTop: 8, height: 6, background: '#1e3050', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 3,
                                    width: distanceCm !== null && distanceCm !== undefined
                                        ? `${Math.min((distanceCm / 250) * 100, 100)}%`
                                        : '0%',
                                    background: distanceCm < DISTANCE_THRESHOLD
                                        ? 'linear-gradient(90deg, #ff3b6b, #ff7095)'
                                        : 'linear-gradient(90deg, #00ff88, #00b4ff)',
                                    transition: 'width 0.5s ease, background 0.3s ease',
                                }} />
                            </div>
                            <div style={{ marginTop: 4, fontSize: 10, color: '#4a6a8a', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#ff3b6b' }}>0</span>
                                <span style={{ color: '#ffb300' }}>Trigger: {DISTANCE_THRESHOLD} cm</span>
                                <span>250 cm</span>
                            </div>
                        </div>

                        {/* PIR */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: '#4a6a8a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                PIR Motion Sensor
                            </div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '6px 14px', borderRadius: 20,
                                background: pirMotion ? 'rgba(255,59,107,0.15)' : 'rgba(0,255,136,0.1)',
                                border: pirMotion ? '1px solid rgba(255,59,107,0.3)' : '1px solid rgba(0,255,136,0.2)',
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: pirMotion ? '#ff3b6b' : '#00ff88',
                                    boxShadow: pirMotion ? '0 0 6px #ff3b6b' : '0 0 6px #00ff88',
                                }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: pirMotion ? '#ff3b6b' : '#00ff88' }}>
                                    {pirStatus}
                                </span>
                            </div>
                        </div>

                        {/* Trigger status */}
                        <div style={{
                            padding: '10px 14px', borderRadius: 10,
                            background: sensorTriggered ? 'rgba(255,59,107,0.08)' : 'rgba(0,255,136,0.05)',
                            border: sensorTriggered ? '1px solid rgba(255,59,107,0.3)' : '1px solid rgba(0,255,136,0.15)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>
                                {sensorTriggered ? '🔴' : '🟢'}
                            </div>
                            <div style={{
                                fontSize: 12, fontWeight: 700,
                                color: sensorTriggered ? '#ff3b6b' : '#00ff88',
                            }}>
                                {sensorTriggered ? 'ANIMAL NEARBY' : 'AREA CLEAR'}
                            </div>
                            <div style={{ fontSize: 10, color: '#4a6a8a', marginTop: 2 }}>
                                {sensorTriggered
                                    ? 'Camera recording automatically'
                                    : `Camera off · waiting for < ${DISTANCE_THRESHOLD} cm`}
                            </div>
                        </div>
                    </div>

                    {/* Live Detections */}
                    <div className="glass-card" style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🔍 Live Detections</div>
                        {detections.length === 0 ? (
                            <div style={{ color: '#4a6a8a', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                                {running ? 'Scanning for animals...' : 'Start camera to detect'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {detections.map((d, i) => (
                                    <div key={i} style={{
                                        padding: '10px 12px', background: '#080e1c', borderRadius: 10,
                                        border: '1px solid #1e3050',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <AnimalTag animal={d.animal} />
                                            <span style={{ fontSize: 14, fontWeight: 800, color: '#00ff88' }}>
                                                {(d.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#4a6a8a' }}>
                                            BBox: [{d.bbox?.join(', ')}]
                                        </div>
                                        <div style={{ height: 4, background: '#1e3050', borderRadius: 2, marginTop: 6 }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                width: `${d.confidence * 100}%`,
                                                background: 'linear-gradient(90deg, #00ff88, #00b4ff)',
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Camera list */}
                    {cameras.length > 0 && (
                        <div className="glass-card" style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, color: '#7a9cc0' }}>📷 Cameras</div>
                            {cameras.map((c, i) => (
                                <div key={i} style={{
                                    padding: '6px 0', fontSize: 12,
                                    color: i === cameraId ? '#00ff88' : '#4a6a8a',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    {i === cameraId && <div className="status-dot active" style={{ width: 6, height: 6 }} />}
                                    {c.label || `Camera ${i + 1}`}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info tip */}
                    <div className="glass-card" style={{ padding: '14px 18px', borderColor: 'rgba(0,180,255,0.2)' }}>
                        <div style={{ fontSize: 12, color: '#7a9cc0', lineHeight: 1.6 }}>
                            💡 <strong style={{ color: '#00b4ff' }}>Auto-mode:</strong> Camera activates automatically when sensor distance drops below <strong style={{ color: '#ff3b6b' }}>{DISTANCE_THRESHOLD} cm</strong>. Click <strong style={{ color: '#00ff88' }}>Start Camera Manually</strong> to override at any time.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
