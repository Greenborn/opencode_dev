import { openBlock as c, createElementBlock as u, Fragment as y, renderList as x, normalizeClass as N, toDisplayString as k, createElementVNode as m, markRaw as v, ref as T, createBlock as p, Teleport as A, unref as z, normalizeStyle as $, resolveDynamicComponent as b, createCommentVNode as w } from "vue";
const I = ["innerHTML"], S = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (t, i) => (c(), u("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, I));
  }
}, O = { class: "gmm-footer-bar" }, B = ["autofocus", "disabled", "onClick"], L = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const t = e, { ocultar_modal: i } = D();
    function a() {
      i(t.parametros._modal_cod);
    }
    async function l() {
      return await t.parametros._callback_guardar(t.parametros);
    }
    return (f, _) => (c(), u("div", O, [
      e.parametros.botones_footer ? (c(!0), u(y, { key: 0 }, x(e.parametros.botones_footer, (n, s) => (c(), u("button", {
        key: s,
        type: "button",
        class: N(["gmm-btn", `gmm-btn-${n.severity || "primary"}`]),
        autofocus: n.autofocus,
        disabled: n.disabled,
        onClick: n.onClick
      }, k(n.label), 11, B))), 128)) : (c(), u(y, { key: 1 }, [
        m("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: a
        }, " Cancelar "),
        m("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: l
        }, k(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, E = 20, F = {
  activo: !1,
  id: 0,
  code: 0,
  componente: null,
  componente_header: null,
  componente_footer: null,
  parametros: {},
  titulo: "",
  config_modal: {}
}, r = T([]);
let h = 0;
for (let e = 0; e < E; e++)
  r.value.push({ ...F, id: e });
function V() {
}
function j() {
  const e = [], t = [];
  for (let a = 0; a < r.value.length; a++)
    r.value[a].activo ? e.push(r.value[a]) : t.push(r.value[a]);
  const i = e.concat(t);
  for (let a = 0; a < i.length; a++)
    i[a].id = a;
  return { modals: i, ultimo_id: e.length - 1 };
}
function C(e, t, i = {}, a = {}) {
  if (h += 1, !(a != null && a.id)) {
    const o = j();
    r.value = o.modals, a.id = o.ultimo_id + 1;
  }
  const l = r.value[a.id];
  if (!l)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", a), { code: Number(h) };
  l.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", a), l.activo = !0;
  const f = !!(e && (e.body || e.header || e.footer)), _ = f ? e.body : e, n = f ? e.header : null, s = f ? e.footer : (e == null ? void 0 : e.footer) || null;
  return l.componente = _ ? v(_) : null, l.componente_header = n ? v(n) : null, l.componente_footer = s ? v(s) : null, l.parametros = { ...i, _config_modal: a, _modal_cod: h }, l.titulo = t, l.config_modal = a, l.code = Number(h), { code: Number(h) };
}
function g(e = null) {
  if (e != null) {
    for (let t = 0; t < r.value.length; t++)
      if (e == r.value[t].code) {
        r.value[t].activo = !1;
        break;
      }
  } else
    for (let t = 0; t < r.value.length; t++)
      r.value[t].activo = !1;
}
function H(e) {
  const t = r.value.length - 1;
  C(
    { body: S, footer: L },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => g(r.value[t].code) }
      ]
    },
    { id: t, size: "sm" }
  );
}
function G(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const t = r.value.length - 1;
  C(
    { body: S, footer: L },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            g(r.value[t].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            g(r.value[t].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: t, size: "sm" }
  );
}
function D() {
  return {
    modals_: r,
    mostrar_modal: C,
    ocultar_modal: g,
    mostrar_alerta: H,
    mostrar_confirm: G,
    inic_modals: V
  };
}
const P = { class: "gmm-stack" }, R = ["data-modal-code", "onClick"], X = { class: "gmm-header" }, Z = {
  key: 1,
  class: "gmm-header-title"
}, q = ["onClick"], J = { class: "gmm-body" }, K = { class: "gmm-content-wrapper" }, Q = {
  key: 0,
  class: "gmm-footer"
}, U = 1e3, Y = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: t, ocultar_modal: i } = D(), a = ["sm", "md", "lg", "full"];
    function l(n) {
      var o;
      const s = ((o = n.config_modal) == null ? void 0 : o.styles) || {};
      return {
        ...s.width ? { width: s.width } : {},
        ...s.height ? { height: s.height } : {}
      };
    }
    function f(n) {
      const s = n.config_modal || {}, o = s.styles || {};
      let d = null;
      return o.width || (s.size && !a.includes(s.size) && console.warn(
        `[ModalContainer] config_modal.size="${s.size}" no está en la escala (${a.join(", ")}); se ignora.`
      ), d = a.includes(s.size) ? `gmm-size-${s.size}` : "gmm-ancho-auto"), [s.cssClass, d, { "gmm-alto-auto": !o.height }];
    }
    function _(n, s) {
      var d;
      (((d = n.config_modal) == null ? void 0 : d.dismissableMask) ?? !1) && s.target === s.currentTarget && i(n.code);
    }
    return (n, s) => (c(), p(A, { to: "body" }, [
      m("div", P, [
        (c(!0), u(y, null, x(z(t).filter((o) => o.activo), (o) => {
          var d;
          return c(), u("div", {
            key: o.code,
            class: "gmm-layer",
            style: $(`z-index: ${U + o.id}`)
          }, [
            m("div", {
              class: "gmm-overlay",
              "data-modal-code": o.code,
              onClick: (M) => _(o, M)
            }, [
              m("div", {
                class: N(["gmm-dialog", f(o)]),
                style: $(l(o)),
                role: "dialog",
                "aria-modal": "true"
              }, [
                m("div", X, [
                  o.componente_header ? (c(), p(b(o.componente_header), {
                    key: 0,
                    parametros: o.parametros
                  }, null, 8, ["parametros"])) : (c(), u("span", Z, k(o.titulo), 1)),
                  ((d = o.config_modal) == null ? void 0 : d.closable) !== !1 ? (c(), u("button", {
                    key: 2,
                    type: "button",
                    class: "gmm-header-close",
                    "aria-label": "Cerrar",
                    onClick: (M) => z(i)(o.code)
                  }, " × ", 8, q)) : w("", !0)
                ]),
                m("div", J, [
                  m("div", K, [
                    (c(), p(b(o.componente), {
                      parametros: o.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                o.componente_footer ? (c(), u("div", Q, [
                  (c(), p(b(o.componente_footer), {
                    parametros: o.parametros
                  }, null, 8, ["parametros"]))
                ])) : w("", !0)
              ], 6)
            ], 8, R)
          ], 4);
        }), 128))
      ])
    ]));
  }
};
export {
  S as DialogConfirm,
  Y as ModalContainer,
  L as ModalFooter,
  Y as default,
  D as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
