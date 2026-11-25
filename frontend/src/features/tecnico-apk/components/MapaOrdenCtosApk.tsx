// Etiqueta: Mapa interactivo unificado (Cliente + Pines de CTOs asignadas) con soporte Google Maps
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, Wifi, Home } from 'lucide-react';
import type { CtoCandidata } from '../../clientes/types/cliente.types';

interface PuntoMapa {
  tipo: 'CLIENTE' | 'CTO';
  etiqueta: string;
  detalle?: string;
  lat: number;
  lng: number;
}

interface Props {
  coordenadasCliente: string | null;
  nombreCliente: string | null;
  ctos: CtoCandidata[];
}

declare global {
  interface Window {
    google?: Record<string, any>;
  }
}

const parsearLatLng = (raw?: string | null): { lat: number; lng: number } | null => {
  if (!raw) return null;
  const limpio = raw.replace(/[()]/g, '').trim();
  const partes = limpio.split(/[,\s]+/).filter(Boolean);
  if (partes.length < 2) return null;
  const lat = Number(partes[0]);
  const lng = Number(partes[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

export const MapaOrdenCtosApk: React.FC<Props> = ({
  coordenadasCliente,
  nombreCliente,
  ctos,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [pinActivo, setPinActivo] = useState<PuntoMapa | null>(null);
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

  const puntos = useMemo<PuntoMapa[]>(() => {
    const lista: PuntoMapa[] = [];
    const coordCli = parsearLatLng(coordenadasCliente);
    if (coordCli) {
      lista.push({
        tipo: 'CLIENTE',
        etiqueta: 'CLIENTE',
        detalle: nombreCliente || 'Predio instalación',
        lat: coordCli.lat,
        lng: coordCli.lng,
      });
    }
    ctos.forEach((c) => {
      const rawCto = c as unknown as Record<string, unknown>;
      const textoCoord =
        typeof rawCto.coordenadas === 'string'
          ? rawCto.coordenadas
          : typeof rawCto.coord === 'string'
          ? rawCto.coord
          : typeof rawCto.ubicacion === 'string'
          ? rawCto.ubicacion
          : rawCto.lat && rawCto.lng
          ? `${rawCto.lat},${rawCto.lng}`
          : null;

      const coord = parsearLatLng(textoCoord);
      if (c.cto && coord) {
        lista.push({
          tipo: 'CTO',
          etiqueta: c.cto,
          detalle: c.metraje ? `${c.metraje}m` : 'CTO asignada',
          lat: coord.lat,
          lng: coord.lng,
        });
      }
    });
    return lista;
  }, [coordenadasCliente, nombreCliente, ctos]);

  // Si existe VITE_GOOGLE_MAPS_API_KEY, monta Google Maps JavaScript API oficial con marcadores
  useEffect(() => {
    if (!apiKey || !mapRef.current || puntos.length === 0) return;

    const renderGoogleMap = () => {
      if (!window.google?.maps || !mapRef.current) return;
      const gmaps = window.google.maps;
      const map = new gmaps.Map(mapRef.current, {
        center: { lat: puntos[0].lat, lng: puntos[0].lng },
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });

      const bounds = new gmaps.LatLngBounds();
      puntos.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng };
        bounds.extend(pos);
        new gmaps.Marker({
          position: pos,
          map,
          title: `${p.etiqueta} ${p.detalle || ''}`,
          label: {
            text: p.tipo === 'CLIENTE' ? 'C' : 'CTO',
            color: p.tipo === 'CLIENTE' ? '#FFFFFF' : '#111827',
            fontSize: '10px',
            fontWeight: 'bold',
          },
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            scale: p.tipo === 'CLIENTE' ? 11 : 10,
            fillColor: p.tipo === 'CLIENTE' ? '#D80319' : '#F4BA00',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
      });
      if (puntos.length > 1) map.fitBounds(bounds, 45);
    };

    if (window.google?.maps) {
      renderGoogleMap();
    } else {
      const scriptId = 'pf-google-maps-sdk';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.onload = renderGoogleMap;
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', renderGoogleMap);
      }
    }
  }, [apiKey, puntos]);

  if (puntos.length === 0) return null;

  // Calculo de proyeccion Mercator sobre teselas limpias de Google Maps cuando no hay API Key JS
  const centroLat = puntos.reduce((acc, p) => acc + p.lat, 0) / puntos.length;
  const centroLng = puntos.reduce((acc, p) => acc + p.lng, 0) / puntos.length;
  const zoom = 17;
  const n = Math.pow(2, zoom);
  const latRad = (centroLat * Math.PI) / 180;
  const centerTileX = ((centroLng + 180) / 360) * n;
  const centerTileY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const baseTileX = Math.floor(centerTileX);
  const baseTileY = Math.floor(centerTileY);

  const proyectarPunto = (lat: number, lng: number) => {
    const r = (lat * Math.PI) / 180;
    const tx = ((lng + 180) / 360) * n;
    const ty = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
    return {
      dx: (tx - centerTileX) * 256,
      dy: (ty - centerTileY) * 256,
    };
  };

  const destinoActivo = pinActivo || puntos[0];
  const urlNavegacion = `https://www.google.com/maps/dir/?api=1&destination=${destinoActivo.lat},${destinoActivo.lng}`;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
      <div className="relative h-52 w-full overflow-hidden bg-neutral-100 select-none">
        {apiKey ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            {/* Mosaico limpio Google Maps Road */}
            {[-1, 0, 1].map((ox) =>
              [-1, 0, 1].map((oy) => {
                const tx = baseTileX + ox;
                const ty = baseTileY + oy;
                const left = `calc(50% + ${(tx - centerTileX) * 256}px)`;
                const top = `calc(50% + ${(ty - centerTileY) * 256}px)`;
                return (
                  <img
                    key={`${tx}-${ty}`}
                    src={`https://mt1.google.com/vt/lyrs=m&x=${tx}&y=${ty}&z=${zoom}`}
                    alt=""
                    draggable={false}
                    style={{ left, top, width: 256, height: 256 }}
                    className="absolute max-w-none pointer-events-none"
                  />
                );
              })
            )}

            {/* Pines superpuestos de Cliente y CTOs */}
            {puntos.map((p, idx) => {
              const { dx, dy } = proyectarPunto(p.lat, p.lng);
              const esCliente = p.tipo === 'CLIENTE';
              return (
                <button
                  key={`${p.etiqueta}-${idx}`}
                  type="button"
                  onClick={() => setPinActivo(p)}
                  style={{
                    left: `calc(50% + ${dx}px)`,
                    top: `calc(50% + ${dy}px)`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group cursor-pointer z-10"
                >
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md whitespace-nowrap mb-0.5 border ${
                      esCliente
                        ? 'bg-pf-red text-white border-white'
                        : 'bg-white text-neutral-900 border-pf-yellow'
                    }`}
                  >
                    {p.etiqueta} {p.detalle && !esCliente ? `(${p.detalle})` : ''}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white ${
                      esCliente ? 'bg-pf-red text-white' : 'bg-pf-yellow text-neutral-900'
                    }`}
                  >
                    {esCliente ? <Home className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <a
          href={urlNavegacion}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2.5 right-2.5 z-20 bg-white/95 hover:bg-white text-neutral-900 border border-neutral-200 shadow-md px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5 text-pf-red" />
          Ir a {destinoActivo.etiqueta}
        </a>
      </div>

      {/* Leyenda tactil de Pines para centrar o navegar a una CTO puntual */}
      <div className="px-3 py-2 bg-white border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {puntos.map((p, i) => {
          const activo = destinoActivo.etiqueta === p.etiqueta;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPinActivo(p)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                activo
                  ? 'border-pf-red bg-pf-red/5 text-pf-red'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  p.tipo === 'CLIENTE' ? 'bg-pf-red' : 'bg-pf-yellow'
                }`}
              />
              <span>{p.etiqueta}</span>
              {p.tipo === 'CTO' && p.detalle && (
                <span className="text-[10px] text-pf-gray">{p.detalle}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};