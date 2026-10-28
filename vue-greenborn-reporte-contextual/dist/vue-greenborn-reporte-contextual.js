import { reactive as U, ref as C, openBlock as b, createElementBlock as _, withModifiers as z, createElementVNode as i, createTextVNode as v, toDisplayString as y, unref as L, createCommentVNode as k, withDirectives as g, vModelText as E, onMounted as S, onBeforeUnmount as D, createBlock as h, Teleport as B, normalizeStyle as P } from "vue";
import { useModal as A } from "vue-greenborn-modal-manager";
const V = "/api/public/notas-desarrollo";
function q(e) {
  if (typeof e != "string" || e.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return e.trim().replace(/\/+$/, "");
}
async function j({ apiBaseUrl: e, payload: a }) {
  const s = q(e);
  if (!a || typeof a != "object")
    throw new Error("payload es requerido");
  const l = await fetch(`${s}${V}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(a)
  }), r = await l.json();
  if (!l.ok && r.status !== !1)
    throw new Error(`HTTP ${l.status} al registrar el reporte`);
  return r;
}
const I = { class: "rc-info" }, X = { key: 0 }, H = { class: "rc-muted" }, F = {
  key: 0,
  class: "rc-error",
  role: "alert"
}, K = { class: "rc-acciones" }, G = ["disabled"], Y = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const a = e, { mostrar_alerta: s, ocultar_modal: l } = A(), r = a.parametros.info, u = a.parametros.version ?? "", n = U({
      slug_proyecto: "",
      localizacion_componente: r.localizacion,
      url: r.url,
      version: u,
      notas: ""
    }), d = C(!1), p = C("");
    function f() {
      l(a.parametros._modal_cod);
    }
    function w() {
      f();
    }
    async function x() {
      p.value = "", d.value = !0;
      try {
        const m = await j({
          apiBaseUrl: a.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: n.slug_proyecto.trim(),
            localizacion_componente: n.localizacion_componente,
            url: n.url,
            version: n.version,
            notas: n.notas
          }
        });
        if (!m.status) {
          p.value = m.error;
          return;
        }
        f(), s("Reporte registrado. ¡Gracias!");
      } catch (m) {
        console.log("[reporte-contextual] Error al enviar el reporte:", m), p.value = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        d.value = !1;
      }
    }
    return (m, t) => (b(), _("form", {
      class: "rc-form",
      onSubmit: z(x, ["prevent"])
    }, [
      i("div", I, [
        i("div", null, [
          t[5] || (t[5] = i("strong", null, "Elemento:", -1)),
          t[6] || (t[6] = v()),
          i("code", null, y(L(r).tag), 1)
        ]),
        L(r).texto ? (b(), _("div", X, [
          t[7] || (t[7] = i("strong", null, "Texto:", -1)),
          v(" " + y(L(r).texto), 1)
        ])) : k("", !0),
        i("div", H, [
          i("code", null, y(L(r).selector), 1)
        ])
      ]),
      t[8] || (t[8] = i("label", {
        class: "rc-label",
        for: "rc-proyecto"
      }, [
        v("Slug del proyecto "),
        i("span", { class: "rc-req" }, "*")
      ], -1)),
      g(i("input", {
        id: "rc-proyecto",
        "onUpdate:modelValue": t[0] || (t[0] = (c) => n.slug_proyecto = c),
        class: "rc-input",
        type: "text",
        maxlength: "255",
        placeholder: "slug del proyecto",
        required: ""
      }, null, 512), [
        [E, n.slug_proyecto]
      ]),
      t[9] || (t[9] = i("label", {
        class: "rc-label",
        for: "rc-componente"
      }, "Localización del componente", -1)),
      g(i("input", {
        id: "rc-componente",
        "onUpdate:modelValue": t[1] || (t[1] = (c) => n.localizacion_componente = c),
        class: "rc-input",
        type: "text",
        maxlength: "255"
      }, null, 512), [
        [E, n.localizacion_componente]
      ]),
      t[10] || (t[10] = i("label", {
        class: "rc-label",
        for: "rc-url"
      }, "URL de la vista", -1)),
      g(i("input", {
        id: "rc-url",
        "onUpdate:modelValue": t[2] || (t[2] = (c) => n.url = c),
        class: "rc-input",
        type: "text",
        maxlength: "500"
      }, null, 512), [
        [E, n.url]
      ]),
      t[11] || (t[11] = i("label", {
        class: "rc-label",
        for: "rc-version"
      }, [
        v("Versión "),
        i("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      g(i("input", {
        id: "rc-version",
        "onUpdate:modelValue": t[3] || (t[3] = (c) => n.version = c),
        class: "rc-input",
        type: "text",
        maxlength: "50"
      }, null, 512), [
        [E, n.version]
      ]),
      t[12] || (t[12] = i("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        v("Notas "),
        i("span", { class: "rc-req" }, "*")
      ], -1)),
      g(i("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": t[4] || (t[4] = (c) => n.notas = c),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [E, n.notas]
      ]),
      p.value ? (b(), _("div", F, y(p.value), 1)) : k("", !0),
      i("div", K, [
        i("button", {
          type: "button",
          class: "rc-btn rc-btn-secundario",
          onClick: w
        }, "Cancelar"),
        i("button", {
          type: "submit",
          class: "rc-btn rc-btn-primario",
          disabled: d.value
        }, y(d.value ? "Enviando…" : "Enviar reporte"), 9, G)
      ])
    ], 32));
  }
}, J = 6, M = 120, O = 255;
function W(e) {
  const a = e.tagName.toLowerCase(), s = e.id ? `#${e.id}` : "", l = typeof e.className == "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => `.${n}`).join("") : "";
  let r = "";
  const u = e.parentElement;
  if (u && !e.id) {
    const n = Array.from(u.children).filter((d) => d.tagName === e.tagName);
    n.length > 1 && (r = `:nth-of-type(${n.indexOf(e) + 1})`);
  }
  return `${a}${s}${l}${r}`;
}
function Z(e) {
  const a = [];
  let s = e;
  for (; s && s.nodeType === Node.ELEMENT_NODE && a.length < J; ) {
    if (s === document.body) {
      a.unshift("body");
      break;
    }
    a.unshift(W(s)), s = s.parentElement;
  }
  return a.join(" > ");
}
function Q(e) {
  const s = (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim();
  return s.length > M ? `${s.slice(0, M)}…` : s;
}
function R(e) {
  const a = e.closest("[data-reporte]"), s = Z(e);
  return {
    localizacion: (a ? a.getAttribute("data-reporte") : s).slice(0, O),
    selector: s.slice(0, O),
    tag: e.tagName.toLowerCase(),
    texto: Q(e),
    url: window.location.href
  };
}
const ee = 200, te = 40, N = 8, re = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null }
  },
  setup(e) {
    const a = e, { mostrar_modal: s } = A(), l = C(null), r = U({ visible: !1, x: 0, y: 0, info: null });
    let u = !1;
    function n() {
      r.visible = !1, r.info = null;
    }
    function d(o) {
      return l.value !== null && l.value.contains(o);
    }
    function p(o) {
      o.altKey && (d(o.target) || o.target instanceof Element && (o.preventDefault(), r.info = R(o.target), r.x = Math.max(N, Math.min(o.clientX, window.innerWidth - ee - N)), r.y = Math.max(N, Math.min(o.clientY, window.innerHeight - te - N)), r.visible = !0));
    }
    function f(o) {
      r.visible && (d(o.target) || n());
    }
    function w(o) {
      u && o.target instanceof Element && (d(o.target) || (o.preventDefault(), o.stopPropagation(), o.stopImmediatePropagation(), u = !1, c(R(o.target))));
    }
    function x(o) {
      o.key === "Escape" && n(), o.key.toLowerCase() === "d" && (u = !0);
    }
    function m(o) {
      o.key.toLowerCase() === "d" && (u = !1);
    }
    function t() {
      u = !1;
    }
    function c(o) {
      if (o === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      s(
        Y,
        "Reportar elemento",
        {
          info: o,
          apiBaseUrl: a.apiBaseUrl,
          version: a.version
        },
        { size: "lg" }
      );
    }
    function $() {
      const o = r.info;
      n(), c(o);
    }
    return S(() => {
      document.addEventListener("contextmenu", p, !0), document.addEventListener("mousedown", f, !0), document.addEventListener("click", w, !0), document.addEventListener("keydown", x), document.addEventListener("keyup", m), window.addEventListener("blur", t), window.addEventListener("scroll", n, !0), window.addEventListener("resize", n);
    }), D(() => {
      document.removeEventListener("contextmenu", p, !0), document.removeEventListener("mousedown", f, !0), document.removeEventListener("click", w, !0), document.removeEventListener("keydown", x), document.removeEventListener("keyup", m), window.removeEventListener("blur", t), window.removeEventListener("scroll", n, !0), window.removeEventListener("resize", n);
    }), (o, T) => (b(), h(B, { to: "body" }, [
      r.visible ? (b(), _("div", {
        key: 0,
        ref_key: "menuRef",
        ref: l,
        class: "rc-menu",
        role: "menu",
        style: P({ top: `${r.y}px`, left: `${r.x}px` }),
        onContextmenu: T[0] || (T[0] = z(() => {
        }, ["prevent"]))
      }, [
        i("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: $
        }, " Reportar este elemento ")
      ], 36)) : k("", !0)
    ]));
  }
};
export {
  re as ReporteContextual,
  Y as ReporteFormModal,
  Z as construirSelector,
  re as default,
  j as enviarReporte,
  Q as extraerTexto,
  R as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
