import json
import tempfile
from pathlib import Path

from src.telemetry import load_telemetry


def test_load_csv_telemetry():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("time,speed,altitude\n")
        f.write("0.0,10.5,100\n")
        f.write("0.1,11.0,101\n")
        f.write("0.2,10.8,102\n")
        tmp_path = f.name

    try:
        points = load_telemetry(tmp_path)
        assert len(points) == 3
        assert points[0].timestamp == 0.0
        assert points[0].values["speed"] == 10.5
        assert points[2].values["altitude"] == 102
    finally:
        Path(tmp_path).unlink()


def test_load_json_telemetry():
    data = [
        {"timestamp": 0.0, "values": {"speed": 10.5}},
        {"timestamp": 0.1, "values": {"speed": 11.0}},
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        tmp_path = f.name

    try:
        points = load_telemetry(tmp_path)
        assert len(points) == 2
        assert points[1].values["speed"] == 11.0
    finally:
        Path(tmp_path).unlink()
