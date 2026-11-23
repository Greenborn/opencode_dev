<script setup>
import { usePerfil } from './usePerfil.js';

const props = defineProps({
  api: { type: Object, required: true },
  base: { type: String, default: '/api/perfil' },
  campos: { type: Array, required: true },
  terminos: { type: Object, default: () => ({}) },
});

const { formulario, textos, valores, cargando, guardando, error, mensaje, hayCambios, cargar, guardar } =
  usePerfil({ api: props.api, base: props.base, campos: props.campos, terminos: props.terminos });

cargar();
</script>

<template>
  <form class="perfil-editor" novalidate @submit.prevent="guardar">
    <h2 class="perfil-editor__titulo">{{ textos.titulo }}</h2>
    <p v-if="cargando" role="status">Cargando…</p>
    <p v-if="error" class="perfil-editor__error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="perfil-editor__ok" role="status">{{ mensaje }}</p>

    <div v-for="campo in formulario" :key="campo.nombre" class="perfil-editor__campo">
      <label :for="`perfil-${campo.nombre}`">{{ campo.etiqueta }}</label>
      <textarea v-if="campo.tipo === 'texto_largo'" :id="`perfil-${campo.nombre}`" v-model="valores[campo.nombre]" rows="3" />
      <input v-else-if="campo.tipo === 'booleano'" :id="`perfil-${campo.nombre}`" v-model="valores[campo.nombre]" type="checkbox" />
      <input v-else :id="`perfil-${campo.nombre}`" v-model="valores[campo.nombre]" :type="campo.tipo === 'numero' ? 'number' : 'text'" />

      <label v-if="campo.publicable" class="perfil-editor__privacidad">
        <input type="checkbox" role="switch" v-model="valores[campo.interruptor]" />
        Mostrar en mi perfil público
      </label>
    </div>

    <button type="submit" class="perfil-editor__guardar" :disabled="guardando || !hayCambios">
      {{ guardando ? 'Guardando…' : 'Guardar' }}
    </button>
  </form>
</template>
