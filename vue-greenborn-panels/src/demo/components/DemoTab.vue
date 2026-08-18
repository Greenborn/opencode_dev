<template>
  <div class="demo-tab" :style="{ '--demo-color': color }">
    <h4>{{ title }}</h4>
    <p>{{ text }}</p>
  </div>
</template>

<script>
export default {
  name: 'DemoTab',
  props: {
    title: { type: String, default: 'Tab' },
    text: { type: String, default: '' },
    color: { type: String, default: '#75aadb' },
  },
}
</script>

<style scoped>
.demo-tab {
  padding: 12px;
  color: #e0e0e0;
  font-size: 0.85rem;
}
.demo-tab h4 {
  color: var(--demo-color);
  margin: 0 0 6px;
}
</style>