<script setup>
import { computed } from 'vue';
import { normalizeImagen } from '../models/imagen.js';

const props = defineProps({
  imagenes: { type: Array, default: () => [] },
  columnas: { type: [Number, String], default: 4 },
  gap: { type: String, default: '12px' },
  mostrarSeccion: { type: Boolean, default: false },
  mostrarTitulo: { type: Boolean, default: true },
  permisos: { type: Object, default: () => ({}) },
  // Función de chequeo de permisos (patrón permissionsCheck): (permiso) => boolean.
  // Si no se define, todos los botones de acción están visibles (uso sin RBAC).
  permissionsCheck: { type: Function, default: null },
  // Selección múltiple opcional: si selectable es true, el click marca/desmarca
  // la celda y sincroniza el array de claves vía v-model.
  selectable: { type: Boolean, default: false },
  modelValue: { type: Array, default: () => [] },
  // Campo del item original (raw) usado como clave de selección y de badge.
  keyField: { type: String, default: 'url' },
  badgeField: { type: String, default: '' },
});

const emit = defineEmits(['select', 'edit', 'delete', 'update:modelValue']);

const items = computed(() => props.imagenes.map(normalizeImagen).filter((i) => i && i.url));

function hasPermission(permiso) {
  if (typeof props.permissionsCheck !== 'function') return true;
  return props.permissionsCheck(permiso);
}

const puedeEditar = computed(() => hasPermission(props.permisos.edit ?? 'galeria.editar'));
const puedeEliminar = computed(() => hasPermission(props.permisos.delete ?? 'galeria.eliminar'));

const estiloGrilla = computed(() => ({
  gridTemplateColumns: `repeat(${props.columnas}, minmax(0, 1fr))`,
  gap: props.gap,
}));

const seleccion = computed(() => new Set(props.modelValue));

function keyOf(item) {
  const v = item.raw?.[props.keyField];
  if (v !== undefined && v !== null && v !== '') return v;
  return item[props.keyField] ?? item.url;
}

function badgeText(item) {
  if (!props.badgeField) return null;
  const v = item.raw?.[props.badgeField];
  if (v === true) return props.badgeField.replace(/_/g, ' ');
  if (typeof v === 'string' && v) return v;
  return null;
}

function toggle(item, indice) {
  const clave = keyOf(item);
  const nueva = new Set(seleccion.value);
  if (nueva.has(clave)) nueva.delete(clave);
  else nueva.add(clave);
  emit('update:modelValue', Array.from(nueva));
  emit('select', indice, item.raw);
}

function onClick(item, indice) {
  if (props.selectable) {
    toggle(item, indice);
    return;
  }
  emit('select', indice, item.raw);
}
</script>

<template>
  <div class="gb-galeria-grid" :style="estiloGrilla">
    <figure
      v-for="(item, i) in items"
      :key="keyOf(item) ?? i"
      class="gb-galeria-grid__item"
      :class="{ 'gb-galeria-grid__item--seleccionada': props.selectable && seleccion.has(keyOf(item)) }"
      tabindex="0"
      @click="onClick(item, i)"
      @keydown.enter="onClick(item, i)"
    >
      <img
        :src="item.thumbnailUrl || item.url"
        :alt="item.titulo"
        class="gb-galeria-grid__thumb"
        loading="lazy"
        draggable="false"
      />
      <span v-if="badgeText(item)" class="gb-galeria-grid__badge">{{ badgeText(item) }}</span>
      <span v-if="props.selectable && seleccion.has(keyOf(item))" class="gb-galeria-grid__check">&#10003;</span>
      <figcaption v-if="props.mostrarTitulo && (item.titulo || item.seccion)" class="gb-galeria-grid__caption">
        <span v-if="item.titulo" class="gb-galeria-grid__titulo">{{ item.titulo }}</span>
        <span v-if="props.mostrarSeccion && item.seccion" class="gb-galeria-grid__seccion">{{ item.seccion }}</span>
      </figcaption>
      <div v-if="puedeEditar || puedeEliminar" class="gb-galeria-grid__acciones">
        <button v-if="puedeEditar" type="button" title="Editar" @click.stop="emit('edit', item.raw, i)">✎</button>
        <button v-if="puedeEliminar" type="button" title="Eliminar" @click.stop="emit('delete', item.raw, i)">🗑</button>
      </div>
    </figure>
  </div>
</template>
