import { reactive as J, ref as U, openBlock as p, createElementBlock as m, withModifiers as je, toDisplayString as E, createCommentVNode as j, Fragment as T, renderList as z, unref as d, mergeProps as Fe, createElementVNode as g, createTextVNode as fe, withDirectives as C, vModelCheckbox as pe, vModelSelect as X, vModelText as me, vModelDynamic as Z, computed as S, watch as ye, createVNode as De } from "vue";
import { BtnConfig as I, TableEditor as Ue } from "@greenborn/vue-table-editor";
import { useModal as le } from "@greenborn/vue-greenborn-modal-manager";
const qe = ["listar", "crear", "editar", "eliminar"], Pe = 4, Me = {
  text: "text",
  number: "number",
  date: "date",
  boolean: "checkbox",
  select: "select",
  multiselect: "multiselect"
}, Te = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
  "multiselect",
  "textarea",
  "markdown",
  "email"
];
function _(e, n) {
  if (e == null || e === "")
    throw new Error(`[crud] Parámetro requerido faltante: ${n}`);
  return e;
}
function Re({ recurso: e, endpoint: n, http: t, permisos: r }) {
  if (_(e, "recurso"), _(n, "endpoint"), _(t, "http"), typeof t.get != "function" || typeof t.post != "function" || typeof t.put != "function" || typeof t.delete != "function")
    throw new Error('[crud] "http" debe exponer get, post, put y delete');
  if (!Array.isArray(r))
    throw new Error('[crud] "permisos" es requerido y debe ser un array de strings');
  return !0;
}
function Le(e) {
  _(e, "recurso");
  const n = {};
  for (const t of qe)
    n[t] = `${e}.${t}`;
  return n;
}
function be(e, n) {
  if (!Array.isArray(e))
    throw new Error('[crud] tienePermiso: "permisos" debe ser un array');
  return e.includes(n);
}
function we(e) {
  if (_(e, "campo"), _(e.field, "campo.field"), e.form_type !== void 0) {
    if (!Te.includes(e.form_type))
      throw new Error(`[crud] form_type inválido en "${e.field}": ${e.form_type}`);
    return e.form_type;
  }
  const n = Me[e.type];
  return n === void 0 ? "text" : n;
}
function re(e) {
  if (!Array.isArray(e))
    throw new Error('[crud] camposFormulario: "campos" debe ser un array');
  return e.filter((n) => n.writable !== !1).map((n) => ({ ...n, form_type: we(n) }));
}
function Ie(e, n) {
  if (!Array.isArray(e))
    throw new Error('[crud] combinarOpciones: "campos" debe ser un array');
  if (n == null) return e;
  if (!Array.isArray(n))
    throw new Error('[crud] combinarOpciones: "fieldsDef" debe ser un array o null');
  return e.map((t) => {
    if (t.options !== void 0) return t;
    const r = n.find((o) => o !== null && typeof o == "object" && o.field === t.field);
    return r === void 0 || !Array.isArray(r.options) ? t : { ...t, options: r.options };
  });
}
function se(e) {
  return _(e, "campo"), Array.isArray(e.options) ? e.options : [];
}
function ze(e) {
  if (_(e, "campo"), e.filas === void 0) return Pe;
  if (!Number.isInteger(e.filas) || e.filas < 1)
    throw new Error(`[crud] "filas" inválido en "${e.field}": debe ser un entero >= 1`);
  return e.filas;
}
function ke(e) {
  return e == null ? !0 : Array.isArray(e) ? e.length === 0 : String(e).trim() === "";
}
function He(e) {
  if (!Array.isArray(e))
    throw new Error('[crud] fieldsDefDesdeCampos: "campos" debe ser un array');
  return e.map((n) => {
    _(n.field, "campo.field");
    const t = {
      field: n.field,
      headerName: n.headerName === void 0 ? n.field : n.headerName,
      type: n.type,
      sortable: n.sortable,
      filterable: n.filterable,
      form_type: we(n)
    };
    return n.css !== void 0 && (t.css = n.css), t;
  });
}
function Be(e, n) {
  const t = {};
  for (const r of re(e)) {
    const o = n == null ? void 0 : n[r.field];
    r.form_type === "checkbox" ? t[r.field] = o === !0 || o === 1 : r.form_type === "multiselect" ? t[r.field] = Array.isArray(o) ? o.slice() : [] : t[r.field] = o ?? "";
  }
  return t;
}
function Ke(e, n) {
  const t = {};
  for (const r of re(e)) {
    const o = n[r.field];
    if (r.form_type === "checkbox") continue;
    const l = ke(o);
    if (r.required === !0 && l) {
      t[r.field] = `${r.headerName === void 0 ? r.field : r.headerName} es obligatorio`;
      continue;
    }
    r.form_type === "number" && !l && Number.isNaN(Number(o)) && (t[r.field] = "Debe ser un número");
  }
  return t;
}
function Ge(e, n) {
  const t = {};
  for (const r of re(e)) {
    const o = n[r.field];
    r.form_type === "checkbox" ? t[r.field] = o === !0 || o === 1 : r.form_type === "multiselect" ? t[r.field] = Array.isArray(o) ? o.slice() : [] : ke(o) ? t[r.field] = null : r.form_type === "number" ? t[r.field] = Number(o) : t[r.field] = o;
  }
  return t;
}
const Je = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function K(e) {
  return String(e).replace(/[&<>"']/g, (n) => Je[n]);
}
function ve(e, n) {
  const t = se(e).find((r) => String(r.value) === String(n));
  return t === void 0 ? void 0 : t.label;
}
function Ye(e, n) {
  _(e, "campo"), _(n, "fila");
  const t = n[e.field], r = `${e.field}_etiqueta`;
  if (n[r] !== void 0 && n[r] !== null)
    return K(n[r]);
  if (e.form_type === "multiselect" || e.type === "multiselect")
    return Array.isArray(t) ? t.map((l) => {
      const u = ve(e, l);
      return K(u === void 0 ? l : u);
    }).join(", ") : K(t ?? "");
  if (t == null) return "";
  const o = ve(e, t);
  return K(o === void 0 ? t : o);
}
function Qe(e) {
  if (e == null) return {};
  if (!Array.isArray(e))
    throw new Error('[crud] formateadoresCeldas: "campos" debe ser un array o null');
  const n = {};
  for (const t of e)
    n[t.field] = (r) => Ye(t, r);
  return n;
}
function We(e) {
  if (typeof e != "string")
    throw new Error('[crud] markdownAHtmlSeguro: "texto" debe ser string');
  const n = (l) => l.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>"), t = [];
  let r = [];
  const o = () => {
    r.length > 0 && (t.push(`<p>${r.join("<br>")}</p>`), r = []);
  };
  for (const l of K(e).split(/\r?\n/)) {
    const u = /^(#{1,3})\s+(.*)$/.exec(l);
    if (u !== null) {
      o();
      const c = u[1].length;
      t.push(`<h${c}>${n(u[2])}</h${c}>`);
    } else l.trim() === "" ? o() : r.push(n(l));
  }
  return o(), t.join(`
`);
}
function G(e) {
  let n = null;
  e !== null && typeof e == "object" && e.response && typeof e.response == "object" ? n = e.response.data === void 0 ? null : e.response.data : e !== null && typeof e == "object" && e.status === !1 && (n = e);
  const t = n && typeof n.message == "string" ? n.message : e instanceof Error ? e.message : "Error desconocido", r = n && n.errors && typeof n.errors == "object" ? n.errors : {};
  return { message: t, errors: r };
}
function he(e) {
  return e !== null && typeof e == "object" && e.status === !1;
}
const $e = {
  igual: "Igual a",
  distinto: "Distinto de",
  contiene: "Contiene",
  en: "En la lista",
  rango: "Entre",
  nulo: "Es nulo"
};
function ee(e) {
  return _(e, "campo"), e.filterable !== !0 ? [] : Array.isArray(e.operadores) ? e.operadores.filter((n) => $e[n] !== void 0) : [];
}
function ie(e, n) {
  if (n == null) return;
  const t = String(n).trim();
  if (t !== "") {
    if (e.type === "number") {
      const r = Number(t);
      if (Number.isNaN(r)) throw new Error(`[crud] "${e.field}": debe ser un número`);
      return r;
    }
    if (e.type === "boolean") {
      if (t === "si") return !0;
      if (t === "no") return !1;
      throw new Error(`[crud] "${e.field}": debe ser si o no`);
    }
    return t;
  }
}
function Xe(e, n) {
  if (!Array.isArray(e)) throw new Error('[crud] construirFiltrosAvanzados: "campos" debe ser un array');
  const t = {};
  for (const r of e) {
    const o = n[r.field];
    if (o == null) continue;
    const l = o.op;
    if (!(l === void 0 || l === "" || l === null)) {
      if (!ee(r).includes(l))
        throw new Error(`[crud] operador "${l}" no permitido en "${r.field}"`);
      if (l === "rango") {
        const u = ie(r, o.desde), c = ie(r, o.hasta);
        if (u === void 0 && c === void 0) continue;
        const k = { op: l };
        u !== void 0 && (k.desde = u), c !== void 0 && (k.hasta = c), t[r.field] = k;
      } else if (l === "en") {
        const u = String(o.valor === void 0 || o.valor === null ? "" : o.valor).split(",").map((c) => c.trim()).filter((c) => c !== "").map((c) => r.type === "number" ? Number(c) : c);
        if (u.length === 0) continue;
        t[r.field] = { op: l, valor: u };
      } else if (l === "nulo")
        (o.valor === "si" || o.valor === "no") && (t[r.field] = { op: l, valor: o.valor === "si" });
      else {
        const u = ie(r, o.valor);
        if (u === void 0) continue;
        t[r.field] = { op: l, valor: u };
      }
    }
  }
  return t;
}
function Ze(e, n) {
  let t = {};
  if (e != null && e !== "") {
    if (typeof e != "string") throw new Error('[crud] combinarFiltros: "filters" debe ser string JSON');
    const o = JSON.parse(e);
    if (o === null || typeof o != "object" || Array.isArray(o))
      throw new Error('[crud] combinarFiltros: "filters" debe ser un objeto JSON');
    t = o;
  }
  const r = { ...t, ...n ?? {} };
  return Object.keys(r).length === 0 ? void 0 : JSON.stringify(r);
}
function Ee(e) {
  _(e, "paginacion");
  const t = (Array.isArray(e.tamanosPermitidos) ? e.tamanosPermitidos : [10, 25, 50, 100, 200]).filter((r) => r <= e.tamanoMaximo);
  return t.includes(e.tamanoDefecto) || t.push(e.tamanoDefecto), [...new Set(t)].sort((r, o) => r - o);
}
function ge(e, n) {
  if (n == null) return;
  const t = Ee(n);
  return e !== void 0 && t.includes(Number(e)) ? Number(e) : n.tamanoDefecto;
}
const _e = ["listar", "crear", "editar", "eliminar"];
function er(e, { recurso: n }) {
  _(n, "recurso");
  const t = { botones: {}, campos: {} };
  for (const u of _e) t.botones[u] = null;
  if (e == null) return t;
  if (typeof e != "object") throw new Error('[crud] "ayuda" debe ser un objeto');
  let r = null;
  if (typeof e.clave == "function") {
    if (r = e.clave({ recurso: n }), typeof r != "string" || r === "") throw new Error("[crud] ayuda.clave(ctx) debe devolver un string no vacío");
  } else if (e.clave !== void 0) {
    if (typeof e.clave != "string" || e.clave === "") throw new Error("[crud] ayuda.clave debe ser string o función");
    r = e.clave;
  }
  const o = e.botones === void 0 ? {} : e.botones;
  for (const u of _e) {
    const c = o[u];
    if (!(c === void 0 || c === !1))
      if (c === !0) {
        if (r === null) throw new Error(`[crud] ayuda.botones.${u}: true requiere ayuda.clave`);
        t.botones[u] = `${r}-${u}`;
      } else if (typeof c == "string" && c !== "")
        t.botones[u] = c;
      else
        throw new Error(`[crud] ayuda.botones.${u} debe ser string, true o false`);
  }
  const l = o.campo === void 0 ? {} : o.campo;
  if (l === null || typeof l != "object") throw new Error("[crud] ayuda.botones.campo debe ser un objeto");
  for (const [u, c] of Object.entries(l))
    if (c === !0) {
      if (r === null) throw new Error(`[crud] ayuda.botones.campo.${u}: true requiere ayuda.clave`);
      t.campos[u] = `${r}-campo-${u}`;
    } else if (typeof c == "string" && c !== "")
      t.campos[u] = c;
    else if (c !== !1 && c !== void 0)
      throw new Error(`[crud] ayuda.botones.campo.${u} debe ser string, true o false`);
  return t;
}
function rr(e) {
  return e == null ? {} : { "data-help": e };
}
function tr(e) {
  return _(e, "recurso"), `te_cfg_${e}`;
}
function Qr(e, n = "crud_prefs:") {
  return _(e, "storage"), {
    leer(t) {
      try {
        return e.getItem(`${n}${t}`);
      } catch (r) {
        return console.error("[crud] preferencias locales: error al leer", r), null;
      }
    },
    guardar(t, r) {
      try {
        e.setItem(`${n}${t}`, typeof r == "string" ? r : JSON.stringify(r));
      } catch (o) {
        console.error("[crud] preferencias locales: error al guardar", o);
      }
    }
  };
}
function nr(e, n) {
  if (e == null) return null;
  if (typeof e.leer != "function" || typeof e.guardar != "function")
    throw new Error('[crud] "preferencias" debe exponer leer(clave) y guardar(clave, valor)');
  const t = tr(n), r = {};
  return {
    get misValores() {
      return r;
    },
    valor(o) {
      const l = r[o];
      return l == null || l === "" ? null : l;
    },
    async fetchMisPreferencias() {
      try {
        const o = await e.leer(t);
        o != null && (r[t] = o);
      } catch (o) {
        console.error("[crud] error al leer preferencias de columnas:", o);
      }
    },
    async guardarValores(o) {
      let l = { status: !0 };
      for (const [u, c] of Object.entries(o)) {
        r[u] = c;
        try {
          await e.guardar(u, c);
        } catch (k) {
          console.error("[crud] error al guardar preferencias de columnas:", k), l = { status: !1, error: String(k && k.message ? k.message : k) };
        }
      }
      return l;
    }
  };
}
const or = {
  key: 0,
  class: "crud-error crud-error-general"
}, ir = ["for"], lr = {
  key: 0,
  class: "crud-required"
}, sr = ["id", "onUpdate:modelValue"], ar = ["id", "onUpdate:modelValue"], ur = {
  key: 0,
  value: "",
  disabled: ""
}, dr = {
  key: 1,
  value: ""
}, cr = ["value"], fr = ["id"], pr = ["onUpdate:modelValue", "value"], mr = {
  key: 0,
  class: "crud-help"
}, yr = ["id", "onUpdate:modelValue", "rows"], br = {
  key: 4,
  class: "crud-markdown"
}, vr = ["id", "onUpdate:modelValue", "rows"], hr = { class: "crud-markdown-barra" }, gr = ["onClick"], _r = ["innerHTML"], wr = ["id", "onUpdate:modelValue", "type"], kr = {
  key: 6,
  class: "crud-error"
}, $r = {
  __name: "FormCrud",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const n = e, { ocultar_modal: t } = le(), r = n.parametros, o = r.campos, l = J(Be(o, r.fila)), u = J({}), c = U(""), k = J({});
    function O(h) {
      return rr(r.ayudaCampos === void 0 ? void 0 : r.ayudaCampos[h.field]);
    }
    function x(h) {
      return `crud-${r.modo}-${h.field}`;
    }
    function q(h) {
      return se(h);
    }
    function v(h) {
      return ze(h);
    }
    function F(h) {
      const A = l[h.field];
      return A == null ? "" : String(A);
    }
    function N(h) {
      k[h.field] = k[h.field] !== !0;
    }
    function L(h) {
      return h.form_type === "date" ? "date" : h.form_type === "number" ? "number" : h.form_type === "email" ? "email" : "text";
    }
    function P() {
      for (const h of Object.keys(u)) delete u[h];
      c.value = "";
    }
    async function M() {
      P();
      const h = r._modalState, A = Ke(o, l);
      if (Object.keys(A).length > 0) {
        Object.assign(u, A);
        return;
      }
      h.guardando = !0;
      try {
        await r.ejecutar(r.modo, r.id, Ge(o, l)), h.guardando = !1, t(r._modal_cod), r.onGuardado();
      } catch (s) {
        console.error("[crud] error al guardar formulario:", s), h.guardando = !1;
        const { message: y, errors: a } = G(s), b = o.map(($) => $.field), Y = Object.keys(a).filter(($) => !b.includes($));
        for (const $ of Object.keys(a))
          b.includes($) && (u[$] = a[$]);
        const R = [y, ...Y.map(($) => `${$}: ${a[$]}`)];
        R.length > 0 && (Object.keys(a).length === 0 || Y.length > 0) && (c.value = R.join(" "));
      }
    }
    return r._modalState.guardar = M, (h, A) => (p(), m("form", {
      class: "crud-form",
      novalidate: "",
      onSubmit: je(M, ["prevent"])
    }, [
      c.value ? (p(), m("div", or, E(c.value), 1)) : j("", !0),
      (p(!0), m(T, null, z(d(o), (s) => (p(), m("div", Fe({
        key: s.field,
        class: "crud-field"
      }, { ref_for: !0 }, O(s)), [
        g("label", {
          for: x(s)
        }, [
          fe(E(s.headerName === void 0 ? s.field : s.headerName) + " ", 1),
          s.required === !0 ? (p(), m("span", lr, "*")) : j("", !0)
        ], 8, ir),
        s.form_type === "checkbox" ? C((p(), m("input", {
          key: 0,
          id: x(s),
          "onUpdate:modelValue": (y) => l[s.field] = y,
          type: "checkbox",
          class: "crud-checkbox"
        }, null, 8, sr)), [
          [pe, l[s.field]]
        ]) : s.form_type === "select" ? C((p(), m("select", {
          key: 1,
          id: x(s),
          "onUpdate:modelValue": (y) => l[s.field] = y,
          class: "crud-input"
        }, [
          s.required === !0 ? (p(), m("option", ur, "— Seleccionar —")) : (p(), m("option", dr, "— Seleccionar —")),
          (p(!0), m(T, null, z(q(s), (y) => (p(), m("option", {
            key: String(y.value),
            value: y.value
          }, E(y.label), 9, cr))), 128))
        ], 8, ar)), [
          [X, l[s.field]]
        ]) : s.form_type === "multiselect" ? (p(), m("div", {
          key: 2,
          id: x(s),
          class: "crud-checks",
          role: "group"
        }, [
          (p(!0), m(T, null, z(q(s), (y) => (p(), m("label", {
            key: String(y.value),
            class: "crud-check"
          }, [
            C(g("input", {
              "onUpdate:modelValue": (a) => l[s.field] = a,
              type: "checkbox",
              class: "crud-checkbox",
              value: y.value
            }, null, 8, pr), [
              [pe, l[s.field]]
            ]),
            fe(" " + E(y.label), 1)
          ]))), 128)),
          q(s).length === 0 ? (p(), m("div", mr, "Sin opciones disponibles.")) : j("", !0)
        ], 8, fr)) : s.form_type === "textarea" ? C((p(), m("textarea", {
          key: 3,
          id: x(s),
          "onUpdate:modelValue": (y) => l[s.field] = y,
          rows: v(s),
          class: "crud-input"
        }, null, 8, yr)), [
          [me, l[s.field]]
        ]) : s.form_type === "markdown" ? (p(), m("div", br, [
          C(g("textarea", {
            id: x(s),
            "onUpdate:modelValue": (y) => l[s.field] = y,
            rows: v(s),
            class: "crud-input"
          }, null, 8, vr), [
            [me, l[s.field]]
          ]),
          g("div", hr, [
            A[0] || (A[0] = g("small", { class: "crud-help" }, "Acepta markdown.", -1)),
            g("button", {
              type: "button",
              class: "crud-btn-preview",
              onClick: (y) => N(s)
            }, E(k[s.field] === !0 ? "Editar" : "Vista previa"), 9, gr)
          ]),
          k[s.field] === !0 ? (p(), m("div", {
            key: 0,
            class: "crud-markdown-preview",
            innerHTML: d(We)(F(s))
          }, null, 8, _r)) : j("", !0)
        ])) : C((p(), m("input", {
          key: 5,
          id: x(s),
          "onUpdate:modelValue": (y) => l[s.field] = y,
          type: L(s),
          class: "crud-input"
        }, null, 8, wr)), [
          [Z, l[s.field]]
        ]),
        u[s.field] ? (p(), m("div", kr, E(u[s.field]), 1)) : j("", !0)
      ], 16))), 128))
    ], 32));
  }
}, Er = { class: "gmm-footer-bar" }, Ar = ["disabled"], Sr = {
  __name: "FormCrudFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const n = e, { ocultar_modal: t } = le(), r = n.parametros._modalState;
    function o() {
      if (r.guardar === null)
        throw new Error("[crud] el formulario no registró su función guardar");
      return r.guardar();
    }
    function l() {
      t(n.parametros._modal_cod);
    }
    return (u, c) => (p(), m("div", Er, [
      g("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: l
      }, "Cancelar"),
      g("button", {
        type: "button",
        class: "gmm-btn gmm-btn-success",
        disabled: d(r).guardando,
        onClick: o
      }, E(d(r).guardando ? "Guardando…" : "Guardar"), 9, Ar)
    ]));
  }
};
function Cr(e) {
  Re({ recurso: e.recurso, endpoint: e.endpoint, http: e.http, permisos: d(e.permisos) });
  const n = e.pk === void 0 ? "id" : e.pk, t = nr(e.preferencias, e.recurso), r = er(e.ayuda, { recurso: e.recurso }), o = U(null), l = J({}), u = U({}), c = U(""), { mostrar_modal: k, mostrar_alerta: O, mostrar_confirm: x } = le(), q = Le(e.recurso), v = e.http, F = e.endpoint, N = S(() => {
    const i = d(e.elemento);
    return i == null || i.singular === void 0 ? "Registro" : i.singular;
  });
  function L() {
    const i = d(e.accionesExtra);
    return i ?? [];
  }
  const P = U(null), M = U(null), h = S(() => {
    const i = P.value;
    return i === null ? [] : i.filter((f) => ee(f).length > 0);
  });
  function A(i) {
    for (const f of i)
      ee(f).length !== 0 && l[f.field] === void 0 && (l[f.field] = { op: "", valor: "", desde: "", hasta: "" });
  }
  function s() {
    c.value = "";
    try {
      u.value = Xe(h.value, l);
    } catch (i) {
      console.error("[crud] filtros inválidos:", i), c.value = i.message;
      return;
    }
    $();
  }
  function y() {
    for (const i of Object.keys(l))
      l[i] = { op: "", valor: "", desde: "", hasta: "" };
    u.value = {}, c.value = "", $();
  }
  const a = S(() => d(e.permisos)), b = (i) => be(a.value, q[i]);
  function Y() {
    const i = d(e.campos);
    return i != null;
  }
  const R = S(() => Y() ? Ie(d(e.campos), P.value) : P.value);
  function $() {
    M.value !== null && M.value.refresh();
  }
  function Ae(i) {
    M.value = i;
  }
  function ae(i, f) {
    console.error(`[crud] ${i}:`, f);
    const { message: w } = G(f);
    O(w);
  }
  const Se = {
    list: async (i) => {
      try {
        requeridoValor(i, "params");
        const { pageSize: f, filters: w, ...Q } = i, V = { ...Q }, W = ge(f, o.value);
        W !== void 0 && (V.pageSize = W);
        const B = Ze(w, u.value);
        B !== void 0 && (V.filters = B);
        const D = await v.get(`${F}/list`, { params: V });
        if (he(D))
          return O(G(D).message), D;
        const oe = D.data.fields_def;
        return oe !== void 0 && (P.value = oe, A(oe)), D.data.paginacion !== void 0 && (o.value = D.data.paginacion), D;
      } catch (f) {
        return ae("error al listar", f), { status: !1, message: G(f).message };
      }
    }
  };
  async function ue(i, f, w) {
    if (i === "crear")
      return v.post(F, w);
    if (i === "editar")
      return _(f, "id"), v.put(`${F}/${f}`, w);
    throw new Error(`[crud] modo de formulario inválido: ${i}`);
  }
  function de(i, f) {
    const w = R.value;
    if (w === null) {
      O("Todavía no hay definición de campos. Actualizá la tabla e intentá de nuevo.");
      return;
    }
    const Q = i === "editar" ? f[n] : void 0, V = J({
      guardar: null,
      guardando: !1
    }), W = {
      campos: re(w),
      ayudaCampos: r.campos,
      fila: f === void 0 ? null : f,
      modo: i,
      id: Q,
      singular: N.value,
      ejecutar: ue,
      onGuardado: () => {
        O(`${N.value} guardado correctamente.`), $();
      },
      _modalState: V
    }, B = N.value.toLowerCase(), D = i === "crear" ? `Nuevo ${B}` : `Editar ${B}`;
    k({ body: $r, footer: Sr }, D, W, { size: "md" });
  }
  function ce() {
    b("crear") && de("crear");
  }
  function te(i) {
    b("editar") && (_(i, "fila"), de("editar", i));
  }
  function ne(i) {
    if (!b("eliminar")) return;
    _(i, "fila");
    const f = _(i[n], `fila.${n}`);
    x({
      title: "Eliminar",
      text: `¿Eliminar ${N.value.toLowerCase()} (${n}: ${f})? Esta acción no se puede deshacer.`,
      severity_confirmar: "danger",
      confirmar_accion: async () => {
        try {
          const w = await v.delete(`${F}/${f}`);
          if (he(w)) {
            O(G(w).message);
            return;
          }
          O(`${N.value} eliminado.`), $();
        } catch (w) {
          ae("error al eliminar", w);
        }
      }
    });
  }
  const H = U(null);
  function Ce(i) {
    H.value = Array.isArray(i) || i === void 0 ? null : i;
  }
  const xe = S(() => {
    const i = [];
    return b("crear") && i.push(new I({
      key: "crud-crear",
      icon: "plus",
      severity: "success",
      label: "Nuevo",
      helpKey: r.botones.crear,
      onClick: () => ce()
    })), b("editar") && i.push(new I({
      key: "crud-editar",
      icon: "pencil",
      severity: "warning",
      label: "Editar",
      helpKey: r.botones.editar,
      isDisabled: () => H.value === null,
      onClick: () => te(H.value)
    })), b("eliminar") && i.push(new I({
      key: "crud-eliminar",
      icon: "trash",
      severity: "danger",
      label: "Eliminar",
      helpKey: r.botones.eliminar,
      isDisabled: () => H.value === null,
      onClick: () => ne(H.value)
    })), i;
  }), Ne = S(() => {
    const i = [];
    b("editar") && i.push(new I({
      key: "crud-fila-editar",
      icon: "pencil",
      severity: "outline-warning",
      label: "Editar",
      helpKey: r.botones.editar,
      onClick: (f) => te(f)
    })), b("eliminar") && i.push(new I({
      key: "crud-fila-eliminar",
      icon: "trash",
      severity: "outline-danger",
      label: "Eliminar",
      helpKey: r.botones.eliminar,
      onClick: (f) => ne(f)
    }));
    for (const f of L())
      _(f.key, "accionesExtra[].key"), !(f.permiso !== void 0 && !be(a.value, f.permiso)) && i.push(new I({
        key: `extra-${f.key}`,
        icon: f.icon,
        severity: f.severity,
        label: f.label,
        onClick: (w) => f.onClick(w)
      }));
    return i;
  });
  function Oe() {
    const i = d(e.elemento);
    return i == null || i.gender === void 0 ? "M" : i.gender;
  }
  const Ve = S(() => {
    const i = {
      lazy: !0,
      infiniteScroll: !1,
      selectionMode: "single",
      elementName: { singular: N.value, gender: Oe() },
      dataPipeline: {
        processFields: (f) => {
          const w = R.value;
          return (w === null ? f : He(w)).map((V) => r.campos[V.field] === void 0 ? V : { ...V, helpKey: r.campos[V.field] });
        }
      },
      // Lookups (<campo>_etiqueta), multiselect (labels) y escapado de texto.
      valueFormatters: Qe(R.value),
      buttons: {
        toolbar: xe.value,
        rowActions: Ne.value
      }
    };
    return o.value !== null && (i.pageSize = ge(void 0, o.value), i.pageSizeOptions = Ee(o.value)), t !== null && (i.preferencesStore = t), i;
  });
  return {
    api: Se,
    tableConfig: Ve,
    puede: b,
    permisosActuales: a,
    camposEfectivos: R,
    puedeListar: S(() => b("listar")),
    onRowSelected: Ce,
    setTabla: Ae,
    refresh: $,
    filtrosDisponibles: h,
    filtrosEstado: l,
    errorFiltros: c,
    aplicarFiltros: s,
    limpiarFiltros: y,
    paginacion: o,
    ayudaResuelta: r,
    abrirCrear: ce,
    abrirEditar: te,
    confirmarEliminar: ne,
    ejecutar: ue
  };
}
const xr = { class: "crud-modulo" }, Nr = {
  key: 0,
  class: "crud-titulo"
}, Or = {
  key: 1,
  class: "crud-sin-permiso"
}, Vr = {
  key: 0,
  class: "crud-filtros"
}, jr = ["aria-expanded"], Fr = {
  key: 0,
  class: "crud-filtros-panel"
}, Dr = ["for"], Ur = ["id", "onUpdate:modelValue"], qr = ["value"], Pr = ["onUpdate:modelValue", "type", "aria-label"], Mr = ["onUpdate:modelValue", "type", "aria-label"], Tr = ["onUpdate:modelValue", "aria-label"], Rr = { value: "si" }, Lr = { value: "no" }, Ir = ["onUpdate:modelValue", "aria-label"], zr = ["value"], Hr = ["onUpdate:modelValue", "type", "placeholder", "aria-label"], Br = {
  key: 0,
  class: "crud-error"
}, Kr = { class: "crud-filtros-acciones" }, Wr = {
  __name: "CrudModulo",
  props: {
    recurso: { type: String, required: !0 },
    endpoint: { type: String, required: !0 },
    http: { type: Object, required: !0 },
    permisos: { type: Array, required: !0 },
    campos: { type: Array, default: null },
    titulo: { type: String, default: "" },
    elemento: { type: Object, default: null },
    accionesExtra: { type: Array, default: () => [] },
    pk: { type: String, default: "id" },
    // Dependencia opcional { leer(clave), guardar(clave, valor) } para preferencias de columnas (sin SSO: ver README).
    preferencias: { type: Object, default: null },
    // Configuración de ayuda contextual: { clave, botones: { listar, crear, editar, eliminar, campo } }.
    ayuda: { type: Object, default: null }
  },
  setup(e, { expose: n }) {
    const t = e, r = U(null), o = U(!1), {
      api: l,
      tableConfig: u,
      puedeListar: c,
      onRowSelected: k,
      setTabla: O,
      refresh: x,
      filtrosDisponibles: q,
      filtrosEstado: v,
      errorFiltros: F,
      aplicarFiltros: N,
      limpiarFiltros: L
    } = Cr({
      recurso: t.recurso,
      endpoint: t.endpoint,
      http: t.http,
      permisos: S(() => t.permisos),
      campos: S(() => t.campos),
      pk: t.pk,
      elemento: S(() => t.elemento),
      accionesExtra: S(() => t.accionesExtra),
      preferencias: t.preferencias,
      ayuda: t.ayuda
    });
    function P(s) {
      return ee(s);
    }
    function M(s) {
      return $e[s];
    }
    function h(s) {
      return se(s);
    }
    function A(s) {
      return s.type === "number" ? "number" : s.type === "date" ? "date" : "text";
    }
    return ye(r, (s) => O(s), { immediate: !0 }), ye(u, () => {
      r.value !== null && r.value.applyConfig();
    }), n({ refresh: x }), (s, y) => (p(), m("div", xr, [
      e.titulo ? (p(), m("h2", Nr, E(e.titulo), 1)) : j("", !0),
      d(c) ? (p(), m(T, { key: 2 }, [
        d(q).length > 0 ? (p(), m("div", Vr, [
          g("button", {
            type: "button",
            class: "btn btn-sm btn-outline-secondary",
            "aria-expanded": o.value ? "true" : "false",
            onClick: y[0] || (y[0] = (a) => o.value = !o.value)
          }, E(o.value ? "Ocultar filtros" : "Filtros avanzados"), 9, jr),
          o.value ? (p(), m("div", Fr, [
            (p(!0), m(T, null, z(d(q), (a) => (p(), m("div", {
              key: a.field,
              class: "crud-filtro-fila"
            }, [
              g("label", {
                for: `crud-filtro-op-${e.recurso}-${a.field}`,
                class: "form-label small mb-0"
              }, E(a.headerName), 9, Dr),
              C(g("select", {
                id: `crud-filtro-op-${e.recurso}-${a.field}`,
                "onUpdate:modelValue": (b) => d(v)[a.field].op = b,
                class: "form-select form-select-sm"
              }, [
                y[3] || (y[3] = g("option", { value: "" }, "Sin filtro", -1)),
                (p(!0), m(T, null, z(P(a), (b) => (p(), m("option", {
                  key: b,
                  value: b
                }, E(M(b)), 9, qr))), 128))
              ], 8, Ur), [
                [X, d(v)[a.field].op]
              ]),
              d(v)[a.field].op === "rango" ? (p(), m(T, { key: 0 }, [
                C(g("input", {
                  "onUpdate:modelValue": (b) => d(v)[a.field].desde = b,
                  type: A(a),
                  class: "form-control form-control-sm",
                  placeholder: "Desde",
                  "aria-label": `${a.headerName} desde`
                }, null, 8, Pr), [
                  [Z, d(v)[a.field].desde]
                ]),
                C(g("input", {
                  "onUpdate:modelValue": (b) => d(v)[a.field].hasta = b,
                  type: A(a),
                  class: "form-control form-control-sm",
                  placeholder: "Hasta",
                  "aria-label": `${a.headerName} hasta`
                }, null, 8, Mr), [
                  [Z, d(v)[a.field].hasta]
                ])
              ], 64)) : d(v)[a.field].op === "nulo" || a.type === "boolean" && d(v)[a.field].op !== "" && d(v)[a.field].op !== "en" ? C((p(), m("select", {
                key: 1,
                "onUpdate:modelValue": (b) => d(v)[a.field].valor = b,
                class: "form-select form-select-sm",
                "aria-label": `${a.headerName} valor`
              }, [
                y[4] || (y[4] = g("option", { value: "" }, "—", -1)),
                g("option", Rr, E(d(v)[a.field].op === "nulo" ? "Sí" : "Sí / verdadero"), 1),
                g("option", Lr, E(d(v)[a.field].op === "nulo" ? "No" : "No / falso"), 1)
              ], 8, Tr)), [
                [X, d(v)[a.field].valor]
              ]) : d(v)[a.field].op !== "" && d(v)[a.field].op !== "en" && h(a).length > 0 ? C((p(), m("select", {
                key: 2,
                "onUpdate:modelValue": (b) => d(v)[a.field].valor = b,
                class: "form-select form-select-sm",
                "aria-label": `${a.headerName} valor`
              }, [
                y[5] || (y[5] = g("option", { value: "" }, "—", -1)),
                (p(!0), m(T, null, z(h(a), (b) => (p(), m("option", {
                  key: String(b.value),
                  value: String(b.value)
                }, E(b.label), 9, zr))), 128))
              ], 8, Ir)), [
                [X, d(v)[a.field].valor]
              ]) : d(v)[a.field].op !== "" ? C((p(), m("input", {
                key: 3,
                "onUpdate:modelValue": (b) => d(v)[a.field].valor = b,
                type: d(v)[a.field].op === "en" ? "text" : A(a),
                class: "form-control form-control-sm",
                placeholder: d(v)[a.field].op === "en" ? "Valores separados por coma" : "Valor",
                "aria-label": `${a.headerName} valor`
              }, null, 8, Hr)), [
                [Z, d(v)[a.field].valor]
              ]) : j("", !0)
            ]))), 128)),
            d(F) ? (p(), m("div", Br, E(d(F)), 1)) : j("", !0),
            g("div", Kr, [
              g("button", {
                type: "button",
                class: "btn btn-sm btn-primary",
                onClick: y[1] || (y[1] = (...a) => d(N) && d(N)(...a))
              }, "Aplicar filtros"),
              g("button", {
                type: "button",
                class: "btn btn-sm btn-outline-secondary",
                onClick: y[2] || (y[2] = (...a) => d(L) && d(L)(...a))
              }, "Limpiar")
            ])
          ])) : j("", !0)
        ])) : j("", !0),
        De(d(Ue), {
          ref_key: "tabla",
          ref: r,
          id: e.recurso,
          api: d(l),
          config: d(u),
          onRowSelected: d(k)
        }, null, 8, ["id", "api", "config", "onRowSelected"])
      ], 64)) : (p(), m("div", Or, " No tenés permiso para ver este listado (" + E(e.recurso) + ".listar). ", 1))
    ]));
  }
};
export {
  qe as ACCIONES,
  Wr as CrudModulo,
  $e as ETIQUETAS_OPERADOR,
  rr as atributosAyuda,
  re as camposFormulario,
  tr as clavePreferenciasTabla,
  Ze as combinarFiltros,
  Xe as construirFiltrosAvanzados,
  Ge as construirPayload,
  nr as crearAdaptadorPreferencias,
  Qr as crearPreferenciasLocales,
  Wr as default,
  G as extraerError,
  He as fieldsDefDesdeCampos,
  we as formTypeDeCampo,
  Ee as opcionesTamanoPagina,
  ee as operadoresDeFiltro,
  ge as pageSizeAceptado,
  Le as permisosDeRecurso,
  er as resolverAyuda,
  be as tienePermiso,
  Cr as useCrud,
  Ke as validarFormulario,
  Be as valoresIniciales
};
//# sourceMappingURL=vue-greenborn-crud.js.map
