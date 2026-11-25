// Etiqueta: Reglas dinamicas de las 7 fases operativas segun At_Titular y Mesh_modo + Compresor de fotos
import type { SeccionFaseApk, TipoAtencionTitular } from '../types/apk.types';

export const construirFasesOrdenApk = (
  atTitular: TipoAtencionTitular,
  meshModoRaw: string | null | undefined
): SeccionFaseApk[] => {
  const meshNorm = (meshModoRaw || 'SIN MESH').toUpperCase();

  // Condicional DOCUMENTO: TITULAR vs ENCARGADO
  const tareasDocumento =
    atTitular === 'ENCARGADO'
      ? [
          'TITULAR/DOCUMENTO FRONTAL',
          'TITULAR/DOCUMENTO POSTERIOR',
          'ENCARGADO/DOCUMENTO FRONTAL',
          'ENCARGADO/DOCUMENTO POSTERIOR',
          'SELFIE DEL TITULAR+DOCUMENTO',
        ]
      : ['TITULAR/DOCUMENTO FRONTAL', 'TITULAR/DOCUMENTO POSTERIOR'];

  // Condicional MESH: MESH CABLEADO vs MESH / MESH INALAMBRICO vs SIN MESH
  let tareasMesh: string[] = [];
  if (meshNorm.includes('CABLEADO')) {
    tareasMesh = [
      'SN MESH',
      'CATEGORIA DEL CABLE',
      'CABLEADO + MESH',
      'PANORAMICA DONDE SE UBICA EL MESH',
      'TEST DE VELOCIDAD DEL MESH',
    ];
  } else if (meshNorm.includes('MESH') && !meshNorm.includes('SIN MESH')) {
    tareasMesh = [
      'SN MESH',
      'PANORAMICA DONDE SE UBICA EL MESH',
      'TEST DE VELOCIDAD DEL MESH',
    ];
  }

  const fases: SeccionFaseApk[] = [
    {
      id: 'FACHADA',
      titulo: '1. Fachada',
      tareasFoto: [
        'PANORAMICA FACHADA',
        'PLACA/NUMERACION/SUMINISTRO',
        'RECIBO DEL SERVICIO',
      ],
    },
    {
      id: 'DOCUMENTO',
      titulo: '2. Documento',
      tareasFoto: tareasDocumento,
    },
    {
      id: 'CTO',
      titulo: '3. Externo',
      tareasFoto: ['CTO CERRADA', 'CTO ABIERTA', 'PM + POTENCIA', 'CINTILLO ROTULADO'],
    },
    {
      id: 'INTERNO',
      titulo: '4. Interno',
      tareasFoto: [
        'PANORAMICA ONT',
        'ROSETA CONDICIONADA(ABIERTA)',
        'PM + POTENCIA EN ROSETA',
      ],
    },
    {
      id: 'ACTIVACION',
      titulo: '5. Activación',
      tareasFoto: ['SERIAL ONT', 'CAPTURE DE LA ACTIVACION'],
      usaEscanerOnt: true,
    },
  ];

  if (tareasMesh.length > 0) {
    fases.push({
      id: 'MESH',
      titulo: '6. Mesh',
      tareasFoto: tareasMesh,
      usaEscanerMesh: true,
    });
  }

  fases.push({
    id: 'CLIENTE',
    titulo: `${tareasMesh.length > 0 ? '7' : '6'}. Cliente`,
    tareasFoto: [
      'CLIENTE + ACTA',
      'ACTA SIN ROTULADO',
      'SPEED TEST/TELEFONO CLIENTE',
      'SPEED TEST/TELEFONO TECNICO',
    ],
  });

  return fases;
};

// Etiqueta: Compresor de camara movil (max 1280px, JPEG 0.72) para subida instantanea en 4G
export const comprimirImagenCamara = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_LADO = 1280;
        let w = img.width;
        let h = img.height;
        if (w > MAX_LADO || h > MAX_LADO) {
          if (w > h) {
            h = Math.round((h * MAX_LADO) / w);
            w = MAX_LADO;
          } else {
            w = Math.round((w * MAX_LADO) / h);
            h = MAX_LADO;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar imagen'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Error al leer foto'));
    reader.readAsDataURL(file);
  });