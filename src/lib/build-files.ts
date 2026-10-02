import path from "node:path";

// Files written by `bun run data:build` (src/scripts/build-geojson.ts) and read by the app
export const BUILD_DIR = path.join(process.cwd(), "data", "build");
export const GEOJSON_FILE = path.join(BUILD_DIR, "geolife.geojsonl");
export const GEOJSON_INDEX_FILE = path.join(BUILD_DIR, "geolife.index.json");
export const SUMMARY_FILE = path.join(BUILD_DIR, "summaries.json");

// Byte range of each trajectory's line in GEOJSON_FILE, keyed by id
export type GeojsonIndex = Record<string, [offset: number, length: number]>;
