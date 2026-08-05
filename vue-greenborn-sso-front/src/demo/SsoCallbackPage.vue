<template>
  <div>
    <h2>Callback SSO</h2>
    <SsoCallback
      @success="onSuccess"
      @error="onError"
      @no-params="onNoParams"
    />
    <pre v-if="result" class="box">{{ result }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { SsoCallback } from '../index.js'

const result = ref(null)

function onSuccess(res) {
  result.value = res
}
function onError(err) {
  result.value = { error: String(err && err.message ? err.message : err) }
}
function onNoParams() {
  result.value = { error: 'missing_params' }
}
</script>

<style scoped>
.box {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
