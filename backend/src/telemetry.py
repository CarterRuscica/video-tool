"""Telemetry data loader — parses CSV and JSON telemetry files."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from .schema import TelemetryPoint


def load_telemetry(path: str) -> list[TelemetryPoint]:
    """Load telemetry from CSV or JSON file.

    CSV format: first column is timestamp, remaining columns are named values.
    JSON format: array of {timestamp, values} objects.
    """
    file_path = Path(path)

    if file_path.suffix == ".json":
        return _load_json(file_path)
    elif file_path.suffix in (".csv", ".tsv"):
        return _load_csv(file_path)
    else:
        raise ValueError(f"Unsupported telemetry format: {file_path.suffix}")


def _load_json(path: Path) -> list[TelemetryPoint]:
    with open(path) as f:
        data = json.load(f)
    return [TelemetryPoint(**item) for item in data]


def _load_csv(path: Path) -> list[TelemetryPoint]:
    points: list[TelemetryPoint] = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            return []

        # First column is timestamp, rest are values
        ts_col = reader.fieldnames[0]
        value_cols = reader.fieldnames[1:]

        for row in reader:
            timestamp = float(row[ts_col])
            values = {}
            for col in value_cols:
                try:
                    values[col] = float(row[col])
                except (ValueError, TypeError):
                    continue
            points.append(TelemetryPoint(timestamp=timestamp, values=values))

    return points
