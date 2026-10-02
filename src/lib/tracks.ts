import { open, readFile } from "node:fs/promises";
import { GEOJSON_FILE, GEOJSON_INDEX_FILE, type GeojsonIndex } from "./build-files";
import type { Track } from "./plt";

let index: GeojsonIndex | null = null;

// Reads one trajectory's full-resolution geometry, using the index to read only its own line
export async function getTrackGeometry(id: string): Promise<Track["geometry"] | null> {
  index ??= JSON.parse(await readFile(GEOJSON_INDEX_FILE, "utf8")) as GeojsonIndex;
  const range = index[id];
  if (!range) return null;

  const [offset, length] = range;
  const file = await open(GEOJSON_FILE);
  try {
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, offset);
    return (JSON.parse(buffer.toString("utf8")) as Track).geometry;
  } finally {
    await file.close();
  }
}
