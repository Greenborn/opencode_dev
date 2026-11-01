import { reactive as C, ref as L, openBlock as f, createElementBlock as v, withModifiers as $, createElementVNode as l, createTextVNode as x, withDirectives as D, vModelText as R, createCommentVNode as b, toDisplayString as w, unref as _, onMounted as S, onBeforeUnmount as U, createBlock as z, Teleport as B, normalizeStyle as j } from "vue";
import { useModal as M } from "vue-greenborn-modal-manager";
const I = "/api/public/notas-desarrollo", K = "/api/public/notas-desarrollo/api-key";
function O(e) {
  if (typeof e != "string" || e.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return e.trim().replace(/\/+$/, "");
}
async function q({ apiBaseUrl: e }) {
  var t;
  const r = O(e), n = await fetch(`${r}${K}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  }), u = await n.json();
  if (!n.ok || u.status !== !0 || !((t = u.data) != null && t.apiKey))
    throw new Error("No se pudo obtener la apikey del reporte");
  return u.data.apiKey;
}
async function H({ apiBaseUrl: e, payload: r }) {
  const n = O(e);
  if (!r || typeof r != "object")
    throw new Error("payload es requerido");
  const u = await q({ apiBaseUrl: n }), t = await fetch(`${n}${I}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Api-Key": u },
    body: JSON.stringify(r)
  }), s = await t.json();
  if (!t.ok && s.status !== !1)
    throw new Error(`HTTP ${t.status} al registrar el reporte`);
  return s;
}
const X = { class: "rc-captura" }, F = ["src"], G = { class: "rc-captura-acciones" }, V = ["disabled"], W = {
  key: 1,
  class: "rc-error",
  role: "alert"
}, Y = { class: "rc-info" }, J = { key: 0 }, Q = { class: "rc-muted" }, Z = {
  key: 0,
  class: "rc-error",
  role: "alert"
}, ee = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const r = e, { mostrar_alerta: n, ocultar_modal: u } = M(), t = r.parametros.info, s = r.parametros.estado, a = C({
      slug_proyecto: r.parametros.slugProyecto ?? "",
      localizacion_componente: t.localizacion,
      url: t.url,
      version: r.parametros.version ?? "",
      notas: "",
      captura_pantalla: ""
    }), m = L(!1), y = L("");
    async function E() {
      y.value = "", m.value = !0;
      const d = document.querySelector(".gmm-stack"), i = (d == null ? void 0 : d.style.visibility) ?? "";
      d && (d.style.visibility = "hidden");
      let p = null;
      try {
        p = await navigator.mediaDevices.getDisplayMedia({ video: !0 });
        const c = document.createElement("video");
        c.srcObject = p, await c.play(), await new Promise((o) => {
          if (c.readyState >= 2) return o();
          c.onloadeddata = () => o();
        });
        const g = document.createElement("canvas");
        g.width = c.videoWidth, g.height = c.videoHeight, g.getContext("2d").drawImage(c, 0, 0), a.captura_pantalla = g.toDataURL("image/webp", 0.85);
      } catch (c) {
        (c == null ? void 0 : c.name) !== "NotAllowedError" && (console.log("[reporte-contextual] Error al tomar la captura:", c), y.value = "No se pudo tomar la captura de pantalla.");
      } finally {
        p == null || p.getTracks().forEach((c) => c.stop()), d && (d.style.visibility = i), m.value = !1;
      }
    }
    async function h() {
      s.error = "", s.enviando = !0;
      try {
        const d = await H({
          apiBaseUrl: r.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: a.slug_proyecto.trim(),
            captura_pantalla: a.captura_pantalla || null,
            localizacion_componente: a.localizacion_componente,
            url: a.url,
            version: a.version,
            notas: a.notas,
            navegador: t.navegador,
            ancho_viewport: t.ancho_viewport,
            alto_viewport: t.alto_viewport,
            es_movil: t.es_movil
          }
        });
        if (!d.status) {
          s.error = d.error;
          return;
        }
        u(r.parametros._modal_cod), n("Reporte registrado. ¡Gracias!");
      } catch (d) {
        console.log("[reporte-contextual] Error al enviar el reporte:", d), s.error = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        s.enviando = !1;
      }
    }
    return (d, i) => (f(), v("form", {
      id: "rc-form",
      class: "rc-form",
      onSubmit: $(h, ["prevent"])
    }, [
      i[6] || (i[6] = l("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        x("Notas "),
        l("span", { class: "rc-req" }, "*")
      ], -1)),
      D(l("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": i[0] || (i[0] = (p) => a.notas = p),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [R, a.notas]
      ]),
      i[7] || (i[7] = l("label", { class: "rc-label" }, [
        x("Captura de pantalla "),
        l("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      l("div", X, [
        a.captura_pantalla ? (f(), v("img", {
          key: 0,
          src: a.captura_pantalla,
          class: "rc-captura-preview",
          alt: "Captura de pantalla"
        }, null, 8, F)) : b("", !0),
        l("div", G, [
          l("button", {
            type: "button",
            class: "rc-btn rc-btn-secundario",
            disabled: m.value,
            onClick: E
          }, w(m.value ? "Capturando…" : a.captura_pantalla ? "Tomar otra captura" : "Tomar captura"), 9, V),
          a.captura_pantalla ? (f(), v("button", {
            key: 0,
            type: "button",
            class: "rc-btn rc-btn-secundario",
            onClick: i[1] || (i[1] = (p) => a.captura_pantalla = "")
          }, " Quitar ")) : b("", !0)
        ]),
        y.value ? (f(), v("div", W, w(y.value), 1)) : b("", !0)
      ]),
      l("div", Y, [
        i[5] || (i[5] = l("div", { class: "rc-info-titulo" }, [
          l("strong", null, "Detalles del elemento")
        ], -1)),
        l("div", null, [
          i[2] || (i[2] = l("strong", null, "Elemento:", -1)),
          i[3] || (i[3] = x()),
          l("code", null, w(_(t).tag), 1)
        ]),
        _(t).texto ? (f(), v("div", J, [
          i[4] || (i[4] = l("strong", null, "Texto:", -1)),
          x(" " + w(_(t).texto), 1)
        ])) : b("", !0),
        l("div", Q, [
          l("code", null, w(_(t).selector), 1)
        ])
      ]),
      _(s).error ? (f(), v("div", Z, w(_(s).error), 1)) : b("", !0)
    ], 32));
  }
}, te = { class: "rc-footer" }, oe = ["disabled"], re = {
  __name: "ReporteFormFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const r = e, { ocultar_modal: n } = M();
    function u() {
      n(r.parametros._modal_cod);
    }
    return (t, s) => (f(), v("div", te, [
      l("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: u
      }, "Cancelar"),
      l("button", {
        type: "submit",
        form: "rc-form",
        class: "gmm-btn gmm-btn-success",
        disabled: e.parametros.estado.enviando
      }, w(e.parametros.estado.enviando ? "Enviando…" : "Enviar reporte"), 9, oe)
    ]));
  }
}, ne = 6, T = 120, A = 255;
function ae(e) {
  const r = e.tagName.toLowerCase(), n = e.id ? `#${e.id}` : "", u = typeof e.className == "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((a) => `.${a}`).join("") : "";
  let t = "";
  const s = e.parentElement;
  if (s && !e.id) {
    const a = Array.from(s.children).filter((m) => m.tagName === e.tagName);
    a.length > 1 && (t = `:nth-of-type(${a.indexOf(e) + 1})`);
  }
  return `${r}${n}${u}${t}`;
}
function ie(e) {
  const r = [];
  let n = e;
  for (; n && n.nodeType === Node.ELEMENT_NODE && r.length < ne; ) {
    if (n === document.body) {
      r.unshift("body");
      break;
    }
    r.unshift(ae(n)), n = n.parentElement;
  }
  return r.join(" > ");
}
function se(e) {
  const n = (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim();
  return n.length > T ? `${n.slice(0, T)}…` : n;
}
function le() {
  const e = navigator.userAgent || "", r = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini/i.test(e), n = typeof window.matchMedia == "function" && window.matchMedia("(pointer: coarse)").matches;
  return r || n;
}
function P(e) {
  const r = e.closest("[data-reporte]"), n = ie(e);
  return {
    localizacion: (r ? r.getAttribute("data-reporte") : n).slice(0, A),
    selector: n.slice(0, A),
    tag: e.tagName.toLowerCase(),
    texto: se(e),
    url: window.location.href,
    navegador: navigator.userAgent || "",
    ancho_viewport: window.innerWidth,
    alto_viewport: window.innerHeight,
    es_movil: le()
  };
}
const ce = 200, ue = 40, k = 8, me = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null },
    // Slug del proyecto que se precompleta en el reporte (opcional).
    slugProyecto: { type: String, default: null }
  },
  setup(e) {
    const r = e, { mostrar_modal: n } = M(), u = L(null), t = C({ visible: !1, x: 0, y: 0, info: null });
    let s = !1;
    function a() {
      t.visible = !1, t.info = null;
    }
    function m(o) {
      return u.value !== null && u.value.contains(o);
    }
    function y(o) {
      o.altKey && (m(o.target) || o.target instanceof Element && (o.preventDefault(), t.info = P(o.target), t.x = Math.max(k, Math.min(o.clientX, window.innerWidth - ce - k)), t.y = Math.max(k, Math.min(o.clientY, window.innerHeight - ue - k)), t.visible = !0));
    }
    function E(o) {
      t.visible && (m(o.target) || a());
    }
    function h(o) {
      s && o.target instanceof Element && (m(o.target) || (o.preventDefault(), o.stopPropagation(), o.stopImmediatePropagation(), s = !1, c(P(o.target))));
    }
    function d(o) {
      o.key === "Escape" && a(), o.key.toLowerCase() === "d" && (s = !0);
    }
    function i(o) {
      o.key.toLowerCase() === "d" && (s = !1);
    }
    function p() {
      s = !1;
    }
    function c(o) {
      if (o === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      n(
        { body: ee, footer: re },
        "Reportar elemento",
        {
          info: o,
          apiBaseUrl: r.apiBaseUrl,
          version: r.version,
          slugProyecto: r.slugProyecto,
          estado: C({ enviando: !1, error: "" })
        },
        { size: "lg" }
      );
    }
    function g() {
      const o = t.info;
      a(), c(o);
    }
    return S(() => {
      document.addEventListener("contextmenu", y, !0), document.addEventListener("mousedown", E, !0), document.addEventListener("click", h, !0), document.addEventListener("keydown", d), document.addEventListener("keyup", i), window.addEventListener("blur", p), window.addEventListener("scroll", a, !0), window.addEventListener("resize", a);
    }), U(() => {
      document.removeEventListener("contextmenu", y, !0), document.removeEventListener("mousedown", E, !0), document.removeEventListener("click", h, !0), document.removeEventListener("keydown", d), document.removeEventListener("keyup", i), window.removeEventListener("blur", p), window.removeEventListener("scroll", a, !0), window.removeEventListener("resize", a);
    }), (o, N) => (f(), z(B, { to: "body" }, [
      t.visible ? (f(), v("div", {
        key: 0,
        ref_key: "menuRef",
        ref: u,
        class: "rc-menu",
        role: "menu",
        style: j({ top: `${t.y}px`, left: `${t.x}px` }),
        onContextmenu: N[0] || (N[0] = $(() => {
        }, ["prevent"]))
      }, [
        l("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: g
        }, " Reportar este elemento ")
      ], 36)) : b("", !0)
    ]));
  }
};
export {
  me as ReporteContextual,
  ee as ReporteFormModal,
  ie as construirSelector,
  me as default,
  H as enviarReporte,
  se as extraerTexto,
  P as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
