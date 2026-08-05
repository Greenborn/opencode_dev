<template>
  <div class="vgb-sso-callback">
    <div v-if="loading" class="vgb-sso-callback__loading">Verificando autenticación…</div>
    <div v-else-if="error" class="vgb-sso-callback__error">{{ error }}</div>
    <slot v-else />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSsoAuth } from '../composables/useSsoAuth.js'

const props = defineProps({
  registerPath: {
    type: String,
    default: '/registro',
  },
  fallbackPath: {
    type: String,
    default: '/',
  },
  autoRedirect: {
    type: Boolean,
    default: true,
  },
  config: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['success', 'error', 'no-params'])

const route = useRoute()
const router = useRouter()
const sso = useSsoAuth(props.config)

const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const token = route.query.token
  const uniqueId = route.query.unique_id

  if (!token || !uniqueId) {
    error.value = 'Parámetros de autenticación no recibidos.'
    emit('no-params')
    if (props.autoRedirect) {
      setTimeout(() => router.push({ path: '/login', query: { error: 'missing_params' } }), 3000)
    }
    loading.value = false
    return
  }

  try {
    const result = await sso.handleCallback(token, uniqueId)
    emit('success', result)
    loading.value = false
    if (props.autoRedirect) {
      if (result.exists) {
        const redirectUrl = sso.getAndClearRedirectUrl()
        router.push(redirectUrl || props.fallbackPath)
      } else {
        router.push({
          path: props.registerPath,
          query: { email: encodeURIComponent(result.ssoEmail || '') },
        })
      }
    }
  } catch (err) {
    console.error('Error en callback SSO:', err)
    error.value = 'Error al autenticar. Intenta nuevamente.'
    emit('error', err)
    loading.value = false
    if (props.autoRedirect) {
      setTimeout(() => router.push({ path: '/login', query: { error: 'auth_failed' } }), 3000)
    }
  }
})
</script>

<style>
.vgb-sso-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  font-family: system-ui, -apple-system, sans-serif;
}
.vgb-sso-callback__loading {
  color: #666;
}
.vgb-sso-callback__error {
  color: #b00020;
  text-align: center;
}
</style>
