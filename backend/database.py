import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "detections.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            animal TEXT NOT NULL,
            confidence REAL NOT NULL,
            source TEXT NOT NULL,
            thumbnail TEXT,
            bbox TEXT,
            session_id TEXT
        )
    """)
    conn.commit()
    conn.close()


def insert_detection(animal: str, confidence: float, source: str, thumbnail: str = None, bbox: list = None, session_id: str = None) -> int:
    conn = get_connection()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    bbox_str = json.dumps(bbox) if bbox else None
    cur = conn.execute(
        "INSERT INTO detections (timestamp, animal, confidence, source, thumbnail, bbox, session_id) VALUES (?,?,?,?,?,?,?)",
        (ts, animal, confidence, source, thumbnail, bbox_str, session_id)
    )
    conn.commit()
    record_id = cur.lastrowid
    conn.close()
    return record_id


def get_detections(animal: str = None, date_from: str = None, date_to: str = None, min_confidence: float = None, limit: int = 200):
    conn = get_connection()
    query = "SELECT * FROM detections WHERE 1=1"
    params = []
    if animal:
        query += " AND animal = ?"
        params.append(animal)
    if date_from:
        query += " AND timestamp >= ?"
        params.append(date_from)
    if date_to:
        query += " AND timestamp <= ?"
        params.append(date_to + " 23:59:59")
    if min_confidence is not None:
        query += " AND confidence >= ?"
        params.append(min_confidence)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("bbox"):
            d["bbox"] = json.loads(d["bbox"])
        result.append(d)
    return result


def delete_detection(record_id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM detections WHERE id = ?", (record_id,))
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


def get_analytics():
    conn = get_connection()
    # Total counts per animal
    animal_counts = {}
    for row in conn.execute("SELECT animal, COUNT(*) as cnt FROM detections GROUP BY animal"):
        animal_counts[row["animal"]] = row["cnt"]

    # Detections today
    today = datetime.now().strftime("%Y-%m-%d")
    today_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM detections WHERE timestamp LIKE ?", (today + "%",)
    ).fetchone()["cnt"]

    # Total detections
    total = conn.execute("SELECT COUNT(*) as cnt FROM detections").fetchone()["cnt"]

    # Most frequent animal
    most_frequent = max(animal_counts, key=animal_counts.get) if animal_counts else None

    # Hourly distribution (0-23)
    hourly = {str(i): 0 for i in range(24)}
    for row in conn.execute("SELECT SUBSTR(timestamp, 12, 2) as hour, COUNT(*) as cnt FROM detections GROUP BY hour"):
        h = row["hour"].lstrip("0") or "0"
        hourly[h] = row["cnt"]

    # Daily for last 14 days
    daily = {}
    for row in conn.execute(
        "SELECT SUBSTR(timestamp, 1, 10) as day, COUNT(*) as cnt FROM detections GROUP BY day ORDER BY day DESC LIMIT 14"
    ):
        daily[row["day"]] = row["cnt"]

    # Source distribution
    sources = {}
    for row in conn.execute("SELECT source, COUNT(*) as cnt FROM detections GROUP BY source"):
        sources[row["source"]] = row["cnt"]

    conn.close()
    return {
        "total": total,
        "today": today_count,
        "most_frequent": most_frequent,
        "animal_counts": animal_counts,
        "hourly": hourly,
        "daily": dict(reversed(list(daily.items()))),
        "sources": sources,
    }
