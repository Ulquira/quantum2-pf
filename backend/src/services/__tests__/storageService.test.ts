import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { buildPublicEvidenceUrl, parseImageDataUrl } from '../storageService';

describe('storageService', () => {
  it('parseImageDataUrl decodes valid JPEG and PNG data URLs', () => {
    const sample = Buffer.from('fake-jpeg-bytes').toString('base64');
    const parsed = parseImageDataUrl(`data:image/jpeg;base64,${sample}`);
    assert.equal(parsed.contentType, 'image/jpeg');
    assert.equal(parsed.extension, 'jpg');
    assert.equal(parsed.buffer.toString('utf8'), 'fake-jpeg-bytes');

    const pngParsed = parseImageDataUrl(`data:image/png;base64,${sample}`);
    assert.equal(pngParsed.extension, 'png');
  });

  it('parseImageDataUrl rejects malformed or empty payloads', () => {
    assert.throws(() => parseImageDataUrl('not-a-data-url'), /Formato de imagen inválido/);
    assert.throws(() => parseImageDataUrl('data:image/jpeg;base64,'), /inválido|vacía/);
  });

  it('buildPublicEvidenceUrl maps gcs:// and local:// to streaming endpoint and keeps legacy URLs', () => {
    const fakeReq = {
      protocol: 'http',
      get: (header: string) => (header === 'host' ? 'localhost:4000' : undefined),
    } as unknown as Request;

    assert.equal(
      buildPublicEvidenceUrl(fakeReq, 42, 'gcs://evidencias/OP-1/CTO/img.jpg'),
      'http://localhost:4000/api/apk/evidencias/42/archivo'
    );
    assert.equal(
      buildPublicEvidenceUrl(fakeReq, 7, 'local://evidencias/OP-1/CTO/img.jpg'),
      'http://localhost:4000/api/apk/evidencias/7/archivo'
    );
    assert.equal(
      buildPublicEvidenceUrl(fakeReq, 9, 'data:image/jpeg;base64,abc'),
      'data:image/jpeg;base64,abc'
    );
  });
});
