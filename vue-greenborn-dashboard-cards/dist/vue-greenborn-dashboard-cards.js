import { computed as f, openBlock as u, createElementBlock as v, normalizeClass as _, createElementVNode as d, toDisplayString as C, createCommentVNode as y, renderSlot as w, provide as A, inject as M, reactive as O, ref as N, onMounted as E, unref as b, Fragment as x, renderList as k, createBlock as D, withCtx as B, resolveDynamicComponent as F, mergeProps as L, defineAsyncComponent as P } from "vue";
const $ = (t, e) => {
  const a = t.__vccOpts || t;
  for (const [r, c] of e)
    a[r] = c;
  return a;
}, T = { class: "gdc-card__header" }, j = { class: "gdc-card__titulo" }, q = { class: "gdc-card__acciones" }, R = { class: "gdc-card__body" }, V = {
  __name: "DashboardCard",
  props: {
    titulo: { type: String, required: !0 },
    ancho: { type: Number, default: 1 }
  },
  emits: ["cambiar-ancho", "ocultar"],
  setup(t) {
    const e = t, a = f(() => e.ancho < 4), r = f(() => e.ancho > 1);
    return (c, n) => (u(), v("div", {
      class: _(["gdc-card", `gdc-card--ancho-${t.ancho}`])
    }, [
      d("div", T, [
        d("span", j, C(t.titulo), 1),
        d("div", q, [
          a.value ? (u(), v("button", {
            key: 0,
            type: "button",
            class: "gdc-card__btn",
            title: "Agrandar",
            onClick: n[0] || (n[0] = (i) => c.$emit("cambiar-ancho", Math.min(t.ancho + 1, 4)))
          }, " + ")) : y("", !0),
          r.value ? (u(), v("button", {
            key: 1,
            type: "button",
            class: "gdc-card__btn",
            title: "Achicar",
            onClick: n[1] || (n[1] = (i) => c.$emit("cambiar-ancho", Math.max(t.ancho - 1, 1)))
          }, " − ")) : y("", !0),
          d("button", {
            type: "button",
            class: "gdc-card__btn",
            title: "Ocultar",
            onClick: n[2] || (n[2] = (i) => c.$emit("ocultar"))
          }, " × ")
        ])
      ]),
      d("div", R, [
        w(c.$slots, "default", {}, void 0, !0)
      ])
    ], 2));
  }
}, G = /* @__PURE__ */ $(V, [["__scopeId", "data-v-a1040dfe"]]), S = Symbol("dashboard-cards-context");
function I(t) {
  A(S, t || {});
}
function nt() {
  const t = M(S, null);
  return t || console.warn(
    '[vue-greenborn-dashboard-cards] No se encontró contexto. Usar provideDashboardCardsContext() o la prop "contexto" de DashboardCardsGrid.'
  ), t || {};
}
const z = "dashboard_cards";
function U(t, e = z) {
  const a = O({});
  let r = !1;
  async function c() {
    if (!t || typeof t.cargar != "function") {
      r = !0;
      return;
    }
    try {
      const s = await t.cargar(e);
      s && typeof s == "object" && Object.assign(a, s);
    } catch (s) {
      console.warn("[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:", s);
    } finally {
      r = !0;
    }
  }
  function n() {
    !t || typeof t.guardar != "function" || t.guardar(e, { ...a }).catch((s) => {
      console.warn("[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:", s);
    });
  }
  function i(s, g) {
    a[s] = { ...a[s] || {}, ...g }, n();
  }
  function m(s) {
    return a[s] || {};
  }
  return { overrides: a, cargar: c, setOverride: i, getOverride: m, estaCargado: () => r };
}
const X = { class: "gdc-grid-wrapper" }, H = {
  key: 0,
  class: "nav nav-tabs gdc-tabs"
}, K = { class: "nav-item" }, Y = ["onClick"], Z = { class: "gdc-grid" }, J = {
  __name: "DashboardCardsGrid",
  props: {
    cards: { type: Array, default: () => [] },
    contexto: { type: Object, default: () => ({}) },
    preferenciasClave: { type: String, default: "dashboard_cards" }
  },
  setup(t) {
    const e = t;
    I(e.contexto);
    const a = Symbol("todas"), r = N(a), c = U(e.contexto.preferencias, e.preferenciasClave);
    E(() => {
      c.cargar();
    });
    const n = f(() => {
      const o = /* @__PURE__ */ new Set();
      for (const h of e.cards)
        for (const l of h.categorias || []) o.add(l);
      return [...o];
    }), i = f(() => e.cards.filter((o) => o.permiso && typeof e.contexto.tienePermiso == "function" && !e.contexto.tienePermiso(o.permiso) || c.getOverride(o.clave).oculta ? !1 : r.value === a ? !0 : (o.categorias || []).includes(r.value)).sort((o, h) => (o.ordenDefault ?? 0) - (h.ordenDefault ?? 0)));
    function m(o) {
      return c.getOverride(o.clave).ancho ?? o.anchoDefault ?? 1;
    }
    const s = /* @__PURE__ */ new Map();
    function g(o) {
      if (!s.has(o.clave)) {
        const h = typeof o.componente == "function" && o.componente.length === 0 ? P(o.componente) : o.componente;
        s.set(o.clave, h);
      }
      return s.get(o.clave);
    }
    return (o, h) => (u(), v("div", X, [
      n.value.length > 1 ? (u(), v("ul", H, [
        d("li", K, [
          d("button", {
            type: "button",
            class: _(["nav-link", { active: r.value === b(a) }]),
            onClick: h[0] || (h[0] = (l) => r.value = b(a))
          }, " Todas ", 2)
        ]),
        (u(!0), v(x, null, k(n.value, (l) => (u(), v("li", {
          key: l,
          class: "nav-item"
        }, [
          d("button", {
            type: "button",
            class: _(["nav-link", { active: r.value === l }]),
            onClick: (p) => r.value = l
          }, C(l), 11, Y)
        ]))), 128))
      ])) : y("", !0),
      d("div", Z, [
        (u(!0), v(x, null, k(i.value, (l) => (u(), D(G, {
          key: l.clave,
          titulo: l.titulo,
          ancho: m(l),
          onCambiarAncho: (p) => b(c).setOverride(l.clave, { ancho: p }),
          onOcultar: (p) => b(c).setOverride(l.clave, { oculta: !0 })
        }, {
          default: B(() => [
            (u(), D(F(g(l)), L({ ref_for: !0 }, l.props || {}), null, 16))
          ]),
          _: 2
        }, 1032, ["titulo", "ancho", "onCambiarAncho", "onOcultar"]))), 128))
      ])
    ]));
  }
}, ot = /* @__PURE__ */ $(J, [["__scopeId", "data-v-ee0f8e27"]]), Q = ["width", "height", "viewBox", "aria-label"], W = ["d", "fill"], tt = ["d", "stroke"], et = {
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
  setup(t) {
    const e = t, a = f(() => {
      const n = e.valores;
      if (!n.length) return [];
      const i = e.max !== null ? e.max : Math.max(...n, e.min), m = Math.max(i - e.min, 1e-6), s = n.length > 1 ? e.ancho / (n.length - 1) : e.ancho;
      return n.map((g, o) => {
        const h = n.length > 1 ? o * s : 0, l = Math.min(Math.max((g - e.min) / m, 0), 1), p = e.alto - l * e.alto;
        return [h, p];
      });
    }), r = f(() => a.value.length ? a.value.map(([n, i], m) => `${m === 0 ? "M" : "L"}${n.toFixed(2)},${i.toFixed(2)}`).join(" ") : ""), c = f(() => {
      if (!a.value.length) return "";
      const n = a.value[a.value.length - 1], i = a.value[0];
      return `${r.value} L${n[0].toFixed(2)},${e.alto} L${i[0].toFixed(2)},${e.alto} Z`;
    });
    return (n, i) => (u(), v("svg", {
      width: t.ancho,
      height: t.alto,
      viewBox: `0 0 ${t.ancho} ${t.alto}`,
      role: "img",
      "aria-label": t.etiqueta,
      class: "gdc-sparkline"
    }, [
      d("title", null, C(t.etiqueta), 1),
      t.relleno && c.value ? (u(), v("path", {
        key: 0,
        d: c.value,
        class: "gdc-sparkline__area",
        fill: t.color
      }, null, 8, W)) : y("", !0),
      d("path", {
        d: r.value,
        class: "gdc-sparkline__line",
        stroke: t.color,
        fill: "none"
      }, null, 8, tt)
    ], 8, Q));
  }
}, rt = /* @__PURE__ */ $(et, [["__scopeId", "data-v-11026cc1"]]);
function ct(t = []) {
  const e = O([...t]);
  function a(c) {
    e.push(c);
  }
  function r() {
    return e;
  }
  return { cards: e, registrar: a, listar: r };
}
export {
  S as DASHBOARD_CARDS_CONTEXT_KEY,
  G as DashboardCard,
  ot as DashboardCardsGrid,
  rt as Sparkline,
  ct as createCardRegistry,
  ot as default,
  I as provideDashboardCardsContext,
  U as useCardPreferences,
  nt as useDashboardCardsContext
};
//# sourceMappingURL=vue-greenborn-dashboard-cards.js.map
