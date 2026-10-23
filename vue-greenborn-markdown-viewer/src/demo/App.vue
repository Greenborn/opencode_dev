<script setup>
import { ref } from 'vue'
import GbMarkdownViewer from '../components/GbMarkdownViewer.vue'

const markdown = ref(`# Política de privacidad

Este es un **ejemplo** de texto con *énfasis*, [enlaces](https://greenborn.com.ar) y \`código\`.

## Datos recopilados

- Nombre y correo electrónico
- Respuestas enviadas en formularios

> Los datos se usan únicamente para la finalidad informada.

| Dato | Finalidad |
|---|---|
| Correo | Contacto |
| Respuestas | Análisis interno |

<script>alert('no debería ejecutarse')</script>
`)
</script>

<template>
  <div class="container py-4" style="max-width: 760px">
    <textarea v-model="markdown" class="form-control mb-4" rows="10"></textarea>
    <GbMarkdownViewer :markdown="markdown" />
  </div>
</template>
