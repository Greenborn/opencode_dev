import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverColorPunto } from './colorPunto.js'

test('usa punto.color cuando es válido', () => {
  assert.equal(resolverColorPunto({ color: '#ff0000' }, '#0d6efd'), '#ff0000')
  assert.equal(resolverColorPunto({ color: 'rgb(1, 2, 3)' }, '#000'), 'rgb(1, 2, 3)')
  assert.equal(resolverColorPunto({ color: 'teal' }, '#000'), 'teal')
})
test('cae al color global si falta o es inválido', () => {
  assert.equal(resolverColorPunto({}, '#0d6efd'), '#0d6efd')
  assert.equal(resolverColorPunto(null, '#0d6efd'), '#0d6efd')
  assert.equal(resolverColorPunto({ color: '' }, '#0d6efd'), '#0d6efd')
  assert.equal(resolverColorPunto({ color: 42 }, '#0d6efd'), '#0d6efd')
  assert.equal(resolverColorPunto({ color: 'red; x:url(a)' }, '#0d6efd'), '#0d6efd')
})
