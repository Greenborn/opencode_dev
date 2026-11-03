import { ref as D, onMounted as Ae, onBeforeUnmount as ee, openBlock as h, createBlock as Q, Teleport as Be, createElementBlock as y, withModifiers as F, normalizeStyle as le, Fragment as T, renderList as H, createElementVNode as b, normalizeClass as X, toDisplayString as R, createCommentVNode as L, nextTick as ba, inject as W, computed as O, watchEffect as Me, createTextVNode as Ve, reactive as Z, provide as J, withDirectives as oe, createVNode as ue, renderSlot as ha, vShow as qe, watch as $e, withKeys as ye, unref as P, vModelText as _a, vModelRadio as ya, vModelCheckbox as Ca, resolveDynamicComponent as Fe, withCtx as $a, mergeProps as xa, markRaw as Oe, defineAsyncComponent as ka } from "vue";
const wa = {
  key: 0,
  class: "gdc-menu__sep",
  role: "separator"
}, Aa = {
  key: 1,
  class: "gdc-menu__item-wrap"
}, Ma = ["disabled", "onClick", "onMouseenter"], Ea = {
  key: 1,
  class: "gdc-menu__icon",
  "aria-hidden": "true"
}, Sa = { class: "gdc-menu__label" }, Ia = {
  key: 2,
  class: "gdc-menu__arrow",
  "aria-hidden": "true"
}, Na = ["onMouseenter"], za = {
  key: 0,
  class: "gdc-menu__sep",
  role: "separator"
}, Da = ["disabled", "onClick"], Pa = {
  key: 1,
  class: "gdc-menu__icon",
  "aria-hidden": "true"
}, Oa = { class: "gdc-menu__label" }, Ge = {
  __name: "ContextMenu",
  props: {
    items: { type: Array, default: () => [] }
  },
  emits: ["select"],
  setup(e, { expose: t, emit: a }) {
    const n = a, r = D(!1), o = D(null), u = D({ left: 0, top: 0 }), c = D(null);
    function v(i) {
      var w;
      const p = (i == null ? void 0 : i.currentTarget) ?? (i == null ? void 0 : i.target) ?? i, k = ((w = p == null ? void 0 : p.getBoundingClientRect) == null ? void 0 : w.call(p)) ?? { left: 0, bottom: 0 };
      u.value = { left: k.left, top: k.bottom + 4 }, c.value = null, r.value = !0, ba(() => m());
    }
    function m() {
      const i = o.value;
      if (!i) return;
      const p = i.getBoundingClientRect(), k = 8;
      let { left: w, top: M } = u.value;
      p.right > window.innerWidth - k && (w = Math.max(k, window.innerWidth - p.width - k)), p.bottom > window.innerHeight - k && (M = Math.max(k, u.value.top - p.height - 8)), u.value = { left: w, top: M };
    }
    function f() {
      r.value = !1, c.value = null;
    }
    function C(i) {
      r.value ? f() : v(i);
    }
    function A(i) {
      c.value = i;
    }
    function g(i, p) {
      if (!(!i || i.disabled)) {
        if (i.items) {
          c.value = c.value === p ? null : p;
          return;
        }
        i.command && i.command(), n("select", i), f();
      }
    }
    function x(i) {
      r.value && o.value && !o.value.contains(i.target) && f();
    }
    function I(i) {
      i.key === "Escape" && f();
    }
    function _(i) {
      var p;
      r.value && ((p = o.value) != null && p.contains(i == null ? void 0 : i.target) || f());
    }
    return Ae(() => {
      document.addEventListener("pointerdown", x, !0), document.addEventListener("keydown", I), window.addEventListener("resize", _), window.addEventListener("scroll", _, !0);
    }), ee(() => {
      document.removeEventListener("pointerdown", x, !0), document.removeEventListener("keydown", I), window.removeEventListener("resize", _), window.removeEventListener("scroll", _, !0);
    }), t({ open: v, close: f, toggle: C }), (i, p) => (h(), Q(Be, { to: "body" }, [
      r.value ? (h(), y("div", {
        key: 0,
        ref_key: "raiz",
        ref: o,
        class: "gdc-menu",
        style: le({ left: u.value.left + "px", top: u.value.top + "px" }),
        role: "menu",
        onPointerdown: p[0] || (p[0] = F(() => {
        }, ["stop"])),
        onClick: p[1] || (p[1] = F(() => {
        }, ["stop"])),
        onContextmenu: p[2] || (p[2] = F(() => {
        }, ["prevent"]))
      }, [
        (h(!0), y(T, null, H(e.items, (k, w) => (h(), y(T, { key: w }, [
          k != null && k.separator ? (h(), y("div", wa)) : k ? (h(), y("div", Aa, [
            b("button", {
              type: "button",
              role: "menuitem",
              class: X(["gdc-menu__item", { "is-disabled": k.disabled, "is-active": c.value === w }]),
              disabled: k.disabled || !k.command && !k.items,
              onClick: (M) => g(k, w),
              onMouseenter: (M) => k.items && A(w)
            }, [
              k.colorHex || k.colorVar ? (h(), y("span", {
                key: 0,
                class: X(["gdc-menu__swatch", { "is-elegido": k.elegido }]),
                style: le({ background: k.colorHex || `var(${k.colorVar})` }),
                "aria-hidden": "true"
              }, null, 6)) : k.icon ? (h(), y("span", Ea, R(k.icon), 1)) : L("", !0),
              b("span", Sa, R(k.label), 1),
              k.items ? (h(), y("span", Ia, "›")) : L("", !0)
            ], 42, Ma),
            k.items && c.value === w ? (h(), y("div", {
              key: 0,
              class: "gdc-menu gdc-menu--sub",
              role: "menu",
              onMouseenter: (M) => c.value = w
            }, [
              (h(!0), y(T, null, H(k.items, (M, q) => (h(), y(T, { key: q }, [
                M != null && M.separator ? (h(), y("div", za)) : M ? (h(), y("button", {
                  key: 1,
                  type: "button",
                  role: "menuitem",
                  class: X(["gdc-menu__item", { "is-disabled": M.disabled }]),
                  disabled: M.disabled,
                  onClick: (K) => g(M, w)
                }, [
                  M.colorHex || M.colorVar ? (h(), y("span", {
                    key: 0,
                    class: X(["gdc-menu__swatch", { "is-elegido": M.elegido }]),
                    style: le({ background: M.colorHex || `var(${M.colorVar})` }),
                    "aria-hidden": "true"
                  }, null, 6)) : M.icon ? (h(), y("span", Pa, R(M.icon), 1)) : L("", !0),
                  b("span", Oa, R(M.label), 1)
                ], 10, Da)) : L("", !0)
              ], 64))), 128))
            ], 40, Na)) : L("", !0)
          ])) : L("", !0)
        ], 64))), 128))
      ], 36)) : L("", !0)
    ]));
  }
}, Ee = Symbol("gdc_filtro_cards"), Ue = Symbol("gdc_textos_card"), Xe = Symbol("gdc_coincidencias_cards");
function de(e) {
  return Array.from(String(e ?? ""), (t) => {
    const a = t.normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase();
    return a.length === t.length ? a : t.toLowerCase().slice(0, t.length).padEnd(t.length, " ");
  }).join("");
}
function Ra(e, t) {
  const a = de(t).trim();
  return a ? de(e).includes(a) : !0;
}
function La(e, t) {
  const a = String(e ?? ""), n = de(t).trim();
  if (!n) return [{ texto: a, marca: !1 }];
  const r = de(a), o = [];
  let u = 0;
  for (let c = r.indexOf(n); c !== -1; c = r.indexOf(n, c + n.length))
    c > u && o.push({ texto: a.slice(u, c), marca: !1 }), o.push({ texto: a.slice(c, c + n.length), marca: !0 }), u = c + n.length;
  return u < a.length && o.push({ texto: a.slice(u), marca: !1 }), o;
}
const Ta = { class: "gdc-texto-resaltado" }, ja = {
  key: 0,
  class: "gdc-coincidencia"
}, Ba = {
  __name: "TextoResaltado",
  props: { texto: { type: String, default: "" } },
  setup(e) {
    const t = e, a = W(Ee, D("")), n = W(Ue, null), r = Symbol("texto"), o = O(() => La(t.texto, a.value));
    return n && (Me(() => n.set(r, t.texto)), ee(() => n.delete(r))), (u, c) => (h(), y("span", Ta, [
      (h(!0), y(T, null, H(o.value, (v, m) => (h(), y(T, { key: m }, [
        v.marca ? (h(), y("mark", ja, R(v.texto), 1)) : (h(), y(T, { key: 1 }, [
          Ve(R(v.texto), 1)
        ], 64))
      ], 64))), 128))
    ]));
  }
}, ve = [
  { clave: "azul", nombre: "Azul", var: "--gdc-color-azul", hex: "#3b82f6" },
  { clave: "verde", nombre: "Verde", var: "--gdc-color-verde", hex: "#22c55e" },
  { clave: "amarillo", nombre: "Amarillo", var: "--gdc-color-amarillo", hex: "#eab308" },
  { clave: "naranja", nombre: "Naranja", var: "--gdc-color-naranja", hex: "#f97316" },
  { clave: "rojo", nombre: "Rojo", var: "--gdc-color-rojo", hex: "#ef4444" },
  { clave: "violeta", nombre: "Violeta", var: "--gdc-color-violeta", hex: "#8b5cf6" },
  { clave: "rosa", nombre: "Rosa", var: "--gdc-color-rosa", hex: "#ec4899" },
  { clave: "gris", nombre: "Gris", var: "--gdc-color-gris", hex: "#64748b" }
];
function Va(e, t = ve) {
  return (t || ve).find((a) => a.clave === e) ?? null;
}
const He = Symbol("gdc_refresco_card");
function qa(e) {
  const t = W(He, null);
  t && (t(e), ee(() => t(null)));
}
const pn = qa, Ye = Symbol("gdc_elemento_card"), ce = [];
let Ce = !1;
function Fa(e, t) {
  var r, o;
  const a = (r = e.elemento) == null ? void 0 : r.call(e), n = (o = t.elemento) == null ? void 0 : o.call(t);
  return !a || !n || a === n ? 0 : a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}
async function Ga() {
  if (!Ce) {
    for (Ce = !0; ce.length; ) {
      ce.sort(Fa);
      const e = ce.shift();
      if (e.vigente())
        try {
          await e.consulta();
        } catch (t) {
          console.error("[vue-greenborn-dashboard-cards] la consulta falló", t);
        }
      e.listo();
    }
    Ce = !1;
  }
}
function Se(e, { vigente: t = () => !0, elemento: a = null } = {}) {
  return new Promise((n) => {
    ce.push({ consulta: e, vigente: t, elemento: a, listo: n }), Ga();
  });
}
function Ua() {
  const e = W(Ye, null);
  let t = !0;
  return ee(() => {
    t = !1;
  }), (a) => Se(a, { vigente: () => t, elemento: e });
}
const gn = Se, bn = Ua, Xa = ["data-card"], Ha = { class: "gdc-card" }, Ya = ["data-help"], Ka = { class: "gdc-card__titulo" }, Qa = {
  key: 0,
  class: "gdc-card__spinner",
  role: "status",
  "aria-label": "Actualizando"
}, Wa = { class: "gdc-card__body" }, Za = {
  __name: "DashboardCard",
  props: {
    clave: { type: String, required: !0 },
    titulo: { type: String, required: !0 },
    ancho: { type: Number, required: !0 },
    anchoElegido: { type: Boolean, default: !1 },
    primera: { type: Boolean, default: !1 },
    ultima: { type: Boolean, default: !1 },
    color: { type: String, default: null },
    destinos: { type: Array, default: () => [] },
    enOtras: { type: Boolean, default: !1 },
    puedeMover: { type: Boolean, default: !0 },
    actualizando: { type: Boolean, default: !1 },
    colores: { type: Array, default: () => ve },
    menuItems: { type: [Array, Function], default: () => [] }
  },
  emits: ["cambiarAncho", "cambiarColor", "mover", "ocultar", "moverA", "copiarA", "quitar"],
  setup(e, { expose: t, emit: a }) {
    const n = e, r = a, o = W(Ee, D("")), u = Z(/* @__PURE__ */ new Map());
    J(Ue, u);
    const c = O(() => [...u.values()].some((i) => Ra(i, o.value))), v = W(Xe, null);
    v && (Me(() => v.set(n.clave, c.value)), ee(() => v.delete(n.clave)));
    const m = O(() => Va(n.color, n.colores)), f = (i) => n.destinos.length ? n.destinos.map((p) => ({ label: p.nombre, command: () => r(i, p.id) })) : void 0;
    let C = null;
    J(He, (i) => {
      C = i;
    }), t({
      refrescar: () => C ? Promise.resolve(C()) : null
    });
    const A = D(null);
    J(Ye, () => A.value);
    const g = D(), x = O(() => {
      const i = typeof n.menuItems == "function" ? n.menuItems({ clave: n.clave, titulo: n.titulo }) : n.menuItems;
      return Array.isArray(i) ? i.filter(Boolean) : [];
    }), I = O(() => [
      ...x.value.length ? [...x.value, { separator: !0 }] : [],
      {
        label: "Ancho",
        icon: "↔",
        items: [
          ...[1, 2, 3, 4].map((i) => ({
            label: i === 1 ? "1 columna" : `${i} columnas`,
            icon: i === n.ancho ? "✓" : " ",
            command: () => r("cambiarAncho", i)
          })),
          { separator: !0 },
          {
            label: "Restablecer ancho",
            icon: "↺",
            disabled: !n.anchoElegido,
            command: () => r("cambiarAncho", null)
          }
        ]
      },
      {
        label: "Color de resaltado",
        icon: "◐",
        items: [
          ...n.colores.map((i) => {
            var p;
            return {
              label: i.nombre,
              colorVar: i.var,
              colorHex: i.hex,
              elegido: i.clave === ((p = m.value) == null ? void 0 : p.clave),
              command: () => r("cambiarColor", i.clave)
            };
          }),
          { separator: !0 },
          {
            label: "Sin color",
            icon: "×",
            disabled: !m.value,
            command: () => r("cambiarColor", null)
          }
        ]
      },
      { separator: !0 },
      { label: "Mover a la izquierda", icon: "←", disabled: n.primera, command: () => r("mover", -1) },
      { label: "Mover a la derecha", icon: "→", disabled: n.ultima, command: () => r("mover", 1) },
      { separator: !0 },
      ...n.puedeMover ? [{ label: "Mover a pestaña…", icon: "⤴", disabled: !n.destinos.length, items: f("moverA") }] : [],
      { label: "Copiar a pestaña…", icon: "⧉", disabled: !n.destinos.length, items: f("copiarA") },
      ...n.enOtras ? [{ label: "Quitar de esta pestaña", icon: "⊖", command: () => r("quitar") }] : [],
      { separator: !0 },
      { label: "Ocultar card", icon: "◌", command: () => r("ocultar") }
    ]);
    function _(i) {
      g.value.open(i);
    }
    return (i, p) => oe((h(), y("div", {
      ref_key: "raiz",
      ref: A,
      class: X(["gdc-card-celda", [`gdc-card-celda--ancho-${e.ancho}`, { "gdc-card-celda--con-color": m.value, "gdc-card-celda--actualizando": e.actualizando }]]),
      style: le(m.value ? { "--gdc-dash-color": m.value.var ? `var(${m.value.var}, ${m.value.hex})` : m.value.hex } : null),
      "data-card": e.clave
    }, [
      b("div", Ha, [
        b("div", {
          class: "gdc-card__header gdc-card__handle",
          "data-help": e.primera ? "gdc-dashboard-arrastre" : void 0
        }, [
          p[1] || (p[1] = b("span", {
            class: "gdc-card__drag",
            "aria-hidden": "true"
          }, "⠿", -1)),
          b("span", Ka, [
            ue(Ba, { texto: e.titulo }, null, 8, ["texto"])
          ]),
          e.actualizando ? (h(), y("span", Qa, "⟳")) : L("", !0),
          b("button", {
            type: "button",
            class: "gdc-card__gear",
            "aria-label": "Configurar card",
            title: "Configurar",
            onPointerdown: p[0] || (p[0] = F(() => {
            }, ["stop"])),
            onClick: F(_, ["stop"])
          }, "⚙", 32)
        ], 8, Ya),
        b("div", Wa, [
          ha(i.$slots, "default")
        ])
      ]),
      ue(Ge, {
        ref_key: "menu",
        ref: g,
        items: I.value
      }, null, 8, ["items"])
    ], 14, Xa)), [
      [qe, c.value]
    ]);
  }
}, Ja = {
  class: "gdc-card-celda gdc-card-celda--ancho-1 gdc-card-celda--ocultas",
  "data-gdc-card-ocultas": ""
}, et = { class: "gdc-card" }, at = { class: "gdc-card__body gdc-card__body--center" }, tt = { class: "gdc-ocultas__num" }, nt = { class: "gdc-ocultas__texto" }, ot = {
  __name: "CardOcultas",
  props: {
    ocultas: { type: Array, required: !0 }
  },
  emits: ["abrir"],
  setup(e, { emit: t }) {
    const a = t;
    return (n, r) => (h(), y("div", Ja, [
      b("div", et, [
        r[1] || (r[1] = b("div", { class: "gdc-card__header" }, [
          b("span", { class: "gdc-card__titulo" }, "Cards ocultas")
        ], -1)),
        b("div", at, [
          b("b", tt, R(e.ocultas.length), 1),
          b("button", {
            type: "button",
            class: "gdc-btn gdc-btn--info",
            onClick: r[0] || (r[0] = (o) => a("abrir"))
          }, "Mostrar cards"),
          b("small", nt, R(e.ocultas.length === 1 ? "1 card que no se muestra" : `${e.ocultas.length} cards que no se muestran`), 1)
        ])
      ])
    ]));
  }
}, rt = { class: "gdc-tabs-bar" }, st = ["data-tab", "aria-selected", "onClick", "onKeydown"], lt = { class: "gdc-tab__name" }, ct = ["aria-label", "onClick"], it = { class: "gdc-tabs__filter" }, ut = ["value"], dt = 5, vt = {
  __name: "TabsBar",
  props: {
    pestanas: { type: Array, required: !0 },
    activa: { type: String, required: !0 },
    actualizando: { type: Boolean, default: !1 },
    filtro: { type: String, default: "" }
  },
  emits: [
    "update:filtro",
    "actualizar",
    "activar",
    "agregar",
    "renombrar",
    "mover",
    "reordenar",
    "eliminar"
  ],
  setup(e, { expose: t, emit: a }) {
    const n = e, r = a, o = D([]);
    $e(() => n.pestanas, (_) => {
      o.value = [..._];
    }, { immediate: !0 });
    const u = D(), c = D([]);
    function v(_, i, p) {
      const k = p === o.value.length - 1;
      c.value = [
        {
          label: "Actualizar todas las cards",
          icon: "⟳",
          disabled: i.id !== n.activa || n.actualizando,
          command: () => r("actualizar")
        },
        { separator: !0 },
        ...i.general ? [] : [{ label: "Renombrar", icon: "✎", command: () => r("renombrar", i.id) }],
        { label: "Mover a la izquierda", icon: "←", disabled: p === 0, command: () => r("mover", i.id, -1) },
        { label: "Mover a la derecha", icon: "→", disabled: k, command: () => r("mover", i.id, 1) },
        ...i.general ? [] : [
          { separator: !0 },
          { label: "Eliminar pestaña", icon: "🗑", command: () => r("eliminar", i.id) }
        ]
      ], u.value.open(_);
    }
    const m = D(null);
    let f = null, C = null, A = null;
    function g(_) {
      if (_.button > 0 || _.target.closest("button")) return;
      const i = _.target.closest("[data-tab]");
      i && (_.pointerType === "touch" && !_.target.closest(".gdc-tab__handle") || (f = i.dataset.tab, C = { x: _.clientX, y: _.clientY }));
    }
    function x(_) {
      var M, q, K, re;
      if (!f) return;
      if (!m.value) {
        if (Math.hypot(_.clientX - C.x, _.clientY - C.y) < dt) return;
        m.value = f, A = o.value.map((G) => G.id).join("|"), (q = (M = _.currentTarget).setPointerCapture) == null || q.call(M, _.pointerId);
      }
      const i = (re = (K = document.elementFromPoint(_.clientX, _.clientY)) == null ? void 0 : K.closest("[data-tab]")) == null ? void 0 : re.dataset.tab;
      if (!i || i === m.value) return;
      const p = o.value.findIndex((G) => G.id === m.value), k = o.value.findIndex((G) => G.id === i), [w] = o.value.splice(p, 1);
      o.value.splice(k, 0, w);
    }
    function I(_) {
      var p, k;
      if (f = null, !m.value) return;
      m.value = null, (k = (p = _.currentTarget).hasPointerCapture) != null && k.call(p, _.pointerId) && _.currentTarget.releasePointerCapture(_.pointerId);
      const i = o.value.map((w) => w.id);
      i.join("|") !== A && r("reordenar", i);
    }
    return t({ abrirMenu: v }), (_, i) => (h(), y("div", rt, [
      b("div", {
        class: "gdc-tabs-scroll",
        role: "tablist",
        "aria-label": "Pestañas del dashboard",
        onPointerdown: g,
        onPointermove: x,
        onPointerup: I,
        onPointercancel: I
      }, [
        (h(!0), y(T, null, H(o.value, (p, k) => (h(), y("div", {
          key: p.id,
          role: "tab",
          tabindex: "0",
          class: X(["gdc-tab", { "is-activa": p.id === e.activa, "is-arrastrada": p.id === m.value }]),
          "data-tab": p.id,
          "aria-selected": p.id === e.activa,
          onClick: (w) => r("activar", p.id),
          onKeydown: [
            ye(F((w) => r("activar", p.id), ["prevent"]), ["enter"]),
            ye(F((w) => r("activar", p.id), ["prevent"]), ["space"])
          ]
        }, [
          i[5] || (i[5] = b("span", {
            class: "gdc-tab__handle",
            "aria-hidden": "true"
          }, "⠿", -1)),
          b("span", lt, R(p.nombre), 1),
          b("button", {
            type: "button",
            class: "gdc-tab__menu",
            "aria-label": `Opciones de la pestaña ${p.nombre}`,
            title: "Opciones",
            onPointerdown: i[0] || (i[0] = F(() => {
            }, ["stop"])),
            onClick: F((w) => v(w, p, k), ["stop"])
          }, "⋯", 40, ct)
        ], 42, st))), 128))
      ], 32),
      b("button", {
        type: "button",
        class: "gdc-tabs__add",
        "aria-label": "Agregar pestaña",
        title: "Agregar pestaña",
        onClick: i[1] || (i[1] = (p) => r("agregar"))
      }, "+"),
      b("div", it, [
        i[6] || (i[6] = b("span", {
          class: "gdc-tabs__filter-icon",
          "aria-hidden": "true"
        }, "⌕", -1)),
        b("input", {
          value: e.filtro,
          type: "search",
          class: "gdc-tabs__filter-input",
          placeholder: "Filtrar cards",
          "aria-label": "Filtrar cards de todas las pestañas por título y subtítulo",
          onInput: i[2] || (i[2] = (p) => r("update:filtro", p.target.value)),
          onKeydown: i[3] || (i[3] = ye((p) => r("update:filtro", ""), ["esc"]))
        }, null, 40, ut),
        e.filtro ? (h(), y("button", {
          key: 0,
          type: "button",
          class: "gdc-tabs__filter-clear",
          "aria-label": "Limpiar filtro",
          title: "Limpiar filtro",
          onClick: i[4] || (i[4] = (p) => r("update:filtro", ""))
        }, "×")) : L("", !0)
      ]),
      ue(Ge, {
        ref_key: "menu",
        ref: u,
        items: c.value
      }, null, 8, ["items"])
    ]));
  }
}, Ke = 2, z = "general", me = "Todas", Re = 2, fe = 40, Qe = [1, 2, 3, 4];
function We(e) {
  const t = typeof e == "string" ? e : e == null ? void 0 : e.clave;
  if (typeof t != "string" || !t) return null;
  const a = { clave: t };
  return Qe.includes(e == null ? void 0 : e.ancho) && (a.ancho = e.ancho), typeof (e == null ? void 0 : e.color) == "string" && e.color && (a.color = e.color), a;
}
function xe(e = [], t = []) {
  return { id: z, nombre: me, general: !0, cards: e, ocultas: t };
}
function j(e) {
  return String(e ?? "").trim().toLocaleLowerCase("es");
}
function mt(e, t) {
  var a;
  return (a = e.find((n) => n.clave === t)) == null ? void 0 : a.tipo;
}
function ne(e, t) {
  const a = mt(e, t);
  return a == null || a === "NUMERO";
}
function ke(e) {
  const t = [], a = (n) => {
    if (typeof n != "string") return;
    const r = n.trim();
    r && !t.some((o) => j(o) === j(r)) && t.push(r);
  };
  a(e == null ? void 0 : e.pestanaDefault), a(e == null ? void 0 : e.pestanaInicial);
  for (const n of (e == null ? void 0 : e.categorias) ?? []) a(n);
  return t;
}
function ft(e, t = null) {
  var u;
  const a = [], n = [], r = Object.entries(e ?? {}).filter(([, c]) => c && typeof c == "object").map(([c, v]) => ({ clave: c, ...We(v) })), o = new Map((t ?? []).map((c, v) => [c.clave, v]));
  r.sort((c, v) => (o.get(c.clave) ?? Number.MAX_SAFE_INTEGER) - (o.get(v.clave) ?? Number.MAX_SAFE_INTEGER));
  for (const c of r)
    (u = e[c.clave]) != null && u.oculta ? n.push(c) : a.push(c);
  return {
    version: Ke,
    activa: z,
    pestanas: [xe(a, n)]
  };
}
function Le(e, t = null) {
  const a = e && typeof e == "object" ? e : {}, n = Array.isArray(a.pestanas) ? a : ft(a, t), r = /* @__PURE__ */ new Set(), o = [];
  for (const f of n.pestanas) {
    if (!f || typeof f != "object" || typeof f.id != "string" || !f.id || r.has(f.id)) continue;
    const C = f.id === z, A = C ? me : typeof f.nombre == "string" ? f.nombre.trim().slice(0, fe) : "";
    if (!A) continue;
    const g = /* @__PURE__ */ new Set(), x = (i) => (Array.isArray(i) ? i : []).map(We).filter((p) => !p || g.has(p.clave) ? !1 : (g.add(p.clave), !0)), I = x(f.cards), _ = x(f.ocultas);
    r.add(f.id), o.push(C ? xe(I, _) : { id: f.id, nombre: A, cards: I, ocultas: _ });
  }
  const u = /* @__PURE__ */ new Set(), c = o.filter((f) => {
    const C = j(f.nombre);
    return u.has(C) ? !1 : (u.add(C), !0);
  });
  c.some((f) => f.id === z) || c.unshift(xe());
  const v = c.some((f) => f.id === n.activa) ? n.activa : z, m = Je(a);
  return { version: Ke, activa: v, ...m ? { iniciales: m } : {}, pestanas: c };
}
function V(e, t) {
  return e.pestanas.find((a) => a.id === t) ?? null;
}
function ie(e) {
  return V(e, e.activa) ?? V(e, z);
}
function Y(e, t) {
  return e.cards.some((a) => a.clave === t) || e.ocultas.some((a) => a.clave === t);
}
function Ze(e, t) {
  return e.pestanas.filter((a) => Y(a, t));
}
function pt(e, t) {
  return e.pestanas.filter((a) => !Y(a, t)).map((a) => ({ id: a.id, nombre: a.nombre }));
}
function gt(e, t, a) {
  const n = t.filter((u) => ne(a, u.clave)), r = t.filter((u) => !ne(a, u.clave));
  let o = 0;
  return e.cards.forEach((u, c) => {
    ne(a, u.clave) && (o = c + 1);
  }), { ...e, cards: [...n, ...e.cards.slice(0, o), ...r, ...e.cards.slice(o)] };
}
function bt(e, t) {
  const a = "i_" + j(t).normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").replace(/[^a-z0-9]+/g, "_");
  let n = a;
  for (let r = 2; e.pestanas.some((o) => o.id === n); r++) n = `${a}_${r}`;
  return n;
}
function ht(e, t) {
  const a = j(t);
  return e.pestanas.find((n) => j(n.nombre) === a) ?? null;
}
function Je(e) {
  return (e == null ? void 0 : e.iniciales) === !0 ? 1 : Number.isInteger(e == null ? void 0 : e.iniciales) && e.iniciales > 0 ? e.iniciales : 0;
}
function ea(e) {
  return (e ?? []).map((t) => typeof t == "string" ? { clave: t, tipo: "NUMERO" } : t);
}
function _t(e, t) {
  const a = ea(t), n = a.filter((c) => !e.pestanas.some((v) => Y(v, c.clave)));
  if (!n.length) return e;
  const r = /* @__PURE__ */ new Map(), o = (c, v) => r.set(c, [...r.get(c) ?? [], { clave: v }]);
  for (const c of n) {
    o(z, c.clave);
    for (const v of ke(c)) {
      const m = ht(e, v);
      m && m.id !== z && o(m.id, c.clave);
    }
  }
  let u = e;
  for (const [c, v] of r) u = B(u, c, (m) => gt(m, v, a));
  return u;
}
function yt(e, t) {
  const a = Je(e);
  if (a >= Re) return e;
  const n = ea(t), r = (m) => [...m.filter((f) => ne(n, f.clave)), ...m.filter((f) => !ne(n, f.clave))], o = (m, f) => {
    for (const C of [V(m, z), ...m.pestanas]) {
      if (C.cards.some((A) => A.clave === f)) return { e: C.cards.find((A) => A.clave === f), oculta: !1 };
      if (C.ocultas.some((A) => A.clave === f)) return { e: C.ocultas.find((A) => A.clave === f), oculta: !0 };
    }
    return { e: null, oculta: !1 };
  };
  let u = { ...e, iniciales: Re };
  if (a < 1) {
    const m = [];
    for (const f of n)
      for (const C of ke(f))
        m.some((A) => j(A) === j(C)) || m.push(C);
    for (const f of m) {
      if (we(u, f)) continue;
      const C = [], A = [];
      for (const g of n.filter((x) => ke(x).some((I) => j(I) === j(f)))) {
        const { e: x, oculta: I } = o(u, g.clave);
        (I ? A : C).push(ge(x, g.clave));
      }
      !C.length && !A.length || (u = { ...u, pestanas: [...u.pestanas, { id: bt(u, f), nombre: f, cards: r(C), ocultas: A }] });
    }
  }
  const c = V(u, z), v = n.filter((m) => !Y(c, m.clave)).map((m) => ge(o(u, m.clave).e, m.clave));
  return B(u, z, (m) => ({ ...m, cards: r([...m.cards, ...v]) }));
}
function we(e, t, a = null) {
  const n = String(t ?? "").trim();
  return n ? n.length > fe ? `El nombre no puede pasar de ${fe} caracteres.` : j(n) === j(me) ? `"${me}" es el nombre de la pestaña fija.` : e.pestanas.some((r) => r.id !== a && j(r.nombre) === j(n)) ? "Ya hay una pestaña con ese nombre." : null : "El nombre es obligatorio.";
}
function B(e, t, a) {
  return { ...e, pestanas: e.pestanas.map((n) => n.id === t ? a(n) : n) };
}
function aa(e, t) {
  const a = { ...e };
  return delete a[t], a;
}
function pe(e, t) {
  return e.cards.find((a) => a.clave === t) ?? e.ocultas.find((a) => a.clave === t) ?? null;
}
function Ie(e, t) {
  return { ...e, cards: e.cards.filter((a) => a.clave !== t), ocultas: e.ocultas.filter((a) => a.clave !== t) };
}
function ge(e, t) {
  return e ? { ...e } : { clave: t };
}
function Ct(e, t = Math.random) {
  let a;
  do
    a = "p" + Math.floor(t() * 36 ** 6).toString(36).padStart(6, "0");
  while (e.pestanas.some((n) => n.id === a));
  return a;
}
function $t(e, t) {
  return V(e, t) ? { ...e, activa: t } : e;
}
function Te(e, t, a) {
  return B(e, t, (n) => {
    const r = new Set(a), o = new Map(n.cards.map((v) => [v.clave, v]));
    let u = 0;
    const c = n.cards.map((v) => r.has(v.clave) ? o.get(a[u++]) ?? v : v);
    return { ...n, cards: c };
  });
}
function xt(e, t, a, n) {
  return B(e, t, (r) => ({
    ...r,
    cards: r.cards.map((o) => {
      if (o.clave !== a) return o;
      const u = aa(o, "ancho");
      return Qe.includes(n) ? { ...u, ancho: n } : u;
    })
  }));
}
function kt(e, t, a, n) {
  return B(e, t, (r) => ({
    ...r,
    cards: r.cards.map((o) => {
      if (o.clave !== a) return o;
      const u = aa(o, "color");
      return typeof n == "string" && n ? { ...u, color: n } : u;
    })
  }));
}
function wt(e, t, a) {
  return B(e, t, (n) => {
    const r = n.cards.find((o) => o.clave === a);
    return r ? { ...n, cards: n.cards.filter((o) => o !== r), ocultas: [...n.ocultas, r] } : n;
  });
}
function At(e, t, a) {
  return B(e, t, (n) => {
    const r = a.map((o) => n.ocultas.find((u) => u.clave === o)).filter(Boolean);
    return { ...n, cards: [...n.cards, ...r], ocultas: n.ocultas.filter((o) => !r.includes(o)) };
  });
}
function Mt(e, t, a = [], n = Ct(e)) {
  const r = ie(e), o = [], u = /* @__PURE__ */ new Set();
  for (const { clave: v, accion: m } of a) {
    if (o.some((C) => C.clave === v)) continue;
    const f = pe(r, v);
    if (m === "mover" && f)
      o.push({ ...f }), u.add(v);
    else if (m === "mover" || m === "copiar") {
      const C = f ?? e.pestanas.map((A) => pe(A, v)).find(Boolean);
      o.push(ge(C, v));
    }
  }
  let c = r.id === z ? e : B(e, r.id, (v) => [...u].reduce(Ie, v));
  return c = { ...c, pestanas: [...c.pestanas, { id: n, nombre: String(t).trim(), cards: o, ocultas: [] }] }, $t(c, n);
}
function Et(e, t, a) {
  return t === z ? e : B(e, t, (n) => ({ ...n, nombre: String(a).trim() }));
}
function ta(e, t) {
  const a = new Map(e.pestanas.map((o) => [o.id, o])), n = t.map((o) => a.get(o)).filter(Boolean), r = e.pestanas.filter((o) => !n.includes(o));
  return { ...e, pestanas: [...n, ...r] };
}
function St(e, t, a) {
  const n = e.pestanas.map((u) => u.id), r = n.indexOf(t), o = r + a;
  return r === -1 || o < 0 || o >= n.length ? e : (n.splice(r, 1), n.splice(o, 0, t), ta(e, n));
}
function It(e, t) {
  const a = V(e, t);
  if (!a || t === z) return e;
  const n = V(e, z), r = a.cards.filter((c) => !Y(n, c.clave)), o = a.ocultas.filter((c) => !Y(n, c.clave)), u = B(e, z, (c) => ({
    ...c,
    cards: [...c.cards, ...r],
    ocultas: [...c.ocultas, ...o]
  }));
  return {
    ...u,
    activa: u.activa === t ? z : u.activa,
    pestanas: u.pestanas.filter((c) => c.id !== t)
  };
}
function Nt(e, t, a, n) {
  if (t === z) return e;
  const r = V(e, t), o = V(e, a), u = r && pe(r, n);
  if (!u || !o || Y(o, n)) return e;
  const c = B(e, t, (v) => Ie(v, n));
  return B(c, a, (v) => ({ ...v, cards: [...v.cards, { ...u }] }));
}
function zt(e, t, a, n) {
  const r = V(e, t), o = V(e, a);
  if (!r || !o || Y(o, n)) return e;
  const u = pe(r, n);
  return u ? B(e, a, (c) => ({ ...c, cards: [...c.cards, ge(u, n)] })) : e;
}
function Dt(e, t, a) {
  return t === z || Ze(e, a).filter((n) => n.id !== t).length === 0 ? e : B(e, t, (n) => Ie(n, a));
}
const Pt = {
  class: "gdc-form__label",
  for: "gdc-tab-nombre"
}, Ot = ["maxlength"], Rt = {
  key: 0,
  class: "gdc-form__error"
}, Lt = { class: "gdc-form__row-label" }, Tt = { class: "gdc-form__choices" }, jt = ["onUpdate:modelValue", "name", "value"], Bt = { class: "gdc-form__footer" }, Vt = ["disabled"], je = {
  __name: "TabFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, a = t.parametros.modelo, n = t.parametros.cards ?? [], r = t.parametros.modo ?? "alta", o = D(!1), u = O(() => t.parametros.validar(a.nombre)), c = { label: "No incluir", value: "no" }, v = { label: "Mover", value: "mover" }, m = { label: "Copiar", value: "copiar" };
    function f(g) {
      return g.enActiva ? [c, v, m] : [c, m];
    }
    function C() {
      var g, x;
      (x = (g = t.parametros).cerrar) == null || x.call(g);
    }
    function A() {
      var x, I;
      if (o.value = !0, u.value) return;
      const g = n.map((_) => ({ clave: _.clave, accion: a.elecciones[_.clave] })).filter((_) => _.accion === "mover" || _.accion === "copiar");
      (I = (x = t.parametros).onGuardar) == null || I.call(x, { nombre: a.nombre, elecciones: g }), C();
    }
    return Me(() => {
      a.nombre && (o.value = !0);
    }), (g, x) => (h(), y("form", {
      class: "gdc-form",
      onSubmit: F(A, ["prevent"])
    }, [
      b("label", Pt, [
        x[2] || (x[2] = b("b", null, "Nombre", -1)),
        oe(b("input", {
          id: "gdc-tab-nombre",
          "onUpdate:modelValue": x[0] || (x[0] = (I) => P(a).nombre = I),
          class: X(["gdc-form__input", { "is-invalid": o.value && !!u.value }]),
          maxlength: P(fe),
          autocomplete: "off",
          autofocus: "",
          onBlur: x[1] || (x[1] = (I) => o.value = !0)
        }, null, 42, Ot), [
          [_a, P(a).nombre]
        ]),
        o.value && u.value ? (h(), y("small", Rt, R(u.value), 1)) : L("", !0)
      ]),
      P(n).length ? (h(), y(T, { key: 0 }, [
        x[3] || (x[3] = b("div", { class: "gdc-form__hint" }, [
          b("b", null, "Cards"),
          b("small", null, ' "Mover" la saca de la pestaña en la que estás; "Copiar" la deja donde está. Las cards que no están en esta pestaña sólo se pueden copiar, y desde "Todas" también: esa pestaña tiene todas. ')
        ], -1)),
        (h(!0), y(T, null, H(P(n), (I) => (h(), y("div", {
          key: I.clave,
          class: "gdc-form__row"
        }, [
          b("span", Lt, R(I.titulo), 1),
          b("span", Tt, [
            (h(!0), y(T, null, H(f(I), (_) => (h(), y("label", {
              key: _.value,
              class: "gdc-form__choice"
            }, [
              oe(b("input", {
                "onUpdate:modelValue": (i) => P(a).elecciones[I.clave] = i,
                type: "radio",
                name: `gdc-eleccion-${I.clave}`,
                value: _.value
              }, null, 8, jt), [
                [ya, P(a).elecciones[I.clave]]
              ]),
              Ve(" " + R(_.label), 1)
            ]))), 128))
          ])
        ]))), 128))
      ], 64)) : L("", !0),
      b("div", Bt, [
        b("button", {
          type: "button",
          class: "gdc-btn gdc-btn--secondary",
          onClick: C
        }, "Cancelar"),
        b("button", {
          type: "submit",
          class: "gdc-btn gdc-btn--success",
          disabled: !!u.value
        }, R(P(r) === "renombrar" ? "Guardar" : "Crear"), 9, Vt)
      ])
    ], 32));
  }
}, qt = { class: "gdc-form" }, Ft = { class: "gdc-form__check gdc-form__check--all" }, Gt = ["checked"], Ut = ["value"], Xt = { class: "gdc-form__footer" }, Ht = ["disabled"], Yt = {
  __name: "SelectorCardsOcultas",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, a = t.parametros.ocultas ?? [], n = D([]), r = O(() => a.length > 0 && n.value.length === a.length);
    function o(v) {
      n.value = v ? a.map((m) => m.clave) : [];
    }
    function u() {
      var v, m;
      (m = (v = t.parametros).cerrar) == null || m.call(v);
    }
    function c() {
      var v, m;
      (m = (v = t.parametros).onMostrar) == null || m.call(v, [...n.value]), u();
    }
    return (v, m) => (h(), y("div", qt, [
      b("label", Ft, [
        b("input", {
          type: "checkbox",
          checked: r.value,
          onChange: m[0] || (m[0] = (f) => o(f.target.checked))
        }, null, 40, Gt),
        m[2] || (m[2] = b("b", null, "Seleccionar todas", -1))
      ]),
      (h(!0), y(T, null, H(P(a), (f) => (h(), y("div", {
        key: f.clave,
        class: "gdc-form__check"
      }, [
        oe(b("input", {
          "onUpdate:modelValue": m[1] || (m[1] = (C) => n.value = C),
          type: "checkbox",
          value: f.clave
        }, null, 8, Ut), [
          [Ca, n.value]
        ]),
        b("span", null, R(f.titulo), 1)
      ]))), 128)),
      b("div", Xt, [
        b("button", {
          type: "button",
          class: "gdc-btn gdc-btn--secondary",
          onClick: u
        }, "Cancelar"),
        b("button", {
          type: "button",
          class: "gdc-btn gdc-btn--info",
          disabled: !n.value.length,
          onClick: c
        }, " Mostrar ", 8, Ht)
      ])
    ]));
  }
}, Kt = ["aria-label"], Qt = { class: "gdc-dialog__header" }, Wt = { class: "gdc-dialog__title" }, Zt = { class: "gdc-dialog__body" }, Jt = {
  __name: "InternalDialog",
  props: {
    dialogo: { type: Object, required: !0 }
  },
  emits: ["cerrar"],
  setup(e, { emit: t }) {
    const a = t;
    function n(r) {
      r.key === "Escape" && a("cerrar");
    }
    return Ae(() => document.addEventListener("keydown", n)), ee(() => document.removeEventListener("keydown", n)), (r, o) => (h(), Q(Be, { to: "body" }, [
      b("div", {
        class: "gdc-dialog-overlay",
        role: "presentation",
        onPointerdown: o[1] || (o[1] = F((u) => a("cerrar"), ["self"]))
      }, [
        b("div", {
          class: "gdc-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": e.dialogo.titulo
        }, [
          b("div", Qt, [
            b("h3", Wt, R(e.dialogo.titulo), 1),
            b("button", {
              type: "button",
              class: "gdc-dialog__close",
              "aria-label": "Cerrar",
              onClick: o[0] || (o[0] = (u) => a("cerrar"))
            }, "×")
          ]),
          b("div", Zt, [
            (h(), Q(Fe(e.dialogo.componente), {
              parametros: e.dialogo.props
            }, null, 8, ["parametros"]))
          ])
        ], 8, Kt)
      ], 32)
    ]));
  }
}, na = Symbol("dashboard-cards-context");
function en(e) {
  J(na, e || {});
}
function hn() {
  const e = W(na, null);
  return e || console.warn(
    '[vue-greenborn-dashboard-cards] No se encontró contexto. Usar provideDashboardCardsContext() o la prop "contexto" de DashboardCardsGrid.'
  ), e || {};
}
const an = {
  key: 0,
  class: "gdc-grid-wrapper"
}, tn = ["data-grupo"], nn = { class: "gdc-grupo__nombre" }, on = ["onClick"], rn = {
  key: 1,
  class: "gdc-pestana-vacia"
}, sn = {
  key: 2,
  class: "gdc-pestana-vacia"
}, _n = {
  __name: "DashboardCardsGrid",
  props: {
    cards: { type: Array, default: () => [] },
    contexto: { type: Object, default: () => ({}) },
    preferenciasClave: { type: String, default: "dashboard_cards" },
    colores: { type: Array, default: null }
  },
  emits: ["preferencia-cambiada"],
  setup(e, { expose: t, emit: a }) {
    const n = e, r = a;
    en(n.contexto);
    const o = O(() => n.contexto || {}), u = O(() => n.colores || o.value.colores || ve), c = /* @__PURE__ */ new Map();
    function v(s) {
      const d = s.componente;
      return d == null ? null : typeof d == "function" ? (c.has(s.clave) || c.set(s.clave, Oe(ka(d))), c.get(s.clave)) : (c.has(s.clave) || c.set(s.clave, Oe(d)), c.get(s.clave));
    }
    function m(s) {
      return s.permiso ? typeof o.value.tienePermiso != "function" || o.value.tienePermiso(s.permiso) : !0;
    }
    const f = O(() => {
      const s = [];
      for (const d of n.cards) {
        if (!(d != null && d.clave) || !m(d)) continue;
        const l = v(d);
        if (!l) {
          console.warn("[vue-greenborn-dashboard-cards] card sin componente", d.clave);
          continue;
        }
        s.push({ ...d, componenteVue: l });
      }
      return s;
    });
    let C, A = !1;
    const g = D(Le(null)), x = D([]);
    function I() {
      const s = f.value;
      g.value = yt(_t(Le(C, s), s), s);
    }
    function _(s, d) {
      return {
        clave: s.clave,
        titulo: s.titulo,
        componenteVue: s.componenteVue,
        props: s.props,
        menuItems: s.menuItems,
        ancho: d.ancho ?? s.anchoDefault ?? 1,
        anchoElegido: d.ancho != null,
        color: d.color ?? null
      };
    }
    function i() {
      const s = new Map(f.value.map((l) => [l.clave, l])), d = ie(g.value);
      x.value = d.cards.filter((l) => s.has(l.clave)).map((l) => ({ ..._(s.get(l.clave), l), pestana: d.id }));
    }
    $e(f, I, { immediate: !0 }), $e(g, i, { immediate: !0 });
    const p = O(() => g.value.pestanas.map((s) => ({ id: s.id, nombre: s.nombre, general: !!s.general })));
    Ae(async () => {
      const s = o.value.preferencias;
      try {
        C = typeof (s == null ? void 0 : s.cargar) == "function" ? await s.cargar(n.preferenciasClave) : null;
      } catch (d) {
        console.warn("[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:", d), C = null;
      } finally {
        A = !0, I();
      }
    });
    function k() {
      if (!A) return;
      const s = g.value;
      r("preferencia-cambiada", s);
      const d = o.value.preferencias;
      typeof (d == null ? void 0 : d.guardar) == "function" && Promise.resolve(d.guardar(n.preferenciasClave, s)).catch((l) => {
        console.warn("[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:", l);
      });
    }
    function w(s) {
      !s || s === g.value || (g.value = s, k());
    }
    const M = D("");
    J(Ee, M);
    const q = O(() => M.value.trim() !== ""), K = Z(/* @__PURE__ */ new Map());
    J(Xe, K);
    const re = O(() => ![...K.values()].some(Boolean)), G = O(() => {
      if (!q.value) return x.value;
      const s = new Map(f.value.map(($) => [$.clave, $])), d = /* @__PURE__ */ new Set(), l = [], E = [...g.value.pestanas.filter(($) => !$.general), ...g.value.pestanas.filter(($) => $.general)];
      for (const $ of E) {
        const N = $.cards.filter((S) => s.has(S.clave) && !d.has(S.clave));
        if (N.length) {
          l.push({ grupo: $.id, nombre: $.nombre, claves: N.map((S) => S.clave) });
          for (const S of N)
            d.add(S.clave), l.push({ ..._(s.get(S.clave), S), pestana: $.id });
        }
      }
      return l;
    }), Ne = O(() => {
      const s = /* @__PURE__ */ new Map(), d = G.value.filter((l) => !l.grupo);
      return d.forEach((l, E) => s.set(l.clave, { primera: E === 0, ultima: E === d.length - 1 })), s;
    });
    function oa(s) {
      const d = G.value.find((l) => l.grupo === s);
      return !!(d != null && d.claves.some((l) => K.get(l)));
    }
    function ra(s) {
      M.value = "", be(s);
    }
    function be(s) {
      M.value = "", s !== g.value.activa && w({ ...g.value, activa: s });
    }
    function sa(s, d) {
      w(St(g.value, s, d));
    }
    function la(s) {
      w(ta(g.value, s));
    }
    const ae = D(null);
    function he(s, d, l, E) {
      let $ = () => {
      };
      const N = { ...l, cerrar: () => $() };
      if (typeof o.value.abrirModal == "function") {
        const S = o.value.abrirModal(s, d, N, E);
        $ = () => {
          typeof (S == null ? void 0 : S.cerrar) == "function" ? S.cerrar() : typeof o.value.cerrarModal == "function" && (S == null ? void 0 : S.code) != null && o.value.cerrarModal(S.code);
        };
      } else
        ae.value = { componente: s, titulo: d, props: N, opciones: E }, $ = () => {
          ae.value = null;
        };
    }
    function ca() {
      const s = ie(g.value), d = ($) => !s.general && (s.cards.some((N) => N.clave === $) || s.ocultas.some((N) => N.clave === $)), l = f.value.map(($) => ({ clave: $.clave, titulo: $.titulo, enActiva: d($.clave) })), E = Z({ nombre: "", elecciones: Object.fromEntries(l.map(($) => [$.clave, "no"])) });
      he(je, "Nueva pestaña", {
        modelo: E,
        cards: l,
        modo: "alta",
        validar: ($) => we(g.value, $),
        onGuardar: ({ nombre: $, elecciones: N }) => w(Mt(g.value, $, N))
      }, { size: "md" });
    }
    function ia(s) {
      const d = V(g.value, s);
      if (!d || d.general) return;
      const l = Z({ nombre: d.nombre });
      he(je, "Renombrar pestaña", {
        modelo: l,
        modo: "renombrar",
        validar: (E) => we(g.value, E, s),
        onGuardar: ({ nombre: E }) => w(Et(g.value, s, E))
      }, { size: "sm" });
    }
    function ua(s) {
      const d = V(g.value, s);
      if (!d || d.general) return;
      const l = () => w(It(g.value, s)), E = `Se eliminará la pestaña "${d.nombre}". Sus cards siguen en "Todas". ¿Desea continuar?`;
      typeof o.value.confirmar == "function" ? o.value.confirmar({
        title: "Eliminar pestaña",
        text: E,
        confirmLabel: "Eliminar",
        onConfirm: l
      }) : typeof window < "u" && window.confirm(E) && l();
    }
    const se = O(() => {
      const s = new Set(ie(g.value).ocultas.map((d) => d.clave));
      return f.value.filter((d) => s.has(d.clave)).map((d) => ({ clave: d.clave, titulo: d.titulo }));
    });
    function da() {
      const s = se.value;
      he(Yt, "Cards ocultas", {
        ocultas: s,
        onMostrar: (d) => w(At(g.value, g.value.activa, d))
      }, { size: "sm" });
    }
    const _e = /* @__PURE__ */ new Map();
    function va(s, d) {
      d ? _e.set(s, d) : _e.delete(s);
    }
    const te = D(null);
    async function ze() {
      if (te.value !== null) return;
      const s = g.value.activa;
      try {
        for (const d of x.value.map((l) => l.clave)) {
          if (g.value.activa !== s) break;
          await Se(async () => {
            const l = _e.get(d);
            l && (te.value = d, await l.refrescar());
          }, { vigente: () => g.value.activa === s });
        }
      } finally {
        te.value = null;
      }
    }
    const U = D(null);
    let De = null;
    function ma(s, d) {
      var l, E;
      return ((E = (l = document.elementFromPoint(s, d)) == null ? void 0 : l.closest("[data-card]")) == null ? void 0 : E.dataset.card) ?? null;
    }
    function fa(s) {
      var l, E, $;
      const d = s.target.closest(".gdc-card__handle");
      q.value || !d || s.target.closest("button") || s.button > 0 || (U.value = ((l = d.closest("[data-card]")) == null ? void 0 : l.dataset.card) ?? null, U.value && (De = x.value.map((N) => N.clave).join("|"), ($ = (E = s.currentTarget).setPointerCapture) == null || $.call(E, s.pointerId), s.preventDefault()));
    }
    function pa(s) {
      if (!U.value) return;
      const d = ma(s.clientX, s.clientY);
      if (!d || d === U.value) return;
      const l = x.value.findIndex((N) => N.clave === U.value), E = x.value.findIndex((N) => N.clave === d);
      if (l === -1 || E === -1) return;
      const [$] = x.value.splice(l, 1);
      x.value.splice(E, 0, $);
    }
    function Pe(s) {
      var l, E;
      if (!U.value) return;
      U.value = null, (E = (l = s.currentTarget).hasPointerCapture) != null && E.call(l, s.pointerId) && s.currentTarget.releasePointerCapture(s.pointerId);
      const d = x.value.map(($) => $.clave);
      d.join("|") !== De && w(Te(g.value, g.value.activa, d));
    }
    function ga(s, d) {
      const l = x.value.map((N) => N.clave), E = l.indexOf(s.clave), $ = E + d;
      $ < 0 || $ >= l.length || (l.splice(E, 1), l.splice($, 0, s.clave), w(Te(g.value, g.value.activa, l)));
    }
    return t({ actualizarTodas: ze, activar: be }), (s, d) => f.value.length ? (h(), y("div", an, [
      ue(vt, {
        filtro: M.value,
        "onUpdate:filtro": d[0] || (d[0] = (l) => M.value = l),
        pestanas: p.value,
        activa: g.value.activa,
        actualizando: te.value !== null,
        onActualizar: ze,
        onActivar: be,
        onAgregar: ca,
        onRenombrar: ia,
        onMover: sa,
        onReordenar: la,
        onEliminar: ua
      }, null, 8, ["filtro", "pestanas", "activa", "actualizando"]),
      b("div", {
        class: "gdc-grid",
        onPointerdown: fa,
        onPointermove: pa,
        onPointerup: Pe,
        onPointercancel: Pe
      }, [
        (h(!0), y(T, null, H(G.value, (l, E) => {
          var $, N;
          return h(), y(T, {
            key: l.clave ?? "grupo_" + l.grupo
          }, [
            l.grupo ? oe((h(), y("div", {
              key: 0,
              class: "gdc-grupo",
              "data-grupo": l.grupo
            }, [
              d[2] || (d[2] = b("span", {
                class: "gdc-grupo__icono",
                "aria-hidden": "true"
              }, "▸", -1)),
              b("span", nn, R(l.nombre), 1),
              b("button", {
                type: "button",
                class: "gdc-btn gdc-btn--secondary gdc-btn--sm",
                onClick: (S) => ra(l.grupo)
              }, " Ir a la pestaña ", 8, on)
            ], 8, tn)), [
              [qe, oa(l.grupo)]
            ]) : (h(), Q(Za, {
              key: 1,
              ref_for: !0,
              ref: (S) => va(l.clave, S),
              clave: l.clave,
              titulo: l.titulo,
              ancho: l.ancho,
              "ancho-elegido": l.anchoElegido,
              color: l.color,
              primera: q.value || (($ = Ne.value.get(l.clave)) == null ? void 0 : $.primera),
              ultima: q.value || ((N = Ne.value.get(l.clave)) == null ? void 0 : N.ultima),
              destinos: P(pt)(g.value, l.clave),
              "en-otras": l.pestana !== P(z) && P(Ze)(g.value, l.clave).length > 1,
              "puede-mover": l.pestana !== P(z),
              actualizando: l.clave === te.value,
              colores: u.value,
              "menu-items": l.menuItems,
              class: X({ "gdc-card-celda--arrastrada": l.clave === U.value }),
              onCambiarAncho: (S) => w(P(xt)(g.value, l.pestana, l.clave, S)),
              onCambiarColor: (S) => w(P(kt)(g.value, l.pestana, l.clave, S)),
              onMover: (S) => ga(l, S),
              onMoverA: (S) => w(P(Nt)(g.value, l.pestana, S, l.clave)),
              onCopiarA: (S) => w(P(zt)(g.value, l.pestana, S, l.clave)),
              onQuitar: (S) => w(P(Dt)(g.value, l.pestana, l.clave)),
              onOcultar: (S) => w(P(wt)(g.value, l.pestana, l.clave))
            }, {
              default: $a(() => [
                (h(), Q(Fe(l.componenteVue), xa({ ref_for: !0 }, l.props || {}), null, 16))
              ]),
              _: 2
            }, 1032, ["clave", "titulo", "ancho", "ancho-elegido", "color", "primera", "ultima", "destinos", "en-otras", "puede-mover", "actualizando", "colores", "menu-items", "class", "onCambiarAncho", "onCambiarColor", "onMover", "onMoverA", "onCopiarA", "onQuitar", "onOcultar"]))
          ], 64);
        }), 128)),
        se.value.length && !q.value ? (h(), Q(ot, {
          key: 0,
          ocultas: se.value,
          onAbrir: da
        }, null, 8, ["ocultas"])) : L("", !0),
        q.value && re.value ? (h(), y("div", rn, " Ninguna card de ninguna pestaña tiene «" + R(M.value.trim()) + "» en el título o el subtítulo. ", 1)) : L("", !0),
        !q.value && !x.value.length && !se.value.length ? (h(), y("div", sn, ' Esta pestaña no tiene cards. Se suman desde el engranaje de una card, con "Copiar a pestaña…" o "Mover a pestaña…". ')) : L("", !0)
      ], 32),
      ae.value ? (h(), Q(Jt, {
        key: 0,
        dialogo: ae.value,
        onCerrar: d[1] || (d[1] = (l) => ae.value = null)
      }, null, 8, ["dialogo"])) : L("", !0)
    ])) : L("", !0);
  }
}, ln = (e, t) => {
  const a = e.__vccOpts || e;
  for (const [n, r] of t)
    a[n] = r;
  return a;
}, cn = ["width", "height", "viewBox", "aria-label"], un = ["d", "fill"], dn = ["d", "stroke"], vn = {
  __name: "Sparkline",
  props: {
    valores: { type: Array, default: () => [] },
    min: { type: Number, default: 0 },
    max: { type: Number, default: null },
    color: { type: String, default: "#0d6efd" },
    alto: { type: Number, default: 40 },
    ancho: { type: Number, default: 120 },
    relleno: { type: Boolean, default: !0 },
    etiqueta: { type: String, default: "Tendencia" }
  },
  setup(e) {
    const t = e, a = O(() => {
      const o = t.valores;
      if (!o.length) return [];
      const u = t.max !== null ? t.max : Math.max(...o, t.min), c = Math.max(u - t.min, 1e-6), v = o.length > 1 ? t.ancho / (o.length - 1) : t.ancho;
      return o.map((m, f) => {
        const C = o.length > 1 ? f * v : 0, A = Math.min(Math.max((m - t.min) / c, 0), 1), g = t.alto - A * t.alto;
        return [C, g];
      });
    }), n = O(() => a.value.length ? a.value.map(([o, u], c) => `${c === 0 ? "M" : "L"}${o.toFixed(2)},${u.toFixed(2)}`).join(" ") : ""), r = O(() => {
      if (!a.value.length) return "";
      const o = a.value[a.value.length - 1], u = a.value[0];
      return `${n.value} L${o[0].toFixed(2)},${t.alto} L${u[0].toFixed(2)},${t.alto} Z`;
    });
    return (o, u) => (h(), y("svg", {
      width: e.ancho,
      height: e.alto,
      viewBox: `0 0 ${e.ancho} ${e.alto}`,
      role: "img",
      "aria-label": e.etiqueta,
      class: "gdc-sparkline"
    }, [
      b("title", null, R(e.etiqueta), 1),
      e.relleno && r.value ? (h(), y("path", {
        key: 0,
        d: r.value,
        class: "gdc-sparkline__area",
        fill: e.color
      }, null, 8, un)) : L("", !0),
      b("path", {
        d: n.value,
        class: "gdc-sparkline__line",
        stroke: e.color,
        fill: "none"
      }, null, 8, dn)
    ], 8, cn));
  }
}, yn = /* @__PURE__ */ ln(vn, [["__scopeId", "data-v-11026cc1"]]);
function Cn(e = []) {
  const t = Z([...e]);
  function a(r) {
    t.push(r);
  }
  function n() {
    return t;
  }
  return { cards: t, registrar: a, listar: n };
}
const mn = "dashboard_cards";
function $n(e, t = mn) {
  const a = Z({});
  let n = !1;
  async function r() {
    if (!e || typeof e.cargar != "function") {
      n = !0;
      return;
    }
    try {
      const v = await e.cargar(t);
      v && typeof v == "object" && Object.assign(a, v);
    } catch (v) {
      console.warn("[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:", v);
    } finally {
      n = !0;
    }
  }
  function o() {
    !e || typeof e.guardar != "function" || e.guardar(t, { ...a }).catch((v) => {
      console.warn("[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:", v);
    });
  }
  function u(v, m) {
    a[v] = { ...a[v] || {}, ...m }, o();
  }
  function c(v) {
    return a[v] || {};
  }
  return { overrides: a, cargar: r, setOverride: u, getOverride: c, estaCargado: () => n };
}
export {
  Xe as CLAVE_COINCIDENCIAS,
  Ye as CLAVE_ELEMENTO_CARD,
  Ee as CLAVE_FILTRO,
  He as CLAVE_REFRESCO,
  Ue as CLAVE_TEXTOS_CARD,
  ve as COLORES_CARDS,
  ot as CardOcultas,
  Ge as ContextMenu,
  na as DASHBOARD_CARDS_CONTEXT_KEY,
  Za as DashboardCard,
  _n as DashboardCardsGrid,
  z as ID_GENERAL,
  Re as INICIALES,
  Jt as InternalDialog,
  fe as MAX_NOMBRE,
  me as NOMBRE_GENERAL,
  Yt as SelectorCardsOcultas,
  yn as Sparkline,
  je as TabFormModal,
  vt as TabsBar,
  Ba as TextoResaltado,
  Ke as VERSION,
  ie as activa,
  $t as activar,
  _t as addNewCards,
  Mt as agregarPestana,
  xt as cambiarAncho,
  kt as cambiarColor,
  Ra as coincide,
  Va as colorDe,
  yt as conIniciales,
  _t as conNuevas,
  zt as copiarCard,
  Cn as createCardRegistry,
  _n as default,
  pt as destinos,
  It as eliminarPestana,
  Se as encolar,
  gn as enqueue,
  yt as ensureInitialTabs,
  we as errorDeNombre,
  Le as leer,
  At as mostrar,
  pt as moveTargets,
  Nt as moverCard,
  St as moverPestana,
  de as normalizar,
  Ct as nuevoId,
  wt as ocultar,
  La as partes,
  V as pestana,
  Ze as pestanasCon,
  ke as pestanasInicialesDe,
  en as provideDashboardCardsContext,
  Dt as quitarCard,
  pn as registerRefresh,
  Et as renombrar,
  Te as reordenarCards,
  ta as reordenarPestanas,
  Ze as tabsWithCard,
  Ua as usarCola,
  qa as usarRefresco,
  $n as useCardPreferences,
  hn as useDashboardCardsContext,
  bn as useQueryQueue
};
//# sourceMappingURL=vue-greenborn-dashboard-cards.js.map
