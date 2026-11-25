// Etiqueta: Lector universal .xlsx, .xls (BIFF, XML 2003, HTML, MHTML, UTF-16, TSV) y .csv
import * as XLSX from 'xlsx';
import { leerXlsxDesdeZipXml } from './xlsxZipFallback';

const COLUMNAS_CLAVE = [
  'valida_cod_pedido',
  'id_contrato',
  'dni_cliente',
  'nom_cliente',
  'idclientes',
  'idvisita',
];

const limpiarClave = (val: unknown): string =>
  String(val ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();

// Etiqueta: Convierte una matriz 2D de celdas en arreglo de objetos detectando la fila de titulos
const matrizAObjetos = (matriz: unknown[][]): Record<string, unknown>[] => {
  if (matriz.length < 2) return [];

  let idxCabecera = -1;
  for (let i = 0; i < Math.min(matriz.length, 20); i++) {
    const filaNorm = (matriz[i] || []).map((c) => limpiarClave(c).toLowerCase());
    if (COLUMNAS_CLAVE.some((clave) => filaNorm.includes(clave))) {
      idxCabecera = i;
      break;
    }
  }

  // Si no coincidio nombre exacto, usar la primera fila con al menos 5 columnas con texto
  if (idxCabecera === -1) {
    idxCabecera = matriz.findIndex(
      (fila) => Array.isArray(fila) && fila.filter((c) => limpiarClave(c) !== '').length >= 5
    );
  }
  if (idxCabecera === -1) return [];

  const cabeceras = (matriz[idxCabecera] || []).map(
    (c, idx) => limpiarClave(c) || `col_${idx}`
  );

  const registros: Record<string, unknown>[] = [];
  for (let r = idxCabecera + 1; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    const obj: Record<string, unknown> = {};
    let tieneDatos = false;

    cabeceras.forEach((colName, colIdx) => {
      const val = String(fila[colIdx] ?? '').trim();
      if (val !== '') tieneDatos = true;
      obj[colName] = val;
    });

    if (tieneDatos) registros.push(obj);
  }

  return registros;
};

// Etiqueta: Corrige hojas .xlsx/.xls cuyo metadato !ref viene truncado en A1
const recalcularRangoHoja = (sheet: XLSX.WorkSheet) => {
  if (Array.isArray(sheet['!data']) && sheet['!data'].length > 0) return;

  let minR = Infinity;
  let minC = Infinity;
  let maxR = -1;
  let maxC = -1;

  for (const key of Object.keys(sheet)) {
    if (key[0] === '!' || !/^[A-Za-z]+\d+$/.test(key)) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r < minR) minR = cell.r;
    if (cell.c < minC) minC = cell.c;
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }

  if (maxR >= 0 && maxC >= 0) {
    sheet['!ref'] = XLSX.utils.encode_range({
      s: { r: minR, c: minC },
      e: { r: maxR, c: maxC },
    });
  }
};

const extraerDesdeWorkbook = (workbook: XLSX.WorkBook): Record<string, unknown>[] => {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    recalcularRangoHoja(sheet);

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    const filas = matrizAObjetos(matriz);
    if (filas.length > 0) return filas;
  }
  return [];
};

// Etiqueta: Lector de .xls en formato XML Spreadsheet 2003 (<Workbook><Worksheet><Table><Row><Cell>)
const extraerDesdeXmlSpreadsheet2003 = (xmlTexto: string): Record<string, unknown>[] => {
  const xmlLimpio = xmlTexto.replace(
    /&(?!(?:apos|quot|[gl]t|amp|#\d+|#x[\da-fA-F]+);)/g,
    '&amp;'
  );
  const doc = new DOMParser().parseFromString(xmlLimpio, 'application/xml');
  const filasXml = Array.from(doc.getElementsByTagNameNS('*', 'Row'));
  if (filasXml.length < 2) return [];

  const matriz: string[][] = filasXml.map((rowEl) => {
    const filaArr: string[] = [];
    let colCursor = 0;
    const celdas = Array.from(rowEl.getElementsByTagNameNS('*', 'Cell'));

    for (const cell of celdas) {
      const ssIndex = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
      if (ssIndex) colCursor = Math.max(0, parseInt(ssIndex, 10) - 1);

      const dataNode = cell.getElementsByTagNameNS('*', 'Data')[0];
      filaArr[colCursor] = (dataNode ? dataNode.textContent || '' : cell.textContent || '').trim();

      const mergeAcross = cell.getAttribute('ss:MergeAcross') || cell.getAttribute('MergeAcross');
      colCursor += 1 + (mergeAcross ? parseInt(mergeAcross, 10) : 0);
    }
    return filaArr;
  });

  return matrizAObjetos(matriz);
};

// Etiqueta: Lector de .xls en formato tabla HTML o MHTML
const extraerDesdeTablaHtml = (htmlRaw: string): Record<string, unknown>[] => {
  let html = htmlRaw;
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(html)) {
    html = html
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const tabla of Array.from(doc.querySelectorAll('table'))) {
    const filasTr = Array.from(tabla.querySelectorAll('tr'));
    if (filasTr.length < 2) continue;

    const matriz = filasTr.map((tr) =>
      Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent || '').trim())
    );
    const res = matrizAObjetos(matriz);
    if (res.length > 0) return res;
  }
  return [];
};

// Etiqueta: Decodificador automatico de texto soportando UTF-16LE, UTF-16BE, UTF-8 y Windows-1252
const decodificarTextoArchivo = (bytes: Uint8Array): string => {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

export const leerArchivoExcelClientes = async (
  file: File
): Promise<Record<string, unknown>[]> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) return [];

  const esZipXlsx = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const esOleXls = bytes[0] === 0xd0 && bytes[1] === 0xcf;

  // 1. Archivos binarios .xlsx o .xls BIFF8
  if (esZipXlsx || esOleXls) {
    try {
      const wb = XLSX.read(bytes, { type: 'array' });
      const filasWb = extraerDesdeWorkbook(wb);
      if (filasWb.length > 0) return filasWb;
    } catch {
      // Continua al extractor nativo ZIP/XML
    }

    if (esZipXlsx) {
      const matrizXml = await leerXlsxDesdeZipXml(buffer);
      const filasZip = matrizAObjetos(matrizXml);
      if (filasZip.length > 0) return filasZip;
    }
  }

  // 2. Archivos .xls basados en texto (XML 2003, HTML, TSV UTF-16/Win1252) y .csv
  const texto = decodificarTextoArchivo(bytes);

  if (/<(?:ss:)?Workbook[\s>]/i.test(texto) && /<(?:ss:)?Row[\s>]/i.test(texto)) {
    const filasXml = extraerDesdeXmlSpreadsheet2003(texto);
    if (filasXml.length > 0) return filasXml;
  }

  if (/<tr[\s>]/i.test(texto)) {
    const filasHtml = extraerDesdeTablaHtml(texto);
    if (filasHtml.length > 0) return filasHtml;
  }

  // TSV directo (inmune a comillas sin cerrar en direcciones o comentarios)
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lineas.length >= 2 && (lineas[0].match(/\t/g) || []).length >= 5) {
    const matrizTsv = lineas.map((linea) =>
      linea.split('\t').map((celda) => celda.replace(/^"(.*)"$/, '$1').trim())
    );
    const filasTsv = matrizAObjetos(matrizTsv);
    if (filasTsv.length > 0) return filasTsv;
  }

  // CSV u otros formatos soportados por SheetJS
  const wbTexto = XLSX.read(texto, { type: 'string', raw: false });
  return extraerDesdeWorkbook(wbTexto);
};