// Etiqueta: Mapa interactivo estilo Google Maps con zoom por rueda, arrastre libre y copia de coordenadas
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  ExternalLink,
  Home,
  Layers,
  Minus,
  Navigation,
  Plus,
} from 'lucide-react';
import type { CtoCandidata } from '../../clientes/types/cliente.types';

interface PuntoMapa {
  id: string;
  tipo: 'CLIENTE' | 'CTO';
  etiqueta: string;
  metraje?: string | null;
  prioridad?: number;
  enUso?: boolean;
  lat: number;
  lng: number;
}

interface Props {
  coordenadasCliente: string | null;
  nombreCliente: string | null;
  ctos: CtoCandidata[];
  ctoUso?: string | null;
}

const MIN_ZOOM = 13;
const MAX_ZOOM = 20;

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

// Etiqueta: Conversiones Mercator exactas para zoom anclado al cursor y arrastre
const latLngAMundo = (lat: number, lng: number) => {
  const sin = Math.sin((lat * Math.PI) / 180);
  const wx = (lng + 180) / 360;
  const wy = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return { wx, wy };
};

const mundoALatLng = (wx: number, wy: number) => {
  const wxClamped = ((((wx % 1) + 1) % 1));
  const wyClamped = Math.max(0.05, Math.min(0.95, wy));
  const lng = wxClamped * 360 - 180;
  const n = Math.PI - 2 * Math.PI * wyClamped;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
};

const calcularVistaInicial = (puntos: PuntoMapa[]) => {
  if (puntos.length === 0) return { lat: -12.0464, lng: -77.0428, zoom: 17 };
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  if (puntos.length === 1) return { lat, lng, zoom: 18 };

  for (let z = 19; z >= 14; z--) {
    const escala = 256 * Math.pow(2, z);
    const proy = puntos.map((p) => latLngAMundo(p.lat, p.lng));
    const xs = proy.map((p) => p.wx * escala);
    const ys = proy.map((p) => p.wy * escala);
    if (Math.max(...xs) - Math.min(...xs) <= 360 && Math.max(...ys) - Math.min(...ys) <= 165) {
      return { lat, lng, zoom: z };
    }
  }
  return { lat, lng, zoom: 15 };
};

export const OperacionMapaCtos: React.FC<Props> = ({
  coordenadasCliente,
  nombreCliente,
  ctos,
  ctoUso,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const googleMapDivRef = useRef<HTMLDivElement | null>(null);
  const ultimoWheelMsRef = useRef(0);
  const timerCopiaRef = useRef<number | null>(null);
  const dragRef = useRef<{
    activo: boolean;
    movido: boolean;
    startX: number;
    startY: number;
    startWx: number;
    startWy: number;
  }>({ activo: false, movido: false, startX: 0, startY: 0, startWx: 0, startWy: 0 });

  const [pinActivoId, setPinActivoId] = useState<string | null>(null);
  const [pinHoverId, setPinHoverId] = useState<string | null>(null);
  const [tipoCapa, setTipoCapa] = useState<'m' | 'y'>('m');
  const [arrastrando, setArrastrando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

  const puntos = useMemo<PuntoMapa[]>(() => {
    const lista: PuntoMapa[] = [];
    const coordCli = parsearLatLng(coordenadasCliente);
    if (coordCli) {
      lista.push({
        id: 'CLIENTE',
        tipo: 'CLIENTE',
        etiqueta: nombreCliente?.split(' ')[0] || 'Predio',
        lat: coordCli.lat,
        lng: coordCli.lng,
      });
    }

    const ctoUsoNorm = (ctoUso || '').trim().toUpperCase();

    ctos.forEach((c, idx) => {
      const raw = c as unknown as Record<string, unknown>;
      const textoCoord =
        typeof raw.coordenadas === 'string'
          ? raw.coordenadas
          : typeof raw.coord === 'string'
          ? raw.coord
          : typeof raw.ubicacion === 'string'
          ? raw.ubicacion
          : raw.lat && raw.lng
          ? `${raw.lat},${raw.lng}`
          : null;

      const coord = parsearLatLng(textoCoord);
      if (c.cto && coord) {
        lista.push({
          id: `CTO-${idx}-${c.cto}`,
          tipo: 'CTO',
          etiqueta: c.cto,
          metraje: c.metraje ? String(c.metraje) : null,
          prioridad: c.prioridad || idx + 1,
          enUso: Boolean(ctoUsoNorm && c.cto.trim().toUpperCase() === ctoUsoNorm),
          lat: coord.lat,
          lng: coord.lng,
        });
      }
    });

    return lista;
  }, [coordenadasCliente, nombreCliente, ctos, ctoUso]);

  const vistaSugerida = useMemo(() => calcularVistaInicial(puntos), [puntos]);
  const [centro, setCentro] = useState({ lat: vistaSugerida.lat, lng: vistaSugerida.lng });
  const [zoom, setZoom] = useState(vistaSugerida.zoom);

  const estadoVistaRef = useRef({ centro, zoom });
  estadoVistaRef.current = { centro, zoom };

  useEffect(() => {
    setCentro({ lat: vistaSugerida.lat, lng: vistaSugerida.lng });
    setZoom(vistaSugerida.zoom);
    setPinActivoId(null);
    setPinHoverId(null);
  }, [vistaSugerida]);

  useEffect(() => {
    return () => {
      if (timerCopiaRef.current) window.clearTimeout(timerCopiaRef.current);
    };
  }, []);

  const copiarCoordenada = useCallback((lat: number, lng: number) => {
    const texto = `${lat}, ${lng}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).catch(() => {});
    } else {
      const input = document.createElement('textarea');
      input.value = texto;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiado(true);
    if (timerCopiaRef.current) window.clearTimeout(timerCopiaRef.current);
    timerCopiaRef.current = window.setTimeout(() => setCopiado(false), 1800);
  }, []);

  const seleccionarPunto = useCallback(
    (p: PuntoMapa, centrarMapa = false) => {
      setPinActivoId(p.id);
      if (centrarMapa) setCentro({ lat: p.lat, lng: p.lng });
      copiarCoordenada(p.lat, p.lng);
    },
    [copiarCoordenada]
  );

  // Etiqueta: Zoom con rueda del mouse anclado a la posicion del puntero (sin mover scroll del drawer)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || apiKey) return;

    const manejarWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const ahora = Date.now();
      if (ahora - ultimoWheelMsRef.current < 65) return;
      ultimoWheelMsRef.current = ahora;

      const { centro: cActual, zoom: zActual } = estadoVistaRef.current;
      const delta = e.deltaY < 0 ? 1 : -1;
      const nuevoZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zActual + delta));
      if (nuevoZoom === zActual) return;

      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + rect.width / 2);
      const offsetY = e.clientY - (rect.top + rect.height / 2);

      const escalaVieja = 256 * Math.pow(2, zActual);
      const escalaNueva = 256 * Math.pow(2, nuevoZoom);
      const mundoCentro = latLngAMundo(cActual.lat, cActual.lng);

      const cursorWx = mundoCentro.wx + offsetX / escalaVieja;
      const cursorWy = mundoCentro.wy + offsetY / escalaVieja;

      const nuevoCentro = mundoALatLng(
        cursorWx - offsetX / escalaNueva,
        cursorWy - offsetY / escalaNueva
      );

      setCentro(nuevoCentro);
      setZoom(nuevoZoom);
    };

    el.addEventListener('wheel', manejarWheel, { passive: false });
    return () => el.removeEventListener('wheel', manejarWheel);
  }, [apiKey]);

  // Etiqueta: Soporte Google Maps JS SDK sin polilineas y con scrollwheel directo
  useEffect(() => {
    if (!apiKey || !googleMapDivRef.current || puntos.length === 0) return;

    const renderGoogleMap = () => {
      const gmaps = (window as unknown as { google?: { maps?: Record<string, any> } }).google?.maps;
      if (!gmaps || !googleMapDivRef.current) return;

      const map = new gmaps.Map(googleMapDivRef.current, {
        center: { lat: vistaSugerida.lat, lng: vistaSugerida.lng },
        zoom: vistaSugerida.zoom,
        mapTypeId: tipoCapa === 'y' ? 'hybrid' : 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        scrollwheel: true,
        gestureHandling: 'greedy',
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });

      const bounds = new gmaps.LatLngBounds();
      puntos.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng };
        bounds.extend(pos);

        const marker = new gmaps.Marker({
          position: pos,
          map,
          title: `${p.etiqueta}${p.metraje ? ` (${p.metraje}m)` : ''}`,
          label: {
            text: p.tipo === 'CLIENTE' ? 'C' : `${p.prioridad || ''}`,
            color: p.tipo === 'CLIENTE' || p.enUso ? '#FFFFFF' : '#111827',
            fontSize: '10px',
            fontWeight: 'bold',
          },
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            scale: p.tipo === 'CLIENTE' ? 12 : 10,
            fillColor: p.tipo === 'CLIENTE' || p.enUso ? '#D80319' : '#F4BA00',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
        });

        marker.addListener('click', () => seleccionarPunto(p));
      });

      if (puntos.length > 1) map.fitBounds(bounds, 56);
    };

    const gmapsLoaded = (window as unknown as { google?: { maps?: unknown } }).google?.maps;
    if (gmapsLoaded) {
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
  }, [apiKey, puntos, seleccionarPunto, tipoCapa, vistaSugerida]);

  if (puntos.length === 0) return null;

  // Etiqueta: Manejo de arrastre libre (Pan) con puntero
  const iniciarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (apiKey || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-no-pan="true"]')) return;

    const mundo = latLngAMundo(centro.lat, centro.lng);
    dragRef.current = {
      activo: true,
      movido: false,
      startX: e.clientX,
      startY: e.clientY,
      startWx: mundo.wx,
      startWy: mundo.wy,
    };
    setArrastrando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moverArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.activo) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.movido = true;

    const escala = 256 * Math.pow(2, zoom);
    const nuevo = mundoALatLng(
      dragRef.current.startWx - dx / escala,
      dragRef.current.startWy - dy / escala
    );
    setCentro(nuevo);
  };

  const terminarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.activo) return;
    dragRef.current.activo = false;
    setArrastrando(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const nTiles = Math.pow(2, zoom);
  const mundoCentro = latLngAMundo(centro.lat, centro.lng);
  const centerTileX = mundoCentro.wx * nTiles;
  const centerTileY = mundoCentro.wy * nTiles;
  const baseTileX = Math.floor(centerTileX);
  const baseTileY = Math.floor(centerTileY);

  const destino = puntos.find((p) => p.id === pinActivoId) || puntos[0];
  const urlMaps = `https://www.google.com/maps/search/?api=1&query=${destino.lat},${destino.lng}`;
  const urlRuta = `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
      <div
        ref={viewportRef}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-pan="true"]')) return;
          setZoom((z) => Math.min(MAX_ZOOM, z + 1));
        }}
        className={`relative h-72 w-full overflow-hidden bg-slate-100 select-none touch-none ${
          apiKey ? '' : arrastrando ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {apiKey ? (
          <div ref={googleMapDivRef} className="w-full h-full" />
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            {[-2, -1, 0, 1, 2].map((ox) =>
              [-2, -1, 0, 1, 2].map((oy) => {
                const tx = baseTileX + ox;
                const ty = baseTileY + oy;
                if (ty < 0 || ty >= nTiles) return null;
                const txWrap = ((tx % nTiles) + nTiles) % nTiles;
                return (
                  <img
                    key={`${tipoCapa}-${zoom}-${tx}-${ty}`}
                    src={`https://mt1.google.com/vt/lyrs=${tipoCapa}&x=${txWrap}&y=${ty}&z=${zoom}`}
                    alt=""
                    draggable={false}
                    style={{
                      left: `calc(50% + ${(tx - centerTileX) * 256}px)`,
                      top: `calc(50% + ${(ty - centerTileY) * 256}px)`,
                      width: 256,
                      height: 256,
                    }}
                    className="absolute max-w-none pointer-events-none"
                  />
                );
              })
            )}

            {/* Etiqueta: Pines geograficos exactos sin lineas de trazado */}
            {puntos.map((p) => {
              const m = latLngAMundo(p.lat, p.lng);
              const dx = (m.wx * nTiles - centerTileX) * 256;
              const dy = (m.wy * nTiles - centerTileY) * 256;
              const esCliente = p.tipo === 'CLIENTE';
              const seleccionado = pinActivoId === p.id;
              const mostrarEtiqueta = seleccionado || pinHoverId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  data-no-pan="true"
                  onClick={() => {
                    if (!dragRef.current.movido) seleccionarPunto(p);
                  }}
                  onMouseEnter={() => setPinHoverId(p.id)}
                  onMouseLeave={() => setPinHoverId(null)}
                  style={{
                    left: `calc(50% + ${dx}px)`,
                    top: `calc(50% + ${dy}px)`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                    mostrarEtiqueta ? 'z-30 scale-110' : esCliente ? 'z-20' : 'z-10 hover:scale-110'
                  }`}
                >
                  {mostrarEtiqueta && (
                    <span
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg whitespace-nowrap border pointer-events-none ${
                        esCliente
                          ? 'bg-pf-red text-white border-white'
                          : 'bg-slate-900 text-white border-white/20'
                      }`}
                    >
                      {esCliente ? `Predio · ${p.etiqueta}` : p.etiqueta}
                      {!esCliente && p.metraje ? ` (${p.metraje}m)` : ''}
                    </span>
                  )}

                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-[11px] font-extrabold ${
                      esCliente
                        ? 'bg-pf-red text-white ring-4 ring-pf-red/25'
                        : p.enUso
                        ? 'bg-slate-900 text-pf-yellow ring-4 ring-pf-yellow/35'
                        : 'bg-pf-yellow text-slate-900'
                    }`}
                  >
                    {esCliente ? <Home className="w-3.5 h-3.5" /> : p.prioridad}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Etiqueta: Selector flotante Mapa / Satelite */}
        <div
          data-no-pan="true"
          className="absolute top-3 left-3 z-20 inline-flex items-center bg-white/95 backdrop-blur-xs rounded-xl p-0.5 shadow-md border border-slate-200/80 text-[11px] font-bold"
        >
          <button
            type="button"
            onClick={() => setTipoCapa('m')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              tipoCapa === 'm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mapa
          </button>
          <button
            type="button"
            onClick={() => setTipoCapa('y')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
              tipoCapa === 'y' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3" /> Satélite
          </button>
        </div>

        {/* Etiqueta: Controles flotantes de Zoom y Encuadre */}
        {!apiKey && (
          <div
            data-no-pan="true"
            className="absolute top-3 right-3 z-20 flex flex-col bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200/80 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              title="Acercar"
              className="p-2 text-slate-700 hover:bg-slate-100 transition cursor-pointer border-b border-slate-200/70"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              title="Alejar"
              className="p-2 text-slate-700 hover:bg-slate-100 transition cursor-pointer border-b border-slate-200/70"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPinActivoId(null);
                setCentro({ lat: vistaSugerida.lat, lng: vistaSugerida.lng });
                setZoom(vistaSugerida.zoom);
              }}
              title="Encuadrar puntos"
              className="p-2 text-slate-700 hover:bg-slate-100 hover:text-pf-red transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Etiqueta: Tarjeta flotante para copiar coordenada */}
        <button
          type="button"
          data-no-pan="true"
          onClick={() => copiarCoordenada(destino.lat, destino.lng)}
          title="Copiar coordenada"
          className="absolute bottom-3 left-3 z-20 max-w-[60%] bg-white/95 hover:bg-white backdrop-blur-xs rounded-xl px-3 py-1.5 shadow-md border border-slate-200/80 text-left transition cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                destino.tipo === 'CLIENTE'
                  ? 'bg-pf-red'
                  : destino.enUso
                  ? 'bg-slate-900'
                  : 'bg-pf-yellow'
              }`}
            />
            <span className="font-mono truncate">
              {destino.tipo === 'CLIENTE' ? 'Predio Cliente' : destino.etiqueta}
            </span>
            {destino.metraje && (
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                · {destino.metraje}m
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums mt-0.5">
            {copiado ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <Check className="w-3 h-3" /> Coordenada copiada
              </span>
            ) : (
              <>
                <span className="text-slate-500 group-hover:text-slate-800">
                  {destino.lat.toFixed(6)}, {destino.lng.toFixed(6)}
                </span>
                <Copy className="w-3 h-3 text-slate-400 group-hover:text-pf-red shrink-0" />
              </>
            )}
          </div>
        </button>

        {/* Etiqueta: Enlaces directos a Google Maps */}
        <div data-no-pan="true" className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
          <a
            href={urlMaps}
            target="_blank"
            rel="noreferrer"
            className="bg-white/95 hover:bg-white text-slate-800 border border-slate-200 shadow-md px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" /> Maps
          </a>
          <a
            href={urlRuta}
            target="_blank"
            rel="noreferrer"
            className="bg-pf-red hover:bg-pf-red-hover text-white shadow-md px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition"
          >
            <Navigation className="w-3 h-3" /> Ruta
          </a>
        </div>
      </div>

      {/* Etiqueta: Chips inferiores para centrar y copiar coordenada de cualquier punto */}
      <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center gap-1.5">
        {puntos.map((p) => {
          const activo = destino.id === p.id;
          const esCliente = p.tipo === 'CLIENTE';
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => seleccionarPunto(p, true)}
              onMouseEnter={() => setPinHoverId(p.id)}
              onMouseLeave={() => setPinHoverId(null)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                activo
                  ? 'border-pf-red bg-pf-red/6 text-slate-900 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 ${
                  esCliente
                    ? 'bg-pf-red text-white'
                    : p.enUso
                    ? 'bg-slate-900 text-pf-yellow'
                    : 'bg-pf-yellow text-slate-900'
                }`}
              >
                {esCliente ? 'C' : p.prioridad}
              </span>
              <span className="font-mono font-bold">
                {esCliente ? 'Predio' : p.etiqueta}
              </span>
              {!esCliente && p.metraje && (
                <span className="text-[10px] font-mono text-slate-400">{p.metraje}m</span>
              )}
              {p.enUso && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Uso
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};