import { ref as P, onMounted as Ae, onBeforeUnmount as ee, openBlock as h, createBlock as Q, Teleport as Be, createElementBlock as y, withModifiers as F, normalizeStyle as le, Fragment as T, renderList as U, createElementVNode as b, normalizeClass as H, toDisplayString as R, createCommentVNode as L, nextTick as ba, inject as W, computed as D, watchEffect as Me, createTextVNode as Ve, reactive as Z, provide as J, withDirectives as oe, createVNode as ue, renderSlot as ha, vShow as qe, watch as $e, withKeys as ye, unref as O, vModelText as _a, vModelRadio as ya, vModelCheckbox as Ca, resolveDynamicComponent as Fe, withCtx as $a, mergeProps as xa, markRaw as Oe, defineAsyncComponent as ka } from "vue";
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
    const n = a, r = P(!1), o = P(null), c = P({ left: 0, top: 0 }), l = P(null);
    function v(u) {
      var w;
      const p = (u == null ? void 0 : u.currentTarget) ?? (u == null ? void 0 : u.target) ?? u, k = ((w = p == null ? void 0 : p.getBoundingClientRect) == null ? void 0 : w.call(p)) ?? { left: 0, bottom: 0 };
      c.value = { left: k.left, top: k.bottom + 4 }, l.value = null, r.value = !0, ba(() => m());
    }
    function m() {
      const u = o.value;
      if (!u) return;
      const p = u.getBoundingClientRect(), k = 8;
      let { left: w, top: M } = c.value;
      p.right > window.innerWidth - k && (w = Math.max(k, window.innerWidth - p.width - k)), p.bottom > window.innerHeight - k && (M = Math.max(k, c.value.top - p.height - 8)), c.value = { left: w, top: M };
    }
    function f() {
      r.value = !1, l.value = null;
    }
    function $(u) {
      r.value ? f() : v(u);
    }
    function A(u) {
      l.value = u;
    }
    function g(u, p) {
      if (!(!u || u.disabled)) {
        if (u.items) {
          l.value = l.value === p ? null : p;
          return;
        }
        u.command && u.command(), n("select", u), f();
      }
    }
    function C(u) {
      r.value && o.value && !o.value.contains(u.target) && f();
    }
    function I(u) {
      u.key === "Escape" && f();
    }
    function _(u) {
      var p;
      r.value && ((p = o.value) != null && p.contains(u == null ? void 0 : u.target) || f());
    }
    return Ae(() => {
      document.addEventListener("pointerdown", C, !0), document.addEventListener("keydown", I), window.addEventListener("resize", _), window.addEventListener("scroll", _, !0);
    }), ee(() => {
      document.removeEventListener("pointerdown", C, !0), document.removeEventListener("keydown", I), window.removeEventListener("resize", _), window.removeEventListener("scroll", _, !0);
    }), t({ open: v, close: f, toggle: $ }), (u, p) => (h(), Q(Be, { to: "body" }, [
      r.value ? (h(), y("div", {
        key: 0,
        ref_key: "raiz",
        ref: o,
        class: "gdc-menu",
        style: le({ left: c.value.left + "px", top: c.value.top + "px" }),
        role: "menu",
        onPointerdown: p[0] || (p[0] = F(() => {
        }, ["stop"])),
        onClick: p[1] || (p[1] = F(() => {
        }, ["stop"])),
        onContextmenu: p[2] || (p[2] = F(() => {
        }, ["prevent"]))
      }, [
        (h(!0), y(T, null, U(e.items, (k, w) => (h(), y(T, { key: w }, [
          k != null && k.separator ? (h(), y("div", wa)) : k ? (h(), y("div", Aa, [
            b("button", {
              type: "button",
              role: "menuitem",
              class: H(["gdc-menu__item", { "is-disabled": k.disabled, "is-active": l.value === w }]),
              disabled: k.disabled || !k.command && !k.items,
              onClick: (M) => g(k, w),
              onMouseenter: (M) => k.items && A(w)
            }, [
              k.colorHex || k.colorVar ? (h(), y("span", {
                key: 0,
                class: H(["gdc-menu__swatch", { "is-elegido": k.elegido }]),
                style: le({ background: k.colorHex || `var(${k.colorVar})` }),
                "aria-hidden": "true"
              }, null, 6)) : k.icon ? (h(), y("span", Ea, R(k.icon), 1)) : L("", !0),
              b("span", Sa, R(k.label), 1),
              k.items ? (h(), y("span", Ia, "›")) : L("", !0)
            ], 42, Ma),
            k.items && l.value === w ? (h(), y("div", {
              key: 0,
              class: "gdc-menu gdc-menu--sub",
              role: "menu",
              onMouseenter: (M) => l.value = w
            }, [
              (h(!0), y(T, null, U(k.items, (M, q) => (h(), y(T, { key: q }, [
                M != null && M.separator ? (h(), y("div", za)) : M ? (h(), y("button", {
                  key: 1,
                  type: "button",
                  role: "menuitem",
                  class: H(["gdc-menu__item", { "is-disabled": M.disabled }]),
                  disabled: M.disabled,
                  onClick: (K) => g(M, w)
                }, [
                  M.colorHex || M.colorVar ? (h(), y("span", {
                    key: 0,
                    class: H(["gdc-menu__swatch", { "is-elegido": M.elegido }]),
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
  let c = 0;
  for (let l = r.indexOf(n); l !== -1; l = r.indexOf(n, l + n.length))
    l > c && o.push({ texto: a.slice(c, l), marca: !1 }), o.push({ texto: a.slice(l, l + n.length), marca: !0 }), c = l + n.length;
  return c < a.length && o.push({ texto: a.slice(c), marca: !1 }), o;
}
const Ta = { class: "gdc-texto-resaltado" }, ja = {
  key: 0,
  class: "gdc-coincidencia"
}, Ba = {
  __name: "TextoResaltado",
  props: { texto: { type: String, default: "" } },
  setup(e) {
    const t = e, a = W(Ee, P("")), n = W(Ue, null), r = Symbol("texto"), o = D(() => La(t.texto, a.value));
    return n && (Me(() => n.set(r, t.texto)), ee(() => n.delete(r))), (c, l) => (h(), y("span", Ta, [
      (h(!0), y(T, null, U(o.value, (v, m) => (h(), y(T, { key: m }, [
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
const gn = qa, Ye = Symbol("gdc_elemento_card"), ce = [];
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
const bn = Se, hn = Ua, Xa = ["data-card"], Ha = { class: "gdc-card" }, Ya = ["data-help"], Ka = { class: "gdc-card__titulo" }, Qa = {
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
    const n = e, r = a, o = W(Ee, P("")), c = Z(/* @__PURE__ */ new Map());
    J(Ue, c);
    const l = D(() => [...c.values()].some((u) => Ra(u, o.value))), v = W(Xe, null);
    v && (Me(() => v.set(n.clave, l.value)), ee(() => v.delete(n.clave)));
    const m = D(() => Va(n.color, n.colores)), f = (u) => n.destinos.length ? n.destinos.map((p) => ({ label: p.nombre, command: () => r(u, p.id) })) : void 0;
    let $ = null;
    J(He, (u) => {
      $ = u;
    }), t({
      refrescar: () => $ ? Promise.resolve($()) : null
    });
    const A = P(null);
    J(Ye, () => A.value);
    const g = P(), C = D(() => {
      const u = typeof n.menuItems == "function" ? n.menuItems({ clave: n.clave, titulo: n.titulo }) : n.menuItems;
      return Array.isArray(u) ? u.filter(Boolean) : [];
    }), I = D(() => [
      ...C.value.length ? [...C.value, { separator: !0 }] : [],
      {
        label: "Ancho",
        icon: "↔",
        items: [
          ...[1, 2, 3, 4].map((u) => ({
            label: u === 1 ? "1 columna" : `${u} columnas`,
            icon: u === n.ancho ? "✓" : " ",
            command: () => r("cambiarAncho", u)
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
          ...n.colores.map((u) => {
            var p;
            return {
              label: u.nombre,
              colorVar: u.var,
              colorHex: u.hex,
              elegido: u.clave === ((p = m.value) == null ? void 0 : p.clave),
              command: () => r("cambiarColor", u.clave)
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
    function _(u) {
      g.value.open(u);
    }
    return (u, p) => oe((h(), y("div", {
      ref_key: "raiz",
      ref: A,
      class: H(["gdc-card-celda", [`gdc-card-celda--ancho-${e.ancho}`, { "gdc-card-celda--con-color": m.value, "gdc-card-celda--actualizando": e.actualizando }]]),
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
          ha(u.$slots, "default")
        ])
      ]),
      ue(Ge, {
        ref_key: "menu",
        ref: g,
        items: I.value
      }, null, 8, ["items"])
    ], 14, Xa)), [
      [qe, l.value]
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
    const n = e, r = a, o = P([]);
    $e(() => n.pestanas, (_) => {
      o.value = [..._];
    }, { immediate: !0 });
    const c = P(), l = P([]);
    function v(_, u, p) {
      const k = p === o.value.length - 1;
      l.value = [
        {
          label: "Actualizar todas las cards",
          icon: "⟳",
          disabled: u.id !== n.activa || n.actualizando,
          command: () => r("actualizar")
        },
        { separator: !0 },
        ...u.general ? [] : [{ label: "Renombrar", icon: "✎", command: () => r("renombrar", u.id) }],
        { label: "Mover a la izquierda", icon: "←", disabled: p === 0, command: () => r("mover", u.id, -1) },
        { label: "Mover a la derecha", icon: "→", disabled: k, command: () => r("mover", u.id, 1) },
        ...u.general ? [] : [
          { separator: !0 },
          { label: "Eliminar pestaña", icon: "🗑", command: () => r("eliminar", u.id) }
        ]
      ], c.value.open(_);
    }
    const m = P(null);
    let f = null, $ = null, A = null;
    function g(_) {
      if (_.button > 0 || _.target.closest("button")) return;
      const u = _.target.closest("[data-tab]");
      u && (_.pointerType === "touch" && !_.target.closest(".gdc-tab__handle") || (f = u.dataset.tab, $ = { x: _.clientX, y: _.clientY }));
    }
    function C(_) {
      var M, q, K, re;
      if (!f) return;
      if (!m.value) {
        if (Math.hypot(_.clientX - $.x, _.clientY - $.y) < dt) return;
        m.value = f, A = o.value.map((G) => G.id).join("|"), (q = (M = _.currentTarget).setPointerCapture) == null || q.call(M, _.pointerId);
      }
      const u = (re = (K = document.elementFromPoint(_.clientX, _.clientY)) == null ? void 0 : K.closest("[data-tab]")) == null ? void 0 : re.dataset.tab;
      if (!u || u === m.value) return;
      const p = o.value.findIndex((G) => G.id === m.value), k = o.value.findIndex((G) => G.id === u), [w] = o.value.splice(p, 1);
      o.value.splice(k, 0, w);
    }
    function I(_) {
      var p, k;
      if (f = null, !m.value) return;
      m.value = null, (k = (p = _.currentTarget).hasPointerCapture) != null && k.call(p, _.pointerId) && _.currentTarget.releasePointerCapture(_.pointerId);
      const u = o.value.map((w) => w.id);
      u.join("|") !== A && r("reordenar", u);
    }
    return t({ abrirMenu: v }), (_, u) => (h(), y("div", rt, [
      b("div", {
        class: "gdc-tabs-scroll",
        role: "tablist",
        "aria-label": "Pestañas del dashboard",
        onPointerdown: g,
        onPointermove: C,
        onPointerup: I,
        onPointercancel: I
      }, [
        (h(!0), y(T, null, U(o.value, (p, k) => (h(), y("div", {
          key: p.id,
          role: "tab",
          tabindex: "0",
          class: H(["gdc-tab", { "is-activa": p.id === e.activa, "is-arrastrada": p.id === m.value }]),
          "data-tab": p.id,
          "aria-selected": p.id === e.activa,
          onClick: (w) => r("activar", p.id),
          onKeydown: [
            ye(F((w) => r("activar", p.id), ["prevent"]), ["enter"]),
            ye(F((w) => r("activar", p.id), ["prevent"]), ["space"])
          ]
        }, [
          u[5] || (u[5] = b("span", {
            class: "gdc-tab__handle",
            "aria-hidden": "true"
          }, "⠿", -1)),
          b("span", lt, R(p.nombre), 1),
          b("button", {
            type: "button",
            class: "gdc-tab__menu",
            "aria-label": `Opciones de la pestaña ${p.nombre}`,
            title: "Opciones",
            onPointerdown: u[0] || (u[0] = F(() => {
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
        onClick: u[1] || (u[1] = (p) => r("agregar"))
      }, "+"),
      b("div", it, [
        u[6] || (u[6] = b("span", {
          class: "gdc-tabs__filter-icon",
          "aria-hidden": "true"
        }, "⌕", -1)),
        b("input", {
          value: e.filtro,
          type: "search",
          class: "gdc-tabs__filter-input",
          placeholder: "Filtrar cards",
          "aria-label": "Filtrar cards de todas las pestañas por título y subtítulo",
          onInput: u[2] || (u[2] = (p) => r("update:filtro", p.target.value)),
          onKeydown: u[3] || (u[3] = ye((p) => r("update:filtro", ""), ["esc"]))
        }, null, 40, ut),
        e.filtro ? (h(), y("button", {
          key: 0,
          type: "button",
          class: "gdc-tabs__filter-clear",
          "aria-label": "Limpiar filtro",
          title: "Limpiar filtro",
          onClick: u[4] || (u[4] = (p) => r("update:filtro", ""))
        }, "×")) : L("", !0)
      ]),
      ue(Ge, {
        ref_key: "menu",
        ref: c,
        items: l.value
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
  var c;
  const a = [], n = [], r = Object.entries(e ?? {}).filter(([, l]) => l && typeof l == "object").map(([l, v]) => ({ clave: l, ...We(v) })), o = new Map((t ?? []).map((l, v) => [l.clave, v]));
  r.sort((l, v) => (o.get(l.clave) ?? Number.MAX_SAFE_INTEGER) - (o.get(v.clave) ?? Number.MAX_SAFE_INTEGER));
  for (const l of r)
    (c = e[l.clave]) != null && c.oculta ? n.push(l) : a.push(l);
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
    const $ = f.id === z, A = $ ? me : typeof f.nombre == "string" ? f.nombre.trim().slice(0, fe) : "";
    if (!A) continue;
    const g = /* @__PURE__ */ new Set(), C = (u) => (Array.isArray(u) ? u : []).map(We).filter((p) => !p || g.has(p.clave) ? !1 : (g.add(p.clave), !0)), I = C(f.cards), _ = C(f.ocultas);
    r.add(f.id), o.push($ ? xe(I, _) : { id: f.id, nombre: A, cards: I, ocultas: _ });
  }
  const c = /* @__PURE__ */ new Set(), l = o.filter((f) => {
    const $ = j(f.nombre);
    return c.has($) ? !1 : (c.add($), !0);
  });
  l.some((f) => f.id === z) || l.unshift(xe());
  const v = l.some((f) => f.id === n.activa) ? n.activa : z, m = Je(a);
  return { version: Ke, activa: v, ...m ? { iniciales: m } : {}, pestanas: l };
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
  const n = t.filter((c) => ne(a, c.clave)), r = t.filter((c) => !ne(a, c.clave));
  let o = 0;
  return e.cards.forEach((c, l) => {
    ne(a, c.clave) && (o = l + 1);
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
  const a = ea(t), n = a.filter((l) => !e.pestanas.some((v) => Y(v, l.clave)));
  if (!n.length) return e;
  const r = /* @__PURE__ */ new Map(), o = (l, v) => r.set(l, [...r.get(l) ?? [], { clave: v }]);
  for (const l of n) {
    o(z, l.clave);
    for (const v of ke(l)) {
      const m = ht(e, v);
      m && m.id !== z && o(m.id, l.clave);
    }
  }
  let c = e;
  for (const [l, v] of r) c = B(c, l, (m) => gt(m, v, a));
  return c;
}
function yt(e, t) {
  const a = Je(e);
  if (a >= Re) return e;
  const n = ea(t), r = (m) => [...m.filter((f) => ne(n, f.clave)), ...m.filter((f) => !ne(n, f.clave))], o = (m, f) => {
    for (const $ of [V(m, z), ...m.pestanas]) {
      if ($.cards.some((A) => A.clave === f)) return { e: $.cards.find((A) => A.clave === f), oculta: !1 };
      if ($.ocultas.some((A) => A.clave === f)) return { e: $.ocultas.find((A) => A.clave === f), oculta: !0 };
    }
    return { e: null, oculta: !1 };
  };
  let c = { ...e, iniciales: Re };
  if (a < 1) {
    const m = [];
    for (const f of n)
      for (const $ of ke(f))
        m.some((A) => j(A) === j($)) || m.push($);
    for (const f of m) {
      if (we(c, f)) continue;
      const $ = [], A = [];
      for (const g of n.filter((C) => ke(C).some((I) => j(I) === j(f)))) {
        const { e: C, oculta: I } = o(c, g.clave);
        (I ? A : $).push(ge(C, g.clave));
      }
      !$.length && !A.length || (c = { ...c, pestanas: [...c.pestanas, { id: bt(c, f), nombre: f, cards: r($), ocultas: A }] });
    }
  }
  const l = V(c, z), v = n.filter((m) => !Y(l, m.clave)).map((m) => ge(o(c, m.clave).e, m.clave));
  return B(c, z, (m) => ({ ...m, cards: r([...m.cards, ...v]) }));
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
    let c = 0;
    const l = n.cards.map((v) => r.has(v.clave) ? o.get(a[c++]) ?? v : v);
    return { ...n, cards: l };
  });
}
function xt(e, t, a, n) {
  return B(e, t, (r) => ({
    ...r,
    cards: r.cards.map((o) => {
      if (o.clave !== a) return o;
      const c = aa(o, "ancho");
      return Qe.includes(n) ? { ...c, ancho: n } : c;
    })
  }));
}
function kt(e, t, a, n) {
  return B(e, t, (r) => ({
    ...r,
    cards: r.cards.map((o) => {
      if (o.clave !== a) return o;
      const c = aa(o, "color");
      return typeof n == "string" && n ? { ...c, color: n } : c;
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
    const r = a.map((o) => n.ocultas.find((c) => c.clave === o)).filter(Boolean);
    return { ...n, cards: [...n.cards, ...r], ocultas: n.ocultas.filter((o) => !r.includes(o)) };
  });
}
function Mt(e, t, a = [], n = Ct(e)) {
  const r = ie(e), o = [], c = /* @__PURE__ */ new Set();
  for (const { clave: v, accion: m } of a) {
    if (o.some(($) => $.clave === v)) continue;
    const f = pe(r, v);
    if (m === "mover" && f)
      o.push({ ...f }), c.add(v);
    else if (m === "mover" || m === "copiar") {
      const $ = f ?? e.pestanas.map((A) => pe(A, v)).find(Boolean);
      o.push(ge($, v));
    }
  }
  let l = r.id === z ? e : B(e, r.id, (v) => [...c].reduce(Ie, v));
  return l = { ...l, pestanas: [...l.pestanas, { id: n, nombre: String(t).trim(), cards: o, ocultas: [] }] }, $t(l, n);
}
function Et(e, t, a) {
  return t === z ? e : B(e, t, (n) => ({ ...n, nombre: String(a).trim() }));
}
function ta(e, t) {
  const a = new Map(e.pestanas.map((o) => [o.id, o])), n = t.map((o) => a.get(o)).filter(Boolean), r = e.pestanas.filter((o) => !n.includes(o));
  return { ...e, pestanas: [...n, ...r] };
}
function St(e, t, a) {
  const n = e.pestanas.map((c) => c.id), r = n.indexOf(t), o = r + a;
  return r === -1 || o < 0 || o >= n.length ? e : (n.splice(r, 1), n.splice(o, 0, t), ta(e, n));
}
function It(e, t) {
  const a = V(e, t);
  if (!a || t === z) return e;
  const n = V(e, z), r = a.cards.filter((l) => !Y(n, l.clave)), o = a.ocultas.filter((l) => !Y(n, l.clave)), c = B(e, z, (l) => ({
    ...l,
    cards: [...l.cards, ...r],
    ocultas: [...l.ocultas, ...o]
  }));
  return {
    ...c,
    activa: c.activa === t ? z : c.activa,
    pestanas: c.pestanas.filter((l) => l.id !== t)
  };
}
function Nt(e, t, a, n) {
  if (t === z) return e;
  const r = V(e, t), o = V(e, a), c = r && pe(r, n);
  if (!c || !o || Y(o, n)) return e;
  const l = B(e, t, (v) => Ie(v, n));
  return B(l, a, (v) => ({ ...v, cards: [...v.cards, { ...c }] }));
}
function zt(e, t, a, n) {
  const r = V(e, t), o = V(e, a);
  if (!r || !o || Y(o, n)) return e;
  const c = pe(r, n);
  return c ? B(e, a, (l) => ({ ...l, cards: [...l.cards, ge(c, n)] })) : e;
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
    const t = e, a = t.parametros.modelo, n = t.parametros.cards ?? [], r = t.parametros.modo ?? "alta", o = P(!1), c = D(() => t.parametros.validar(a.nombre)), l = { label: "No incluir", value: "no" }, v = { label: "Mover", value: "mover" }, m = { label: "Copiar", value: "copiar" };
    function f(g) {
      return g.enActiva ? [l, v, m] : [l, m];
    }
    function $() {
      var g, C;
      (C = (g = t.parametros).cerrar) == null || C.call(g);
    }
    function A() {
      var C, I;
      if (o.value = !0, c.value) return;
      const g = n.map((_) => ({ clave: _.clave, accion: a.elecciones[_.clave] })).filter((_) => _.accion === "mover" || _.accion === "copiar");
      (I = (C = t.parametros).onGuardar) == null || I.call(C, { nombre: a.nombre, elecciones: g }), $();
    }
    return Me(() => {
      a.nombre && (o.value = !0);
    }), (g, C) => (h(), y("form", {
      class: "gdc-form",
      onSubmit: F(A, ["prevent"])
    }, [
      b("label", Pt, [
        C[2] || (C[2] = b("b", null, "Nombre", -1)),
        oe(b("input", {
          id: "gdc-tab-nombre",
          "onUpdate:modelValue": C[0] || (C[0] = (I) => O(a).nombre = I),
          class: H(["gdc-form__input", { "is-invalid": o.value && !!c.value }]),
          maxlength: O(fe),
          autocomplete: "off",
          autofocus: "",
          onBlur: C[1] || (C[1] = (I) => o.value = !0)
        }, null, 42, Ot), [
          [_a, O(a).nombre]
        ]),
        o.value && c.value ? (h(), y("small", Rt, R(c.value), 1)) : L("", !0)
      ]),
      O(n).length ? (h(), y(T, { key: 0 }, [
        C[3] || (C[3] = b("div", { class: "gdc-form__hint" }, [
          b("b", null, "Cards"),
          b("small", null, ' "Mover" la saca de la pestaña en la que estás; "Copiar" la deja donde está. Las cards que no están en esta pestaña sólo se pueden copiar, y desde "Todas" también: esa pestaña tiene todas. ')
        ], -1)),
        (h(!0), y(T, null, U(O(n), (I) => (h(), y("div", {
          key: I.clave,
          class: "gdc-form__row"
        }, [
          b("span", Lt, R(I.titulo), 1),
          b("span", Tt, [
            (h(!0), y(T, null, U(f(I), (_) => (h(), y("label", {
              key: _.value,
              class: "gdc-form__choice"
            }, [
              oe(b("input", {
                "onUpdate:modelValue": (u) => O(a).elecciones[I.clave] = u,
                type: "radio",
                name: `gdc-eleccion-${I.clave}`,
                value: _.value
              }, null, 8, jt), [
                [ya, O(a).elecciones[I.clave]]
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
          onClick: $
        }, "Cancelar"),
        b("button", {
          type: "submit",
          class: "gdc-btn gdc-btn--success",
          disabled: !!c.value
        }, R(O(r) === "renombrar" ? "Guardar" : "Crear"), 9, Vt)
      ])
    ], 32));
  }
}, qt = { class: "gdc-form" }, Ft = { class: "gdc-form__check gdc-form__check--all" }, Gt = ["checked"], Ut = ["value"], Xt = { class: "gdc-form__footer" }, Ht = ["disabled"], Yt = {
  __name: "SelectorCardsOcultas",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, a = t.parametros.ocultas ?? [], n = P([]), r = D(() => a.length > 0 && n.value.length === a.length);
    function o(v) {
      n.value = v ? a.map((m) => m.clave) : [];
    }
    function c() {
      var v, m;
      (m = (v = t.parametros).cerrar) == null || m.call(v);
    }
    function l() {
      var v, m;
      (m = (v = t.parametros).onMostrar) == null || m.call(v, [...n.value]), c();
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
      (h(!0), y(T, null, U(O(a), (f) => (h(), y("div", {
        key: f.clave,
        class: "gdc-form__check"
      }, [
        oe(b("input", {
          "onUpdate:modelValue": m[1] || (m[1] = ($) => n.value = $),
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
          onClick: c
        }, "Cancelar"),
        b("button", {
          type: "button",
          class: "gdc-btn gdc-btn--info",
          disabled: !n.value.length,
          onClick: l
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
        onPointerdown: o[1] || (o[1] = F((c) => a("cerrar"), ["self"]))
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
              onClick: o[0] || (o[0] = (c) => a("cerrar"))
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
function _n() {
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
}, yn = {
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
    const o = D(() => n.contexto || {}), c = D(() => n.colores || o.value.colores || ve), l = /* @__PURE__ */ new Map();
    function v(s) {
      const d = s.componente;
      return d == null ? null : typeof d == "function" ? (l.has(s.clave) || l.set(s.clave, Oe(ka(d))), l.get(s.clave)) : (l.has(s.clave) || l.set(s.clave, Oe(d)), l.get(s.clave));
    }
    function m(s) {
      return s.permiso ? typeof o.value.tienePermiso != "function" || o.value.tienePermiso(s.permiso) : !0;
    }
    const f = D(() => {
      const s = [];
      for (const d of n.cards) {
        if (!(d != null && d.clave) || !m(d)) continue;
        const i = v(d);
        if (!i) {
          console.warn("[vue-greenborn-dashboard-cards] card sin componente", d.clave);
          continue;
        }
        s.push({ ...d, componenteVue: i });
      }
      return s;
    });
    let $, A = !1;
    const g = P(Le(null)), C = P([]);
    function I() {
      const s = f.value;
      g.value = yt(_t(Le($, s), s), s);
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
    function u() {
      const s = new Map(f.value.map((i) => [i.clave, i])), d = ie(g.value);
      C.value = d.cards.filter((i) => s.has(i.clave)).map((i) => ({ ..._(s.get(i.clave), i), pestana: d.id }));
    }
    $e(f, I, { immediate: !0 }), $e(g, u, { immediate: !0 });
    const p = D(() => g.value.pestanas.map((s) => ({ id: s.id, nombre: s.nombre, general: !!s.general })));
    Ae(async () => {
      const s = o.value.preferencias;
      try {
        $ = typeof (s == null ? void 0 : s.cargar) == "function" ? await s.cargar(n.preferenciasClave) : null;
      } catch (d) {
        console.warn("[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:", d), $ = null;
      } finally {
        A = !0, I();
      }
    });
    function k() {
      if (!A) return;
      const s = g.value;
      r("preferencia-cambiada", s);
      const d = o.value.preferencias;
      typeof (d == null ? void 0 : d.guardar) == "function" && Promise.resolve(d.guardar(n.preferenciasClave, s)).catch((i) => {
        console.warn("[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:", i);
      });
    }
    function w(s) {
      !s || s === g.value || (g.value = s, k());
    }
    const M = P("");
    J(Ee, M);
    const q = D(() => M.value.trim() !== ""), K = Z(/* @__PURE__ */ new Map());
    J(Xe, K);
    const re = D(() => ![...K.values()].some(Boolean)), G = D(() => {
      if (!q.value) return C.value;
      const s = new Map(f.value.map((x) => [x.clave, x])), d = /* @__PURE__ */ new Set(), i = [], E = [...g.value.pestanas.filter((x) => !x.general), ...g.value.pestanas.filter((x) => x.general)];
      for (const x of E) {
        const N = x.cards.filter((S) => s.has(S.clave) && !d.has(S.clave));
        if (N.length) {
          i.push({ grupo: x.id, nombre: x.nombre, claves: N.map((S) => S.clave) });
          for (const S of N)
            d.add(S.clave), i.push({ ..._(s.get(S.clave), S), pestana: x.id });
        }
      }
      return i;
    }), Ne = D(() => {
      const s = /* @__PURE__ */ new Map(), d = G.value.filter((i) => !i.grupo);
      return d.forEach((i, E) => s.set(i.clave, { primera: E === 0, ultima: E === d.length - 1 })), s;
    });
    function oa(s) {
      const d = G.value.find((i) => i.grupo === s);
      return !!(d != null && d.claves.some((i) => K.get(i)));
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
    const ae = P(null);
    function he(s, d, i, E) {
      let x = () => {
      };
      const N = { ...i, cerrar: () => x() };
      if (typeof o.value.abrirModal == "function") {
        const S = o.value.abrirModal(s, d, N, E);
        x = () => {
          typeof (S == null ? void 0 : S.cerrar) == "function" ? S.cerrar() : typeof o.value.cerrarModal == "function" && (S == null ? void 0 : S.code) != null && o.value.cerrarModal(S.code);
        };
      } else
        ae.value = { componente: s, titulo: d, props: N, opciones: E }, x = () => {
          ae.value = null;
        };
    }
    function ca() {
      const s = ie(g.value), d = (x) => !s.general && (s.cards.some((N) => N.clave === x) || s.ocultas.some((N) => N.clave === x)), i = f.value.map((x) => ({ clave: x.clave, titulo: x.titulo, enActiva: d(x.clave) })), E = Z({ nombre: "", elecciones: Object.fromEntries(i.map((x) => [x.clave, "no"])) });
      he(je, "Nueva pestaña", {
        modelo: E,
        cards: i,
        modo: "alta",
        validar: (x) => we(g.value, x),
        onGuardar: ({ nombre: x, elecciones: N }) => w(Mt(g.value, x, N))
      }, { size: "md" });
    }
    function ia(s) {
      const d = V(g.value, s);
      if (!d || d.general) return;
      const i = Z({ nombre: d.nombre });
      he(je, "Renombrar pestaña", {
        modelo: i,
        modo: "renombrar",
        validar: (E) => we(g.value, E, s),
        onGuardar: ({ nombre: E }) => w(Et(g.value, s, E))
      }, { size: "sm" });
    }
    function ua(s) {
      const d = V(g.value, s);
      if (!d || d.general) return;
      const i = () => w(It(g.value, s)), E = `Se eliminará la pestaña "${d.nombre}". Sus cards siguen en "Todas". ¿Desea continuar?`;
      typeof o.value.confirmar == "function" ? o.value.confirmar({
        title: "Eliminar pestaña",
        text: E,
        confirmLabel: "Eliminar",
        onConfirm: i
      }) : typeof window < "u" && window.confirm(E) && i();
    }
    const se = D(() => {
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
    const te = P(null);
    async function ze() {
      if (te.value !== null) return;
      const s = g.value.activa;
      try {
        for (const d of C.value.map((i) => i.clave)) {
          if (g.value.activa !== s) break;
          await Se(async () => {
            const i = _e.get(d);
            i && (te.value = d, await i.refrescar());
          }, { vigente: () => g.value.activa === s });
        }
      } finally {
        te.value = null;
      }
    }
    const X = P(null);
    let De = null;
    function ma(s, d) {
      var i, E;
      return ((E = (i = document.elementFromPoint(s, d)) == null ? void 0 : i.closest("[data-card]")) == null ? void 0 : E.dataset.card) ?? null;
    }
    function fa(s) {
      var i, E, x;
      const d = s.target.closest(".gdc-card__handle");
      q.value || !d || s.target.closest("button") || s.button > 0 || (X.value = ((i = d.closest("[data-card]")) == null ? void 0 : i.dataset.card) ?? null, X.value && (De = C.value.map((N) => N.clave).join("|"), (x = (E = s.currentTarget).setPointerCapture) == null || x.call(E, s.pointerId), s.preventDefault()));
    }
    function pa(s) {
      if (!X.value) return;
      const d = ma(s.clientX, s.clientY);
      if (!d || d === X.value) return;
      const i = C.value.findIndex((N) => N.clave === X.value), E = C.value.findIndex((N) => N.clave === d);
      if (i === -1 || E === -1) return;
      const [x] = C.value.splice(i, 1);
      C.value.splice(E, 0, x);
    }
    function Pe(s) {
      var i, E;
      if (!X.value) return;
      X.value = null, (E = (i = s.currentTarget).hasPointerCapture) != null && E.call(i, s.pointerId) && s.currentTarget.releasePointerCapture(s.pointerId);
      const d = C.value.map((x) => x.clave);
      d.join("|") !== De && w(Te(g.value, g.value.activa, d));
    }
    function ga(s, d) {
      const i = C.value.map((N) => N.clave), E = i.indexOf(s.clave), x = E + d;
      x < 0 || x >= i.length || (i.splice(E, 1), i.splice(x, 0, s.clave), w(Te(g.value, g.value.activa, i)));
    }
    return t({ actualizarTodas: ze, activar: be }), (s, d) => f.value.length ? (h(), y("div", an, [
      ue(vt, {
        filtro: M.value,
        "onUpdate:filtro": d[0] || (d[0] = (i) => M.value = i),
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
        (h(!0), y(T, null, U(G.value, (i, E) => {
          var x, N;
          return h(), y(T, {
            key: i.clave ?? "grupo_" + i.grupo
          }, [
            i.grupo ? oe((h(), y("div", {
              key: 0,
              class: "gdc-grupo",
              "data-grupo": i.grupo
            }, [
              d[2] || (d[2] = b("span", {
                class: "gdc-grupo__icono",
                "aria-hidden": "true"
              }, "▸", -1)),
              b("span", nn, R(i.nombre), 1),
              b("button", {
                type: "button",
                class: "gdc-btn gdc-btn--secondary gdc-btn--sm",
                onClick: (S) => ra(i.grupo)
              }, " Ir a la pestaña ", 8, on)
            ], 8, tn)), [
              [qe, oa(i.grupo)]
            ]) : (h(), Q(Za, {
              key: 1,
              ref_for: !0,
              ref: (S) => va(i.clave, S),
              clave: i.clave,
              titulo: i.titulo,
              ancho: i.ancho,
              "ancho-elegido": i.anchoElegido,
              color: i.color,
              primera: q.value || ((x = Ne.value.get(i.clave)) == null ? void 0 : x.primera),
              ultima: q.value || ((N = Ne.value.get(i.clave)) == null ? void 0 : N.ultima),
              destinos: O(pt)(g.value, i.clave),
              "en-otras": i.pestana !== O(z) && O(Ze)(g.value, i.clave).length > 1,
              "puede-mover": i.pestana !== O(z),
              actualizando: i.clave === te.value,
              colores: c.value,
              "menu-items": i.menuItems,
              class: H({ "gdc-card-celda--arrastrada": i.clave === X.value }),
              onCambiarAncho: (S) => w(O(xt)(g.value, i.pestana, i.clave, S)),
              onCambiarColor: (S) => w(O(kt)(g.value, i.pestana, i.clave, S)),
              onMover: (S) => ga(i, S),
              onMoverA: (S) => w(O(Nt)(g.value, i.pestana, S, i.clave)),
              onCopiarA: (S) => w(O(zt)(g.value, i.pestana, S, i.clave)),
              onQuitar: (S) => w(O(Dt)(g.value, i.pestana, i.clave)),
              onOcultar: (S) => w(O(wt)(g.value, i.pestana, i.clave))
            }, {
              default: $a(() => [
                (h(), Q(Fe(i.componenteVue), xa({ ref_for: !0 }, i.props || {}), null, 16))
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
        !q.value && !C.value.length && !se.value.length ? (h(), y("div", sn, ' Esta pestaña no tiene cards. Se suman desde el engranaje de una card, con "Copiar a pestaña…" o "Mover a pestaña…". ')) : L("", !0)
      ], 32),
      ae.value ? (h(), Q(Jt, {
        key: 0,
        dialogo: ae.value,
        onCerrar: d[1] || (d[1] = (i) => ae.value = null)
      }, null, 8, ["dialogo"])) : L("", !0)
    ])) : L("", !0);
  }
}, ln = (e, t) => {
  const a = e.__vccOpts || e;
  for (const [n, r] of t)
    a[n] = r;
  return a;
}, cn = ["width", "height", "viewBox", "aria-label"], un = ["d", "fill"], dn = ["d", "stroke"], vn = ["cx", "cy", "r", "fill"], mn = {
  __name: "Sparkline",
  props: {
    valores: { type: Array, default: () => [] },
    min: { type: Number, default: 0 },
    max: { type: Number, default: null },
    color: { type: String, default: "#0d6efd" },
    alto: { type: Number, default: 40 },
    ancho: { type: Number, default: 120 },
    relleno: { type: Boolean, default: !0 },
    etiqueta: { type: String, default: "Tendencia" },
    // Array paralelo a `valores`: posiciones (truthy) donde resaltar el punto con un círculo,
    // por ejemplo donde se disparó una alarma/notificación en esa muestra.
    marcadores: { type: Array, default: () => [] },
    colorMarcador: { type: String, default: "#dc3545" },
    radioMarcador: { type: Number, default: 3 }
  },
  setup(e) {
    const t = e, a = D(() => {
      const c = t.valores;
      if (!c.length) return [];
      const l = t.max !== null ? t.max : Math.max(...c, t.min), v = Math.max(l - t.min, 1e-6), m = c.length > 1 ? t.ancho / (c.length - 1) : t.ancho;
      return c.map((f, $) => {
        const A = c.length > 1 ? $ * m : 0, g = Math.min(Math.max((f - t.min) / v, 0), 1), C = t.alto - g * t.alto;
        return [A, C];
      });
    }), n = D(() => a.value.length ? a.value.map(([c, l], v) => `${v === 0 ? "M" : "L"}${c.toFixed(2)},${l.toFixed(2)}`).join(" ") : ""), r = D(() => t.marcadores.length ? a.value.filter((c, l) => t.marcadores[l]) : []), o = D(() => {
      if (!a.value.length) return "";
      const c = a.value[a.value.length - 1], l = a.value[0];
      return `${n.value} L${c[0].toFixed(2)},${t.alto} L${l[0].toFixed(2)},${t.alto} Z`;
    });
    return (c, l) => (h(), y("svg", {
      width: e.ancho,
      height: e.alto,
      viewBox: `0 0 ${e.ancho} ${e.alto}`,
      role: "img",
      "aria-label": e.etiqueta,
      class: "gdc-sparkline"
    }, [
      b("title", null, R(e.etiqueta), 1),
      e.relleno && o.value ? (h(), y("path", {
        key: 0,
        d: o.value,
        class: "gdc-sparkline__area",
        fill: e.color
      }, null, 8, un)) : L("", !0),
      b("path", {
        d: n.value,
        class: "gdc-sparkline__line",
        stroke: e.color,
        fill: "none"
      }, null, 8, dn),
      (h(!0), y(T, null, U(r.value, (v, m) => (h(), y("circle", {
        key: m,
        cx: v[0],
        cy: v[1],
        r: e.radioMarcador,
        fill: e.colorMarcador,
        class: "gdc-sparkline__marcador"
      }, null, 8, vn))), 128))
    ], 8, cn));
  }
}, Cn = /* @__PURE__ */ ln(mn, [["__scopeId", "data-v-9a60a4be"]]);
function $n(e = []) {
  const t = Z([...e]);
  function a(r) {
    t.push(r);
  }
  function n() {
    return t;
  }
  return { cards: t, registrar: a, listar: n };
}
const fn = "dashboard_cards";
function xn(e, t = fn) {
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
  function c(v, m) {
    a[v] = { ...a[v] || {}, ...m }, o();
  }
  function l(v) {
    return a[v] || {};
  }
  return { overrides: a, cargar: r, setOverride: c, getOverride: l, estaCargado: () => n };
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
  yn as DashboardCardsGrid,
  z as ID_GENERAL,
  Re as INICIALES,
  Jt as InternalDialog,
  fe as MAX_NOMBRE,
  me as NOMBRE_GENERAL,
  Yt as SelectorCardsOcultas,
  Cn as Sparkline,
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
  $n as createCardRegistry,
  yn as default,
  pt as destinos,
  It as eliminarPestana,
  Se as encolar,
  bn as enqueue,
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
  gn as registerRefresh,
  Et as renombrar,
  Te as reordenarCards,
  ta as reordenarPestanas,
  Ze as tabsWithCard,
  Ua as usarCola,
  qa as usarRefresco,
  xn as useCardPreferences,
  _n as useDashboardCardsContext,
  hn as useQueryQueue
};
//# sourceMappingURL=vue-greenborn-dashboard-cards.js.map
