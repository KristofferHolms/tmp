import { readFile, readdir } from "fs/promises";
import path from "path";
export const DATA_DIR = path.join(process.cwd(), "data", "Geolife", "Data");

export type Track = {
  type: "Feature";
  properties: { id: string; color: string };
  geometry: { type: "MultiLineString"; coordinates: [number, number][][] };
};

export type TrackCollection = {
  type: "FeatureCollection";
  features: Track[];
};

export type TrajRow = {
  id: string;
  points: number;
  start: string;
  end: string;
  duration: string;
};

type PltPoint = { lat: number; lon: number; days: number };

const GAP_MS = 5 * 60 * 1000;

// Parses the raw text of a .plt file into points, skipping header lines
function parsePltPoints(text: string): PltPoint[] {
  const points: PltPoint[] = [];

  for (const line of text.split(/\r\n|\r|\n/)) {
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

// Lists up to `count` .plt files, going through users 000, 001, 002, ...
export async function listPltFiles(
  dataDir: string,
  count = Infinity
): Promise<{ user: string; file: string }[]> {
  const users = (await readdir(dataDir)).filter((d) => /^\d{3}$/.test(d)).sort();
  const files: { user: string; file: string }[] = [];

  for (const user of users) {
    if (files.length >= count) break;
    const dir = path.join(dataDir, user, "Trajectory");
    const userFiles = (await readdir(dir))
      .filter((f) => f.endsWith(".plt"))
      .sort()
      .slice(0, count - files.length);
    files.push(...userFiles.map((f) => ({ user, file: path.join(dir, f) })));
  }

  return files;
}

// Reads one .plt file as a GeoJSON feature, split into segments at time gaps
export async function readPlt(filePath: string, color = "#ff5a36"): Promise<Track> {
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
    properties: { id: path.basename(filePath, ".plt"), color },
    geometry: { type: "MultiLineString", coordinates: segments },
  };
}

// Loads up to `count` trajectories as a GeoJSON FeatureCollection
export async function readTracks(dataDir: string, count: number): Promise<TrackCollection> {
  const files = await listPltFiles(dataDir, count);

  const features = await Promise.all(
    files.map(({ file }, i) => {
      const hue = Math.round((i * 360) / files.length);
      return readPlt(file, `hsl(${hue}, 85%, 60%)`);
    })
  );

  return {
    type: "FeatureCollection",
    features: features.filter((t) => t.geometry.coordinates.length > 0),
  };
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// Summarizes one .plt file for the table
export async function summarizePlt(filePath: string, user: string): Promise<TrajRow | null> {
  const points = parsePltPoints(await readFile(filePath, "utf8"));
  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];

  return {
    id: `${user}/${path.basename(filePath, ".plt")}`,
    points: points.length,
    start: `${first.lat.toFixed(3)}, ${first.lon.toFixed(3)}`,
    end: `${last.lat.toFixed(3)}, ${last.lon.toFixed(3)}`,
    duration: formatDuration((last.days - first.days) * 86_400),
  };
}

// Summarizes up to `count` trajectories directly from the .plt files
export async function readSummaries(dataDir: string, count: number): Promise<TrajRow[]> {
  const files = await listPltFiles(dataDir, count);
  const rows = await Promise.all(files.map(({ user, file }) => summarizePlt(file, user)));
  return rows.filter((r): r is TrajRow => r !== null);
}