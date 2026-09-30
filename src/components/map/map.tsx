"use client";

import { Map, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/fiord",
      zoom: 3,
    });

    map.on("load", () => {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
});

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} id="map" style={{ width: "100%", height: "100vh" }} />;
}