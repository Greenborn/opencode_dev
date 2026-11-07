import { createApp, h } from 'vue';
import { usePush } from '../src/usePush.js';

// http de ejemplo contra el demo de express-greenborn-notificaciones
// (correrlo aparte en el puerto 5175 de ESE paquete, o ajustar baseURL).
const http = {
  async get(url) {
    const res = await fetch(`http://localhost:5176${url}`);
    return { data: await res.json() };
  },
  async post(url, body) {
    const res = await fetch(`http://localhost:5176${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { data: await res.json() };
  },
  async delete(url, { data }) {
    const res = await fetch(`http://localhost:5176${url}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { data: await res.json() };
  },
};

const App = {
  setup() {
    const { soportado, suscripto, cargando, suscribir, desuscribir } = usePush({ http });
    return () =>
      h('div', { style: 'font-family: sans-serif; padding: 2rem' }, [
        h('h1', 'Demo vue-greenborn-notificaciones'),
        h('p', `Soportado: ${soportado.value}`),
        h('p', `Suscripto: ${suscripto.value}`),
        h(
          'button',
          { onClick: suscribir, disabled: cargando.value },
          'Suscribirse a push'
        ),
        h(
          'button',
          { onClick: desuscribir, disabled: cargando.value, style: 'margin-left: 1rem' },
          'Desuscribirse'
        ),
      ]);
  },
};

createApp(App).mount('#app');
