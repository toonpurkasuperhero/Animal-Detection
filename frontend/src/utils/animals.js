// Animal display metadata
export const ANIMALS = {
    tapir: {
        label: 'Tapir',
        color: '#ff8c42',
        bg: 'rgba(255, 140, 66, 0.15)',
        border: '#ff8c42',
        icon: '🦏',
        dangerous: false,
    },
    jaguarundi: {
        label: 'Jaguarundi',
        color: '#ff3b6b',
        bg: 'rgba(255, 59, 107, 0.15)',
        border: '#ff3b6b',
        icon: '🐱',
        dangerous: true,
    },
    maned_wolf: {
        label: 'Maned Wolf',
        color: '#ffd60a',
        bg: 'rgba(255, 214, 10, 0.15)',
        border: '#ffd60a',
        icon: '🐺',
        dangerous: false,
    },
    puma: {
        label: 'Puma',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.15)',
        border: '#7c3aed',
        icon: '🐆',
        dangerous: true,
    },
    giant_anteater: {
        label: 'Giant Anteater',
        color: '#00ff88',
        bg: 'rgba(0, 255, 136, 0.15)',
        border: '#00ff88',
        icon: '🐜',
        dangerous: false,
    },
};

export const getAnimalInfo = (key) =>
    ANIMALS[key] || { label: key, color: '#7a9cc0', bg: 'rgba(122,156,192,0.15)', border: '#7a9cc0', icon: '🐾', dangerous: false };

export const formatAnimalName = (key) => getAnimalInfo(key).label;

export const formatConfidence = (conf) => `${(conf * 100).toFixed(1)}%`;

export const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
        const d = new Date(ts.replace(' ', 'T'));
        return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return ts;
    }
};

export const CHART_COLORS = ['#00ff88', '#00b4ff', '#7c3aed', '#ff6b35', '#ffd60a'];
