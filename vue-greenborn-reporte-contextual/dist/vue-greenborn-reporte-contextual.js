import { reactive as T, ref as h, openBlock as f, createElementBlock as v, withModifiers as A, createElementVNode as n, createTextVNode as E, toDisplayString as g, unref as w, createCommentVNode as _, withDirectives as x, vModelText as C, onMounted as P, onBeforeUnmount as S, createBlock as z, Teleport as D, normalizeStyle as B } from "vue";
import { useModal as M } from "vue-greenborn-modal-manager";
const q = "/api/public/notas-desarrollo";
function j(o) {
  if (typeof o != "string" || o.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return o.trim().replace(/\/+$/, "");
}
async function V({ apiBaseUrl: o, payload: a }) {
  const s = j(o);
  if (!a || typeof a != "object")
    throw new Error("payload es requerido");
  const p = await fetch(`${s}${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(a)
  }), l = await p.json();
  if (!p.ok && l.status !== !1)
    throw new Error(`HTTP ${p.status} al registrar el reporte`);
  return l;
}
const I = { class: "rc-info" }, F = { key: 0 }, H = { class: "rc-muted" }, X = { class: "rc-captura" }, K = ["src"], G = { class: "rc-captura-acciones" }, W = ["disabled"], Y = {
  key: 1,
  class: "rc-error",
  role: "alert"
}, J = {
  key: 0,
  class: "rc-error",
  role: "alert"
}, Q = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(o) {
    const a = o, { mostrar_alerta: s, ocultar_modal: p } = M(), l = a.parametros.info, c = a.parametros.estado, e = T({
      slug_proyecto: a.parametros.slugProyecto ?? "",
      localizacion_componente: l.localizacion,
      url: l.url,
      version: a.parametros.version ?? "",
      notas: "",
      captura_pantalla: ""
    }), m = h(!1), y = h("");
    async function L() {
      y.value = "", m.value = !0;
      const d = document.querySelector(".gmm-stack"), t = (d == null ? void 0 : d.style.visibility) ?? "";
      d && (d.style.visibility = "hidden");
      let i = null;
      try {
        i = await navigator.mediaDevices.getDisplayMedia({ video: !0 });
        const u = document.createElement("video");
        u.srcObject = i, await u.play(), await new Promise((r) => {
          if (u.readyState >= 2) return r();
          u.onloadeddata = () => r();
        });
        const b = document.createElement("canvas");
        b.width = u.videoWidth, b.height = u.videoHeight, b.getContext("2d").drawImage(u, 0, 0), e.captura_pantalla = b.toDataURL("image/webp", 0.85);
      } catch (u) {
        (u == null ? void 0 : u.name) !== "NotAllowedError" && (console.log("[reporte-contextual] Error al tomar la captura:", u), y.value = "No se pudo tomar la captura de pantalla.");
      } finally {
        i == null || i.getTracks().forEach((u) => u.stop()), d && (d.style.visibility = t), m.value = !1;
      }
    }
    async function k() {
      c.error = "", c.enviando = !0;
      try {
        const d = await V({
          apiBaseUrl: a.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: e.slug_proyecto.trim(),
            captura_pantalla: e.captura_pantalla || null,
            localizacion_componente: e.localizacion_componente,
            url: e.url,
            version: e.version,
            notas: e.notas
          }
        });
        if (!d.status) {
          c.error = d.error;
          return;
        }
        p(a.parametros._modal_cod), s("Reporte registrado. ¡Gracias!");
      } catch (d) {
        console.log("[reporte-contextual] Error al enviar el reporte:", d), c.error = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        c.enviando = !1;
      }
    }
    return (d, t) => (f(), v("form", {
      id: "rc-form",
      class: "rc-form",
      onSubmit: A(k, ["prevent"])
    }, [
      n("div", I, [
        n("div", null, [
          t[6] || (t[6] = n("strong", null, "Elemento:", -1)),
          t[7] || (t[7] = E()),
          n("code", null, g(w(l).tag), 1)
        ]),
        w(l).texto ? (f(), v("div", F, [
          t[8] || (t[8] = n("strong", null, "Texto:", -1)),
          E(" " + g(w(l).texto), 1)
        ])) : _("", !0),
        n("div", H, [
          n("code", null, g(w(l).selector), 1)
        ])
      ]),
      t[9] || (t[9] = n("label", {
        class: "rc-label",
        for: "rc-proyecto"
      }, [
        E("Slug del proyecto "),
        n("span", { class: "rc-req" }, "*")
      ], -1)),
      x(n("input", {
        id: "rc-proyecto",
        "onUpdate:modelValue": t[0] || (t[0] = (i) => e.slug_proyecto = i),
        class: "rc-input",
        type: "text",
        maxlength: "255",
        placeholder: "slug del proyecto",
        required: ""
      }, null, 512), [
        [C, e.slug_proyecto]
      ]),
      t[10] || (t[10] = n("label", {
        class: "rc-label",
        for: "rc-componente"
      }, "Localización del componente", -1)),
      x(n("input", {
        id: "rc-componente",
        "onUpdate:modelValue": t[1] || (t[1] = (i) => e.localizacion_componente = i),
        class: "rc-input",
        type: "text",
        maxlength: "255"
      }, null, 512), [
        [C, e.localizacion_componente]
      ]),
      t[11] || (t[11] = n("label", {
        class: "rc-label",
        for: "rc-url"
      }, "URL de la vista", -1)),
      x(n("input", {
        id: "rc-url",
        "onUpdate:modelValue": t[2] || (t[2] = (i) => e.url = i),
        class: "rc-input",
        type: "text",
        maxlength: "500"
      }, null, 512), [
        [C, e.url]
      ]),
      t[12] || (t[12] = n("label", {
        class: "rc-label",
        for: "rc-version"
      }, [
        E("Versión "),
        n("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      x(n("input", {
        id: "rc-version",
        "onUpdate:modelValue": t[3] || (t[3] = (i) => e.version = i),
        class: "rc-input",
        type: "text",
        maxlength: "50"
      }, null, 512), [
        [C, e.version]
      ]),
      t[13] || (t[13] = n("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        E("Notas "),
        n("span", { class: "rc-req" }, "*")
      ], -1)),
      x(n("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": t[4] || (t[4] = (i) => e.notas = i),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [C, e.notas]
      ]),
      t[14] || (t[14] = n("label", { class: "rc-label" }, [
        E("Captura de pantalla "),
        n("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      n("div", X, [
        e.captura_pantalla ? (f(), v("img", {
          key: 0,
          src: e.captura_pantalla,
          class: "rc-captura-preview",
          alt: "Captura de pantalla"
        }, null, 8, K)) : _("", !0),
        n("div", G, [
          n("button", {
            type: "button",
            class: "rc-btn rc-btn-secundario",
            disabled: m.value,
            onClick: L
          }, g(m.value ? "Capturando…" : e.captura_pantalla ? "Tomar otra captura" : "Tomar captura"), 9, W),
          e.captura_pantalla ? (f(), v("button", {
            key: 0,
            type: "button",
            class: "rc-btn rc-btn-secundario",
            onClick: t[5] || (t[5] = (i) => e.captura_pantalla = "")
          }, " Quitar ")) : _("", !0)
        ]),
        y.value ? (f(), v("div", Y, g(y.value), 1)) : _("", !0)
      ]),
      w(c).error ? (f(), v("div", J, g(w(c).error), 1)) : _("", !0)
    ], 32));
  }
}, Z = { class: "rc-footer" }, ee = ["disabled"], te = {
  __name: "ReporteFormFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(o) {
    const a = o, { ocultar_modal: s } = M();
    function p() {
      s(a.parametros._modal_cod);
    }
    return (l, c) => (f(), v("div", Z, [
      n("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: p
      }, "Cancelar"),
      n("button", {
        type: "submit",
        form: "rc-form",
        class: "gmm-btn gmm-btn-success",
        disabled: o.parametros.estado.enviando
      }, g(o.parametros.estado.enviando ? "Enviando…" : "Enviar reporte"), 9, ee)
    ]));
  }
}, oe = 6, O = 120, R = 255;
function re(o) {
  const a = o.tagName.toLowerCase(), s = o.id ? `#${o.id}` : "", p = typeof o.className == "string" ? o.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((e) => `.${e}`).join("") : "";
  let l = "";
  const c = o.parentElement;
  if (c && !o.id) {
    const e = Array.from(c.children).filter((m) => m.tagName === o.tagName);
    e.length > 1 && (l = `:nth-of-type(${e.indexOf(o) + 1})`);
  }
  return `${a}${s}${p}${l}`;
}
function ne(o) {
  const a = [];
  let s = o;
  for (; s && s.nodeType === Node.ELEMENT_NODE && a.length < oe; ) {
    if (s === document.body) {
      a.unshift("body");
      break;
    }
    a.unshift(re(s)), s = s.parentElement;
  }
  return a.join(" > ");
}
function ae(o) {
  const s = (o.innerText ?? o.textContent ?? "").replace(/\s+/g, " ").trim();
  return s.length > O ? `${s.slice(0, O)}…` : s;
}
function U(o) {
  const a = o.closest("[data-reporte]"), s = ne(o);
  return {
    localizacion: (a ? a.getAttribute("data-reporte") : s).slice(0, R),
    selector: s.slice(0, R),
    tag: o.tagName.toLowerCase(),
    texto: ae(o),
    url: window.location.href
  };
}
const le = 200, se = 40, N = 8, ue = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null },
    // Slug del proyecto que se precompleta en el reporte (opcional).
    slugProyecto: { type: String, default: null }
  },
  setup(o) {
    const a = o, { mostrar_modal: s } = M(), p = h(null), l = T({ visible: !1, x: 0, y: 0, info: null });
    let c = !1;
    function e() {
      l.visible = !1, l.info = null;
    }
    function m(r) {
      return p.value !== null && p.value.contains(r);
    }
    function y(r) {
      r.altKey && (m(r.target) || r.target instanceof Element && (r.preventDefault(), l.info = U(r.target), l.x = Math.max(N, Math.min(r.clientX, window.innerWidth - le - N)), l.y = Math.max(N, Math.min(r.clientY, window.innerHeight - se - N)), l.visible = !0));
    }
    function L(r) {
      l.visible && (m(r.target) || e());
    }
    function k(r) {
      c && r.target instanceof Element && (m(r.target) || (r.preventDefault(), r.stopPropagation(), r.stopImmediatePropagation(), c = !1, u(U(r.target))));
    }
    function d(r) {
      r.key === "Escape" && e(), r.key.toLowerCase() === "d" && (c = !0);
    }
    function t(r) {
      r.key.toLowerCase() === "d" && (c = !1);
    }
    function i() {
      c = !1;
    }
    function u(r) {
      if (r === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      s(
        { body: Q, footer: te },
        "Reportar elemento",
        {
          info: r,
          apiBaseUrl: a.apiBaseUrl,
          version: a.version,
          slugProyecto: a.slugProyecto,
          estado: T({ enviando: !1, error: "" })
        },
        { size: "lg" }
      );
    }
    function b() {
      const r = l.info;
      e(), u(r);
    }
    return P(() => {
      document.addEventListener("contextmenu", y, !0), document.addEventListener("mousedown", L, !0), document.addEventListener("click", k, !0), document.addEventListener("keydown", d), document.addEventListener("keyup", t), window.addEventListener("blur", i), window.addEventListener("scroll", e, !0), window.addEventListener("resize", e);
    }), S(() => {
      document.removeEventListener("contextmenu", y, !0), document.removeEventListener("mousedown", L, !0), document.removeEventListener("click", k, !0), document.removeEventListener("keydown", d), document.removeEventListener("keyup", t), window.removeEventListener("blur", i), window.removeEventListener("scroll", e, !0), window.removeEventListener("resize", e);
    }), (r, $) => (f(), z(D, { to: "body" }, [
      l.visible ? (f(), v("div", {
        key: 0,
        ref_key: "menuRef",
        ref: p,
        class: "rc-menu",
        role: "menu",
        style: B({ top: `${l.y}px`, left: `${l.x}px` }),
        onContextmenu: $[0] || ($[0] = A(() => {
        }, ["prevent"]))
      }, [
        n("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: b
        }, " Reportar este elemento ")
      ], 36)) : _("", !0)
    ]));
  }
};
export {
  ue as ReporteContextual,
  Q as ReporteFormModal,
  ne as construirSelector,
  ue as default,
  V as enviarReporte,
  ae as extraerTexto,
  U as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
