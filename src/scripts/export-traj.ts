import { writeFile } from "fs/promises";
import path from "path";
import { readTracks } from "../lib/plt";

const dataDir = path.join(process.cwd(), "data", "Geolife", "Data");
const outputFile = path.join(process.cwd(), "public", "tracks.geojson");

const tracks = await readTracks(dataDir, 10000);

await writeFile(outputFile, JSON.stringify(tracks));
console.log(`Exported ${tracks.features.length} tracks`);