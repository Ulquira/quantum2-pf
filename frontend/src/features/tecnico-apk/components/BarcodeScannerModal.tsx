// Etiqueta: Escaner de codigos de barras y QR con camara trasera para Seriales ONT y Mesh
import React, { useEffect, useRef, useState } from 'react';
import { X, ScanLine, Check } from 'lucide-react';

interface BarcodeDetectorNativo {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorNativo;
  }
}

interface Props {
  abierto: boolean;
  titulo: string;
  valorInicial: string;
  onScan: (codigo: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<Props> = ({
  abierto,
  titulo,
  valorInicial,
  onScan,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manual, setManual] = useState(valorInicial);
  const [soportaCamara, setSoportaCamara] = useState(true);

  useEffect(() => {
    setManual(valorInicial);
    if (!abierto) return;

    let streamActivo: MediaStream | null = null;
    let intervalo: number | null = null;

    const iniciarCamara = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
        setSoportaCamara(false);
        return;
      }

      try {
        streamActivo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = streamActivo;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'qr_code', 'data_matrix', 'ean_13'],
        });

        intervalo = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos.length > 0 && codigos[0].rawValue) {
              const serial = codigos[0].rawValue.trim().toUpperCase();
              onScan(serial);
              onClose();
            }
          } catch {
            // Continua escaneando siguiente frame
          }
        }, 350);
      } catch {
        setSoportaCamara(false);
      }
    };

    iniciarCamara();

    return () => {
      if (intervalo) window.clearInterval(intervalo);
      if (streamActivo) streamActivo.getTracks().forEach((t) => t.stop());
    };
  }, [abierto, valorInicial, onScan, onClose]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col justify-between p-4 text-white">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm uppercase tracking-wider">{titulo}</span>
        <button onClick={onClose} className="p-2 rounded-full bg-white/15 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="my-auto space-y-4">
        {soportaCamara && (
          <div className="relative rounded-2xl overflow-hidden border-2 border-pf-yellow aspect-video bg-neutral-900">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-pf-red shadow-[0_0_12px_#D80319]" />
            <div className="absolute bottom-2 right-3 inline-flex items-center gap-1 text-[11px] bg-black/60 px-2 py-0.5 rounded">
              <ScanLine className="w-3.5 h-3.5 text-pf-yellow" /> Apunte al código S/N
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-3.5 text-neutral-900 space-y-2">
          <label className="block text-xs font-bold text-pf-gray uppercase">
            Código Serial
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="Ej: 48575443..."
              className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-pf-red"
            />
            <button
              type="button"
              onClick={() => {
                if (manual.trim()) {
                  onScan(manual.trim().toUpperCase());
                  onClose();
                }
              }}
              className="bg-pf-red text-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Usar
            </button>
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
};