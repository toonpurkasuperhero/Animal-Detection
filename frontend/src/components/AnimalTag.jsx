import { getAnimalInfo } from '../utils/animals';

export default function AnimalTag({ animal }) {
    const info = getAnimalInfo(animal);
    return (
        <span className="animal-tag" style={{
            background: info.bg,
            color: info.color,
            border: `1px solid ${info.border}`,
        }}>
            {info.icon} {info.label}
        </span>
    );
}
