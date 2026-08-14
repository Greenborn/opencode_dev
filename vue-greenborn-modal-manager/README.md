# vue-greenborn-modal-manager

Gestor de modales genérico y autocontenido para **Vue 3**, extraído y genericizado del `ModalsManager` de la aplicación SGI. Soporta **modales anidados**, **pasaje de parámetros**, **componentes compuestos** (`body`/`header`/`footer`), alertas y confirmaciones. **Sin Pinia** (estado vía composable/singleton de módulo) y **sin dependencias de UI** (CSS propio que reemplaza Bootstrap + PrimeVue).

## Instalación

```bash
npm install vue-greenborn-modal-manager
```

## Uso básico

### 1. Monta el contenedor una sola vez (en la raíz de la app)

```vue
<!-- App.vue -->
<template>
  <Header />
  <RouterView />
  <ModalContainer />
</template>

<script>
import { ModalContainer } from 'vue-greenborn-modal-manager'
import 'vue-greenborn-modal-manager/style.css'

export default { components: { ModalContainer } }
</script>
```

### 2. Abre un modal desde cualquier componente

```js
import { useModal } from 'vue-greenborn-modal-manager'

const { mostrar_modal, ocultar_modal, mostrar_alerta, mostrar_confirm } = useModal()

// Componente simple → se usa como body
mostrar_modal(FormImputar, 'Imputación', { modelo }, { size: 'full' })

// Componente compuesto (body + header + footer opcionales)
mostrar_modal(
  { body: formDatos, header: FormDatosHeader, footer: Botonera },
  'Título',
  { _callback_guardar: async (p) => { /* ... */ } },
  { size: 'md' }
)

// Helpers
mostrar_alerta('Operación exitosa')
mostrar_confirm({
  title: 'Atención',
  text: '¿Eliminar el registro?',
  confirmar_accion: () => borrar(),
  no_confirma_accion: () => {},
  severity_confirmar: 'danger', // 'success' | 'danger' | 'warn' | 'primary' | 'secondary'
})
```

## API

### `useModal()`

Devuelve el estado y funciones compartidos (singleton de módulo). Las funciones:

| Función | Descripción |
|---------|-------------|
| `mostrar_modal(componente, titulo, parametros?, config_modal?)` | Abre un modal y devuelve `{ code }`. `componente` puede ser un SFC simple o `{ body, header?, footer? }`. |
| `ocultar_modal(cod?)` | Cierra el modal con `cod`; si no se pasa, cierra todos. |
| `mostrar_alerta(texto)` | Alerta con botón "Aceptar". `texto` admite HTML. |
| `mostrar_confirm(params)` | Confirmación Sí/No. |
| `modals_` | `Ref` a la pila de modales (leída por `ModalContainer`). |

### `mostrar_modal` — parámetros inyectados

Al cuerpo/header/footer se les pasa `:parametros` con el objeto que definiste **más** dos claves reservadas:

- `parametros._modal_cod` — identificador para `ocultar_modal()`.
- `parametros._config_modal` — la configuración del modal.

Un canal típico para que el body exponga su función de guardar al footer:

```js
// call site
const modalState = reactive({ guardar: null })
mostrar_modal({ body, footer }, 'Título', { _modalState: modalState }, { size: 'md' })

// body: registra su handler
if (props.parametros._modalState) props.parametros._modalState.guardar = guardar

// footer: lo invoca
<button @click="parametros._modalState?.guardar?.()">Guardar</button>
```

### `config_modal`

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `size` | `string` | Escala de ancho: `sm` (480px), `md` (720px), `lg` (1100px), `full`. Default: auto. |
| `styles.width` / `styles.height` | `string` | Escape hatch inline; gana a `size`. |
| `cssClass` | `string` | Clase extra para el diálogo. |
| `dismissableMask` | `boolean` | Si `true`, un clic en el overlay cierra el modal (default `false`). |
| `id` | `number` | Slot explícito a ocupar en la pila (uso interno). |

## Modales anidados

Basta con llamar a `mostrar_modal()` desde el body de otro modal: la pila mantiene hasta `MAX_MODALS_LVLS = 20` slots y cada capa se apila con mayor `z-index`. Cerrar el hijo no afecta al padre.

## Estilos propios

La hoja `style.css` define todo el tema (overlay, panel, header/body/footer, botones y escala de anchos) y replica las severidades de PrimeVue con las clases `gmm-btn-*`:

- `gmm-btn-primary`, `gmm-btn-secondary`, `gmm-btn-success`, `gmm-btn-danger`, `gmm-btn-warn`.

Puedes sobreescribirlas en tu proyecto apuntando a las mismas clases.

## Desarrollo

```bash
npm install
npm run dev      # demo en http://localhost:5175
npm run build    # compila lib (ESM + UMD)
```

## Licencia

MIT