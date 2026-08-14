import { openBlock as u, createElementBlock as _, Fragment as z, renderList as B, normalizeClass as $, toDisplayString as L, createElementVNode as p, markRaw as M, ref as I, createBlock as b, Teleport as Z, unref as k, normalizeStyle as D, withModifiers as T, resolveDynamicComponent as x, createCommentVNode as A } from "vue";
const G = ["innerHTML"], O = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (o, c) => (u(), _("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, G));
  }
}, P = { class: "gmm-footer-bar" }, W = ["autofocus", "disabled", "onClick"], X = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const o = e, { ocultar_modal: c } = H();
    function n() {
      c(o.parametros._modal_cod);
    }
    async function i() {
      return await o.parametros._callback_guardar(o.parametros);
    }
    return (f, r) => (u(), _("div", P, [
      e.parametros.botones_footer ? (u(!0), _(z, { key: 0 }, B(e.parametros.botones_footer, (d, g) => (u(), _("button", {
        key: g,
        type: "button",
        class: $(["gmm-btn", `gmm-btn-${d.severity || "primary"}`]),
        autofocus: d.autofocus,
        disabled: d.disabled,
        onClick: d.onClick
      }, L(d.label), 11, W))), 128)) : (u(), _(z, { key: 1 }, [
        p("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: n
        }, " Cancelar "),
        p("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: i
        }, L(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, q = 20, J = 2e3, K = {
  activo: !1,
  id: 0,
  code: 0,
  componente: null,
  componente_header: null,
  componente_footer: null,
  parametros: {},
  titulo: "",
  config_modal: {},
  position: { x: 0, y: 0 }
}, a = I([]), F = I(J);
let h = 0;
for (let e = 0; e < q; e++)
  a.value.push({ ...K, id: e });
function Q() {
}
function U() {
  const e = [], o = [];
  for (let n = 0; n < a.value.length; n++)
    a.value[n].activo ? e.push(a.value[n]) : o.push(a.value[n]);
  const c = e.concat(o);
  for (let n = 0; n < c.length; n++)
    c[n].id = n;
  return { modals: c, ultimo_id: e.length - 1 };
}
function N(e, o, c = {}, n = {}) {
  if (h += 1, !(n != null && n.id)) {
    const y = U();
    a.value = y.modals, n.id = y.ultimo_id + 1;
  }
  const i = a.value[n.id];
  if (!i)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", n), { code: Number(h) };
  i.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", n), i.activo = !0;
  const f = !!(e && (e.body || e.header || e.footer)), r = f ? e.body : e, d = f ? e.header : null, g = f ? e.footer : (e == null ? void 0 : e.footer) || null;
  return i.componente = r ? M(r) : null, i.componente_header = d ? M(d) : null, i.componente_footer = g ? M(g) : null, i.parametros = { ...c, _config_modal: n, _modal_cod: h }, i.titulo = o, i.config_modal = n, i.code = Number(h), { code: Number(h) };
}
function C(e = null) {
  if (e != null) {
    for (let o = 0; o < a.value.length; o++)
      if (e == a.value[o].code) {
        a.value[o].activo = !1;
        break;
      }
  } else
    for (let o = 0; o < a.value.length; o++)
      a.value[o].activo = !1;
}
function ee(e) {
  const o = a.value.filter((r) => r.activo);
  if (o.length <= 1) return;
  const c = o.find((r) => r.code === e);
  if (!c || o[o.length - 1] === c) return;
  const n = o.filter((r) => r.code !== e), i = a.value.filter((r) => !r.activo), f = n.concat([c]).concat(i);
  for (let r = 0; r < f.length; r++)
    f[r].id = r;
  a.value = f;
}
function oe(e, o, c) {
  const n = a.value.find((i) => i.activo && i.code === e);
  n && (n.position.x = o, n.position.y = c);
}
function te(e) {
  const o = a.value.length - 1;
  N(
    { body: O, footer: X },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => C(a.value[o].code) }
      ]
    },
    { id: o, size: "sm" }
  );
}
function ne(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const o = a.value.length - 1;
  N(
    { body: O, footer: X },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            C(a.value[o].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            C(a.value[o].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: o, size: "sm" }
  );
}
function se(e) {
  F.value = Number(e);
}
function H() {
  return {
    modals_: a,
    z_index_base: F,
    mostrar_modal: N,
    ocultar_modal: C,
    traer_al_frente: ee,
    actualizar_posicion: oe,
    mostrar_alerta: te,
    mostrar_confirm: ne,
    inic_modals: Q,
    set_z_index_base: se
  };
}
const ae = { class: "gmm-stack" }, re = ["onMousedown"], ie = ["data-modal-code", "onClick"], le = ["onMousedown"], ce = {
  key: 1,
  class: "gmm-header-title"
}, ue = ["onClick"], de = { class: "gmm-body" }, me = { class: "gmm-content-wrapper" }, fe = {
  key: 0,
  class: "gmm-footer"
}, ge = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: o, ocultar_modal: c, traer_al_frente: n, actualizar_posicion: i, z_index_base: f } = H(), r = ["sm", "md", "lg", "full"];
    let d = null, g = { x: 0, y: 0 };
    function y(l) {
      var t;
      const s = ((t = l.config_modal) == null ? void 0 : t.styles) || {};
      return {
        ...s.width ? { width: s.width } : {},
        ...s.height ? { height: s.height } : {}
      };
    }
    function V(l) {
      return {
        transform: `translate(${l.position.x}px, ${l.position.y}px)`
      };
    }
    function j(l) {
      const s = l.config_modal || {}, t = s.styles || {};
      let m = null;
      return t.width || (s.size && !r.includes(s.size) && console.warn(
        `[ModalContainer] config_modal.size="${s.size}" no está en la escala (${r.join(", ")}); se ignora.`
      ), m = r.includes(s.size) ? `gmm-size-${s.size}` : "gmm-ancho-auto"), [s.cssClass, m, { "gmm-alto-auto": !t.height }];
    }
    function w(l) {
      var s;
      return (((s = l.config_modal) == null ? void 0 : s.draggable) ?? !0) !== !1;
    }
    function R(l, s) {
      var m;
      (((m = l.config_modal) == null ? void 0 : m.dismissableMask) ?? !1) && s.target === s.currentTarget && c(l.code);
    }
    function Y(l, s) {
      d = s.code;
      const m = l.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      g.x = l.clientX - (m.left + m.width / 2), g.y = l.clientY - (m.top + m.height / 2), document.addEventListener("mousemove", S), document.addEventListener("mouseup", E);
    }
    function S(l) {
      if (d == null) return;
      const s = l.clientX - g.x - window.innerWidth / 2, t = l.clientY - g.y - window.innerHeight / 2;
      i(d, s, t);
    }
    function E() {
      d = null, document.removeEventListener("mousemove", S), document.removeEventListener("mouseup", E);
    }
    return (l, s) => (u(), b(Z, { to: "body" }, [
      p("div", ae, [
        (u(!0), _(z, null, B(k(o).filter((t) => t.activo), (t) => {
          var m;
          return u(), _("div", {
            key: t.code,
            class: "gmm-layer",
            style: D(`z-index: ${k(f).value + t.id}`),
            onMousedown: (v) => k(n)(t.code)
          }, [
            p("div", {
              class: "gmm-overlay",
              "data-modal-code": t.code,
              onClick: (v) => R(t, v)
            }, [
              p("div", {
                class: $(["gmm-dialog", [...j(t), ...w(t) ? ["gmm-draggable"] : []]]),
                style: D({ ...y(t), ...V(t) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: s[1] || (s[1] = T(() => {
                }, ["stop"]))
              }, [
                p("div", {
                  class: $(["gmm-header", w(t) ? "gmm-header-drag" : ""]),
                  onMousedown: (v) => w(t) && Y(v, t)
                }, [
                  t.componente_header ? (u(), b(x(t.componente_header), {
                    key: 0,
                    parametros: t.parametros
                  }, null, 8, ["parametros"])) : (u(), _("span", ce, L(t.titulo), 1)),
                  ((m = t.config_modal) == null ? void 0 : m.closable) !== !1 ? (u(), _("button", {
                    key: 2,
                    type: "button",
                    class: "gmm-header-close",
                    "aria-label": "Cerrar",
                    onMousedown: s[0] || (s[0] = T(() => {
                    }, ["stop"])),
                    onClick: (v) => k(c)(t.code)
                  }, " × ", 40, ue)) : A("", !0)
                ], 42, le),
                p("div", de, [
                  p("div", me, [
                    (u(), b(x(t.componente), {
                      parametros: t.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                t.componente_footer ? (u(), _("div", fe, [
                  (u(), b(x(t.componente_footer), {
                    parametros: t.parametros
                  }, null, 8, ["parametros"]))
                ])) : A("", !0)
              ], 38)
            ], 8, ie)
          ], 44, re);
        }), 128))
      ])
    ]));
  }
};
export {
  O as DialogConfirm,
  ge as ModalContainer,
  X as ModalFooter,
  ge as default,
  H as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
