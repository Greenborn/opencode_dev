<template>
  <div class="vgb-sso-splash" :style="{ background: fondo }" role="status" aria-live="polite">
    <span class="vgb-sso-splash__spinner" aria-hidden="true"></span>
    <span v-if="texto" class="vgb-sso-splash__texto">{{ texto }}</span>
  </div>
</template>

<script setup>
defineProps({
  texto: {
    type: String,
    default: '',
  },
  fondo: {
    type: String,
    default: '#212529',
  },
})
</script>

<style>
.vgb-sso-splash {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
.vgb-sso-splash__spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vgb-sso-splash-spin 0.8s linear infinite;
}
.vgb-sso-splash__texto {
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.9rem;
}
@keyframes vgb-sso-splash-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
