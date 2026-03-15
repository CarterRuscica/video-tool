#!/usr/bin/env python3
"""Generate Pydantic models from shared/schema.json.

Outputs to backend/src/schema.py.
"""

import json
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent.parent / "shared" / "schema.json"
OUTPUT_PATH = Path(__file__).parent.parent / "backend" / "src" / "schema.py"

TYPE_MAP = {
    "string": "str",
    "number": "float",
    "integer": "int",
    "boolean": "bool",
}


def json_type_to_python(prop: dict) -> str:
    if "$ref" in prop:
        return prop["$ref"].split("/")[-1]
    t = prop.get("type", "")
    if t == "array":
        item_type = json_type_to_python(prop.get("items", {}))
        return f"list[{item_type}]"
    if t == "object" and "additionalProperties" in prop:
        val_type = json_type_to_python(prop["additionalProperties"])
        return f"dict[str, {val_type}]"
    return TYPE_MAP.get(t, "Any")


def generate() -> str:
    schema = json.loads(SCHEMA_PATH.read_text())
    defs = schema["definitions"]

    lines = [
        '"""Generated from shared/schema.json — do not edit manually."""',
        "",
        "from __future__ import annotations",
        "",
        "from pydantic import BaseModel, Field",
        "",
        "",
    ]

    for name, defn in defs.items():
        required = set(defn.get("required", []))
        props = defn.get("properties", {})

        lines.append(f"class {name}(BaseModel):")

        if not props:
            lines.append("    pass")
        else:
            for prop_name, prop_def in props.items():
                py_type = json_type_to_python(prop_def)
                is_required = prop_name in required

                field_parts = []
                if "minimum" in prop_def:
                    field_parts.append(f"ge={prop_def['minimum']}")
                if "maximum" in prop_def:
                    field_parts.append(f"le={prop_def['maximum']}")

                if is_required:
                    if field_parts:
                        lines.append(f"    {prop_name}: {py_type} = Field({', '.join(field_parts)})")
                    else:
                        lines.append(f"    {prop_name}: {py_type}")
                else:
                    if field_parts:
                        lines.append(f"    {prop_name}: {py_type} | None = Field(None, {', '.join(field_parts)})")
                    else:
                        lines.append(f"    {prop_name}: {py_type} | None = None")

        lines.append("")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(generate())
    print(f"Generated {OUTPUT_PATH}")
