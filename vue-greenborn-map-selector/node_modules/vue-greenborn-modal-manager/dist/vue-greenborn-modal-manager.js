import { openBlock as u, createElementBlock as v, Fragment as N, renderList as j, normalizeClass as S, toDisplayString as I, createElementVNode as h, markRaw as H, ref as V, computed as ee, onMounted as _e, onUnmounted as ve, watch as pe, createBlock as E, Teleport as ge, normalizeStyle as F, unref as z, withModifiers as X, resolveDynamicComponent as R, createCommentVNode as L } from "vue";
const he = ["innerHTML"], oe = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(e) {
    return (t, l) => (u(), v("div", {
      class: "gmm-dialog-confirm",
      innerHTML: e.parametros.texto
    }, null, 8, he));
  }
}, be = { class: "gmm-footer-bar" }, ye = ["autofocus", "disabled", "onClick"], te = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(e) {
    const t = e, { ocultar_modal: l } = ie();
    function a() {
      l(t.parametros._modal_cod);
    }
    async function c() {
      return await t.parametros._callback_guardar(t.parametros);
    }
    return (_, r) => (u(), v("div", be, [
      e.parametros.botones_footer ? (u(!0), v(N, { key: 0 }, j(e.parametros.botones_footer, (g, y) => (u(), v("button", {
        key: y,
        type: "button",
        class: S(["gmm-btn", `gmm-btn-${g.severity || "primary"}`]),
        autofocus: g.autofocus,
        disabled: g.disabled,
        onClick: g.onClick
      }, I(g.label), 11, ye))), 128)) : (u(), v(N, { key: 1 }, [
        h("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: a
        }, " Cancelar "),
        h("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: c
        }, I(e.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, ke = 20, xe = 1e4, ze = 100, Ce = {
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
}, s = V([]), Y = V(xe);
let C = 0;
function Z(e) {
  return Y.value + (e + 1) * ze;
}
for (let e = 0; e < ke; e++)
  s.value.push({ ...Ce, id: e });
function we() {
}
function Me() {
  const e = [], t = [];
  for (let a = 0; a < s.value.length; a++)
    s.value[a].activo ? e.push(s.value[a]) : t.push(s.value[a]);
  const l = e.concat(t);
  for (let a = 0; a < l.length; a++)
    l[a].id = a;
  return { modals: l, ultimo_id: e.length - 1 };
}
function q(e, t, l = {}, a = {}) {
  if (C += 1, !(a != null && a.id)) {
    const k = Me();
    s.value = k.modals, a.id = k.ultimo_id + 1;
  }
  const c = s.value[a.id];
  if (!c)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", a), { code: Number(C) };
  c.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", a), c.activo = !0, c.zIndex = Z(c.id);
  const _ = !!(e && (e.body || e.header || e.footer)), r = _ ? e.body : e, g = _ ? e.header : null, y = _ ? e.footer : (e == null ? void 0 : e.footer) || null;
  return c.componente = r ? H(r) : null, c.componente_header = g ? H(g) : null, c.componente_footer = y ? H(y) : null, c.parametros = { ...l, _config_modal: a, _modal_cod: C }, c.titulo = t, c.config_modal = a, c.code = Number(C), { code: Number(C) };
}
function B(e = null) {
  if (e != null) {
    for (let t = 0; t < s.value.length; t++)
      if (e == s.value[t].code) {
        s.value[t].activo = !1;
        break;
      }
  } else
    for (let t = 0; t < s.value.length; t++)
      s.value[t].activo = !1;
}
function Te(e) {
  const t = s.value.find((l) => l.activo && l.code === e);
  t && (t.minimized = !0);
}
function $e(e) {
  const t = s.value.find((l) => l.activo && l.code === e);
  t && (t.minimized = !1, ne(e));
}
function ne(e) {
  const t = s.value.filter((r) => r.activo);
  if (t.length <= 1) return;
  const l = t.find((r) => r.code === e);
  if (!l || t[t.length - 1] === l) return;
  const a = t.filter((r) => r.code !== e), c = s.value.filter((r) => !r.activo), _ = a.concat([l]).concat(c);
  for (let r = 0; r < _.length; r++)
    _[r].id = r;
  for (let r = 0; r < _.length; r++)
    _[r].activo && (_[r].zIndex = Z(_[r].id));
  s.value = _;
}
function Ee(e, t, l) {
  const a = s.value.find((c) => c.activo && c.code === e);
  a && (a.position.x = t, a.position.y = l);
}
function Le(e) {
  const t = s.value.length - 1;
  q(
    { body: oe, footer: te },
    "Info",
    {
      texto: e,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => B(s.value[t].code) }
      ]
    },
    { id: t, size: "sm" }
  );
}
function Se(e) {
  Object.prototype.hasOwnProperty.call(e, "no_confirma_accion") || (e.no_confirma_accion = () => {
  });
  const t = s.value.length - 1;
  q(
    { body: oe, footer: te },
    e.title,
    {
      texto: e.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            B(s.value[t].code), e.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: e.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            B(s.value[t].code), e.confirmar_accion();
          }
        }
      ]
    },
    { id: t, size: "sm" }
  );
}
function Ne(e) {
  Y.value = Number(e);
  for (let t = 0; t < s.value.length; t++)
    s.value[t].activo && (s.value[t].zIndex = Z(s.value[t].id));
}
function ie() {
  return {
    modals_: s,
    z_index_base: Y,
    mostrar_modal: q,
    ocultar_modal: B,
    minimizar: Te,
    restaurar: $e,
    traer_al_frente: ne,
    actualizar_posicion: Ee,
    mostrar_alerta: Le,
    mostrar_confirm: Se,
    inic_modals: we,
    set_z_index_base: Ne
  };
}
const Ie = ["onMousedown"], Be = ["data-modal-code", "onClick"], De = ["onMousedown"], Oe = {
  key: 1,
  class: "gmm-header-title"
}, Ae = { class: "gmm-header-controls" }, He = ["onClick"], Fe = ["onClick"], Xe = { class: "gmm-body" }, Re = { class: "gmm-content-wrapper" }, je = {
  key: 0,
  class: "gmm-footer"
}, Ve = { class: "gmm-taskbar-inner" }, Ye = ["title", "onClick"], Ze = { class: "gmm-taskbar-title" }, qe = 12, Ge = {
  __name: "ModalContainer",
  setup(e) {
    const { modals_: t, z_index_base: l, ocultar_modal: a, minimizar: c, restaurar: _, traer_al_frente: r, actualizar_posicion: g } = ie(), y = ee(() => t.value.filter((n) => n.activo && !n.minimized)), k = ee(() => t.value.filter((n) => n.activo && n.minimized)), w = V(!1);
    let p = null;
    function P(n) {
      window.innerHeight - n.clientY < qe && k.value.length && (p && (clearTimeout(p), p = null), w.value = !0);
    }
    function ae() {
      p && (clearTimeout(p), p = null), w.value = !0;
    }
    function se() {
      p && clearTimeout(p), p = setTimeout(() => {
        w.value = !1, p = null;
      }, 300);
    }
    _e(() => {
      document.addEventListener("mousemove", P), window.addEventListener("resize", A);
    }), ve(() => {
      document.removeEventListener("mousemove", P), window.removeEventListener("resize", A), p && clearTimeout(p), x && clearTimeout(x);
    });
    const D = ["sm", "md", "lg", "full"];
    let M = null, m = null;
    function re(n) {
      var o;
      const i = ((o = n.config_modal) == null ? void 0 : o.styles) || {};
      return {
        ...i.width ? { width: i.width } : {},
        ...i.height ? { height: i.height } : {}
      };
    }
    function le(n) {
      return {
        transform: `translate(${n.position.x}px, ${n.position.y}px)`
      };
    }
    function ce(n) {
      const i = n.config_modal || {}, o = i.styles || {};
      let d = null;
      return o.width || (i.size && !D.includes(i.size) && console.warn(
        `[ModalContainer] config_modal.size="${i.size}" no está en la escala (${D.join(", ")}); se ignora.`
      ), d = D.includes(i.size) ? `gmm-size-${i.size}` : "gmm-ancho-auto"), [i.cssClass, d, { "gmm-alto-auto": !o.height }];
    }
    function O(n) {
      var i;
      return (((i = n.config_modal) == null ? void 0 : i.draggable) ?? !0) !== !1;
    }
    function ue(n, i) {
      var d;
      (((d = n.config_modal) == null ? void 0 : d.dismissableMask) ?? !1) && i.target === i.currentTarget && a(n.code);
    }
    function de() {
      const n = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return Number.isFinite(n) && n > 0 ? n * 3 : 48;
    }
    function G(n, i) {
      const o = de(), d = Math.min(o, n), b = Math.min(o, i);
      return {
        min_left: d - n,
        max_left: window.innerWidth - d,
        min_top: b - i,
        max_top: window.innerHeight - b
      };
    }
    function T(n, i, o) {
      return Math.min(Math.max(n, i), o);
    }
    function me(n, i) {
      M = i.code;
      const o = n.currentTarget.getBoundingClientRect();
      m = {
        mouse_x: n.clientX,
        mouse_y: n.clientY,
        header_left: o.left,
        header_top: o.top,
        bounds: G(o.width, o.height),
        pos_x: i.position.x,
        pos_y: i.position.y
      }, document.addEventListener("mousemove", U), document.addEventListener("mouseup", W);
    }
    function U(n) {
      if (M == null || !m) return;
      const i = T(
        m.header_left + (n.clientX - m.mouse_x),
        m.bounds.min_left,
        m.bounds.max_left
      ), o = T(
        m.header_top + (n.clientY - m.mouse_y),
        m.bounds.min_top,
        m.bounds.max_top
      );
      g(
        M,
        m.pos_x + (i - m.header_left),
        m.pos_y + (o - m.header_top)
      );
    }
    function W() {
      M = null, m = null, document.removeEventListener("mousemove", U), document.removeEventListener("mouseup", W);
    }
    function A() {
      const n = document.querySelectorAll(".gmm-layer .gmm-overlay[data-modal-code]");
      for (const i of n) {
        const o = Number(i.dataset.modalCode), d = t.value.find((Q) => Q.activo && Q.code === o), b = i.querySelector(".gmm-header");
        if (!d || !b) continue;
        const f = b.getBoundingClientRect(), $ = G(f.width, f.height), J = T(f.left, $.min_left, $.max_left), K = T(f.top, $.min_top, $.max_top);
        (J !== f.left || K !== f.top) && g(
          o,
          d.position.x + (J - f.left),
          d.position.y + (K - f.top)
        );
      }
    }
    let x = null;
    function fe() {
      x && clearTimeout(x), x = setTimeout(() => {
        x = null, A();
      }, 200);
    }
    return pe(
      () => y.value.map((n) => n.code).join(","),
      fe
    ), (n, i) => (u(), E(ge, { to: "body" }, [
      h("div", {
        class: "gmm-stack",
        style: F(`z-index: ${z(l)}`)
      }, [
        (u(!0), v(N, null, j(y.value, (o) => {
          var d, b;
          return u(), v("div", {
            key: o.code,
            class: "gmm-layer",
            style: F(`z-index: ${o.zIndex}`),
            onMousedown: (f) => z(r)(o.code)
          }, [
            h("div", {
              class: "gmm-overlay",
              "data-modal-code": o.code,
              onClick: (f) => ue(o, f)
            }, [
              h("div", {
                class: S(["gmm-dialog", [...ce(o), ...O(o) ? ["gmm-draggable"] : []]]),
                style: F({ ...re(o), ...le(o) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: i[2] || (i[2] = X(() => {
                }, ["stop"]))
              }, [
                h("div", {
                  class: S(["gmm-header", O(o) ? "gmm-header-drag" : ""]),
                  onMousedown: (f) => O(o) && me(f, o)
                }, [
                  o.componente_header ? (u(), E(R(o.componente_header), {
                    key: 0,
                    parametros: o.parametros
                  }, null, 8, ["parametros"])) : (u(), v("span", Oe, I(o.titulo), 1)),
                  h("div", Ae, [
                    ((d = o.config_modal) == null ? void 0 : d.minimizable) !== !1 ? (u(), v("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: i[0] || (i[0] = X(() => {
                      }, ["stop"])),
                      onClick: (f) => z(c)(o.code)
                    }, " − ", 40, He)) : L("", !0),
                    ((b = o.config_modal) == null ? void 0 : b.closable) !== !1 ? (u(), v("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: i[1] || (i[1] = X(() => {
                      }, ["stop"])),
                      onClick: (f) => z(a)(o.code)
                    }, " × ", 40, Fe)) : L("", !0)
                  ])
                ], 42, De),
                h("div", Xe, [
                  h("div", Re, [
                    (u(), E(R(o.componente), {
                      parametros: o.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                o.componente_footer ? (u(), v("div", je, [
                  (u(), E(R(o.componente_footer), {
                    parametros: o.parametros
                  }, null, 8, ["parametros"]))
                ])) : L("", !0)
              ], 38)
            ], 8, Be)
          ], 44, Ie);
        }), 128)),
        k.value.length ? (u(), v("div", {
          key: 0,
          class: S(["gmm-taskbar", { visible: w.value }]),
          onMouseenter: ae,
          onMouseleave: se
        }, [
          h("div", Ve, [
            (u(!0), v(N, null, j(k.value, (o) => (u(), v("div", {
              key: `min-${o.code}`,
              class: "gmm-taskbar-item",
              title: o.titulo,
              onClick: (d) => z(_)(o.code)
            }, [
              h("span", Ze, I(o.titulo), 1)
            ], 8, Ye))), 128))
          ])
        ], 34)) : L("", !0)
      ], 4)
    ]));
  }
};
export {
  oe as DialogConfirm,
  Ge as ModalContainer,
  te as ModalFooter,
  Ge as default,
  ie as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
