import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { construirFasesOrdenApk } from '../fasesApk';
import { validarFaseCompleta } from '../validarFaseApk';

describe('APK phases & validation rules', () => {
  it('construirFasesOrdenApk adapts DOCUMENTO and MESH phases dynamically', () => {
    const sinMeshTitular = construirFasesOrdenApk('TITULAR', 'SIN MESH');
    assert.equal(sinMeshTitular.length, 6);
    assert.equal(sinMeshTitular.find((f) => f.id === 'DOCUMENTO')?.tareasFoto.length, 2);
    assert.equal(sinMeshTitular.some((f) => f.id === 'MESH'), false);

    const meshCableadoEncargado = construirFasesOrdenApk('ENCARGADO', 'MESH CABLEADO');
    assert.equal(meshCableadoEncargado.length, 7);
    assert.equal(meshCableadoEncargado.find((f) => f.id === 'DOCUMENTO')?.tareasFoto.length, 5);
    assert.equal(meshCableadoEncargado.find((f) => f.id === 'MESH')?.tareasFoto.length, 5);

    const meshNormal = construirFasesOrdenApk('TITULAR', 'MESH');
    assert.equal(meshNormal.find((f) => f.id === 'MESH')?.tareasFoto.length, 3);
  });

  it('validarFaseCompleta blocks CTO phase until all photos and technical fields are filled', () => {
    const fases = construirFasesOrdenApk('TITULAR', 'SIN MESH');
    const faseCto = fases.find((f) => f.id === 'CTO')!;

    const emptyCampos = {
      ctoUso: '',
      puerto: '',
      rxCto: '',
      rxRoseta: '',
      metraje: '',
      snOnt: '',
      snMesh: '',
    };

    const fail = validarFaseCompleta(faseCto, [], emptyCampos);
    assert.equal(fail.ok, false);
    assert.deepEqual(fail.faltantes, ['4 foto(s)', 'CTO', 'Puerto', 'Potencia RX CTO']);

    const evidenciasCompletas = faseCto.tareasFoto.map((t) => ({
      seccion: 'CTO' as const,
      tipo_foto: t,
      url_archivo: 'http://localhost:4000/api/apk/evidencias/1/archivo',
    }));

    const pass = validarFaseCompleta(faseCto, evidenciasCompletas, {
      ...emptyCampos,
      ctoUso: 'CTO-01',
      puerto: '4',
      rxCto: '-18.5',
    });
    assert.equal(pass.ok, true);
    assert.deepEqual(pass.faltantes, []);
  });
});
