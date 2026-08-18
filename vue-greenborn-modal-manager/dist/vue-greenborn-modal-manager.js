import { openBlock as u, createElementBlock as f, Fragment as x, renderList as D, normalizeClass as w, toDisplayString as $, createElementVNode as _, markRaw as N, ref as O, onMounted as ee, onUnmounted as oe, createBlock as z, Teleport as te, unref as b, normalizeStyle as R, withModifiers as S, resolveDynamicComponent as B, createCommentVNode as M } from "vue";
const ne = ["innerHTML"], V = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (t, r) => (u(), f("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, ne));
  }
}, se = { class: "gmm-footer-bar" }, ie = ["autofocus", "disabled", "onClick"], Y = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const t = e, { ocultar_modal: r } = G();
    function n() {
      r(t.parametros._modal_cod);
    }
    async function l() {
      return await t.parametros._callback_guardar(t.parametros);
    }
    return (v, c) => (u(), f("div", se, [
      e.parametros.botones_footer ? (u(!0), f(x, { key: 0 }, D(e.parametros.botones_footer, (g, p) => (u(), f("button", {
        key: p,
        type: "button",
        class: w(["gmm-btn", `gmm-btn-${g.severity || "primary"}`]),
        autofocus: g.autofocus,
        disabled: g.disabled,
        onClick: g.onClick
      }, $(g.label), 11, ie))), 128)) : (u(), f(x, { key: 1 }, [
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: n
        }, " Cancelar "),
        _("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: l
        }, $(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, ae = 20, re = 2e3, le = {
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
}, a = O([]), j = O(re);
let y = 0;
for (let e = 0; e < ae; e++)
  a.value.push({ ...le, id: e });
function ce() {
}
function ue() {
  const e = [], t = [];
  for (let n = 0; n < a.value.length; n++)
    a.value[n].activo ? e.push(a.value[n]) : t.push(a.value[n]);
  const r = e.concat(t);
  for (let n = 0; n < r.length; n++)
    r[n].id = n;
  return { modals: r, ultimo_id: e.length - 1 };
}
function H(e, t, r = {}, n = {}) {
  if (y += 1, !(n != null && n.id)) {
    const d = ue();
    a.value = d.modals, n.id = d.ultimo_id + 1;
  }
  const l = a.value[n.id];
  if (!l)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", n), { code: Number(y) };
  l.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", n), l.activo = !0;
  const v = !!(e && (e.body || e.header || e.footer)), c = v ? e.body : e, g = v ? e.header : null, p = v ? e.footer : (e == null ? void 0 : e.footer) || null;
  return l.componente = c ? N(c) : null, l.componente_header = g ? N(g) : null, l.componente_footer = p ? N(p) : null, l.parametros = { ...r, _config_modal: n, _modal_cod: y }, l.titulo = t, l.config_modal = n, l.code = Number(y), { code: Number(y) };
}
function L(e = null) {
  if (e != null) {
    for (let t = 0; t < a.value.length; t++)
      if (e == a.value[t].code) {
        a.value[t].activo = !1;
        break;
      }
  } else
    for (let t = 0; t < a.value.length; t++)
      a.value[t].activo = !1;
}
function de(e) {
  const t = a.value.find((r) => r.activo && r.code === e);
  t && (t.minimized = !0);
}
function me(e) {
  const t = a.value.find((r) => r.activo && r.code === e);
  t && (t.minimized = !1, Z(e));
}
function Z(e) {
  const t = a.value.filter((c) => c.activo);
  if (t.length <= 1) return;
  const r = t.find((c) => c.code === e);
  if (!r || t[t.length - 1] === r) return;
  const n = t.filter((c) => c.code !== e), l = a.value.filter((c) => !c.activo), v = n.concat([r]).concat(l);
  for (let c = 0; c < v.length; c++)
    v[c].id = c;
  a.value = v;
}
function fe(e, t, r) {
  const n = a.value.find((l) => l.activo && l.code === e);
  n && (n.position.x = t, n.position.y = r);
}
function _e(e) {
  const t = a.value.length - 1;
  H(
    { body: V, footer: Y },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => L(a.value[t].code) }
      ]
    },
    { id: t, size: "sm" }
  );
}
function ve(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const t = a.value.length - 1;
  H(
    { body: V, footer: Y },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            L(a.value[t].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            L(a.value[t].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: t, size: "sm" }
  );
}
function ge(e) {
  j.value = Number(e);
}
function G() {
  return {
    modals_: a,
    z_index_base: j,
    mostrar_modal: H,
    ocultar_modal: L,
    minimizar: de,
    restaurar: me,
    traer_al_frente: Z,
    actualizar_posicion: fe,
    mostrar_alerta: _e,
    mostrar_confirm: ve,
    inic_modals: ce,
    set_z_index_base: ge
  };
}
const pe = { class: "gmm-stack" }, he = ["onMousedown"], be = ["data-modal-code", "onClick"], ye = ["onMousedown"], ke = {
  key: 1,
  class: "gmm-header-title"
}, Ce = { class: "gmm-header-controls" }, ze = ["onClick"], Me = ["onClick"], we = { class: "gmm-body" }, xe = { class: "gmm-content-wrapper" }, $e = {
  key: 0,
  class: "gmm-footer"
}, Le = { class: "gmm-taskbar-inner" }, Te = ["title", "onClick"], Ee = { class: "gmm-taskbar-title" }, Ne = 12, Be = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: t, ocultar_modal: r, minimizar: n, restaurar: l, traer_al_frente: v, actualizar_posicion: c, z_index_base: g } = G(), p = O(!1);
    let d = null;
    function A(i) {
      window.innerHeight - i.clientY < Ne && t.value.some((o) => o.activo && o.minimized) && (d && (clearTimeout(d), d = null), p.value = !0);
    }
    function P() {
      d && (clearTimeout(d), d = null), p.value = !0;
    }
    function U() {
      d && clearTimeout(d), d = setTimeout(() => {
        p.value = !1, d = null;
      }, 300);
    }
    ee(() => {
      document.addEventListener("mousemove", A);
    }), oe(() => {
      document.removeEventListener("mousemove", A), d && clearTimeout(d);
    });
    const T = ["sm", "md", "lg", "full"];
    let k = null, C = { x: 0, y: 0 };
    function W(i) {
      var o;
      const s = ((o = i.config_modal) == null ? void 0 : o.styles) || {};
      return {
        ...s.width ? { width: s.width } : {},
        ...s.height ? { height: s.height } : {}
      };
    }
    function q(i) {
      return {
        transform: `translate(${i.position.x}px, ${i.position.y}px)`
      };
    }
    function J(i) {
      const s = i.config_modal || {}, o = s.styles || {};
      let m = null;
      return o.width || (s.size && !T.includes(s.size) && console.warn(
        `[ModalContainer] config_modal.size="${s.size}" no está en la escala (${T.join(", ")}); se ignora.`
      ), m = T.includes(s.size) ? `gmm-size-${s.size}` : "gmm-ancho-auto"), [s.cssClass, m, { "gmm-alto-auto": !o.height }];
    }
    function E(i) {
      var s;
      return (((s = i.config_modal) == null ? void 0 : s.draggable) ?? !0) !== !1;
    }
    function K(i, s) {
      var m;
      (((m = i.config_modal) == null ? void 0 : m.dismissableMask) ?? !1) && s.target === s.currentTarget && r(i.code);
    }
    function Q(i, s) {
      k = s.code;
      const m = i.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      C.x = i.clientX - (m.left + m.width / 2), C.y = i.clientY - (m.top + m.height / 2), document.addEventListener("mousemove", I), document.addEventListener("mouseup", X);
    }
    function I(i) {
      if (k == null) return;
      const s = i.clientX - C.x - window.innerWidth / 2, o = i.clientY - C.y - window.innerHeight / 2;
      c(k, s, o);
    }
    function X() {
      k = null, document.removeEventListener("mousemove", I), document.removeEventListener("mouseup", X);
    }
    return (i, s) => (u(), z(te, { to: "body" }, [
      _("div", pe, [
        (u(!0), f(x, null, D(i.modales_.filter((o) => o.activo && !o.minimized), (o) => {
          var m, F;
          return u(), f("div", {
            key: o.code,
            class: "gmm-layer",
            style: R(`z-index: ${b(g).value + o.id}`),
            onMousedown: (h) => b(v)(o.code)
          }, [
            _("div", {
              class: "gmm-overlay",
              "data-modal-code": o.code,
              onClick: (h) => K(o, h)
            }, [
              _("div", {
                class: w(["gmm-dialog", [...J(o), ...E(o) ? ["gmm-draggable"] : []]]),
                style: R({ ...W(o), ...q(o) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: s[2] || (s[2] = S(() => {
                }, ["stop"]))
              }, [
                _("div", {
                  class: w(["gmm-header", E(o) ? "gmm-header-drag" : ""]),
                  onMousedown: (h) => E(o) && Q(h, o)
                }, [
                  o.componente_header ? (u(), z(B(o.componente_header), {
                    key: 0,
                    parametros: o.parametros
                  }, null, 8, ["parametros"])) : (u(), f("span", ke, $(o.titulo), 1)),
                  _("div", Ce, [
                    ((m = o.config_modal) == null ? void 0 : m.minimizable) !== !1 ? (u(), f("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: s[0] || (s[0] = S(() => {
                      }, ["stop"])),
                      onClick: (h) => b(n)(o.code)
                    }, " − ", 40, ze)) : M("", !0),
                    ((F = o.config_modal) == null ? void 0 : F.closable) !== !1 ? (u(), f("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: s[1] || (s[1] = S(() => {
                      }, ["stop"])),
                      onClick: (h) => b(r)(o.code)
                    }, " × ", 40, Me)) : M("", !0)
                  ])
                ], 42, ye),
                _("div", we, [
                  _("div", xe, [
                    (u(), z(B(o.componente), {
                      parametros: o.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                o.componente_footer ? (u(), f("div", $e, [
                  (u(), z(B(o.componente_footer), {
                    parametros: o.parametros
                  }, null, 8, ["parametros"]))
                ])) : M("", !0)
              ], 38)
            ], 8, be)
          ], 44, he);
        }), 128)),
        i.modales_.some((o) => o.activo && o.minimized) ? (u(), f("div", {
          key: 0,
          class: w(["gmm-taskbar", { visible: p.value }]),
          onMouseenter: P,
          onMouseleave: U
        }, [
          _("div", Le, [
            (u(!0), f(x, null, D(i.modales_.filter((o) => o.activo && o.minimized), (o) => (u(), f("div", {
              key: `min-${o.code}`,
              class: "gmm-taskbar-item",
              title: o.titulo,
              onClick: (m) => b(l)(o.code)
            }, [
              _("span", Ee, $(o.titulo), 1)
            ], 8, Te))), 128))
          ])
        ], 34)) : M("", !0)
      ])
    ]));
  }
};
export {
  V as DialogConfirm,
  Be as ModalContainer,
  Y as ModalFooter,
  Be as default,
  G as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
