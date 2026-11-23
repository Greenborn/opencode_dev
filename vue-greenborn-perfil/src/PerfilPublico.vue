<script setup>
// Muestra sólo lo que el backend entregó (la lista blanca ya se aplicó en el servidor).
defineProps({
  perfil: { type: Object, default: null },
  campos: { type: Array, default: () => [] },
  terminos: { type: Object, default: () => ({}) },
});
</script>

<template>
  <section class="perfil-publico" v-if="perfil">
    <dl>
      <template v-for="campo in campos" :key="campo.nombre">
        <template v-if="campo.publicable && perfil[campo.nombre] != null && perfil[campo.nombre] !== ''">
          <dt>{{ campo.etiqueta || campo.nombre }}</dt>
          <dd>{{ perfil[campo.nombre] }}</dd>
        </template>
      </template>
    </dl>
  </section>
  <p v-else class="perfil-publico__vacio">Este {{ terminos.singular || 'negocio' }} no tiene datos publicados.</p>
</template>
