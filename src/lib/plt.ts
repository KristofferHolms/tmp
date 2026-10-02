import { readFile, readdir } from "fs/promises";
import path from "path";
export const DATA_DIR = path.join(process.cwd(), "data", "Geolife", "Data");

export type Track = {
  type: "Feature";
  properties: { id: string };
  geometry: { type: "MultiLineString"; coordinates: [number, number][][] };
};

export type TrajRow = {
  id: string;
  user: number;
  trip: number;
  points: number;
  start: LngLat;
  end: LngLat;
  bbox: [west: number, south: number, east: number, north: number];
  seconds: number;
};

export type LngLat = [lon: number, lat: number];

export type PltFile = { user: string; trip: number; file: string };

type PltPoint = { lat: number; lon: number; days: number };

const GAP_MS = 5 * 60 * 1000;

// Every .plt file starts with 6 header lines that are not points
const HEADER_LINES = 6;

// Parses the raw text of a .plt file into points
function parsePltPoints(text: string): PltPoint[] {
  const points: PltPoint[] = [];

  for (const line of text.split(/\r\n|\r|\n/).slice(HEADER_LINES)) {
    const parts = line.split(",");
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    const days = Number(parts[4]);

    if (parts.length < 5 || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    points.push({ lat, lon, days });
  }

  return points;
}

// Readable trajectory id: user number + the user's nth trip, e.g. "0-1"
export function trajId(user: string, trip: number): string {
  return `${Number(user)}-${trip}`;
}

// Lists all .plt files, going through users 000, 001, 002, ...
// `trip` is the 1-based position of the file among that user's trajectories
export async function listPltFiles(dataDir: string): Promise<PltFile[]> {
  const users = (await readdir(dataDir)).filter((d) => /^\d{3}$/.test(d)).sort();
  const files: PltFile[] = [];

  for (const user of users) {
    const dir = path.join(dataDir, user, "Trajectory");
    const userFiles = (await readdir(dir))
      .filter((f) => f.endsWith(".plt"))
      .sort();
    files.push(...userFiles.map((f, i) => ({ user, trip: i + 1, file: path.join(dir, f) })));
  }

  return files;
}

// Reads one .plt file as a GeoJSON feature, split into segments at time gaps
export async function readPlt(filePath: string): Promise<Track> {
  const points = parsePltPoints(await readFile(filePath, "utf8"));

  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  let prevTime: number | null = null;

  for (const { lat, lon, days } of points) {
    const time = days * 86_400_000;
    if (prevTime !== null && time - prevTime > GAP_MS) {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
    current.push([lon, lat]); // GeoJSON is [lon, lat]
    prevTime = time;
  }
  if (current.length >= 2) segments.push(current);

  return {
    type: "Feature",
    properties: { id: path.basename(filePath, ".plt") },
    geometry: { type: "MultiLineString", coordinates: segments },
  };
}

function bboxOf(points: PltPoint[]): TrajRow["bbox"] {
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { lon, lat } of points) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

// Summarizes one .plt file for the table
export async function summarizePlt({ user, trip, file }: PltFile): Promise<TrajRow | null> {
  const points = parsePltPoints(await readFile(file, "utf8"));
  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  // ~1 m precision is plenty, and keeps summaries.json small
  const round = (n: number) => Math.round(n * 1e5) / 1e5;

  return {
    id: trajId(user, trip),
    user: Number(user),
    trip,
    points: points.length,
    start: [round(first.lon), round(first.lat)],
    end: [round(last.lon), round(last.lat)],
    bbox: bboxOf(points).map(round) as TrajRow["bbox"],
    seconds: Math.max(0, Math.round((last.days - first.days) * 86_400)),
  };
}
