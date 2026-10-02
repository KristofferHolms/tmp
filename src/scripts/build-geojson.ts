import { createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import {
  BUILD_DIR,
  GEOJSON_FILE,
  GEOJSON_INDEX_FILE,
  SUMMARY_FILE,
  type GeojsonIndex,
} from "../lib/build-files";
import { DATA_DIR, listPltFiles, readPlt, summarizePlt, trajId, type TrajRow } from "../lib/plt";

async function main() {
  await mkdir(BUILD_DIR, { recursive: true });
  const out = createWriteStream(GEOJSON_FILE);

  const write = (line: string) =>
    new Promise<void>((resolve) => {
      if (out.write(line)) resolve();
      else out.once("drain", resolve);
    });

  const files = await listPltFiles(DATA_DIR);
  const summaries: TrajRow[] = [];
  const index: GeojsonIndex = {};
  let offset = 0;
  let count = 0;

  for (const pltFile of files) {
    const { user, trip, file } = pltFile;
    const track = await readPlt(file);
    if (track.geometry.coordinates.length > 0) {
      const id = trajId(user, trip);
      const feature = {
        type: "Feature",
        properties: { id, user: Number(user) },
        geometry: track.geometry,
      };
      const line = JSON.stringify(feature) + "\n";
      const length = Buffer.byteLength(line);
      index[id] = [offset, length];
      offset += length;
      await write(line);
    }

    const row = await summarizePlt(pltFile);
    if (row) summaries.push(row);

    if (++count % 1000 === 0) console.log(`${count} / ${files.length} trajectories...`);
  }

  out.end();
  await new Promise<void>((resolve) => out.on("finish", () => resolve()));
  await writeFile(SUMMARY_FILE, JSON.stringify(summaries));
  await writeFile(GEOJSON_INDEX_FILE, JSON.stringify(index));

  console.log(`Done: ${count} trajectories`);
  console.log(`  → ${GEOJSON_FILE}`);
  console.log(`  → ${SUMMARY_FILE}`);
  console.log(`  → ${GEOJSON_INDEX_FILE}`);
}

main();