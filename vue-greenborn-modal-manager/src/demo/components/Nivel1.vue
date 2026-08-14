<template>
  <div>
    <p>Este es el modal de <b>nivel 1</b>.</p>
    <p>
      Resultado del anidado:
      <b>{{ parametros.nivel1dato }}</b>
    </p>
    <div class="row">
      <button class="gmm-btn gmm-btn-primary" @click="parametros.abrir_nivel2()">
        Abrir modal nivel 2 (anidado)
      </button>
    </div>
    <p>
      <code>_modal_cod</code> = {{ parametros._modal_cod }}
    </p>
  </div>
</template>

<script setup>
defineProps(['parametros'])
</script>