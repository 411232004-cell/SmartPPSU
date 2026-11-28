"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Zona } from "@/lib/data";

/**
 * Peta OpenStreetMap (Leaflet) untuk mengatur titik pusat zona geofencing.
 * - Pin tiap zona bisa DIGESER langsung → menyimpan koordinat baru.
 * - Klik pada peta memindahkan titik pusat zona terpilih (hanya saat klikAktif).
 * - Lingkaran menampilkan radius geofence.
 * - `fokus` menggerakkan kamera peta ke titik tertentu (hasil pencarian).
 */
export default function ZonaMap({
  zonas,
  seleksiId,
  klikAktif = true,
  fokus,
  onPilih,
  onKlikZona,
}: {
  zonas: Zona[];
  seleksiId?: string;
  klikAktif?: boolean;
  fokus?: { lat: number; lng: number } | null;
  onPilih: (zonaId: string, lat: number, lng: number) => void;
  onKlikZona?: (zonaId: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const Lref = useRef<typeof import("leaflet") | null>(null);
  const fittedRef = useRef(false);
  const fokusRef = useRef<typeof fokus>(null);
  const propsRef = useRef({ zonas, seleksiId, klikAktif, onPilih, onKlikZona });
  propsRef.current = { zonas, seleksiId, klikAktif, onPilih, onKlikZona };

  const renderLayers = () => {
    const L = Lref.current;
    const g = layerRef.current;
    const map = mapRef.current;
    if (!L || !g || !map) return;
    g.clearLayers();
    const { zonas, seleksiId, onPilih, onKlikZona } = propsRef.current;
    const bounds: [number, number][] = [];
    zonas.forEach((z) => {
      if (!z.lat || !z.lng) return;
      bounds.push([z.lat, z.lng]);
      const aktif = z.id === seleksiId;
      L.circle([z.lat, z.lng], {
        radius: z.radiusMeter || 300,
        color: aktif ? "#f97316" : "#3b82f6",
        weight: aktif ? 3 : 2,
        fillOpacity: aktif ? 0.18 : 0.07,
      }).addTo(g);
      const m = L.marker([z.lat, z.lng], { draggable: true })
        .addTo(g)
        .bindTooltip(`${z.nama} — geser pin`, {
          direction: "top",
          offset: [0, -10],
        });
      m.on("dragend", () => {
        const ll = m.getLatLng();
        onPilih(z.id, ll.lat, ll.lng);
      });
      m.on("click", () => onKlikZona?.(z.id));
    });
    if (!fittedRef.current && bounds.length) {
      fittedRef.current = true;
      map.fitBounds(L.latLngBounds(bounds).pad(0.15));
    }
  };

  // init peta sekali — leaflet dimuat dinamis agar aman di Next.js
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !divRef.current || mapRef.current) return;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      Lref.current = L;
      const map = L.map(divRef.current).setView([-6.1667, 106.8], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e) => {
        const p = propsRef.current;
        if (p.klikAktif && p.seleksiId) p.onPilih(p.seleksiId, e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      renderLayers();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    renderLayers();
  }, [zonas, seleksiId]);

  // terbang ke titik fokus (hasil pencarian alamat)
  useEffect(() => {
    if (fokus && fokus !== fokusRef.current && mapRef.current) {
      mapRef.current.flyTo([fokus.lat, fokus.lng], 18);
    }
    fokusRef.current = fokus;
  }, [fokus]);

  return (
    <div
      ref={divRef}
      style={{
        height: 380,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        border: "1px solid var(--border)",
      }}
    />
  );
}
