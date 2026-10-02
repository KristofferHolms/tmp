"use client";

import {
  Map,
  Marker,
  Popup,
  addProtocol,
  setWorkerUrl,
  type FilterSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Protocol } from "pmtiles";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrajRow, Track } from "@/lib/plt";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
addProtocol("pmtiles", new Protocol().tile);

const LINE_COLOR = "#ff7a50";
const HOVER_COLOR = "#ffffff";
const HOVER_HIGHLIGHT = false; // set to true to highlight the hovered trajectory
const SELECTED_COLOR = "#ffd23f";
const NONE: FilterSpecification = ["==", ["get", "id"], ""];
const onlyId = (id: string): FilterSpecification => ["==", ["get", "id"], id];
const EMPTY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function MapView({
  selected,
  selectedGeometry,
}: {
  selected: TrajRow | null;
  // Full-resolution line for the selection; the tiles drop and simplify lines when zoomed out
  selectedGeometry: Track["geometry"] | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Which selection the camera last zoomed to, so paging the table doesn't re-zoom
  const fittedIdRef = useRef<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Selection lives in the URL (?sel=…) so the table and the map share it
  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("sel", id);
      else params.delete("sel");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Kept in a ref so the map's click handler (bound once) always sees the latest version
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  const mapBounds: [[number, number], [number, number]] = [
    [115.19, 38.84], // [west, south]
    [117.93, 40.63], // [east, north]
  ]; 

  // 38.839371, 117.926800 South east
  // 40.629600, 115.187387 North west

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/fiord",
      center: [116.35, 39.95], // Beijing
      zoom: 10,
      maxBounds: mapBounds,
    });
    mapRef.current = map;

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    let hoveredId: string | null = null;

    map.on("load", () => {
      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }

      map.addSource("tracks", {
        type: "vector",
        url: "pmtiles:///tiles/tracks.pmtiles",
      });

      // All trajectories: thin and translucent, so busy routes build up into brighter bands
      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        "source-layer": "tracks",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": LINE_COLOR,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.4,
            12,
            1,
            16,
            2.5,
          ],
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.25,
            14,
            0.5,
          ],
        },
      });

      map.addLayer({
        id: "tracks-hover",
        type: "line",
        source: "tracks",
        "source-layer": "tracks",
        filter: NONE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": HOVER_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 16, 5],
        },
      });

      map.addSource("selected", { type: "geojson", data: EMPTY });

      map.addLayer({
        id: "tracks-selected",
        type: "line",
        source: "selected",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": SELECTED_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 16, 6],
        },
      });

      setLoaded(true);
    });

    // A few pixels of slack around the cursor, so thin lines are easy to hit
    const featureAt = (point: { x: number; y: number }) => {
      const pad = 4;
      return map.queryRenderedFeatures(
        [
          [point.x - pad, point.y - pad],
          [point.x + pad, point.y + pad],
        ],
        { layers: ["tracks-line", "tracks-selected"] },
      )[0];
    };

    const setHover = (id: string | null) => {
      if (id === hoveredId) return;
      hoveredId = id;
      if (HOVER_HIGHLIGHT)
        map.setFilter("tracks-hover", id ? onlyId(id) : NONE);
      map.getCanvas().style.cursor = id ? "pointer" : "";
      if (!id) popup.remove();
    };

    map.on("mousemove", (event) => {
      if (!map.getLayer("tracks-line")) return;
      const id = featureAt(event.point)?.properties?.id as string | undefined;
      setHover(id ?? null);
      if (id) popup.setLngLat(event.lngLat).setText(id).addTo(map);
    });

    map.on("mouseout", () => setHover(null));

    map.on("click", (event) => {
      if (!map.getLayer("tracks-line")) return;
      const id = featureAt(event.point)?.properties?.id as string | undefined;
      if (id) selectRef.current(id);
    });

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Show only the selected trajectory, with start/end markers, and zoom to it
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    map.setLayoutProperty(
      "tracks-line",
      "visibility",
      selected ? "none" : "visible",
    );
    (map.getSource("selected") as GeoJSONSource).setData(
      selected && selectedGeometry
        ? {
            type: "Feature",
            properties: { id: selected.id },
            geometry: selectedGeometry,
          }
        : EMPTY,
    );
    if (!selected) {
      fittedIdRef.current = null;
      return;
    }

    if (fittedIdRef.current !== selected.id) {
      fittedIdRef.current = selected.id;
      const [west, south, east, north] = selected.bbox;
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 60, maxZoom: 16 },
      );
    }

    const markers = [
      new Marker({ color: "#22c55e" }).setLngLat(selected.start).addTo(map),
      new Marker({ color: "#ef4444" }).setLngLat(selected.end).addTo(map),
    ];
    return () => markers.forEach((marker) => marker.remove());
  }, [selected, selectedGeometry, loaded]);

  return (
    <div className="relative h-full w-full">
      {/* Sized explicitly: maplibre-gl.css forces position: relative on the container */}
      <div ref={containerRef} className="h-full w-full" />

      {selected && (
        <div className="absolute top-3 left-3 flex items-center gap-3 rounded-lg border bg-card/95 px-3 py-2 text-sm text-card-foreground shadow-md">
          <span>
            Valgt: <span className="font-semibold">{selected.id}</span>
            <span className="ml-2 text-muted-foreground">
              {selected.points.toLocaleString()} punkter
            </span>
          </span>
          <button
            type="button"
            onClick={() => select(null)}
            className="rounded-md border px-2 py-1 hover:bg-muted"
          >
            Vis alle
          </button>
        </div>
      )}
    </div>
  );
}
