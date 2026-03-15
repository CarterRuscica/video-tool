#!/usr/bin/env node

/**
 * Generate TypeScript interfaces from shared/schema.json.
 * Outputs to frontend/src/types/schema.ts.
 */

const fs = require("fs");
const path = require("path");

const schemaPath = path.resolve(__dirname, "../shared/schema.json");
const outputPath = path.resolve(__dirname, "../frontend/src/types/schema.ts");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const defs = schema.definitions;

const lines = ["// Generated from shared/schema.json — do not edit manually", ""];

function jsonTypeToTs(prop) {
  if (prop.$ref) {
    const refName = prop.$ref.split("/").pop();
    return refName;
  }
  if (prop.type === "string") return "string";
  if (prop.type === "number" || prop.type === "integer") return "number";
  if (prop.type === "boolean") return "boolean";
  if (prop.type === "array") {
    const itemType = jsonTypeToTs(prop.items);
    return `${itemType}[]`;
  }
  if (prop.type === "object" && prop.additionalProperties) {
    const valType = jsonTypeToTs(prop.additionalProperties);
    return `Record<string, ${valType}>`;
  }
  return "unknown";
}

for (const [name, def] of Object.entries(defs)) {
  const required = new Set(def.required || []);
  lines.push(`export interface ${name} {`);

  for (const [propName, propDef] of Object.entries(def.properties || {})) {
    const optional = required.has(propName) ? "" : "?";
    const tsType = jsonTypeToTs(propDef);
    lines.push(`  ${propName}${optional}: ${tsType};`);
  }

  lines.push("}");
  lines.push("");
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"));
console.log(`Generated ${outputPath}`);
