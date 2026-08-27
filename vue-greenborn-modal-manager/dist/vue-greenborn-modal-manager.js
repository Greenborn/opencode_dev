import { openBlock as u, createElementBlock as f, Fragment as T, renderList as H, normalizeClass as $, toDisplayString as E, createElementVNode as v, markRaw as I, ref as A, computed as P, onMounted as ae, onUnmounted as ie, createBlock as M, Teleport as se, normalizeStyle as D, unref as y, withModifiers as B, resolveDynamicComponent as O, createCommentVNode as w } from "vue";
const re = ["innerHTML"], G = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (o, l) => (u(), f("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, re));
  }
}, le = { class: "gmm-footer-bar" }, ce = ["autofocus", "disabled", "onClick"], U = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const o = e, { ocultar_modal: l } = q();
    function n() {
      l(o.parametros._modal_cod);
    }
    async function c() {
      return await o.parametros._callback_guardar(o.parametros);
    }
    return (d, r) => (u(), f("div", le, [
      e.parametros.botones_footer ? (u(!0), f(T, { key: 0 }, H(e.parametros.botones_footer, (g, h) => (u(), f("button", {
        key: h,
        type: "button",
        class: $(["gmm-btn", `gmm-btn-${g.severity || "primary"}`]),
        autofocus: g.autofocus,
        disabled: g.disabled,
        onClick: g.onClick
      }, E(g.label), 11, ce))), 128)) : (u(), f(T, { key: 1 }, [
        v("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: n
        }, " Cancelar "),
        v("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: c
        }, E(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, ue = 20, de = 1e4, me = 100, fe = {
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
}, i = A([]), X = A(de);
let k = 0;
function F(e) {
  return X.value + (e + 1) * me;
}
for (let e = 0; e < ue; e++)
  i.value.push({ ...fe, id: e });
function _e() {
}
function ve() {
  const e = [], o = [];
  for (let n = 0; n < i.value.length; n++)
    i.value[n].activo ? e.push(i.value[n]) : o.push(i.value[n]);
  const l = e.concat(o);
  for (let n = 0; n < l.length; n++)
    l[n].id = n;
  return { modals: l, ultimo_id: e.length - 1 };
}
function R(e, o, l = {}, n = {}) {
  if (k += 1, !(n != null && n.id)) {
    const p = ve();
    i.value = p.modals, n.id = p.ultimo_id + 1;
  }
  const c = i.value[n.id];
  if (!c)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", n), { code: Number(k) };
  c.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", n), c.activo = !0, c.zIndex = F(c.id);
  const d = !!(e && (e.body || e.header || e.footer)), r = d ? e.body : e, g = d ? e.header : null, h = d ? e.footer : (e == null ? void 0 : e.footer) || null;
  return c.componente = r ? I(r) : null, c.componente_header = g ? I(g) : null, c.componente_footer = h ? I(h) : null, c.parametros = { ...l, _config_modal: n, _modal_cod: k }, c.titulo = o, c.config_modal = n, c.code = Number(k), { code: Number(k) };
}
function L(e = null) {
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
function ge(e) {
  const o = i.value.find((l) => l.activo && l.code === e);
  o && (o.minimized = !0);
}
function he(e) {
  const o = i.value.find((l) => l.activo && l.code === e);
  o && (o.minimized = !1, W(e));
}
function W(e) {
  const o = i.value.filter((r) => r.activo);
  if (o.length <= 1) return;
  const l = o.find((r) => r.code === e);
  if (!l || o[o.length - 1] === l) return;
  const n = o.filter((r) => r.code !== e), c = i.value.filter((r) => !r.activo), d = n.concat([l]).concat(c);
  for (let r = 0; r < d.length; r++)
    d[r].id = r;
  for (let r = 0; r < d.length; r++)
    d[r].activo && (d[r].zIndex = F(d[r].id));
  i.value = d;
}
function pe(e, o, l) {
  const n = i.value.find((c) => c.activo && c.code === e);
  n && (n.position.x = o, n.position.y = l);
}
function be(e) {
  const o = i.value.length - 1;
  R(
    { body: G, footer: U },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => L(i.value[o].code) }
      ]
    },
    { id: o, size: "sm" }
  );
}
function ye(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const o = i.value.length - 1;
  R(
    { body: G, footer: U },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            L(i.value[o].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            L(i.value[o].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: o, size: "sm" }
  );
}
function ke(e) {
  X.value = Number(e);
  for (let o = 0; o < i.value.length; o++)
    i.value[o].activo && (i.value[o].zIndex = F(i.value[o].id));
}
function q() {
  return {
    modals_: i,
    z_index_base: X,
    mostrar_modal: R,
    ocultar_modal: L,
    minimizar: ge,
    restaurar: he,
    traer_al_frente: W,
    actualizar_posicion: pe,
    mostrar_alerta: be,
    mostrar_confirm: ye,
    inic_modals: _e,
    set_z_index_base: ke
  };
}
const ze = ["onMousedown"], Ce = ["data-modal-code", "onClick"], xe = ["onMousedown"], Me = {
  key: 1,
  class: "gmm-header-title"
}, we = { class: "gmm-header-controls" }, $e = ["onClick"], Te = ["onClick"], Ee = { class: "gmm-body" }, Le = { class: "gmm-content-wrapper" }, Ne = {
  key: 0,
  class: "gmm-footer"
}, Se = { class: "gmm-taskbar-inner" }, Ie = ["title", "onClick"], De = { class: "gmm-taskbar-title" }, Be = 12, He = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: o, z_index_base: l, ocultar_modal: n, minimizar: c, restaurar: d, traer_al_frente: r, actualizar_posicion: g } = q(), h = P(() => o.value.filter((s) => s.activo && !s.minimized)), p = P(() => o.value.filter((s) => s.activo && s.minimized)), z = A(!1);
    let _ = null;
    function V(s) {
      window.innerHeight - s.clientY < Be && p.value.length && (_ && (clearTimeout(_), _ = null), z.value = !0);
    }
    function J() {
      _ && (clearTimeout(_), _ = null), z.value = !0;
    }
    function K() {
      _ && clearTimeout(_), _ = setTimeout(() => {
        z.value = !1, _ = null;
      }, 300);
    }
    ae(() => {
      document.addEventListener("mousemove", V);
    }), ie(() => {
      document.removeEventListener("mousemove", V), _ && clearTimeout(_);
    });
    const N = ["sm", "md", "lg", "full"];
    let C = null, x = { x: 0, y: 0 };
    function Q(s) {
      var t;
      const a = ((t = s.config_modal) == null ? void 0 : t.styles) || {};
      return {
        ...a.width ? { width: a.width } : {},
        ...a.height ? { height: a.height } : {}
      };
    }
    function ee(s) {
      return {
        transform: `translate(${s.position.x}px, ${s.position.y}px)`
      };
    }
    function oe(s) {
      const a = s.config_modal || {}, t = a.styles || {};
      let m = null;
      return t.width || (a.size && !N.includes(a.size) && console.warn(
        `[ModalContainer] config_modal.size="${a.size}" no está en la escala (${N.join(", ")}); se ignora.`
      ), m = N.includes(a.size) ? `gmm-size-${a.size}` : "gmm-ancho-auto"), [a.cssClass, m, { "gmm-alto-auto": !t.height }];
    }
    function S(s) {
      var a;
      return (((a = s.config_modal) == null ? void 0 : a.draggable) ?? !0) !== !1;
    }
    function te(s, a) {
      var m;
      (((m = s.config_modal) == null ? void 0 : m.dismissableMask) ?? !1) && a.target === a.currentTarget && n(s.code);
    }
    function ne(s, a) {
      C = a.code;
      const m = s.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      x.x = s.clientX - (m.left + m.width / 2), x.y = s.clientY - (m.top + m.height / 2), document.addEventListener("mousemove", Y), document.addEventListener("mouseup", Z);
    }
    function Y(s) {
      if (C == null) return;
      const a = s.clientX - x.x - window.innerWidth / 2, t = s.clientY - x.y - window.innerHeight / 2;
      g(C, a, t);
    }
    function Z() {
      C = null, document.removeEventListener("mousemove", Y), document.removeEventListener("mouseup", Z);
    }
    return (s, a) => (u(), M(se, { to: "body" }, [
      v("div", {
        class: "gmm-stack",
        style: D(`z-index: ${y(l)}`)
      }, [
        (u(!0), f(T, null, H(h.value, (t) => {
          var m, j;
          return u(), f("div", {
            key: t.code,
            class: "gmm-layer",
            style: D(`z-index: ${t.zIndex}`),
            onMousedown: (b) => y(r)(t.code)
          }, [
            v("div", {
              class: "gmm-overlay",
              "data-modal-code": t.code,
              onClick: (b) => te(t, b)
            }, [
              v("div", {
                class: $(["gmm-dialog", [...oe(t), ...S(t) ? ["gmm-draggable"] : []]]),
                style: D({ ...Q(t), ...ee(t) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: a[2] || (a[2] = B(() => {
                }, ["stop"]))
              }, [
                v("div", {
                  class: $(["gmm-header", S(t) ? "gmm-header-drag" : ""]),
                  onMousedown: (b) => S(t) && ne(b, t)
                }, [
                  t.componente_header ? (u(), M(O(t.componente_header), {
                    key: 0,
                    parametros: t.parametros
                  }, null, 8, ["parametros"])) : (u(), f("span", Me, E(t.titulo), 1)),
                  v("div", we, [
                    ((m = t.config_modal) == null ? void 0 : m.minimizable) !== !1 ? (u(), f("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: a[0] || (a[0] = B(() => {
                      }, ["stop"])),
                      onClick: (b) => y(c)(t.code)
                    }, " − ", 40, $e)) : w("", !0),
                    ((j = t.config_modal) == null ? void 0 : j.closable) !== !1 ? (u(), f("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: a[1] || (a[1] = B(() => {
                      }, ["stop"])),
                      onClick: (b) => y(n)(t.code)
                    }, " × ", 40, Te)) : w("", !0)
                  ])
                ], 42, xe),
                v("div", Ee, [
                  v("div", Le, [
                    (u(), M(O(t.componente), {
                      parametros: t.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                t.componente_footer ? (u(), f("div", Ne, [
                  (u(), M(O(t.componente_footer), {
                    parametros: t.parametros
                  }, null, 8, ["parametros"]))
                ])) : w("", !0)
              ], 38)
            ], 8, Ce)
          ], 44, ze);
        }), 128)),
        p.value.length ? (u(), f("div", {
          key: 0,
          class: $(["gmm-taskbar", { visible: z.value }]),
          onMouseenter: J,
          onMouseleave: K
        }, [
          v("div", Se, [
            (u(!0), f(T, null, H(p.value, (t) => (u(), f("div", {
              key: `min-${t.code}`,
              class: "gmm-taskbar-item",
              title: t.titulo,
              onClick: (m) => y(d)(t.code)
            }, [
              v("span", De, E(t.titulo), 1)
            ], 8, Ie))), 128))
          ])
        ], 34)) : w("", !0)
      ], 4)
    ]));
  }
};
export {
  G as DialogConfirm,
  He as ModalContainer,
  U as ModalFooter,
  He as default,
  q as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
