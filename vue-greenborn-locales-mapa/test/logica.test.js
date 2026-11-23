import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlComoLlegar, localesAPuntos, direccionLegible, terminosCompletos } from '../src/logica.js';

test('urlComoLlegar sólo con coordenadas válidas', () => {
  assert.equal(urlComoLlegar(-37.3, -59.1), 'https://www.google.com/maps/dir/?api=1&destination=-37.3,-59.1');
  assert.equal(urlComoLlegar(null, -59.1), null);
  assert.equal(urlComoLlegar(95, 0), null);
});

test('localesAPuntos omite locales sin coordenadas', () => {
  const puntos = localesAPuntos([
    { id: 1, calle: 'Mitre', numero: '100', latitud: -37.3, longitud: -59.1 },
    { id: 2, calle: 'Sin mapa', latitud: null, longitud: null },
  ]);
  assert.deepEqual(puntos, [{ id: 1, lat: -37.3, lng: -59.1, nombre: 'Mitre 100' }]);
});

test('direccionLegible omite partes vacías', () => {
  assert.equal(direccionLegible({ calle: 'Mitre', numero: '100', ciudad: '' }), 'Mitre, 100');
});

test('terminos por defecto son negocio', () => {
  assert.deepEqual(terminosCompletos(), { singular: 'negocio', plural: 'negocios' });
});
