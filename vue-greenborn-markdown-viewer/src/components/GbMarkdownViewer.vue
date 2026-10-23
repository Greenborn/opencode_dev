<script setup>
import { computed } from 'vue';
import { renderMarkdown } from '../utils/renderMarkdown.js';

const props = defineProps({
  // Texto Markdown (GFM) a mostrar.
  markdown: { type: String, default: '' },
});

const html = computed(() => renderMarkdown(props.markdown));
</script>

<template>
  <div class="gb-markdown" v-html="html"></div>
</template>
