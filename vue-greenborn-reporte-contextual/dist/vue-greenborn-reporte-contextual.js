import { reactive as C, ref as E, onMounted as $, openBlock as f, createElementBlock as g, withModifiers as k, createElementVNode as l, createTextVNode as _, toDisplayString as v, unref as N, createCommentVNode as T, withDirectives as w, Fragment as R, renderList as P, vModelSelect as B, vModelText as h, onBeforeUnmount as j, createBlock as D, Teleport as H, normalizeStyle as V } from "vue";
import { useModal as O } from "vue-greenborn-modal-manager";
const q = "/api/proyectos", I = "/api/public/notas-desarrollo", F = 100, X = 50;
function S(e) {
  if (typeof e != "string" || e.trim() === "")
    throw new Error("apiBaseUrl es requerido");
  return e.trim().replace(/\/+$/, "");
}
function G(e) {
  const t = { Accept: "application/json" };
  if (e == null)
    return t;
  if (typeof e != "function")
    throw new Error("getAuthHeaders debe ser una función");
  const n = e();
  if (!n || typeof n != "object")
    throw new Error("getAuthHeaders debe devolver un objeto de cabeceras");
  return { ...t, ...n };
}
async function Y({ apiBaseUrl: e, getAuthHeaders: t }) {
  const n = S(e), u = G(t), o = [];
  for (let i = 1; i <= X; i++) {
    const s = `${n}${q}?page=${i}&pageSize=${F}&sortField=slug&sortOrder=asc`, d = await fetch(s, { headers: u });
    if (!d.ok)
      throw new Error(`HTTP ${d.status} al listar proyectos`);
    const p = await d.json();
    if (!p.status)
      throw new Error(p.error ?? "Error al listar proyectos");
    const y = p.data.rows;
    for (const m of y)
      o.push({ slug: m.slug, nombre: m.nombre });
    if (y.length === 0 || o.length >= p.data.total)
      break;
  }
  return o;
}
async function K({ apiBaseUrl: e, payload: t }) {
  const n = S(e);
  if (!t || typeof t != "object")
    throw new Error("payload es requerido");
  const u = await fetch(`${n}${I}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(t)
  }), o = await u.json();
  if (!u.ok && o.status !== !1)
    throw new Error(`HTTP ${u.status} al registrar el reporte`);
  return o;
}
const Z = { class: "rc-info" }, J = { key: 0 }, W = { class: "rc-muted" }, Q = ["disabled"], ee = {
  value: "",
  disabled: ""
}, te = ["value"], oe = {
  key: 2,
  class: "rc-error",
  role: "alert"
}, re = { class: "rc-acciones" }, ne = ["disabled"], se = {
  __name: "ReporteFormModal",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, { mostrar_alerta: n, ocultar_modal: u } = O(), o = t.parametros.info, i = t.parametros.version ?? "", s = C({
      slug_proyecto: "",
      localizacion_componente: o.localizacion,
      url: o.url,
      version: i,
      notas: ""
    }), d = E([]), p = E(!0), y = E(!1), m = E(!1), a = E("");
    function x() {
      u(t.parametros._modal_cod);
    }
    function U() {
      x();
    }
    $(async () => {
      try {
        d.value = await Y({
          apiBaseUrl: t.parametros.apiBaseUrl,
          getAuthHeaders: t.parametros.getAuthHeaders
        });
      } catch (b) {
        console.log("[reporte-contextual] No se pudo listar proyectos:", b), y.value = !0, a.value = "No se pudo cargar la lista de proyectos. Escriba el slug manualmente.";
      } finally {
        p.value = !1;
      }
    });
    async function z() {
      a.value = "", m.value = !0;
      try {
        const b = await K({
          apiBaseUrl: t.parametros.apiBaseUrl,
          payload: {
            tipo_proyecto: "PROYECTO",
            slug_proyecto: s.slug_proyecto.trim(),
            localizacion_componente: s.localizacion_componente,
            url: s.url,
            version: s.version,
            notas: s.notas
          }
        });
        if (!b.status) {
          a.value = b.error;
          return;
        }
        x(), n("Reporte registrado. ¡Gracias!");
      } catch (b) {
        console.log("[reporte-contextual] Error al enviar el reporte:", b), a.value = "No se pudo enviar el reporte. Intente nuevamente.";
      } finally {
        m.value = !1;
      }
    }
    return (b, r) => (f(), g("form", {
      class: "rc-form",
      onSubmit: k(z, ["prevent"])
    }, [
      l("div", Z, [
        l("div", null, [
          r[6] || (r[6] = l("strong", null, "Elemento:", -1)),
          r[7] || (r[7] = _()),
          l("code", null, v(N(o).tag), 1)
        ]),
        N(o).texto ? (f(), g("div", J, [
          r[8] || (r[8] = l("strong", null, "Texto:", -1)),
          _(" " + v(N(o).texto), 1)
        ])) : T("", !0),
        l("div", W, [
          l("code", null, v(N(o).selector), 1)
        ])
      ]),
      r[9] || (r[9] = l("label", {
        class: "rc-label",
        for: "rc-proyecto"
      }, [
        _("Proyecto "),
        l("span", { class: "rc-req" }, "*")
      ], -1)),
      y.value ? w((f(), g("input", {
        key: 1,
        id: "rc-proyecto",
        "onUpdate:modelValue": r[1] || (r[1] = (c) => s.slug_proyecto = c),
        class: "rc-input",
        type: "text",
        maxlength: "255",
        placeholder: "slug del proyecto",
        required: ""
      }, null, 512)), [
        [h, s.slug_proyecto]
      ]) : w((f(), g("select", {
        key: 0,
        id: "rc-proyecto",
        "onUpdate:modelValue": r[0] || (r[0] = (c) => s.slug_proyecto = c),
        class: "rc-input",
        required: "",
        disabled: p.value
      }, [
        l("option", ee, v(p.value ? "Cargando proyectos…" : "Seleccione un proyecto"), 1),
        (f(!0), g(R, null, P(d.value, (c) => (f(), g("option", {
          key: c.slug,
          value: c.slug
        }, v(c.nombre) + " (" + v(c.slug) + ")", 9, te))), 128))
      ], 8, Q)), [
        [B, s.slug_proyecto]
      ]),
      r[10] || (r[10] = l("label", {
        class: "rc-label",
        for: "rc-componente"
      }, "Localización del componente", -1)),
      w(l("input", {
        id: "rc-componente",
        "onUpdate:modelValue": r[2] || (r[2] = (c) => s.localizacion_componente = c),
        class: "rc-input",
        type: "text",
        maxlength: "255"
      }, null, 512), [
        [h, s.localizacion_componente]
      ]),
      r[11] || (r[11] = l("label", {
        class: "rc-label",
        for: "rc-url"
      }, "URL de la vista", -1)),
      w(l("input", {
        id: "rc-url",
        "onUpdate:modelValue": r[3] || (r[3] = (c) => s.url = c),
        class: "rc-input",
        type: "text",
        maxlength: "500"
      }, null, 512), [
        [h, s.url]
      ]),
      r[12] || (r[12] = l("label", {
        class: "rc-label",
        for: "rc-version"
      }, [
        _("Versión "),
        l("span", { class: "rc-muted" }, "(opcional)")
      ], -1)),
      w(l("input", {
        id: "rc-version",
        "onUpdate:modelValue": r[4] || (r[4] = (c) => s.version = c),
        class: "rc-input",
        type: "text",
        maxlength: "50"
      }, null, 512), [
        [h, s.version]
      ]),
      r[13] || (r[13] = l("label", {
        class: "rc-label",
        for: "rc-notas"
      }, [
        _("Notas "),
        l("span", { class: "rc-req" }, "*")
      ], -1)),
      w(l("textarea", {
        id: "rc-notas",
        "onUpdate:modelValue": r[5] || (r[5] = (c) => s.notas = c),
        class: "rc-input",
        rows: "5",
        maxlength: "5000",
        required: ""
      }, null, 512), [
        [h, s.notas]
      ]),
      a.value ? (f(), g("div", oe, v(a.value), 1)) : T("", !0),
      l("div", re, [
        l("button", {
          type: "button",
          class: "rc-btn rc-btn-secundario",
          onClick: U
        }, "Cancelar"),
        l("button", {
          type: "submit",
          class: "rc-btn rc-btn-primario",
          disabled: m.value
        }, v(m.value ? "Enviando…" : "Enviar reporte"), 9, ne)
      ])
    ], 32));
  }
}, ae = 6, M = 120, L = 255;
function le(e) {
  const t = e.tagName.toLowerCase(), n = e.id ? `#${e.id}` : "", u = typeof e.className == "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((s) => `.${s}`).join("") : "";
  let o = "";
  const i = e.parentElement;
  if (i && !e.id) {
    const s = Array.from(i.children).filter((d) => d.tagName === e.tagName);
    s.length > 1 && (o = `:nth-of-type(${s.indexOf(e) + 1})`);
  }
  return `${t}${n}${u}${o}`;
}
function ie(e) {
  const t = [];
  let n = e;
  for (; n && n.nodeType === Node.ELEMENT_NODE && t.length < ae; ) {
    if (n === document.body) {
      t.unshift("body");
      break;
    }
    t.unshift(le(n)), n = n.parentElement;
  }
  return t.join(" > ");
}
function ce(e) {
  const n = (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim();
  return n.length > M ? `${n.slice(0, M)}…` : n;
}
function ue(e) {
  const t = e.closest("[data-reporte]"), n = ie(e);
  return {
    localizacion: (t ? t.getAttribute("data-reporte") : n).slice(0, L),
    selector: n.slice(0, L),
    tag: e.tagName.toLowerCase(),
    texto: ce(e),
    url: window.location.href
  };
}
const de = 200, pe = 40, A = 8, ye = {
  __name: "ReporteContextual",
  props: {
    apiBaseUrl: { type: String, required: !0 },
    // Devuelve las cabeceras de autenticación del SGI (p. ej. { Authorization: 'Bearer ...' }).
    // Solo se usa para listar proyectos; el envío de la nota es público.
    getAuthHeaders: { type: Function, default: null },
    // Versión que se precompleta en el reporte (opcional).
    version: { type: String, default: null }
  },
  setup(e) {
    const t = e, { mostrar_modal: n } = O(), u = E(null), o = C({ visible: !1, x: 0, y: 0, info: null });
    function i() {
      o.visible = !1, o.info = null;
    }
    function s(a) {
      return u.value !== null && u.value.contains(a);
    }
    function d(a) {
      a.shiftKey || s(a.target) || a.target instanceof Element && (a.preventDefault(), o.info = ue(a.target), o.x = Math.max(A, Math.min(a.clientX, window.innerWidth - de - A)), o.y = Math.max(A, Math.min(a.clientY, window.innerHeight - pe - A)), o.visible = !0);
    }
    function p(a) {
      o.visible && (s(a.target) || i());
    }
    function y(a) {
      a.key === "Escape" && i();
    }
    function m() {
      const a = o.info;
      if (i(), a === null) {
        console.log("[reporte-contextual] Se intentó reportar sin información del elemento");
        return;
      }
      n(
        se,
        "Reportar elemento",
        {
          info: a,
          apiBaseUrl: t.apiBaseUrl,
          getAuthHeaders: t.getAuthHeaders,
          version: t.version
        },
        { size: "lg" }
      );
    }
    return $(() => {
      document.addEventListener("contextmenu", d, !0), document.addEventListener("mousedown", p, !0), document.addEventListener("keydown", y), window.addEventListener("scroll", i, !0), window.addEventListener("resize", i);
    }), j(() => {
      document.removeEventListener("contextmenu", d, !0), document.removeEventListener("mousedown", p, !0), document.removeEventListener("keydown", y), window.removeEventListener("scroll", i, !0), window.removeEventListener("resize", i);
    }), (a, x) => (f(), D(H, { to: "body" }, [
      o.visible ? (f(), g("div", {
        key: 0,
        ref_key: "menuRef",
        ref: u,
        class: "rc-menu",
        role: "menu",
        style: V({ top: `${o.y}px`, left: `${o.x}px` }),
        onContextmenu: x[0] || (x[0] = k(() => {
        }, ["prevent"]))
      }, [
        l("button", {
          type: "button",
          class: "rc-menu-item",
          role: "menuitem",
          onClick: m
        }, " Reportar este elemento ")
      ], 36)) : T("", !0)
    ]));
  }
};
export {
  ye as ReporteContextual,
  se as ReporteFormModal,
  Y as cargarProyectos,
  ie as construirSelector,
  ye as default,
  K as enviarReporte,
  ce as extraerTexto,
  ue as obtenerInfoElemento
};
//# sourceMappingURL=vue-greenborn-reporte-contextual.js.map
