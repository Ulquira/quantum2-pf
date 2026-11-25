export const limpiarTextoXls = (val: unknown): string | null => {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim().replace(/^'/, '');
};

export const parsearFechaXls = (val: unknown, conHora = false): string | null => {
  const limpio = limpiarTextoXls(val);
  if (!limpio) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(limpio)) {
    if (!conHora) return limpio.slice(0, 10);
    return limpio.length >= 19 ? limpio.slice(0, 19) : `${limpio.slice(0, 10)} 00:00:00`;
  }

  const partesEspacio = limpio.split(/\s+/);
  const partesFecha = partesEspacio[0].split(/[/-]/);
  if (partesFecha.length === 3) {
    let p0 = partesFecha[0];
    let p1 = partesFecha[1];
    let anio = partesFecha[2];

    if (anio.length === 2) anio = `20${anio}`;
    if (p0.length === 4) {
      anio = p0;
      p0 = partesFecha[2];
    }

    const dia = p0.padStart(2, '0');
    const mes = p1.padStart(2, '0');
    const horaRaw = partesEspacio[1] || '00:00:00';
    const hora = horaRaw.split(':').length === 2 ? `${horaRaw}:00` : horaRaw.slice(0, 8);
    const fechaIso = `${anio}-${mes}-${dia}`;

    if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
      return conHora ? `${fechaIso} ${hora}` : fechaIso;
    }
  }
  return null;
};

export const obtenerCampoXls = (
  fila: Record<string, unknown>,
  posiblesClaves: string[]
): string | null => {
  for (const clave of posiblesClaves) {
    if (fila[clave] !== undefined) return limpiarTextoXls(fila[clave]);
  }
  const mapaNormalizado = Object.keys(fila).reduce<Record<string, unknown>>((acc, key) => {
    acc[key.trim().toLowerCase()] = fila[key];
    return acc;
  }, {});
  for (const clave of posiblesClaves) {
    const val = mapaNormalizado[clave.trim().toLowerCase()];
    if (val !== undefined) return limpiarTextoXls(val);
  }
  return null;
};

export const calcularModoMesh = (
  comentarioValidador: string | null,
  comentarioComercial: string | null
): 'MESH CABLEADO' | 'MESH' | 'SIN MESH' => {
  const texto = `${comentarioValidador || ''} ${comentarioComercial || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (!texto.includes('MESH') || texto.includes('SIN MESH')) return 'SIN MESH';
  if (texto.includes('CABLEADO')) return 'MESH CABLEADO';
  return 'MESH';
};
