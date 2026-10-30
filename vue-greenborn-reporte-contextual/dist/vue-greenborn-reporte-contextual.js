import { reactive as L, ref as M, openBlock as f, createElementBlock as v, withModifiers as O, createElementVNode as s, createTextVNode as x, withDirectives as $, vModelText as D, createCommentVNode as b, toDisplayString as g, unref as _, onMounted as R, onBeforeUnmount as S, createBlock as z, Teleport as U, normalizeStyle as B } from "vue";
import { useModal as k } from "vue-greenborn-modal-manager";
const j = "/api/public/notas-desarrollo";
function I(e) {
  if (typeof e != "string" || e.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return e.trim().replace(/\/+$/, "");
}
async function q({ apiBaseUrl: e, payload: o }) {
  const a = I(e);
  if (!o || typeof o != "object")
    throw new Error("payload es requerido");
  const d = await fetch(`${a}${j}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(o)
  }), r = await d.json();
  if (!d.ok && r.status !== !1)
    throw new Error(`HTTP ${d.status} al registrar el reporte`);
  return r;
}
const H = { class: "rc-captura" }, F = ["src"], X = { class: "rc-captura-acciones" }, V = ["disabled"], W = {
  key: 1,
  class: "rc-error",
  role: "alert"
}, G = { class: "rc-info" }, K = { key: 0 }, Y = { class: "rc-muted" }, J = {
  key: 0,
  class: "rc-error",
  role: "alert"
}, Q = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const o = e, { mostrar_alerta: a, ocultar_modal: d } = k(), r = o.parametros.info, l = o.parametros.estado, n = L({
      slug_proyecto: o.parametros.slugProyecto ?? "",
      localizacion_componente: r.localizacion,
      url: r.url,
      version: o.parametros.version ?? "",
      notas: "",
      captura_pantalla: ""
    }), m = M(!1), y = M("");
    async function E() {
      y.value = "", m.value = !0;
      const u = document.querySelector(".gmm-stack"), i = (u == null ? void 0 : u.style.visibility) ?? "";
      u && (u.style.visibility = "hidden");
      let p = null;
      try {
        p = await navigator.mediaDevices.getDisplayMedia({ video: !0 });
        const c = document.createElement("video");
        c.srcObject = p, await c.play(), await new Promise((t) => {
          if (c.readyState >= 2) return t();
          c.onloadeddata = () => t();
        });
        const w = document.createElement("canvas");
        w.width = c.videoWidth, w.height = c.videoHeight, w.getContext("2d").drawImage(c, 0, 0), n.captura_pantalla = w.toDataURL("image/webp", 0.85);
      } catch (c) {
        (c == null ? void 0 : c.name) !== "NotAllowedError" && (console.log("[reporte-contextual] Error al tomar la captura:", c), y.value = "No se pudo tomar la captura de pantalla.");
      } finally {
        p == null || p.getTracks().forEach((c) => c.stop()), u && (u.style.visibility = i), m.value = !1;
      }
    }
    async function h() {
      l.error = "", l.enviando = !0;
      try {
        const u = await q({
          apiBaseUrl: o.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: n.slug_proyecto.trim(),
            captura_pantalla: n.captura_pantalla || null,
            localizacion_componente: n.localizacion_componente,
            url: n.url,
            version: n.version,
            notas: n.notas,
            navegador: r.navegador,
            ancho_viewport: r.ancho_viewport,
            alto_viewport: r.alto_viewport,
            es_movil: r.es_movil
          }
        });
        if (!u.status) {
          l.error = u.error;
          return;
        }
        d(o.parametros._modal_cod), a("Reporte registrado. ¡Gracias!");
      } catch (u) {
        console.log("[reporte-contextual] Error al enviar el reporte:", u), l.error = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        l.enviando = !1;
      }
    }
    return (u, i) => (f(), v("form", {
      id: "rc-form",
      class: "rc-form",
      onSubmit: O(h, ["prevent"])
    }, [
      i[6] || (i[6] = s("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        x("Notas "),
        s("span", { class: "rc-req" }, "*")
      ], -1)),
      $(s("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": i[0] || (i[0] = (p) => n.notas = p),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [D, n.notas]
      ]),
      i[7] || (i[7] = s("label", { class: "rc-label" }, [
        x("Captura de pantalla "),
        s("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      s("div", H, [
        n.captura_pantalla ? (f(), v("img", {
          key: 0,
          src: n.captura_pantalla,
          class: "rc-captura-preview",
          alt: "Captura de pantalla"
        }, null, 8, F)) : b("", !0),
        s("div", X, [
          s("button", {
            type: "button",
            class: "rc-btn rc-btn-secundario",
            disabled: m.value,
            onClick: E
          }, g(m.value ? "Capturando…" : n.captura_pantalla ? "Tomar otra captura" : "Tomar captura"), 9, V),
          n.captura_pantalla ? (f(), v("button", {
            key: 0,
            type: "button",
            class: "rc-btn rc-btn-secundario",
            onClick: i[1] || (i[1] = (p) => n.captura_pantalla = "")
          }, " Quitar ")) : b("", !0)
        ]),
        y.value ? (f(), v("div", W, g(y.value), 1)) : b("", !0)
      ]),
      s("div", G, [
        i[5] || (i[5] = s("div", { class: "rc-info-titulo" }, [
          s("strong", null, "Detalles del elemento")
        ], -1)),
        s("div", null, [
          i[2] || (i[2] = s("strong", null, "Elemento:", -1)),
          i[3] || (i[3] = x()),
          s("code", null, g(_(r).tag), 1)
        ]),
        _(r).texto ? (f(), v("div", K, [
          i[4] || (i[4] = s("strong", null, "Texto:", -1)),
          x(" " + g(_(r).texto), 1)
        ])) : b("", !0),
        s("div", Y, [
          s("code", null, g(_(r).selector), 1)
        ])
      ]),
      _(l).error ? (f(), v("div", J, g(_(l).error), 1)) : b("", !0)
    ], 32));
  }
}, Z = { class: "rc-footer" }, ee = ["disabled"], te = {
  __name: "ReporteFormFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const o = e, { ocultar_modal: a } = k();
    function d() {
      a(o.parametros._modal_cod);
    }
    return (r, l) => (f(), v("div", Z, [
      s("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: d
      }, "Cancelar"),
      s("button", {
        type: "submit",
        form: "rc-form",
        class: "gmm-btn gmm-btn-success",
        disabled: e.parametros.estado.enviando
      }, g(e.parametros.estado.enviando ? "Enviando…" : "Enviar reporte"), 9, ee)
    ]));
  }
}, oe = 6, T = 120, P = 255;
function re(e) {
  const o = e.tagName.toLowerCase(), a = e.id ? `#${e.id}` : "", d = typeof e.className == "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => `.${n}`).join("") : "";
  let r = "";
  const l = e.parentElement;
  if (l && !e.id) {
    const n = Array.from(l.children).filter((m) => m.tagName === e.tagName);
    n.length > 1 && (r = `:nth-of-type(${n.indexOf(e) + 1})`);
  }
  return `${o}${a}${d}${r}`;
}
function ne(e) {
  const o = [];
  let a = e;
  for (; a && a.nodeType === Node.ELEMENT_NODE && o.length < oe; ) {
    if (a === document.body) {
      o.unshift("body");
      break;
    }
    o.unshift(re(a)), a = a.parentElement;
  }
  return o.join(" > ");
}
function ae(e) {
  const a = (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim();
  return a.length > T ? `${a.slice(0, T)}…` : a;
}
function ie() {
  const e = navigator.userAgent || "", o = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini/i.test(e), a = typeof window.matchMedia == "function" && window.matchMedia("(pointer: coarse)").matches;
  return o || a;
}
function A(e) {
  const o = e.closest("[data-reporte]"), a = ne(e);
  return {
    localizacion: (o ? o.getAttribute("data-reporte") : a).slice(0, P),
    selector: a.slice(0, P),
    tag: e.tagName.toLowerCase(),
    texto: ae(e),
    url: window.location.href,
    navegador: navigator.userAgent || "",
    ancho_viewport: window.innerWidth,
    alto_viewport: window.innerHeight,
    es_movil: ie()
  };
}
const se = 200, le = 40, C = 8, de = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null },
    // Slug del proyecto que se precompleta en el reporte (opcional).
    slugProyecto: { type: String, default: null }
  },
  setup(e) {
    const o = e, { mostrar_modal: a } = k(), d = M(null), r = L({ visible: !1, x: 0, y: 0, info: null });
    let l = !1;
    function n() {
      r.visible = !1, r.info = null;
    }
    function m(t) {
      return d.value !== null && d.value.contains(t);
    }
    function y(t) {
      t.altKey && (m(t.target) || t.target instanceof Element && (t.preventDefault(), r.info = A(t.target), r.x = Math.max(C, Math.min(t.clientX, window.innerWidth - se - C)), r.y = Math.max(C, Math.min(t.clientY, window.innerHeight - le - C)), r.visible = !0));
    }
    function E(t) {
      r.visible && (m(t.target) || n());
    }
    function h(t) {
      l && t.target instanceof Element && (m(t.target) || (t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation(), l = !1, c(A(t.target))));
    }
    function u(t) {
      t.key === "Escape" && n(), t.key.toLowerCase() === "d" && (l = !0);
    }
    function i(t) {
      t.key.toLowerCase() === "d" && (l = !1);
    }
    function p() {
      l = !1;
    }
    function c(t) {
      if (t === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      a(
        { body: Q, footer: te },
        "Reportar elemento",
        {
          info: t,
          apiBaseUrl: o.apiBaseUrl,
          version: o.version,
          slugProyecto: o.slugProyecto,
          estado: L({ enviando: !1, error: "" })
        },
        { size: "lg" }
      );
    }
    function w() {
      const t = r.info;
      n(), c(t);
    }
    return R(() => {
      document.addEventListener("contextmenu", y, !0), document.addEventListener("mousedown", E, !0), document.addEventListener("click", h, !0), document.addEventListener("keydown", u), document.addEventListener("keyup", i), window.addEventListener("blur", p), window.addEventListener("scroll", n, !0), window.addEventListener("resize", n);
    }), S(() => {
      document.removeEventListener("contextmenu", y, !0), document.removeEventListener("mousedown", E, !0), document.removeEventListener("click", h, !0), document.removeEventListener("keydown", u), document.removeEventListener("keyup", i), window.removeEventListener("blur", p), window.removeEventListener("scroll", n, !0), window.removeEventListener("resize", n);
    }), (t, N) => (f(), z(U, { to: "body" }, [
      r.visible ? (f(), v("div", {
        key: 0,
        ref_key: "menuRef",
        ref: d,
        class: "rc-menu",
        role: "menu",
        style: B({ top: `${r.y}px`, left: `${r.x}px` }),
        onContextmenu: N[0] || (N[0] = O(() => {
        }, ["prevent"]))
      }, [
        s("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: w
        }, " Reportar este elemento ")
      ], 36)) : b("", !0)
    ]));
  }
};
export {
  de as ReporteContextual,
  Q as ReporteFormModal,
  ne as construirSelector,
  de as default,
  q as enviarReporte,
  ae as extraerTexto,
  A as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
