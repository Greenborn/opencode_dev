import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarPlugins, pluginsFaltantes, construirMapa, ESQUEMA_PLUGINS } from '../src/index.js';
import * as datos from '../src/plugins/datos.js';

test('sin plugins registrados, construirMapa falla con la lista de faltantes', () => {
    assert.deepEqual(pluginsFaltantes().sort(), Object.keys(ESQUEMA_PLUGINS).sort());
    assert.throws(() => construirMapa(), /faltan plugins de datos/);
});

test('registrarPlugins rechaza un plugin desconocido', () => {
    assert.throws(() => registrarPlugins({ inexistente: {} }), /plugin desconocido "inexistente"/);
});

test('registrarPlugins rechaza nombres que faltan dentro de un plugin', () => {
    assert.throws(() => registrarPlugins({ postes: {} }), /"postes" no trae: ID_POSTE/);
});

test('registrarPlugins expone los datos como bindings vivos', async () => {
    const { PLUGINS_FALSOS } = await import('../fixtures/plugins_falsos.js');
    registrarPlugins({ postes: PLUGINS_FALSOS.postes });
    assert.equal(datos.ID_POSTE, 'poste_test');
});
