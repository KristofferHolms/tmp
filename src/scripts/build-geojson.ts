import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { listPltFiles, readPlt, summarizePlt, type TrajRow } from "../lib/plt";

const DATA_DIR = path.join(process.cwd(), "data", "Geolife Trajectories 1.3", "Data");
const OUT_DIR = path.join(process.cwd(), "data", "build");
const GEOJSON_FILE = path.join(OUT_DIR, "geolife.geojsonl");
const SUMMARY_FILE = path.join(OUT_DIR, "summaries.json");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const out = createWriteStream(GEOJSON_FILE);

  const write = (line: string) =>
    new Promise<void>((resolve) => {
      if (out.write(line)) resolve();
      else out.once("drain", resolve);
    });

  const files = await listPltFiles(DATA_DIR);
  const summaries: TrajRow[] = [];
  let count = 0;

  for (const { user, file } of files) {
    const track = await readPlt(file);
    if (track.geometry.coordinates.length > 0) {
      const feature = {
        type: "Feature",
        properties: { user, id: track.properties.id },
        geometry: track.geometry,
      };
      await write(JSON.stringify(feature) + "\n");
    }

    const row = await summarizePlt(file, user);
    if (row) summaries.push(row);

    if (++count % 1000 === 0) console.log(`${count} / ${files.length} trajectories...`);
  }

  out.end();
 await new Promise<void>((resolve) => out.on("finish", () => resolve()));
  await writeFile(SUMMARY_FILE, JSON.stringify(summaries));

  console.log(`Done: ${count} trajectories`);
  console.log(`  → ${GEOJSON_FILE}`);
  console.log(`  → ${SUMMARY_FILE}`);
}

main();