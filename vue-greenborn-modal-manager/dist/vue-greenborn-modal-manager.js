import { openBlock as u, createElementBlock as m, Fragment as $, renderList as D, normalizeClass as x, toDisplayString as L, createElementVNode as _, markRaw as S, ref as O, computed as Y, onMounted as se, onUnmounted as ae, createBlock as C, Teleport as ie, unref as M, normalizeStyle as j, withModifiers as I, resolveDynamicComponent as B, createCommentVNode as w } from "vue";
const re = ["innerHTML"], Z = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (o, i) => (u(), m("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, re));
  }
}, le = { class: "gmm-footer-bar" }, ce = ["autofocus", "disabled", "onClick"], G = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const o = e, { ocultar_modal: i } = q();
    function n() {
      i(o.parametros._modal_cod);
    }
    async function l() {
      return await o.parametros._callback_guardar(o.parametros);
    }
    return (v, c) => (u(), m("div", le, [
      e.parametros.botones_footer ? (u(!0), m($, { key: 0 }, D(e.parametros.botones_footer, (g, h) => (u(), m("button", {
        key: h,
        type: "button",
        class: x(["gmm-btn", `gmm-btn-${g.severity || "primary"}`]),
        autofocus: g.autofocus,
        disabled: g.disabled,
        onClick: g.onClick
      }, L(g.label), 11, ce))), 128)) : (u(), m($, { key: 1 }, [
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: n
        }, " Cancelar "),
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: l
        }, L(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, ue = 20, P = 2e3, de = {
  activo: !1,
  id: 0,
  code: 0,
  zIndex: 0,
  componente: null,
  componente_header: null,
  componente_footer: null,
  parametros: {},
  titulo: "",
  config_modal: {},
  position: { x: 0, y: 0 },
  minimized: !1
}, r = O([]), U = O(P);
let y = 0, H = P;
for (let e = 0; e < ue; e++)
  r.value.push({ ...de, id: e });
function me() {
}
function fe() {
  const e = [], o = [];
  for (let n = 0; n < r.value.length; n++)
    r.value[n].activo ? e.push(r.value[n]) : o.push(r.value[n]);
  const i = e.concat(o);
  for (let n = 0; n < i.length; n++)
    i[n].id = n;
  return { modals: i, ultimo_id: e.length - 1 };
}
function A(e, o, i = {}, n = {}) {
  if (y += 1, !(n != null && n.id)) {
    const p = fe();
    r.value = p.modals, n.id = p.ultimo_id + 1;
  }
  const l = r.value[n.id];
  if (!l)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", n), { code: Number(y) };
  l.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", n), l.activo = !0, l.zIndex = ++H;
  const v = !!(e && (e.body || e.header || e.footer)), c = v ? e.body : e, g = v ? e.header : null, h = v ? e.footer : (e == null ? void 0 : e.footer) || null;
  return l.componente = c ? S(c) : null, l.componente_header = g ? S(g) : null, l.componente_footer = h ? S(h) : null, l.parametros = { ...i, _config_modal: n, _modal_cod: y }, l.titulo = o, l.config_modal = n, l.code = Number(y), { code: Number(y) };
}
function T(e = null) {
  if (e != null) {
    for (let o = 0; o < r.value.length; o++)
      if (e == r.value[o].code) {
        r.value[o].activo = !1;
        break;
      }
  } else
    for (let o = 0; o < r.value.length; o++)
      r.value[o].activo = !1;
}
function _e(e) {
  const o = r.value.find((i) => i.activo && i.code === e);
  o && (o.minimized = !0);
}
function ve(e) {
  const o = r.value.find((i) => i.activo && i.code === e);
  o && (o.minimized = !1, W(e));
}
function W(e) {
  const o = r.value.filter((c) => c.activo);
  if (o.length <= 1) return;
  const i = o.find((c) => c.code === e);
  if (!i || o[o.length - 1] === i) return;
  const n = o.filter((c) => c.code !== e), l = r.value.filter((c) => !c.activo), v = n.concat([i]).concat(l);
  for (let c = 0; c < v.length; c++)
    v[c].id = c;
  i.zIndex = ++H, r.value = v;
}
function ge(e, o, i) {
  const n = r.value.find((l) => l.activo && l.code === e);
  n && (n.position.x = o, n.position.y = i);
}
function he(e) {
  const o = r.value.length - 1;
  A(
    { body: Z, footer: G },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => T(r.value[o].code) }
      ]
    },
    { id: o, size: "sm" }
  );
}
function pe(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const o = r.value.length - 1;
  A(
    { body: Z, footer: G },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            T(r.value[o].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            T(r.value[o].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: o, size: "sm" }
  );
}
function be(e) {
  U.value = Number(e), H = Number(e);
}
function q() {
  return {
    modals_: r,
    z_index_base: U,
    mostrar_modal: A,
    ocultar_modal: T,
    minimizar: _e,
    restaurar: ve,
    traer_al_frente: W,
    actualizar_posicion: ge,
    mostrar_alerta: he,
    mostrar_confirm: pe,
    inic_modals: me,
    set_z_index_base: be
  };
}
const ye = { class: "gmm-stack" }, ke = ["onMousedown"], ze = ["data-modal-code", "onClick"], Ce = ["onMousedown"], Me = {
  key: 1,
  class: "gmm-header-title"
}, we = { class: "gmm-header-controls" }, xe = ["onClick"], $e = ["onClick"], Le = { class: "gmm-body" }, Te = { class: "gmm-content-wrapper" }, Ee = {
  key: 0,
  class: "gmm-footer"
}, Ne = { class: "gmm-taskbar-inner" }, Se = ["title", "onClick"], Ie = { class: "gmm-taskbar-title" }, Be = 12, Oe = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: o, ocultar_modal: i, minimizar: n, restaurar: l, traer_al_frente: v, actualizar_posicion: c } = q(), g = Y(() => o.value.filter((a) => a.activo && !a.minimized)), h = Y(() => o.value.filter((a) => a.activo && a.minimized)), p = O(!1);
    let f = null;
    function X(a) {
      window.innerHeight - a.clientY < Be && h.value.length && (f && (clearTimeout(f), f = null), p.value = !0);
    }
    function J() {
      f && (clearTimeout(f), f = null), p.value = !0;
    }
    function K() {
      f && clearTimeout(f), f = setTimeout(() => {
        p.value = !1, f = null;
      }, 300);
    }
    se(() => {
      document.addEventListener("mousemove", X);
    }), ae(() => {
      document.removeEventListener("mousemove", X), f && clearTimeout(f);
    });
    const E = ["sm", "md", "lg", "full"];
    let k = null, z = { x: 0, y: 0 };
    function Q(a) {
      var t;
      const s = ((t = a.config_modal) == null ? void 0 : t.styles) || {};
      return {
        ...s.width ? { width: s.width } : {},
        ...s.height ? { height: s.height } : {}
      };
    }
    function ee(a) {
      return {
        transform: `translate(${a.position.x}px, ${a.position.y}px)`
      };
    }
    function oe(a) {
      const s = a.config_modal || {}, t = s.styles || {};
      let d = null;
      return t.width || (s.size && !E.includes(s.size) && console.warn(
        `[ModalContainer] config_modal.size="${s.size}" no está en la escala (${E.join(", ")}); se ignora.`
      ), d = E.includes(s.size) ? `gmm-size-${s.size}` : "gmm-ancho-auto"), [s.cssClass, d, { "gmm-alto-auto": !t.height }];
    }
    function N(a) {
      var s;
      return (((s = a.config_modal) == null ? void 0 : s.draggable) ?? !0) !== !1;
    }
    function te(a, s) {
      var d;
      (((d = a.config_modal) == null ? void 0 : d.dismissableMask) ?? !1) && s.target === s.currentTarget && i(a.code);
    }
    function ne(a, s) {
      k = s.code;
      const d = a.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      z.x = a.clientX - (d.left + d.width / 2), z.y = a.clientY - (d.top + d.height / 2), document.addEventListener("mousemove", F), document.addEventListener("mouseup", R);
    }
    function F(a) {
      if (k == null) return;
      const s = a.clientX - z.x - window.innerWidth / 2, t = a.clientY - z.y - window.innerHeight / 2;
      c(k, s, t);
    }
    function R() {
      k = null, document.removeEventListener("mousemove", F), document.removeEventListener("mouseup", R);
    }
    return (a, s) => (u(), C(ie, { to: "body" }, [
      _("div", ye, [
        (u(!0), m($, null, D(g.value, (t) => {
          var d, V;
          return u(), m("div", {
            key: t.code,
            class: "gmm-layer",
            style: j(`z-index: ${t.zIndex}`),
            onMousedown: (b) => M(v)(t.code)
          }, [
            _("div", {
              class: "gmm-overlay",
              "data-modal-code": t.code,
              onClick: (b) => te(t, b)
            }, [
              _("div", {
                class: x(["gmm-dialog", [...oe(t), ...N(t) ? ["gmm-draggable"] : []]]),
                style: j({ ...Q(t), ...ee(t) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: s[2] || (s[2] = I(() => {
                }, ["stop"]))
              }, [
                _("div", {
                  class: x(["gmm-header", N(t) ? "gmm-header-drag" : ""]),
                  onMousedown: (b) => N(t) && ne(b, t)
                }, [
                  t.componente_header ? (u(), C(B(t.componente_header), {
                    key: 0,
                    parametros: t.parametros
                  }, null, 8, ["parametros"])) : (u(), m("span", Me, L(t.titulo), 1)),
                  _("div", we, [
                    ((d = t.config_modal) == null ? void 0 : d.minimizable) !== !1 ? (u(), m("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: s[0] || (s[0] = I(() => {
                      }, ["stop"])),
                      onClick: (b) => M(n)(t.code)
                    }, " − ", 40, xe)) : w("", !0),
                    ((V = t.config_modal) == null ? void 0 : V.closable) !== !1 ? (u(), m("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: s[1] || (s[1] = I(() => {
                      }, ["stop"])),
                      onClick: (b) => M(i)(t.code)
                    }, " × ", 40, $e)) : w("", !0)
                  ])
                ], 42, Ce),
                _("div", Le, [
                  _("div", Te, [
                    (u(), C(B(t.componente), {
                      parametros: t.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                t.componente_footer ? (u(), m("div", Ee, [
                  (u(), C(B(t.componente_footer), {
                    parametros: t.parametros
                  }, null, 8, ["parametros"]))
                ])) : w("", !0)
              ], 38)
            ], 8, ze)
          ], 44, ke);
        }), 128)),
        h.value.length ? (u(), m("div", {
          key: 0,
          class: x(["gmm-taskbar", { visible: p.value }]),
          onMouseenter: J,
          onMouseleave: K
        }, [
          _("div", Ne, [
            (u(!0), m($, null, D(h.value, (t) => (u(), m("div", {
              key: `min-${t.code}`,
              class: "gmm-taskbar-item",
              title: t.titulo,
              onClick: (d) => M(l)(t.code)
            }, [
              _("span", Ie, L(t.titulo), 1)
            ], 8, Se))), 128))
          ])
        ], 34)) : w("", !0)
      ])
    ]));
  }
};
export {
  Z as DialogConfirm,
  Oe as ModalContainer,
  G as ModalFooter,
  Oe as default,
  q as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
