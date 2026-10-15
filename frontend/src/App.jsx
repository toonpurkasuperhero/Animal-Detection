import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveDetection from './pages/LiveDetection';
import ImageDetection from './pages/ImageDetection';
import History from './pages/History';
import Analytics from './pages/Analytics';
import { getHealth } from './services/api';

export default function App() {
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const check = async () => {
      try { await getHealth(); setBackendOnline(true); }
      catch { setBackendOnline(false); }
    };
    check();
    const t = setInterval(check, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />

        {/* Main content */}
        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top bar */}
          <header style={{
            height: 56,
            background: 'rgba(5,13,26,0.95)',
            borderBottom: '1px solid #1e3050',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky', top: 0, zIndex: 50,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 13, color: '#7a9cc0' }}>
              🌿 Brazilian Road Animals Wildlife Monitoring Platform
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Backend status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={`status-dot ${backendOnline === true ? 'active' : 'inactive'}`} />
                <span style={{ fontSize: 11, fontWeight: 600, color: backendOnline === true ? '#00ff88' : backendOnline === false ? '#ff3b6b' : '#4a6a8a' }}>
                  {backendOnline === true ? 'API Online' : backendOnline === false ? 'API Offline' : 'Connecting…'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#4a6a8a' }}>
                {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </div>
            </div>
          </header>

          {/* API Offline warning */}
          {backendOnline === false && (
            <div style={{
              background: 'rgba(255,59,107,0.08)', borderBottom: '1px solid rgba(255,59,107,0.2)',
              padding: '8px 28px', fontSize: 12, color: '#ff6b35',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ Backend API is offline. Start it with:{' '}
              <code style={{ background: '#0f1e35', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                cd D:\animal_detection\backend && python main.py
              </code>
            </div>
          )}

          {/* Page content */}
          <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveDetection />} />
              <Route path="/image" element={<ImageDetection />} />
              <Route path="/history" element={<History />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer style={{
            borderTop: '1px solid #1e3050', padding: '10px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#4a6a8a' }}>
              WildGuard AI · YOLOv8 + ONNX Runtime · BRA Dataset
            </span>
            <span style={{ fontSize: 11, color: '#4a6a8a' }}>
              Tapir · Jaguarundi · Maned Wolf · Puma · Giant Anteater
            </span>
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}
