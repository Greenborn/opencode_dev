import { reactive as C, ref as L, openBlock as p, createElementBlock as f, withModifiers as P, createElementVNode as s, createTextVNode as E, withDirectives as $, vModelText as R, createCommentVNode as g, toDisplayString as y, unref as v, Fragment as S, renderList as U, onMounted as B, onBeforeUnmount as j, createBlock as z, Teleport as I, normalizeStyle as K } from "vue";
import { useModal as M } from "@greenborn/vue-greenborn-modal-manager";
const X = "/api/public/notas-desarrollo", q = "/api/public/notas-desarrollo/api-key";
function D(e) {
  if (typeof e != "string" || e.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return e.trim().replace(/\/+$/, "");
}
async function H({ apiBaseUrl: e }) {
  var t;
  const o = D(e), r = await fetch(`${o}${q}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  }), l = await r.json();
  if (!r.ok || l.status !== !0 || !((t = l.data) != null && t.apiKey))
    throw new Error("No se pudo obtener la apikey del reporte");
  return l.data.apiKey;
}
async function F({ apiBaseUrl: e, payload: o }) {
  const r = D(e);
  if (!o || typeof o != "object")
    throw new Error("payload es requerido");
  const l = await H({ apiBaseUrl: r }), t = await fetch(`${r}${X}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Api-Key": l },
    body: JSON.stringify(o)
  }), c = await t.json();
  if (!t.ok && c.status !== !1)
    throw new Error(`HTTP ${t.status} al registrar el reporte`);
  return c;
}
const V = { class: "rc-captura" }, W = ["src"], G = { class: "rc-captura-acciones" }, Y = ["disabled"], J = {
  key: 1,
  class: "rc-error",
  role: "alert"
}, Q = { class: "rc-info" }, Z = { key: 0 }, ee = { key: 1 }, te = { key: 2 }, oe = { key: 3 }, re = { class: "rc-atributos" }, ne = { class: "rc-muted" }, ae = {
  key: 0,
  class: "rc-error",
  role: "alert"
}, ie = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const o = e, { mostrar_alerta: r, ocultar_modal: l } = M(), t = o.parametros.info, c = o.parametros.estado, i = C({
      slug_proyecto: o.parametros.slugProyecto ?? "",
      localizacion_componente: t.localizacion,
      url: t.url,
      version: o.parametros.version ?? "",
      notas: "",
      captura_pantalla: ""
    }), _ = L(!1), b = L("");
    async function h() {
      b.value = "", _.value = !0;
      const d = document.querySelector(".gmm-stack"), a = (d == null ? void 0 : d.style.visibility) ?? "";
      d && (d.style.visibility = "hidden");
      let m = null;
      try {
        m = await navigator.mediaDevices.getDisplayMedia({ video: !0 });
        const u = document.createElement("video");
        u.srcObject = m, await u.play(), await new Promise((n) => {
          if (u.readyState >= 2) return n();
          u.onloadeddata = () => n();
        });
        const w = document.createElement("canvas");
        w.width = u.videoWidth, w.height = u.videoHeight, w.getContext("2d").drawImage(u, 0, 0), i.captura_pantalla = w.toDataURL("image/webp", 0.85);
      } catch (u) {
        (u == null ? void 0 : u.name) !== "NotAllowedError" && (console.log("[reporte-contextual] Error al tomar la captura:", u), b.value = "No se pudo tomar la captura de pantalla.");
      } finally {
        m == null || m.getTracks().forEach((u) => u.stop()), d && (d.style.visibility = a), _.value = !1;
      }
    }
    async function A() {
      c.error = "", c.enviando = !0;
      try {
        const d = await F({
          apiBaseUrl: o.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: i.slug_proyecto.trim(),
            captura_pantalla: i.captura_pantalla || null,
            localizacion_componente: i.localizacion_componente,
            url: i.url,
            version: i.version,
            notas: i.notas,
            navegador: t.navegador,
            ancho_viewport: t.ancho_viewport,
            alto_viewport: t.alto_viewport,
            es_movil: t.es_movil,
            id_elemento: t.id_elemento,
            clases_elemento: t.clases_elemento,
            atributos_data: t.atributos_data
          }
        });
        if (!d.status) {
          c.error = d.error;
          return;
        }
        l(o.parametros._modal_cod), r("Reporte registrado. ¡Gracias!");
      } catch (d) {
        console.log("[reporte-contextual] Error al enviar el reporte:", d), c.error = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        c.enviando = !1;
      }
    }
    return (d, a) => (p(), f("form", {
      id: "rc-form",
      class: "rc-form",
      onSubmit: P(A, ["prevent"])
    }, [
      a[11] || (a[11] = s("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        E("Notas "),
        s("span", { class: "rc-req" }, "*")
      ], -1)),
      $(s("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": a[0] || (a[0] = (m) => i.notas = m),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [R, i.notas]
      ]),
      a[12] || (a[12] = s("label", { class: "rc-label" }, [
        E("Captura de pantalla "),
        s("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      s("div", V, [
        i.captura_pantalla ? (p(), f("img", {
          key: 0,
          src: i.captura_pantalla,
          class: "rc-captura-preview",
          alt: "Captura de pantalla"
        }, null, 8, W)) : g("", !0),
        s("div", G, [
          s("button", {
            type: "button",
            class: "rc-btn rc-btn-secundario",
            disabled: _.value,
            onClick: h
          }, y(_.value ? "Capturando…" : i.captura_pantalla ? "Tomar otra captura" : "Tomar captura"), 9, Y),
          i.captura_pantalla ? (p(), f("button", {
            key: 0,
            type: "button",
            class: "rc-btn rc-btn-secundario",
            onClick: a[1] || (a[1] = (m) => i.captura_pantalla = "")
          }, " Quitar ")) : g("", !0)
        ]),
        b.value ? (p(), f("div", J, y(b.value), 1)) : g("", !0)
      ]),
      s("div", Q, [
        a[10] || (a[10] = s("div", { class: "rc-info-titulo" }, [
          s("strong", null, "Detalles del elemento")
        ], -1)),
        s("div", null, [
          a[2] || (a[2] = s("strong", null, "Elemento:", -1)),
          a[3] || (a[3] = E()),
          s("code", null, y(v(t).tag), 1)
        ]),
        v(t).texto ? (p(), f("div", Z, [
          a[4] || (a[4] = s("strong", null, "Texto:", -1)),
          E(" " + y(v(t).texto), 1)
        ])) : g("", !0),
        v(t).id_elemento ? (p(), f("div", ee, [
          a[5] || (a[5] = s("strong", null, "ID:", -1)),
          a[6] || (a[6] = E()),
          s("code", null, y(v(t).id_elemento), 1)
        ])) : g("", !0),
        v(t).clases_elemento ? (p(), f("div", te, [
          a[7] || (a[7] = s("strong", null, "Clase:", -1)),
          a[8] || (a[8] = E()),
          s("code", null, y(v(t).clases_elemento), 1)
        ])) : g("", !0),
        Object.keys(v(t).atributos_data || {}).length ? (p(), f("div", oe, [
          a[9] || (a[9] = s("strong", null, "Atributos data:", -1)),
          s("ul", re, [
            (p(!0), f(S, null, U(v(t).atributos_data, (m, u) => (p(), f("li", { key: u }, [
              s("code", null, y(u) + '="' + y(m) + '"', 1)
            ]))), 128))
          ])
        ])) : g("", !0),
        s("div", ne, [
          s("code", null, y(v(t).selector), 1)
        ])
      ]),
      v(c).error ? (p(), f("div", ae, y(v(c).error), 1)) : g("", !0)
    ], 32));
  }
}, se = { class: "rc-footer" }, le = ["disabled"], ce = {
  __name: "ReporteFormFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const o = e, { ocultar_modal: r } = M();
    function l() {
      r(o.parametros._modal_cod);
    }
    return (t, c) => (p(), f("div", se, [
      s("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: l
      }, "Cancelar"),
      s("button", {
        type: "submit",
        form: "rc-form",
        class: "gmm-btn gmm-btn-success",
        disabled: e.parametros.estado.enviando
      }, y(e.parametros.estado.enviando ? "Enviando…" : "Enviar reporte"), 9, le)
    ]));
  }
}, ue = 6, N = 120, x = 255, de = 500, pe = 30, me = 300;
function fe(e) {
  const o = {};
  let r = 0;
  for (const l of Array.from(e.attributes || []))
    if (l.name.startsWith("data-")) {
      if (r >= pe) break;
      o[l.name] = l.value.slice(0, me), r += 1;
    }
  return o;
}
function ve(e) {
  const o = e.tagName.toLowerCase(), r = e.id ? `#${e.id}` : "", l = typeof e.className == "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((i) => `.${i}`).join("") : "";
  let t = "";
  const c = e.parentElement;
  if (c && !e.id) {
    const i = Array.from(c.children).filter((_) => _.tagName === e.tagName);
    i.length > 1 && (t = `:nth-of-type(${i.indexOf(e) + 1})`);
  }
  return `${o}${r}${l}${t}`;
}
function ye(e) {
  const o = [];
  let r = e;
  for (; r && r.nodeType === Node.ELEMENT_NODE && o.length < ue; ) {
    if (r === document.body) {
      o.unshift("body");
      break;
    }
    o.unshift(ve(r)), r = r.parentElement;
  }
  return o.join(" > ");
}
function _e(e) {
  const r = (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim();
  return r.length > N ? `${r.slice(0, N)}…` : r;
}
function ge() {
  const e = navigator.userAgent || "", o = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini/i.test(e), r = typeof window.matchMedia == "function" && window.matchMedia("(pointer: coarse)").matches;
  return o || r;
}
function O(e) {
  const o = e.closest("[data-reporte]"), r = ye(e);
  return {
    localizacion: (o ? o.getAttribute("data-reporte") : r).slice(0, x),
    selector: r.slice(0, x),
    tag: e.tagName.toLowerCase(),
    texto: _e(e),
    id_elemento: e.id ? e.id.slice(0, x) : null,
    clases_elemento: typeof e.className == "string" ? e.className.trim().replace(/\s+/g, " ").slice(0, de) : "",
    atributos_data: fe(e),
    url: window.location.href,
    navegador: navigator.userAgent || "",
    ancho_viewport: window.innerWidth,
    alto_viewport: window.innerHeight,
    es_movil: ge()
  };
}
const be = 200, we = 40, k = 8, Ae = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null },
    // Slug del proyecto que se precompleta en el reporte (opcional).
    slugProyecto: { type: String, default: null }
  },
  setup(e) {
    const o = e, { mostrar_modal: r } = M(), l = L(null), t = C({ visible: !1, x: 0, y: 0, info: null });
    let c = !1;
    function i() {
      t.visible = !1, t.info = null;
    }
    function _(n) {
      return l.value !== null && l.value.contains(n);
    }
    function b(n) {
      n.altKey && (_(n.target) || n.target instanceof Element && (n.preventDefault(), t.info = O(n.target), t.x = Math.max(k, Math.min(n.clientX, window.innerWidth - be - k)), t.y = Math.max(k, Math.min(n.clientY, window.innerHeight - we - k)), t.visible = !0));
    }
    function h(n) {
      t.visible && (_(n.target) || i());
    }
    function A(n) {
      c && n.target instanceof Element && (_(n.target) || (n.preventDefault(), n.stopPropagation(), n.stopImmediatePropagation(), c = !1, u(O(n.target))));
    }
    function d(n) {
      n.key === "Escape" && i(), n.key.toLowerCase() === "d" && (c = !0);
    }
    function a(n) {
      n.key.toLowerCase() === "d" && (c = !1);
    }
    function m() {
      c = !1;
    }
    function u(n) {
      if (n === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      r(
        { body: ie, footer: ce },
        "Reportar elemento",
        {
          info: n,
          apiBaseUrl: o.apiBaseUrl,
          version: o.version,
          slugProyecto: o.slugProyecto,
          estado: C({ enviando: !1, error: "" })
        },
        { size: "lg" }
      );
    }
    function w() {
      const n = t.info;
      i(), u(n);
    }
    return B(() => {
      document.addEventListener("contextmenu", b, !0), document.addEventListener("mousedown", h, !0), document.addEventListener("click", A, !0), document.addEventListener("keydown", d), document.addEventListener("keyup", a), window.addEventListener("blur", m), window.addEventListener("scroll", i, !0), window.addEventListener("resize", i);
    }), j(() => {
      document.removeEventListener("contextmenu", b, !0), document.removeEventListener("mousedown", h, !0), document.removeEventListener("click", A, !0), document.removeEventListener("keydown", d), document.removeEventListener("keyup", a), window.removeEventListener("blur", m), window.removeEventListener("scroll", i, !0), window.removeEventListener("resize", i);
    }), (n, T) => (p(), z(I, { to: "body" }, [
      t.visible ? (p(), f("div", {
        key: 0,
        ref_key: "menuRef",
        ref: l,
        class: "rc-menu",
        role: "menu",
        style: K({ top: `${t.y}px`, left: `${t.x}px` }),
        onContextmenu: T[0] || (T[0] = P(() => {
        }, ["prevent"]))
      }, [
        s("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: w
        }, " Reportar este elemento ")
      ], 36)) : g("", !0)
    ]));
  }
};
export {
  Ae as ReporteContextual,
  ie as ReporteFormModal,
  ye as construirSelector,
  Ae as default,
  F as enviarReporte,
  _e as extraerTexto,
  O as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
