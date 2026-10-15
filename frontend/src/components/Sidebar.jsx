import { NavLink } from 'react-router-dom';
import {
    MdDashboard, MdVideoCall, MdImage, MdHistory, MdAnalytics, MdWaves
} from 'react-icons/md';

const navItems = [
    { path: '/', icon: <MdDashboard size={20} />, label: 'Dashboard' },
    { path: '/live', icon: <MdVideoCall size={20} />, label: 'Live Detection' },
    { path: '/image', icon: <MdImage size={20} />, label: 'Image Detection' },
    { path: '/history', icon: <MdHistory size={20} />, label: 'History' },
    { path: '/analytics', icon: <MdAnalytics size={20} />, label: 'Analytics' },
];

export default function Sidebar() {
    return (
        <aside style={{
            width: 240,
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #080e1c 0%, #0a1628 100%)',
            borderRight: '1px solid #1e3050',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0, top: 0, bottom: 0,
            zIndex: 100,
        }}>
            {/* Logo */}
            <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #1e3050' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #00ff88, #00b4ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                    }}>
                        🦁
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#e8f4fd', letterSpacing: 0.3 }}>WildGuard AI</div>
                        <div style={{ fontSize: 10, color: '#4a6a8a', fontWeight: 500, letterSpacing: 1 }}>MONITORING SYSTEM</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '16px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4a6a8a', letterSpacing: 1.5, padding: '0 12px 8px' }}>
                    NAVIGATION
                </div>
                {navItems.map(({ path, icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === '/'}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '11px 14px',
                            borderRadius: 10,
                            marginBottom: 4,
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: 14,
                            transition: 'all 0.2s ease',
                            background: isActive
                                ? 'linear-gradient(135deg, rgba(0,255,136,0.12), rgba(0,180,255,0.08))'
                                : 'transparent',
                            color: isActive ? '#00ff88' : '#7a9cc0',
                            borderLeft: isActive ? '3px solid #00ff88' : '3px solid transparent',
                        })}
                    >
                        {icon}
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1e3050' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="status-dot active" />
                    <span style={{ fontSize: 12, color: '#4a6a8a' }}>System Online</span>
                </div>
                <div style={{ fontSize: 10, color: '#4a6a8a', marginTop: 4 }}>
                    BRA Dataset · 5 Species
                </div>
            </div>
        </aside>
    );
}
