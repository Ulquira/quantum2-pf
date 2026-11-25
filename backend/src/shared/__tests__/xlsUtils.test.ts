import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularModoMesh,
  limpiarTextoXls,
  obtenerCampoXls,
  parsearFechaXls,
} from '../xlsUtils';

describe('xlsUtils', () => {
  it('limpiarTextoXls strips leading apostrophe and trims whitespace', () => {
    assert.equal(limpiarTextoXls("  '100000301  "), '100000301');
    assert.equal(limpiarTextoXls(''), null);
    assert.equal(limpiarTextoXls(null), null);
    assert.equal(limpiarTextoXls(undefined), null);
  });

  it('parsearFechaXls parses ISO, DD/MM/YYYY and YYYY/MM/DD formats', () => {
    assert.equal(parsearFechaXls('2026-11-20T14:30:00Z', false), '2026-11-20');
    assert.equal(parsearFechaXls('2026-11-20 14:30:00', true), '2026-11-20 14:30:00');
    assert.equal(parsearFechaXls('20/11/2026', false), '2026-11-20');
    assert.equal(parsearFechaXls('20/11/26 09:15', true), '2026-11-20 09:15:00');
    assert.equal(parsearFechaXls('2026/11/20', false), '2026-11-20');
    assert.equal(parsearFechaXls('99/99/2026', false), null);
  });

  it('obtenerCampoXls matches headers case-insensitively with extra spaces', () => {
    const fila = { '  Estado de validación  ': 'APROBADO', 'valida_cod_pedido': "'PED-99" };
    assert.equal(obtenerCampoXls(fila, ['Estado de validacion', 'Estado de validación']), 'APROBADO');
    assert.equal(obtenerCampoXls(fila, ['valida_cod_pedido']), 'PED-99');
    assert.equal(obtenerCampoXls(fila, ['inexistente']), null);
  });

  it('calcularModoMesh classifies SIN MESH, MESH CABLEADO, and MESH accurately', () => {
    assert.equal(calcularModoMesh('Cliente sin mesh adicional', null), 'SIN MESH');
    assert.equal(calcularModoMesh('Instalación estándar fibra', ''), 'SIN MESH');
    assert.equal(calcularModoMesh('Incluye 1 mesh cableado cat6', null), 'MESH CABLEADO');
    assert.equal(calcularModoMesh(null, 'Promoción con MESH inalámbrico'), 'MESH');
  });
});
