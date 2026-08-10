<template>
  <div class="demo">
    <nav class="demo-topbar">
      <button type="button" class="demo-toggle" @click="sidebarVisible = !sidebarVisible">
        ☰ Toggle
      </button>
      <span class="demo-brand">vue-side-menu</span>
      <div class="demo-actions">
        <label class="demo-perms">
          <input type="checkbox" v-model="permisosHabilitados" /> Filtrar por permisos
        </label>
      </div>
    </nav>

    <SideMenu
      :items="items"
      :visible="sidebarVisible"
      title="Menú"
      footer="v1.0.0"
      @close="sidebarVisible = false"
    >
      <template #footer>v1.0.0 — demo</template>
    </SideMenu>

    <main class="demo-main" :class="{ 'demo-main--open': sidebarVisible }">
      <h1>Demo vue-side-menu</h1>
      <p>
        Menú configurable por props. Usa <code>href</code> (sin vue-router),
        <code>to</code> (con vue-router), <code>action</code> para botones y
        <code>permiso</code> para filtrado opcional.
      </p>
      <ul>
        <li><b>Dashboard</b> — item con <code>href</code>.</li>
        <li><b>Clientes</b> — item con <code>permiso: 'clientes.ver'</code>.</li>
        <li><b>Notas</b> — item con <code>permiso: 'notas.ver'</code>.</li>
        <li><b>Secreto</b> — solo visible si <code>hasPermission('secreto.ver')</code>.</li>
        <li><b>Instalar</b> — item con <code>action</code> (botón).</li>
      </ul>
      <p v-if="!permisosHabilitados" class="demo-note">
        Permisos desactivados: se muestran todos los items.
      </p>
      <p v-else class="demo-note">
        Permisos activados: el item "Secreto" queda oculto (permiso no concedido).
      </p>
    </main>
  </div>
</template>

<script>
import { provide } from 'vue'
import SideMenu, { HAS_PERMISSION_KEY } from '../index.js'

const PERMISOS_OTORGADOS = ['clientes.ver', 'notas.ver']

export default {
  name: 'DemoApp',
  components: { SideMenu },
  data() {
    return {
      sidebarVisible: false,
      permisosHabilitados: false,
    }
  },
  computed: {
    items() {
      const instalado = {
        label: 'Instalar aplicación',
        icon: '↧',
        action: () => alert('Acción "Instalar" ejecutada (aquí iría la lógica PWA).'),
      }
      return [
        { label: 'Dashboard', to: '/', icon: '▣' },
        { label: 'Clientes', to: '/clientes', icon: '▤', permiso: 'clientes.ver' },
        { label: 'Notas', to: '/notas', icon: '▥', permiso: 'notas.ver' },
        { label: 'Proyectos', href: '/proyectos', icon: '▦' },
        { divider: true },
        { label: 'Secreto', to: '/secreto', icon: '▧', permiso: 'secreto.ver' },
        instalado,
      ]
    },
  },
  setup() {
    provide(HAS_PERMISSION_KEY, (permiso) => PERMISOS_OTORGADOS.includes(permiso))
  },
}
</script>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
}
.demo-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #212529;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 1rem;
  z-index: 1030;
}
.demo-toggle {
  background: transparent;
  border: 1px solid #fff;
  color: #fff;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.demo-brand {
  font-weight: 600;
}
.demo-actions {
  margin-left: auto;
}
.demo-perms {
  font-size: 0.85rem;
}
.demo-main {
  padding: 56px 1rem 1rem;
  margin-left: 0;
  transition: margin-left 0.3s ease;
}
.demo-main--open {
  margin-left: 250px;
}
.demo-note {
  font-style: italic;
  color: #555;
}
@media (max-width: 767px) {
  .demo-main--open {
    margin-left: 0;
  }
}
</style>
