"use client";

import { Map, addProtocol, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
addProtocol("pmtiles", new Protocol().tile);

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/fiord",
      center: [116.35, 39.95], // Beijing
      zoom: 10,
    });

    map.on("load", () => {
      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }

      map.addSource("tracks-points", {
        type: "vector",
        url: "pmtiles:///tiles/tracks.pmtiles",
      });

      map.addSource("tracks", {
        type: "vector",
        url: "pmtiles:///tiles/tracks.pmtiles",
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        "source-layer": "tracks",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff5a36",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 2],
          "line-opacity": 0.6,
        },
      });

      map.addLayer({
        id: "traj-points",
        type: "circle",
        source: "tracks-points",
        "source-layer": "tracks",
        paint: {
          "circle-radius": 3,
          "circle-color": "#90ff36",
          "circle-opacity": 0.9
        }
      });

    });

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainerRef}
      id="map"
      style={{ position: "relative", overflow: "hidden", width: "100%", height: "100vh" }}
    />
  );
}