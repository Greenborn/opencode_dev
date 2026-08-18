import { openBlock as u, createElementBlock as m, Fragment as L, renderList as H, normalizeClass as $, toDisplayString as T, createElementVNode as _, markRaw as B, ref as A, computed as Y, onMounted as ne, onUnmounted as se, createBlock as w, Teleport as ae, unref as y, normalizeStyle as j, withModifiers as D, resolveDynamicComponent as O, createCommentVNode as x } from "vue";
const ie = ["innerHTML"], Z = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (o, r) => (u(), m("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, ie));
  }
}, re = { class: "gmm-footer-bar" }, le = ["autofocus", "disabled", "onClick"], G = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const o = e, { ocultar_modal: r } = W();
    function n() {
      r(o.parametros._modal_cod);
    }
    async function l() {
      return await o.parametros._callback_guardar(o.parametros);
    }
    return (v, c) => (u(), m("div", re, [
      e.parametros.botones_footer ? (u(!0), m(L, { key: 0 }, H(e.parametros.botones_footer, (g, h) => (u(), m("button", {
        key: h,
        type: "button",
        class: $(["gmm-btn", `gmm-btn-${g.severity || "primary"}`]),
        autofocus: g.autofocus,
        disabled: g.disabled,
        onClick: g.onClick
      }, T(g.label), 11, le))), 128)) : (u(), m(L, { key: 1 }, [
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: n
        }, " Cancelar "),
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: l
        }, T(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, ce = 20, ue = 2e3, de = {
  activo: !1,
  id: 0,
  code: 0,
  componente: null,
  componente_header: null,
  componente_footer: null,
  parametros: {},
  titulo: "",
  config_modal: {},
  position: { x: 0, y: 0 },
  minimized: !1
}, i = A([]), P = A(ue);
let k = 0;
for (let e = 0; e < ce; e++)
  i.value.push({ ...de, id: e });
function me() {
}
function fe() {
  const e = [], o = [];
  for (let n = 0; n < i.value.length; n++)
    i.value[n].activo ? e.push(i.value[n]) : o.push(i.value[n]);
  const r = e.concat(o);
  for (let n = 0; n < r.length; n++)
    r[n].id = n;
  return { modals: r, ultimo_id: e.length - 1 };
}
function I(e, o, r = {}, n = {}) {
  if (k += 1, !(n != null && n.id)) {
    const p = fe();
    i.value = p.modals, n.id = p.ultimo_id + 1;
  }
  const l = i.value[n.id];
  if (!l)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", n), { code: Number(k) };
  l.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", n), l.activo = !0;
  const v = !!(e && (e.body || e.header || e.footer)), c = v ? e.body : e, g = v ? e.header : null, h = v ? e.footer : (e == null ? void 0 : e.footer) || null;
  return l.componente = c ? B(c) : null, l.componente_header = g ? B(g) : null, l.componente_footer = h ? B(h) : null, l.parametros = { ...r, _config_modal: n, _modal_cod: k }, l.titulo = o, l.config_modal = n, l.code = Number(k), { code: Number(k) };
}
function E(e = null) {
  if (e != null) {
    for (let o = 0; o < i.value.length; o++)
      if (e == i.value[o].code) {
        i.value[o].activo = !1;
        break;
      }
  } else
    for (let o = 0; o < i.value.length; o++)
      i.value[o].activo = !1;
}
function _e(e) {
  const o = i.value.find((r) => r.activo && r.code === e);
  o && (o.minimized = !0);
}
function ve(e) {
  const o = i.value.find((r) => r.activo && r.code === e);
  o && (o.minimized = !1, U(e));
}
function U(e) {
  const o = i.value.filter((c) => c.activo);
  if (o.length <= 1) return;
  const r = o.find((c) => c.code === e);
  if (!r || o[o.length - 1] === r) return;
  const n = o.filter((c) => c.code !== e), l = i.value.filter((c) => !c.activo), v = n.concat([r]).concat(l);
  for (let c = 0; c < v.length; c++)
    v[c].id = c;
  i.value = v;
}
function ge(e, o, r) {
  const n = i.value.find((l) => l.activo && l.code === e);
  n && (n.position.x = o, n.position.y = r);
}
function he(e) {
  const o = i.value.length - 1;
  I(
    { body: Z, footer: G },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => E(i.value[o].code) }
      ]
    },
    { id: o, size: "sm" }
  );
}
function pe(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const o = i.value.length - 1;
  I(
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
            E(i.value[o].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            E(i.value[o].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: o, size: "sm" }
  );
}
function be(e) {
  P.value = Number(e);
}
function W() {
  return {
    modals_: i,
    z_index_base: P,
    mostrar_modal: I,
    ocultar_modal: E,
    minimizar: _e,
    restaurar: ve,
    traer_al_frente: U,
    actualizar_posicion: ge,
    mostrar_alerta: he,
    mostrar_confirm: pe,
    inic_modals: me,
    set_z_index_base: be
  };
}
const ye = { class: "gmm-stack" }, ke = ["onMousedown"], Ce = ["data-modal-code", "onClick"], ze = ["onMousedown"], Me = {
  key: 1,
  class: "gmm-header-title"
}, we = { class: "gmm-header-controls" }, xe = ["onClick"], $e = ["onClick"], Le = { class: "gmm-body" }, Te = { class: "gmm-content-wrapper" }, Ee = {
  key: 0,
  class: "gmm-footer"
}, Ne = { class: "gmm-taskbar-inner" }, Se = ["title", "onClick"], Be = { class: "gmm-taskbar-title" }, De = 12, He = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: o, ocultar_modal: r, minimizar: n, restaurar: l, traer_al_frente: v, actualizar_posicion: c, z_index_base: g } = W(), h = Y(() => o.value.filter((a) => a.activo && !a.minimized)), p = Y(() => o.value.filter((a) => a.activo && a.minimized)), C = A(!1);
    let f = null;
    function X(a) {
      window.innerHeight - a.clientY < De && p.value.length && (f && (clearTimeout(f), f = null), C.value = !0);
    }
    function q() {
      f && (clearTimeout(f), f = null), C.value = !0;
    }
    function J() {
      f && clearTimeout(f), f = setTimeout(() => {
        C.value = !1, f = null;
      }, 300);
    }
    ne(() => {
      document.addEventListener("mousemove", X);
    }), se(() => {
      document.removeEventListener("mousemove", X), f && clearTimeout(f);
    });
    const N = ["sm", "md", "lg", "full"];
    let z = null, M = { x: 0, y: 0 };
    function K(a) {
      var t;
      const s = ((t = a.config_modal) == null ? void 0 : t.styles) || {};
      return {
        ...s.width ? { width: s.width } : {},
        ...s.height ? { height: s.height } : {}
      };
    }
    function Q(a) {
      return {
        transform: `translate(${a.position.x}px, ${a.position.y}px)`
      };
    }
    function ee(a) {
      const s = a.config_modal || {}, t = s.styles || {};
      let d = null;
      return t.width || (s.size && !N.includes(s.size) && console.warn(
        `[ModalContainer] config_modal.size="${s.size}" no está en la escala (${N.join(", ")}); se ignora.`
      ), d = N.includes(s.size) ? `gmm-size-${s.size}` : "gmm-ancho-auto"), [s.cssClass, d, { "gmm-alto-auto": !t.height }];
    }
    function S(a) {
      var s;
      return (((s = a.config_modal) == null ? void 0 : s.draggable) ?? !0) !== !1;
    }
    function oe(a, s) {
      var d;
      (((d = a.config_modal) == null ? void 0 : d.dismissableMask) ?? !1) && s.target === s.currentTarget && r(a.code);
    }
    function te(a, s) {
      z = s.code;
      const d = a.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      M.x = a.clientX - (d.left + d.width / 2), M.y = a.clientY - (d.top + d.height / 2), document.addEventListener("mousemove", F), document.addEventListener("mouseup", R);
    }
    function F(a) {
      if (z == null) return;
      const s = a.clientX - M.x - window.innerWidth / 2, t = a.clientY - M.y - window.innerHeight / 2;
      c(z, s, t);
    }
    function R() {
      z = null, document.removeEventListener("mousemove", F), document.removeEventListener("mouseup", R);
    }
    return (a, s) => (u(), w(ae, { to: "body" }, [
      _("div", ye, [
        (u(!0), m(L, null, H(h.value, (t) => {
          var d, V;
          return u(), m("div", {
            key: t.code,
            class: "gmm-layer",
            style: j(`z-index: ${y(g) + t.id}`),
            onMousedown: (b) => y(v)(t.code)
          }, [
            _("div", {
              class: "gmm-overlay",
              "data-modal-code": t.code,
              onClick: (b) => oe(t, b)
            }, [
              _("div", {
                class: $(["gmm-dialog", [...ee(t), ...S(t) ? ["gmm-draggable"] : []]]),
                style: j({ ...K(t), ...Q(t) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: s[2] || (s[2] = D(() => {
                }, ["stop"]))
              }, [
                _("div", {
                  class: $(["gmm-header", S(t) ? "gmm-header-drag" : ""]),
                  onMousedown: (b) => S(t) && te(b, t)
                }, [
                  t.componente_header ? (u(), w(O(t.componente_header), {
                    key: 0,
                    parametros: t.parametros
                  }, null, 8, ["parametros"])) : (u(), m("span", Me, T(t.titulo), 1)),
                  _("div", we, [
                    ((d = t.config_modal) == null ? void 0 : d.minimizable) !== !1 ? (u(), m("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: s[0] || (s[0] = D(() => {
                      }, ["stop"])),
                      onClick: (b) => y(n)(t.code)
                    }, " − ", 40, xe)) : x("", !0),
                    ((V = t.config_modal) == null ? void 0 : V.closable) !== !1 ? (u(), m("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: s[1] || (s[1] = D(() => {
                      }, ["stop"])),
                      onClick: (b) => y(r)(t.code)
                    }, " × ", 40, $e)) : x("", !0)
                  ])
                ], 42, ze),
                _("div", Le, [
                  _("div", Te, [
                    (u(), w(O(t.componente), {
                      parametros: t.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                t.componente_footer ? (u(), m("div", Ee, [
                  (u(), w(O(t.componente_footer), {
                    parametros: t.parametros
                  }, null, 8, ["parametros"]))
                ])) : x("", !0)
              ], 38)
            ], 8, Ce)
          ], 44, ke);
        }), 128)),
        p.value.length ? (u(), m("div", {
          key: 0,
          class: $(["gmm-taskbar", { visible: C.value }]),
          onMouseenter: q,
          onMouseleave: J
        }, [
          _("div", Ne, [
            (u(!0), m(L, null, H(p.value, (t) => (u(), m("div", {
              key: `min-${t.code}`,
              class: "gmm-taskbar-item",
              title: t.titulo,
              onClick: (d) => y(l)(t.code)
            }, [
              _("span", Be, T(t.titulo), 1)
            ], 8, Se))), 128))
          ])
        ], 34)) : x("", !0)
      ])
    ]));
  }
};
export {
  Z as DialogConfirm,
  He as ModalContainer,
  G as ModalFooter,
  He as default,
  W as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
