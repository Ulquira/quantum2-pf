// Etiqueta: Lector nativo de archivos .xlsx (ZIP + XML) para Strict OpenXML o hojas con dimension truncada
const colLetraAIndice = (refCelda: string): number => {
  const match = refCelda.match(/^[A-Za-z]+/);
  if (!match) return -1;
  const letras = match[0].toUpperCase();
  let col = 0;
  for (let i = 0; i < letras.length; i++) {
    col = col * 26 + (letras.charCodeAt(i) - 64);
  }
  return col - 1;
};

const descomprimirEntradaZip = async (
  buffer: ArrayBuffer,
  offset: number,
  compSize: number,
  metodo: number
): Promise<string> => {
  const slice = buffer.slice(offset, offset + compSize);
  if (metodo === 0) {
    return new TextDecoder('utf-8').decode(slice);
  }
  if (metodo === 8 && typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([slice]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).text();
  }
  return '';
};

// Etiqueta: Extrae todas las filas directamente desde xl/sharedStrings.xml y xl/worksheets/sheet*.xml
export const leerXlsxDesdeZipXml = async (buffer: ArrayBuffer): Promise<string[][]> => {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Buscar End of Central Directory (0x06054b50)
  let eocdPos = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) return [];

  const totalEntradas = view.getUint16(eocdPos + 10, true);
  let cdPos = view.getUint32(eocdPos + 16, true);
  const archivosXml: Record<string, string> = {};

  for (let e = 0; e < totalEntradas; e++) {
    if (cdPos + 46 > bytes.length || view.getUint32(cdPos, true) !== 0x02014b50) break;

    const metodo = view.getUint16(cdPos + 10, true);
    const compSize = view.getUint32(cdPos + 20, true);
    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localHeaderOffset = view.getUint32(cdPos + 42, true);

    const nombre = new TextDecoder('utf-8').decode(
      buffer.slice(cdPos + 46, cdPos + 46 + nameLen)
    );

    if (
      nombre === 'xl/sharedStrings.xml' ||
      /^xl\/worksheets\/sheet\d+\.xml$/i.test(nombre)
    ) {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
      archivosXml[nombre] = await descomprimirEntradaZip(buffer, dataOffset, compSize, metodo);
    }

    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  // 1. Leer diccionario sharedStrings.xml
  const sharedStrings: string[] = [];
  if (archivosXml['xl/sharedStrings.xml']) {
    const docSS = new DOMParser().parseFromString(archivosXml['xl/sharedStrings.xml'], 'application/xml');
    const itemsSi = Array.from(docSS.getElementsByTagNameNS('*', 'si'));
    for (const si of itemsSi) {
      const nodosT = Array.from(si.getElementsByTagNameNS('*', 't'));
      sharedStrings.push(nodosT.map((t) => t.textContent || '').join(''));
    }
  }

  // 2. Leer hojas xl/worksheets/sheet*.xml
  const nombresHojas = Object.keys(archivosXml)
    .filter((k) => k.startsWith('xl/worksheets/'))
    .sort();

  for (const rutaHoja of nombresHojas) {
    const docSheet = new DOMParser().parseFromString(archivosXml[rutaHoja], 'application/xml');
    const nodosRow = Array.from(docSheet.getElementsByTagNameNS('*', 'row'));
    if (nodosRow.length < 2) continue;

    const matriz: string[][] = [];
    for (const rowEl of nodosRow) {
      const fila: string[] = [];
      let colCursor = 0;
      const celdas = Array.from(rowEl.getElementsByTagNameNS('*', 'c'));

      for (const cEl of celdas) {
        const ref = cEl.getAttribute('r') || '';
        const colIdx = colLetraAIndice(ref);
        if (colIdx >= 0) colCursor = colIdx;

        const tipo = cEl.getAttribute('t') || '';
        let valor = '';

        if (tipo === 'inlineStr') {
          const tNodes = Array.from(cEl.getElementsByTagNameNS('*', 't'));
          valor = tNodes.map((n) => n.textContent || '').join('');
        } else {
          const vNode = cEl.getElementsByTagNameNS('*', 'v')[0];
          const rawVal = vNode?.textContent || '';
          valor = tipo === 's' ? sharedStrings[Number(rawVal)] ?? rawVal : rawVal;
        }

        fila[colCursor] = valor.trim();
        colCursor++;
      }
      matriz.push(fila);
    }

    if (matriz.length >= 2) return matriz;
  }

  return [];
};