import { reactive as K, ref as L, openBlock as m, createElementBlock as p, withModifiers as Je, toDisplayString as j, createCommentVNode as M, Fragment as q, renderList as J, unref as u, mergeProps as Ye, createElementVNode as k, createTextVNode as ne, withDirectives as P, vModelCheckbox as be, vModelSelect as ee, vModelText as ve, vModelDynamic as re, computed as A, watch as he, createVNode as Qe } from "vue";
import { BtnConfig as B, TableEditor as We } from "@greenborn/vue-table-editor";
import { useModal as ue } from "@greenborn/vue-greenborn-modal-manager";
const Ae = ["listar", "crear", "editar", "eliminar"], Xe = 4, Ze = {
  text: "text",
  number: "number",
  date: "date",
  boolean: "checkbox",
  select: "select",
  multiselect: "multiselect"
}, er = [
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
function _(e, t) {
  if (e == null || e === "")
    throw new Error(`[crud] Parámetro requerido faltante: ${t}`);
  return e;
}
function rr({ recurso: e, endpoint: t, http: n, permisos: r }) {
  if (_(e, "recurso"), _(t, "endpoint"), _(n, "http"), typeof n.get != "function" || typeof n.post != "function" || typeof n.put != "function" || typeof n.delete != "function")
    throw new Error('[crud] "http" debe exponer get, post, put y delete');
  if (!Array.isArray(r))
    throw new Error('[crud] "permisos" es requerido y debe ser un array de strings');
  return !0;
}
function nr(e) {
  _(e, "recurso");
  const t = {};
  for (const n of Ae)
    t[n] = `${e}.${n}`;
  return t;
}
function Ce(e, t) {
  if (!Array.isArray(e))
    throw new Error('[crud] tienePermiso: "permisos" debe ser un array');
  return e.includes(t);
}
function Se(e) {
  if (_(e, "campo"), _(e.field, "campo.field"), e.form_type !== void 0) {
    if (!er.includes(e.form_type))
      throw new Error(`[crud] form_type inválido en "${e.field}": ${e.form_type}`);
    return e.form_type;
  }
  const t = Ze[e.type];
  return t === void 0 ? "text" : t;
}
function X(e) {
  if (!Array.isArray(e))
    throw new Error('[crud] camposFormulario: "campos" debe ser un array');
  return e.filter((t) => t.writable !== !1).map((t) => ({ ...t, form_type: Se(t) }));
}
function tr(e, t) {
  if (!Array.isArray(e))
    throw new Error('[crud] combinarOpciones: "campos" debe ser un array');
  if (t == null) return e;
  if (!Array.isArray(t))
    throw new Error('[crud] combinarOpciones: "fieldsDef" debe ser un array o null');
  return e.map((n) => {
    if (n.options !== void 0) return n;
    const r = t.find((o) => o !== null && typeof o == "object" && o.field === n.field);
    return r === void 0 || !Array.isArray(r.options) ? n : { ...n, options: r.options };
  });
}
function de(e) {
  return _(e, "campo"), Array.isArray(e.options) ? e.options : [];
}
function or(e) {
  if (_(e, "campo"), e.filas === void 0) return Xe;
  if (!Number.isInteger(e.filas) || e.filas < 1)
    throw new Error(`[crud] "filas" inválido en "${e.field}": debe ser un entero >= 1`);
  return e.filas;
}
function je(e) {
  return e == null ? !0 : Array.isArray(e) ? e.length === 0 : String(e).trim() === "";
}
function ir(e) {
  if (!Array.isArray(e))
    throw new Error('[crud] fieldsDefDesdeCampos: "campos" debe ser un array');
  return e.map((t) => {
    _(t.field, "campo.field");
    const n = {
      field: t.field,
      headerName: t.headerName === void 0 ? t.field : t.headerName,
      type: t.type,
      sortable: t.sortable,
      filterable: t.filterable,
      form_type: Se(t)
    };
    return t.css !== void 0 && (n.css = t.css), n;
  });
}
function xe(e, t) {
  const n = {};
  for (const r of X(e)) {
    const o = t == null ? void 0 : t[r.field];
    r.form_type === "checkbox" ? n[r.field] = o === !0 || o === 1 : r.form_type === "multiselect" ? n[r.field] = Array.isArray(o) ? o.slice() : [] : n[r.field] = o ?? "";
  }
  return n;
}
function lr(e, t) {
  const n = {};
  for (const r of X(e)) {
    const o = t[r.field];
    if (r.form_type === "checkbox") continue;
    const i = je(o);
    if (r.required === !0 && i) {
      n[r.field] = `${r.headerName === void 0 ? r.field : r.headerName} es obligatorio`;
      continue;
    }
    r.form_type === "number" && !i && Number.isNaN(Number(o)) && (n[r.field] = "Debe ser un número");
  }
  return n;
}
function ar(e, t) {
  const n = {};
  for (const r of X(e)) {
    const o = t[r.field];
    r.form_type === "checkbox" ? n[r.field] = o === !0 || o === 1 : r.form_type === "multiselect" ? n[r.field] = Array.isArray(o) ? o.slice() : [] : je(o) ? n[r.field] = null : r.form_type === "number" ? n[r.field] = Number(o) : n[r.field] = o;
  }
  return n;
}
const sr = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function Q(e) {
  return String(e).replace(/[&<>"']/g, (t) => sr[t]);
}
function ge(e, t) {
  const n = de(e).find((r) => String(r.value) === String(t));
  return n === void 0 ? void 0 : n.label;
}
function ur(e, t) {
  _(e, "campo"), _(t, "fila");
  const n = t[e.field], r = `${e.field}_etiqueta`;
  if (t[r] !== void 0 && t[r] !== null)
    return Q(t[r]);
  if (e.form_type === "multiselect" || e.type === "multiselect")
    return Array.isArray(n) ? n.map((i) => {
      const a = ge(e, i);
      return Q(a === void 0 ? i : a);
    }).join(", ") : Q(n ?? "");
  if (n == null) return "";
  const o = ge(e, n);
  return Q(o === void 0 ? n : o);
}
function dr(e) {
  if (e == null) return {};
  if (!Array.isArray(e))
    throw new Error('[crud] formateadoresCeldas: "campos" debe ser un array o null');
  const t = {};
  for (const n of e)
    t[n.field] = (r) => ur(n, r);
  return t;
}
function cr(e) {
  if (typeof e != "string")
    throw new Error('[crud] markdownAHtmlSeguro: "texto" debe ser string');
  const t = (i) => i.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>"), n = [];
  let r = [];
  const o = () => {
    r.length > 0 && (n.push(`<p>${r.join("<br>")}</p>`), r = []);
  };
  for (const i of Q(e).split(/\r?\n/)) {
    const a = /^(#{1,3})\s+(.*)$/.exec(i);
    if (a !== null) {
      o();
      const s = a[1].length;
      n.push(`<h${s}>${t(a[2])}</h${s}>`);
    } else i.trim() === "" ? o() : r.push(t(i));
  }
  return o(), n.join(`
`);
}
function W(e) {
  let t = null;
  e !== null && typeof e == "object" && e.response && typeof e.response == "object" ? t = e.response.data === void 0 ? null : e.response.data : e !== null && typeof e == "object" && e.status === !1 && (t = e);
  const n = t && typeof t.message == "string" ? t.message : e instanceof Error ? e.message : "Error desconocido", r = t && t.errors && typeof t.errors == "object" ? t.errors : {};
  return { message: n, errors: r };
}
function we(e) {
  return e !== null && typeof e == "object" && e.status === !1;
}
const Oe = {
  igual: "Igual a",
  distinto: "Distinto de",
  contiene: "Contiene",
  en: "En la lista",
  rango: "Entre",
  nulo: "Es nulo"
};
function te(e) {
  return _(e, "campo"), e.filterable !== !0 ? [] : Array.isArray(e.operadores) ? e.operadores.filter((t) => Oe[t] !== void 0) : [];
}
function ae(e, t) {
  if (t == null) return;
  const n = String(t).trim();
  if (n !== "") {
    if (e.type === "number") {
      const r = Number(n);
      if (Number.isNaN(r)) throw new Error(`[crud] "${e.field}": debe ser un número`);
      return r;
    }
    if (e.type === "boolean") {
      if (n === "si") return !0;
      if (n === "no") return !1;
      throw new Error(`[crud] "${e.field}": debe ser si o no`);
    }
    return n;
  }
}
function fr(e, t) {
  if (!Array.isArray(e)) throw new Error('[crud] construirFiltrosAvanzados: "campos" debe ser un array');
  const n = {};
  for (const r of e) {
    const o = t[r.field];
    if (o == null) continue;
    const i = o.op;
    if (!(i === void 0 || i === "" || i === null)) {
      if (!te(r).includes(i))
        throw new Error(`[crud] operador "${i}" no permitido en "${r.field}"`);
      if (i === "rango") {
        const a = ae(r, o.desde), s = ae(r, o.hasta);
        if (a === void 0 && s === void 0) continue;
        const w = { op: i };
        a !== void 0 && (w.desde = a), s !== void 0 && (w.hasta = s), n[r.field] = w;
      } else if (i === "en") {
        const a = String(o.valor === void 0 || o.valor === null ? "" : o.valor).split(",").map((s) => s.trim()).filter((s) => s !== "").map((s) => r.type === "number" ? Number(s) : s);
        if (a.length === 0) continue;
        n[r.field] = { op: i, valor: a };
      } else if (i === "nulo")
        (o.valor === "si" || o.valor === "no") && (n[r.field] = { op: i, valor: o.valor === "si" });
      else {
        const a = ae(r, o.valor);
        if (a === void 0) continue;
        n[r.field] = { op: i, valor: a };
      }
    }
  }
  return n;
}
function mr(e, t) {
  let n = {};
  if (e != null && e !== "") {
    if (typeof e != "string") throw new Error('[crud] combinarFiltros: "filters" debe ser string JSON');
    const o = JSON.parse(e);
    if (o === null || typeof o != "object" || Array.isArray(o))
      throw new Error('[crud] combinarFiltros: "filters" debe ser un objeto JSON');
    n = o;
  }
  const r = { ...n, ...t ?? {} };
  return Object.keys(r).length === 0 ? void 0 : JSON.stringify(r);
}
function Fe(e) {
  _(e, "paginacion");
  const n = (Array.isArray(e.tamanosPermitidos) ? e.tamanosPermitidos : [10, 25, 50, 100, 200]).filter((r) => r <= e.tamanoMaximo);
  return n.includes(e.tamanoDefecto) || n.push(e.tamanoDefecto), [...new Set(n)].sort((r, o) => r - o);
}
function _e(e, t) {
  if (t == null) return;
  const n = Fe(t);
  return e !== void 0 && n.includes(Number(e)) ? Number(e) : t.tamanoDefecto;
}
const ke = ["listar", "crear", "editar", "eliminar"];
function pr(e, { recurso: t }) {
  _(t, "recurso");
  const n = { botones: {}, campos: {} };
  for (const a of ke) n.botones[a] = null;
  if (e == null) return n;
  if (typeof e != "object") throw new Error('[crud] "ayuda" debe ser un objeto');
  let r = null;
  if (typeof e.clave == "function") {
    if (r = e.clave({ recurso: t }), typeof r != "string" || r === "") throw new Error("[crud] ayuda.clave(ctx) debe devolver un string no vacío");
  } else if (e.clave !== void 0) {
    if (typeof e.clave != "string" || e.clave === "") throw new Error("[crud] ayuda.clave debe ser string o función");
    r = e.clave;
  }
  const o = e.botones === void 0 ? {} : e.botones;
  for (const a of ke) {
    const s = o[a];
    if (!(s === void 0 || s === !1))
      if (s === !0) {
        if (r === null) throw new Error(`[crud] ayuda.botones.${a}: true requiere ayuda.clave`);
        n.botones[a] = `${r}-${a}`;
      } else if (typeof s == "string" && s !== "")
        n.botones[a] = s;
      else
        throw new Error(`[crud] ayuda.botones.${a} debe ser string, true o false`);
  }
  const i = o.campo === void 0 ? {} : o.campo;
  if (i === null || typeof i != "object") throw new Error("[crud] ayuda.botones.campo debe ser un objeto");
  for (const [a, s] of Object.entries(i))
    if (s === !0) {
      if (r === null) throw new Error(`[crud] ayuda.botones.campo.${a}: true requiere ayuda.clave`);
      n.campos[a] = `${r}-campo-${a}`;
    } else if (typeof s == "string" && s !== "")
      n.campos[a] = s;
    else if (s !== !1 && s !== void 0)
      throw new Error(`[crud] ayuda.botones.campo.${a} debe ser string, true o false`);
  return n;
}
function yr(e) {
  return e == null ? {} : { "data-help": e };
}
function br(e) {
  return _(e, "recurso"), `te_cfg_${e}`;
}
function yn(e, t = "crud_prefs:") {
  return _(e, "storage"), {
    leer(n) {
      try {
        return e.getItem(`${t}${n}`);
      } catch (r) {
        return console.error("[crud] preferencias locales: error al leer", r), null;
      }
    },
    guardar(n, r) {
      try {
        e.setItem(`${t}${n}`, typeof r == "string" ? r : JSON.stringify(r));
      } catch (o) {
        console.error("[crud] preferencias locales: error al guardar", o);
      }
    }
  };
}
function vr(e, t) {
  if (e == null) return null;
  if (typeof e.leer != "function" || typeof e.guardar != "function")
    throw new Error('[crud] "preferencias" debe exponer leer(clave) y guardar(clave, valor)');
  const n = br(t), r = {};
  return {
    get misValores() {
      return r;
    },
    valor(o) {
      const i = r[o];
      return i == null || i === "" ? null : i;
    },
    async fetchMisPreferencias() {
      try {
        const o = await e.leer(n);
        o != null && (r[n] = o);
      } catch (o) {
        console.error("[crud] error al leer preferencias de columnas:", o);
      }
    },
    async guardarValores(o) {
      let i = { status: !0 };
      for (const [a, s] of Object.entries(o)) {
        r[a] = s;
        try {
          await e.guardar(a, s);
        } catch (w) {
          console.error("[crud] error al guardar preferencias de columnas:", w), i = { status: !1, error: String(w && w.message ? w.message : w) };
        }
      }
      return i;
    }
  };
}
const se = ["crear", "editar", "eliminar", "listar"];
function Ne(e) {
  if (e == null)
    return { crear: !0, editar: !0, eliminar: !0, listar: !0 };
  if (typeof e != "object" || Array.isArray(e))
    throw new Error('[crud] "acciones" debe ser un objeto { crear, editar, eliminar, listar } con booleanos');
  for (const n of Object.keys(e)) {
    if (!se.includes(n))
      throw new Error(`[crud] "acciones" tiene una clave desconocida: "${n}" (válidas: ${se.join(", ")})`);
    if (typeof e[n] != "boolean")
      throw new Error(`[crud] "acciones.${n}" debe ser booleano`);
  }
  const t = {};
  for (const n of se)
    t[n] = e[n] === void 0 ? !0 : e[n];
  return t;
}
function hr(e, t, n, r) {
  if (!Ae.includes(r))
    throw new Error(`[crud] acción desconocida: "${r}"`);
  const o = Ne(e), i = nr(n)[r];
  return o[r] === !0 && Ce(t, i);
}
const gr = ["componente", "footer"];
function Ee(e) {
  return typeof e == "function" || e !== null && typeof e == "object" && !Array.isArray(e);
}
function wr(e) {
  if (e == null) return null;
  if (typeof e != "object" || Array.isArray(e))
    throw new Error('[crud] "formulario" debe ser un objeto { componente, footer? }');
  for (const t of Object.keys(e))
    if (!gr.includes(t))
      throw new Error(`[crud] "formulario" tiene una clave desconocida: "${t}" (válidas: componente, footer)`);
  if (!Ee(e.componente))
    throw new Error('[crud] "formulario.componente" es requerido y debe ser un componente Vue');
  if (e.footer !== void 0 && !Ee(e.footer))
    throw new Error('[crud] "formulario.footer" debe ser un componente Vue');
  return {
    componente: e.componente,
    footer: e.footer === void 0 ? null : e.footer
  };
}
function _r({ modo: e, fila: t, campos: n, valores: r, guardar: o, modalState: i }) {
  if (e !== "crear" && e !== "editar")
    throw new Error(`[crud] modo de formulario inválido: ${e}`);
  if (e === "editar" && (t === null || typeof t != "object"))
    throw new Error('[crud] construirParametrosFormulario: "fila" es requerida en modo editar');
  if (e === "crear" && t !== null)
    throw new Error('[crud] construirParametrosFormulario: "fila" debe ser null en modo crear');
  if (!Array.isArray(n)) throw new Error('[crud] construirParametrosFormulario: "campos" debe ser un array');
  if (r === null || typeof r != "object") throw new Error('[crud] construirParametrosFormulario: "valores" debe ser un objeto');
  if (typeof o != "function") throw new Error('[crud] construirParametrosFormulario: "guardar" debe ser una función');
  if (i === null || typeof i != "object") throw new Error('[crud] construirParametrosFormulario: "modalState" debe ser un objeto');
  return { modo: e, fila: t, campos: n, valores: r, guardar: o, _modalState: i };
}
function kr(e, t) {
  const { message: n, errors: r } = W(e), o = t.map((E) => E.field), i = {};
  for (const E of Object.keys(r))
    o.includes(E) && (i[E] = r[E]);
  const a = Object.keys(r).filter((E) => !o.includes(E)), s = [n, ...a.map((E) => `${E}: ${r[E]}`)], w = Object.keys(r).length === 0 || a.length > 0 ? s.join(" ") : "";
  return { errores: i, errorGeneral: w };
}
async function Ve({ campos: e, valores: t, modo: n, id: r, ejecutar: o, alEnviar: i }) {
  const a = lr(e, t);
  if (Object.keys(a).length > 0)
    return { ok: !1, errores: a, errorGeneral: "" };
  i();
  try {
    return await o(n, r, ar(e, t)), { ok: !0, errores: {}, errorGeneral: "" };
  } catch (s) {
    return console.error("[crud] error al guardar formulario:", s), { ok: !1, ...kr(s, e) };
  }
}
const Er = {
  key: 0,
  class: "crud-error crud-error-general"
}, $r = ["for"], Ar = {
  key: 0,
  class: "crud-required"
}, Cr = ["id", "onUpdate:modelValue"], Sr = ["id", "onUpdate:modelValue"], jr = {
  key: 0,
  value: "",
  disabled: ""
}, xr = {
  key: 1,
  value: ""
}, Or = ["value"], Fr = ["id"], Nr = ["onUpdate:modelValue", "value"], Vr = {
  key: 0,
  class: "crud-help"
}, Pr = ["id", "onUpdate:modelValue", "rows"], Dr = {
  key: 4,
  class: "crud-markdown"
}, Ur = ["id", "onUpdate:modelValue", "rows"], qr = { class: "crud-markdown-barra" }, Mr = ["onClick"], Rr = ["innerHTML"], Tr = ["id", "onUpdate:modelValue", "type"], Lr = {
  key: 6,
  class: "crud-error"
}, Gr = {
  __name: "FormCrud",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, { ocultar_modal: n } = ue(), r = t.parametros, o = r.campos, i = K(xe(o, r.fila)), a = K({}), s = L(""), w = K({});
    function E(h) {
      return yr(r.ayudaCampos === void 0 ? void 0 : r.ayudaCampos[h.field]);
    }
    function F(h) {
      return `crud-${r.modo}-${h.field}`;
    }
    function O(h) {
      return de(h);
    }
    function z(h) {
      return or(h);
    }
    function b(h) {
      const C = i[h.field];
      return C == null ? "" : String(C);
    }
    function R(h) {
      w[h.field] = w[h.field] !== !0;
    }
    function N(h) {
      return h.form_type === "date" ? "date" : h.form_type === "number" ? "number" : h.form_type === "email" ? "email" : "text";
    }
    function I() {
      for (const h of Object.keys(a)) delete a[h];
      s.value = "";
    }
    async function T() {
      I();
      const h = r._modalState, C = await Ve({
        campos: o,
        valores: i,
        modo: r.modo,
        id: r.id,
        ejecutar: r.ejecutar,
        alEnviar: () => {
          h.guardando = !0;
        }
      });
      if (h.guardando = !1, C.ok) {
        n(r._modal_cod), r.onGuardado();
        return;
      }
      Object.assign(a, C.errores), s.value = C.errorGeneral;
    }
    return r._modalState.guardar = T, (h, C) => (m(), p("form", {
      class: "crud-form",
      novalidate: "",
      onSubmit: Je(T, ["prevent"])
    }, [
      s.value ? (m(), p("div", Er, j(s.value), 1)) : M("", !0),
      (m(!0), p(q, null, J(u(o), (d) => (m(), p("div", Ye({
        key: d.field,
        class: "crud-field"
      }, { ref_for: !0 }, E(d)), [
        k("label", {
          for: F(d)
        }, [
          ne(j(d.headerName === void 0 ? d.field : d.headerName) + " ", 1),
          d.required === !0 ? (m(), p("span", Ar, "*")) : M("", !0)
        ], 8, $r),
        d.form_type === "checkbox" ? P((m(), p("input", {
          key: 0,
          id: F(d),
          "onUpdate:modelValue": (y) => i[d.field] = y,
          type: "checkbox",
          class: "crud-checkbox"
        }, null, 8, Cr)), [
          [be, i[d.field]]
        ]) : d.form_type === "select" ? P((m(), p("select", {
          key: 1,
          id: F(d),
          "onUpdate:modelValue": (y) => i[d.field] = y,
          class: "crud-input"
        }, [
          d.required === !0 ? (m(), p("option", jr, "— Seleccionar —")) : (m(), p("option", xr, "— Seleccionar —")),
          (m(!0), p(q, null, J(O(d), (y) => (m(), p("option", {
            key: String(y.value),
            value: y.value
          }, j(y.label), 9, Or))), 128))
        ], 8, Sr)), [
          [ee, i[d.field]]
        ]) : d.form_type === "multiselect" ? (m(), p("div", {
          key: 2,
          id: F(d),
          class: "crud-checks",
          role: "group"
        }, [
          (m(!0), p(q, null, J(O(d), (y) => (m(), p("label", {
            key: String(y.value),
            class: "crud-check"
          }, [
            P(k("input", {
              "onUpdate:modelValue": (S) => i[d.field] = S,
              type: "checkbox",
              class: "crud-checkbox",
              value: y.value
            }, null, 8, Nr), [
              [be, i[d.field]]
            ]),
            ne(" " + j(y.label), 1)
          ]))), 128)),
          O(d).length === 0 ? (m(), p("div", Vr, "Sin opciones disponibles.")) : M("", !0)
        ], 8, Fr)) : d.form_type === "textarea" ? P((m(), p("textarea", {
          key: 3,
          id: F(d),
          "onUpdate:modelValue": (y) => i[d.field] = y,
          rows: z(d),
          class: "crud-input"
        }, null, 8, Pr)), [
          [ve, i[d.field]]
        ]) : d.form_type === "markdown" ? (m(), p("div", Dr, [
          P(k("textarea", {
            id: F(d),
            "onUpdate:modelValue": (y) => i[d.field] = y,
            rows: z(d),
            class: "crud-input"
          }, null, 8, Ur), [
            [ve, i[d.field]]
          ]),
          k("div", qr, [
            C[0] || (C[0] = k("small", { class: "crud-help" }, "Acepta markdown.", -1)),
            k("button", {
              type: "button",
              class: "crud-btn-preview",
              onClick: (y) => R(d)
            }, j(w[d.field] === !0 ? "Editar" : "Vista previa"), 9, Mr)
          ]),
          w[d.field] === !0 ? (m(), p("div", {
            key: 0,
            class: "crud-markdown-preview",
            innerHTML: u(cr)(b(d))
          }, null, 8, Rr)) : M("", !0)
        ])) : P((m(), p("input", {
          key: 5,
          id: F(d),
          "onUpdate:modelValue": (y) => i[d.field] = y,
          type: N(d),
          class: "crud-input"
        }, null, 8, Tr)), [
          [re, i[d.field]]
        ]),
        a[d.field] ? (m(), p("div", Lr, j(a[d.field]), 1)) : M("", !0)
      ], 16))), 128))
    ], 32));
  }
}, zr = { class: "gmm-footer-bar" }, Ir = ["disabled"], $e = {
  __name: "FormCrudFooter",
  props: {
    parametros: { type: Object, required: !0 }
  },
  setup(e) {
    const t = e, { ocultar_modal: n } = ue(), r = t.parametros._modalState;
    function o() {
      if (r.guardar === null)
        throw new Error("[crud] el formulario no registró su función guardar");
      return r.guardar();
    }
    function i() {
      n(t.parametros._modal_cod);
    }
    return (a, s) => (m(), p("div", zr, [
      k("button", {
        type: "button",
        class: "gmm-btn gmm-btn-secondary",
        onClick: i
      }, "Cancelar"),
      k("button", {
        type: "button",
        class: "gmm-btn gmm-btn-success",
        disabled: u(r).guardando,
        onClick: o
      }, j(u(r).guardando ? "Guardando…" : "Guardar"), 9, Ir)
    ]));
  }
};
function Hr(e) {
  rr({ recurso: e.recurso, endpoint: e.endpoint, http: e.http, permisos: u(e.permisos) });
  const t = A(() => Ne(u(e.acciones)));
  t.value;
  const n = A(() => wr(u(e.formulario)));
  n.value;
  const r = e.pk === void 0 ? "id" : e.pk, o = vr(e.preferencias, e.recurso), i = pr(e.ayuda, { recurso: e.recurso }), a = L(null), s = K({}), w = L({}), E = L(""), { mostrar_modal: F, mostrar_alerta: O, mostrar_confirm: z } = ue(), b = e.http, R = e.endpoint, N = A(() => {
    const l = u(e.elemento);
    return l == null || l.singular === void 0 ? "Registro" : l.singular;
  });
  function I() {
    const l = u(e.accionesExtra);
    return l ?? [];
  }
  const T = L(null), h = L(null), C = A(() => {
    const l = T.value;
    return l === null ? [] : l.filter((f) => te(f).length > 0);
  });
  function d(l) {
    for (const f of l)
      te(f).length !== 0 && s[f.field] === void 0 && (s[f.field] = { op: "", valor: "", desde: "", hasta: "" });
  }
  function y() {
    E.value = "";
    try {
      w.value = fr(C.value, s);
    } catch (l) {
      console.error("[crud] filtros inválidos:", l), E.value = l.message;
      return;
    }
    H();
  }
  function S() {
    for (const l of Object.keys(s))
      s[l] = { op: "", valor: "", desde: "", hasta: "" };
    w.value = {}, E.value = "", H();
  }
  const c = A(() => u(e.permisos)), v = (l) => hr(t.value, c.value, e.recurso, l);
  function Pe() {
    const l = u(e.campos);
    return l != null;
  }
  const Z = A(() => Pe() ? tr(u(e.campos), T.value) : T.value);
  function H() {
    h.value !== null && h.value.refresh();
  }
  function De(l) {
    h.value = l;
  }
  function ce(l, f) {
    console.error(`[crud] ${l}:`, f);
    const { message: g } = W(f);
    O(g);
  }
  const Ue = {
    list: async (l) => {
      try {
        _(l, "params");
        const { pageSize: f, filters: g, ...U } = l, $ = { ...U }, D = _e(f, a.value);
        D !== void 0 && ($.pageSize = D);
        const V = mr(g, w.value);
        V !== void 0 && ($.filters = V);
        const x = await b.get(`${R}/list`, { params: $ });
        if (we(x))
          return O(W(x).message), x;
        const G = x.data.fields_def;
        return G !== void 0 && (T.value = G, d(G)), x.data.paginacion !== void 0 && (a.value = x.data.paginacion), x;
      } catch (f) {
        return ce("error al listar", f), { status: !1, message: W(f).message };
      }
    }
  };
  async function oe(l, f, g) {
    if (l === "crear")
      return b.post(R, g);
    if (l === "editar")
      return _(f, "id"), b.put(`${R}/${f}`, g);
    throw new Error(`[crud] modo de formulario inválido: ${l}`);
  }
  async function qe(l, f, g, U, $, D) {
    const V = await Ve({
      campos: g,
      valores: U,
      modo: l,
      id: f,
      ejecutar: oe,
      alEnviar: () => {
        $.guardando = !0;
      }
    });
    return $.guardando = !1, $.errores = V.errores, $.errorGeneral = V.errorGeneral, V.ok && (ocultar_modal(D()), O(`${N.value} guardado correctamente.`), H()), V;
  }
  function fe(l, f) {
    const g = Z.value;
    if (g === null) {
      O("Todavía no hay definición de campos. Actualizá la tabla e intentá de nuevo.");
      return;
    }
    const U = l === "editar" ? f[r] : void 0, $ = K({
      guardar: null,
      guardando: !1,
      errores: {},
      errorGeneral: ""
    }), D = N.value.toLowerCase(), V = l === "crear" ? `Nuevo ${D}` : `Editar ${D}`, x = n.value;
    if (x !== null) {
      Me(x, l, U, f, g, $, V);
      return;
    }
    const G = {
      campos: X(g),
      ayudaCampos: i.campos,
      fila: f === void 0 ? null : f,
      modo: l,
      id: U,
      singular: N.value,
      ejecutar: oe,
      onGuardado: () => {
        O(`${N.value} guardado correctamente.`), H();
      },
      _modalState: $
    };
    F({ body: Gr, footer: $e }, V, G, { size: "md" });
  }
  function Me(l, f, g, U, $, D, V) {
    const x = X($), G = K(xe(x, U));
    let pe = null;
    const ye = (Ke) => qe(f, g, x, Ke, D, () => pe);
    D.guardar = () => ye(G);
    const Ie = _r({
      modo: f,
      fila: f === "editar" ? U : null,
      campos: x,
      valores: G,
      guardar: ye,
      modalState: D
    }), He = l.footer === null ? $e : l.footer, { code: Be } = F({ body: l.componente, footer: He }, V, Ie, { size: "md" });
    pe = Be;
  }
  function me() {
    v("crear") && fe("crear");
  }
  function ie(l) {
    v("editar") && (_(l, "fila"), fe("editar", l));
  }
  function le(l) {
    if (!v("eliminar")) return;
    _(l, "fila");
    const f = _(l[r], `fila.${r}`);
    z({
      title: "Eliminar",
      text: `¿Eliminar ${N.value.toLowerCase()} (${r}: ${f})? Esta acción no se puede deshacer.`,
      severity_confirmar: "danger",
      confirmar_accion: async () => {
        try {
          const g = await b.delete(`${R}/${f}`);
          if (we(g)) {
            O(W(g).message);
            return;
          }
          O(`${N.value} eliminado.`), H();
        } catch (g) {
          ce("error al eliminar", g);
        }
      }
    });
  }
  const Y = L(null);
  function Re(l) {
    Y.value = Array.isArray(l) || l === void 0 ? null : l;
  }
  const Te = A(() => {
    const l = [];
    return v("crear") && l.push(new B({
      key: "crud-crear",
      icon: "plus",
      severity: "success",
      label: "Nuevo",
      helpKey: i.botones.crear,
      onClick: () => me()
    })), v("editar") && l.push(new B({
      key: "crud-editar",
      icon: "pencil",
      severity: "warning",
      label: "Editar",
      helpKey: i.botones.editar,
      isDisabled: () => Y.value === null,
      onClick: () => ie(Y.value)
    })), v("eliminar") && l.push(new B({
      key: "crud-eliminar",
      icon: "trash",
      severity: "danger",
      label: "Eliminar",
      helpKey: i.botones.eliminar,
      isDisabled: () => Y.value === null,
      onClick: () => le(Y.value)
    })), l;
  }), Le = A(() => {
    const l = [];
    v("editar") && l.push(new B({
      key: "crud-fila-editar",
      icon: "pencil",
      severity: "outline-warning",
      label: "Editar",
      helpKey: i.botones.editar,
      onClick: (f) => ie(f)
    })), v("eliminar") && l.push(new B({
      key: "crud-fila-eliminar",
      icon: "trash",
      severity: "outline-danger",
      label: "Eliminar",
      helpKey: i.botones.eliminar,
      onClick: (f) => le(f)
    }));
    for (const f of I())
      _(f.key, "accionesExtra[].key"), !(f.permiso !== void 0 && !Ce(c.value, f.permiso)) && l.push(new B({
        key: `extra-${f.key}`,
        icon: f.icon,
        severity: f.severity,
        label: f.label,
        onClick: (g) => f.onClick(g)
      }));
    return l;
  });
  function Ge() {
    const l = u(e.elemento);
    return l == null || l.gender === void 0 ? "M" : l.gender;
  }
  const ze = A(() => {
    const l = {
      lazy: !0,
      infiniteScroll: !1,
      selectionMode: "single",
      elementName: { singular: N.value, gender: Ge() },
      dataPipeline: {
        processFields: (f) => {
          const g = Z.value;
          return (g === null ? f : ir(g)).map(($) => i.campos[$.field] === void 0 ? $ : { ...$, helpKey: i.campos[$.field] });
        }
      },
      // Lookups (<campo>_etiqueta), multiselect (labels) y escapado de texto.
      valueFormatters: dr(Z.value),
      buttons: {
        toolbar: Te.value,
        rowActions: Le.value
      }
    };
    return a.value !== null && (l.pageSize = _e(void 0, a.value), l.pageSizeOptions = Fe(a.value)), o !== null && (l.preferencesStore = o), l;
  });
  return {
    api: Ue,
    tableConfig: ze,
    puede: v,
    permisosActuales: c,
    camposEfectivos: Z,
    puedeListar: A(() => v("listar")),
    accionesActuales: A(() => t.value),
    onRowSelected: Re,
    setTabla: De,
    refresh: H,
    filtrosDisponibles: C,
    filtrosEstado: s,
    errorFiltros: E,
    aplicarFiltros: y,
    limpiarFiltros: S,
    paginacion: a,
    ayudaResuelta: i,
    abrirCrear: me,
    abrirEditar: ie,
    confirmarEliminar: le,
    ejecutar: oe
  };
}
const Br = { class: "crud-modulo" }, Kr = {
  key: 0,
  class: "crud-titulo"
}, Jr = {
  key: 1,
  class: "crud-sin-permiso"
}, Yr = {
  key: 0,
  class: "crud-filtros"
}, Qr = ["aria-expanded"], Wr = {
  key: 0,
  class: "crud-filtros-panel"
}, Xr = ["for"], Zr = ["id", "onUpdate:modelValue"], en = ["value"], rn = ["onUpdate:modelValue", "type", "aria-label"], nn = ["onUpdate:modelValue", "type", "aria-label"], tn = ["onUpdate:modelValue", "aria-label"], on = { value: "si" }, ln = { value: "no" }, an = ["onUpdate:modelValue", "aria-label"], sn = ["value"], un = ["onUpdate:modelValue", "type", "placeholder", "aria-label"], dn = {
  key: 0,
  class: "crud-error"
}, cn = { class: "crud-filtros-acciones" }, bn = {
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
    ayuda: { type: Object, default: null },
    // Operaciones habilitadas: { crear, editar, eliminar, listar } booleanos. Default: todas true.
    // Un botón se muestra sólo si está habilitado aquí Y el usuario tiene `<recurso>.<accion>`.
    acciones: { type: Object, default: null },
    // Formulario personalizado: { componente, footer? } en lugar de FormCrud (y FormCrudFooter).
    formulario: { type: Object, default: null }
  },
  setup(e, { expose: t }) {
    const n = e, r = L(null), o = L(!1), {
      api: i,
      tableConfig: a,
      puedeListar: s,
      accionesActuales: w,
      onRowSelected: E,
      setTabla: F,
      refresh: O,
      filtrosDisponibles: z,
      filtrosEstado: b,
      errorFiltros: R,
      aplicarFiltros: N,
      limpiarFiltros: I
    } = Hr({
      recurso: n.recurso,
      endpoint: n.endpoint,
      http: n.http,
      permisos: A(() => n.permisos),
      campos: A(() => n.campos),
      pk: n.pk,
      elemento: A(() => n.elemento),
      accionesExtra: A(() => n.accionesExtra),
      preferencias: n.preferencias,
      ayuda: n.ayuda,
      acciones: A(() => n.acciones),
      formulario: A(() => n.formulario)
    });
    function T(y) {
      return te(y);
    }
    function h(y) {
      return Oe[y];
    }
    function C(y) {
      return de(y);
    }
    function d(y) {
      return y.type === "number" ? "number" : y.type === "date" ? "date" : "text";
    }
    return he(r, (y) => F(y), { immediate: !0 }), he(a, () => {
      r.value !== null && r.value.applyConfig();
    }), t({ refresh: O }), (y, S) => (m(), p("div", Br, [
      e.titulo ? (m(), p("h2", Kr, j(e.titulo), 1)) : M("", !0),
      u(s) ? (m(), p(q, { key: 2 }, [
        u(z).length > 0 ? (m(), p("div", Yr, [
          k("button", {
            type: "button",
            class: "btn btn-sm btn-outline-secondary",
            "aria-expanded": o.value ? "true" : "false",
            onClick: S[0] || (S[0] = (c) => o.value = !o.value)
          }, j(o.value ? "Ocultar filtros" : "Filtros avanzados"), 9, Qr),
          o.value ? (m(), p("div", Wr, [
            (m(!0), p(q, null, J(u(z), (c) => (m(), p("div", {
              key: c.field,
              class: "crud-filtro-fila"
            }, [
              k("label", {
                for: `crud-filtro-op-${e.recurso}-${c.field}`,
                class: "form-label small mb-0"
              }, j(c.headerName), 9, Xr),
              P(k("select", {
                id: `crud-filtro-op-${e.recurso}-${c.field}`,
                "onUpdate:modelValue": (v) => u(b)[c.field].op = v,
                class: "form-select form-select-sm"
              }, [
                S[3] || (S[3] = k("option", { value: "" }, "Sin filtro", -1)),
                (m(!0), p(q, null, J(T(c), (v) => (m(), p("option", {
                  key: v,
                  value: v
                }, j(h(v)), 9, en))), 128))
              ], 8, Zr), [
                [ee, u(b)[c.field].op]
              ]),
              u(b)[c.field].op === "rango" ? (m(), p(q, { key: 0 }, [
                P(k("input", {
                  "onUpdate:modelValue": (v) => u(b)[c.field].desde = v,
                  type: d(c),
                  class: "form-control form-control-sm",
                  placeholder: "Desde",
                  "aria-label": `${c.headerName} desde`
                }, null, 8, rn), [
                  [re, u(b)[c.field].desde]
                ]),
                P(k("input", {
                  "onUpdate:modelValue": (v) => u(b)[c.field].hasta = v,
                  type: d(c),
                  class: "form-control form-control-sm",
                  placeholder: "Hasta",
                  "aria-label": `${c.headerName} hasta`
                }, null, 8, nn), [
                  [re, u(b)[c.field].hasta]
                ])
              ], 64)) : u(b)[c.field].op === "nulo" || c.type === "boolean" && u(b)[c.field].op !== "" && u(b)[c.field].op !== "en" ? P((m(), p("select", {
                key: 1,
                "onUpdate:modelValue": (v) => u(b)[c.field].valor = v,
                class: "form-select form-select-sm",
                "aria-label": `${c.headerName} valor`
              }, [
                S[4] || (S[4] = k("option", { value: "" }, "—", -1)),
                k("option", on, j(u(b)[c.field].op === "nulo" ? "Sí" : "Sí / verdadero"), 1),
                k("option", ln, j(u(b)[c.field].op === "nulo" ? "No" : "No / falso"), 1)
              ], 8, tn)), [
                [ee, u(b)[c.field].valor]
              ]) : u(b)[c.field].op !== "" && u(b)[c.field].op !== "en" && C(c).length > 0 ? P((m(), p("select", {
                key: 2,
                "onUpdate:modelValue": (v) => u(b)[c.field].valor = v,
                class: "form-select form-select-sm",
                "aria-label": `${c.headerName} valor`
              }, [
                S[5] || (S[5] = k("option", { value: "" }, "—", -1)),
                (m(!0), p(q, null, J(C(c), (v) => (m(), p("option", {
                  key: String(v.value),
                  value: String(v.value)
                }, j(v.label), 9, sn))), 128))
              ], 8, an)), [
                [ee, u(b)[c.field].valor]
              ]) : u(b)[c.field].op !== "" ? P((m(), p("input", {
                key: 3,
                "onUpdate:modelValue": (v) => u(b)[c.field].valor = v,
                type: u(b)[c.field].op === "en" ? "text" : d(c),
                class: "form-control form-control-sm",
                placeholder: u(b)[c.field].op === "en" ? "Valores separados por coma" : "Valor",
                "aria-label": `${c.headerName} valor`
              }, null, 8, un)), [
                [re, u(b)[c.field].valor]
              ]) : M("", !0)
            ]))), 128)),
            u(R) ? (m(), p("div", dn, j(u(R)), 1)) : M("", !0),
            k("div", cn, [
              k("button", {
                type: "button",
                class: "btn btn-sm btn-primary",
                onClick: S[1] || (S[1] = (...c) => u(N) && u(N)(...c))
              }, "Aplicar filtros"),
              k("button", {
                type: "button",
                class: "btn btn-sm btn-outline-secondary",
                onClick: S[2] || (S[2] = (...c) => u(I) && u(I)(...c))
              }, "Limpiar")
            ])
          ])) : M("", !0)
        ])) : M("", !0),
        Qe(u(We), {
          ref_key: "tabla",
          ref: r,
          id: e.recurso,
          api: u(i),
          config: u(a),
          onRowSelected: u(E)
        }, null, 8, ["id", "api", "config", "onRowSelected"])
      ], 64)) : (m(), p("div", Jr, [
        u(w).listar === !1 ? (m(), p(q, { key: 0 }, [
          ne("Este listado está deshabilitado.")
        ], 64)) : (m(), p(q, { key: 1 }, [
          ne("No tenés permiso para ver este listado (" + j(e.recurso) + ".listar).", 1)
        ], 64))
      ]))
    ]));
  }
};
export {
  Ae as ACCIONES,
  bn as CrudModulo,
  Oe as ETIQUETAS_OPERADOR,
  hr as accionPermitida,
  yr as atributosAyuda,
  X as camposFormulario,
  br as clavePreferenciasTabla,
  mr as combinarFiltros,
  fr as construirFiltrosAvanzados,
  _r as construirParametrosFormulario,
  ar as construirPayload,
  vr as crearAdaptadorPreferencias,
  yn as crearPreferenciasLocales,
  bn as default,
  kr as erroresDeRespuesta,
  W as extraerError,
  ir as fieldsDefDesdeCampos,
  Se as formTypeDeCampo,
  Ne as normalizarAcciones,
  wr as normalizarFormulario,
  Fe as opcionesTamanoPagina,
  te as operadoresDeFiltro,
  _e as pageSizeAceptado,
  nr as permisosDeRecurso,
  Ve as procesarGuardado,
  pr as resolverAyuda,
  Ce as tienePermiso,
  Hr as useCrud,
  lr as validarFormulario,
  xe as valoresIniciales
};
//# sourceMappingURL=vue-greenborn-crud.js.map
