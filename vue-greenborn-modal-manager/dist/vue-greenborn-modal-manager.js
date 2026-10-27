import { openBlock as d, createElementBlock as h, Fragment as S, renderList as q, normalizeClass as O, toDisplayString as R, createElementVNode as v, markRaw as Z, ref as G, computed as se, onMounted as ze, onUnmounted as we, watch as xe, createBlock as H, Teleport as ke, normalizeStyle as V, unref as T, withModifiers as C, resolveDynamicComponent as W, createCommentVNode as L } from "vue";
const Me = ["innerHTML"], ae = {
  __name: "DialogConfirm",
  props: ["parametros"],
  setup(o) {
    return (n, u) => (d(), h("div", {
      class: "gmm-dialog-confirm",
      innerHTML: o.parametros.texto
    }, null, 8, Me));
  }
}, Ce = { class: "gmm-footer-bar" }, Ee = ["autofocus", "disabled", "onClick"], re = {
  __name: "ModalFooter",
  props: ["parametros"],
  setup(o) {
    const n = o, { ocultar_modal: u } = ce();
    function s() {
      u(n.parametros._modal_cod);
    }
    async function l() {
      return await n.parametros._callback_guardar(n.parametros);
    }
    return (g, c) => (d(), h("div", Ce, [
      o.parametros.botones_footer ? (d(!0), h(S, { key: 0 }, q(o.parametros.botones_footer, (b, z) => (d(), h("button", {
        key: z,
        type: "button",
        class: O(["gmm-btn", `gmm-btn-${b.severity || "primary"}`]),
        autofocus: b.autofocus,
        disabled: b.disabled,
        onClick: b.onClick
      }, R(b.label), 11, Ee))), 128)) : (d(), h(S, { key: 1 }, [
        v("button", {
          type: "button",
          class: "gmm-btn gmm-btn-secondary",
          onClick: s
        }, " Cancelar "),
        v("button", {
          type: "button",
          class: "gmm-btn gmm-btn-success",
          onClick: l
        }, R(o.parametros.action === "edit" ? "Guardar" : "Nuevo"), 1)
      ], 64))
    ]));
  }
}, Te = 20, Le = 1e4, $e = 100, Se = {
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
  resize: { width: null, height: null },
  minimized: !1
}, a = G([]), P = G(Le);
let $ = 0;
function U(o) {
  return P.value + (o + 1) * $e;
}
for (let o = 0; o < Te; o++)
  a.value.push({
    ...Se,
    id: o,
    position: { x: 0, y: 0 },
    resize: { width: null, height: null }
  });
function Ie() {
}
function Ne() {
  const o = [], n = [];
  for (let s = 0; s < a.value.length; s++)
    a.value[s].activo ? o.push(a.value[s]) : n.push(a.value[s]);
  const u = o.concat(n);
  for (let s = 0; s < u.length; s++)
    u[s].id = s;
  return { modals: u, ultimo_id: o.length - 1 };
}
function J(o, n, u = {}, s = {}) {
  if ($ += 1, !(s != null && s.id)) {
    const w = Ne();
    a.value = w.modals, s.id = w.ultimo_id + 1;
  }
  const l = a.value[s.id];
  if (!l)
    return console.error("[useModal] No hay un slot libre para el modal; se ignora la apertura.", s), { code: Number($) };
  l.activo && console.warn("[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.", s), l.activo = !0, l.zIndex = U(l.id), l.position.x = 0, l.position.y = 0, l.resize.width = null, l.resize.height = null;
  const g = !!(o && (o.body || o.header || o.footer)), c = g ? o.body : o, b = g ? o.header : null, z = g ? o.footer : (o == null ? void 0 : o.footer) || null;
  return l.componente = c ? Z(c) : null, l.componente_header = b ? Z(b) : null, l.componente_footer = z ? Z(z) : null, l.parametros = { ...u, _config_modal: s, _modal_cod: $ }, l.titulo = n, l.config_modal = s, l.code = Number($), { code: Number($) };
}
function X(o = null) {
  if (o != null) {
    for (let n = 0; n < a.value.length; n++)
      if (o == a.value[n].code) {
        a.value[n].activo = !1;
        break;
      }
  } else
    for (let n = 0; n < a.value.length; n++)
      a.value[n].activo = !1;
}
function Be(o) {
  const n = a.value.find((u) => u.activo && u.code === o);
  n && (n.minimized = !0);
}
function De(o) {
  const n = a.value.find((u) => u.activo && u.code === o);
  n && (n.minimized = !1, le(o));
}
function le(o) {
  const n = a.value.filter((c) => c.activo);
  if (n.length <= 1) return;
  const u = n.find((c) => c.code === o);
  if (!u || n[n.length - 1] === u) return;
  const s = n.filter((c) => c.code !== o), l = a.value.filter((c) => !c.activo), g = s.concat([u]).concat(l);
  for (let c = 0; c < g.length; c++)
    g[c].id = c;
  for (let c = 0; c < g.length; c++)
    g[c].activo && (g[c].zIndex = U(g[c].id));
  a.value = g;
}
function He(o, n, u) {
  const s = a.value.find((l) => l.activo && l.code === o);
  s && (s.position.x = n, s.position.y = u);
}
function Oe(o) {
  const n = a.value.length - 1;
  J(
    { body: ae, footer: re },
    "Info",
    {
      texto: o,
      botones_footer: [
        { label: "Aceptar", autofocus: !0, onClick: () => X(a.value[n].code) }
      ]
    },
    { id: n, size: "sm", resizable: !1 }
  );
}
function Re(o) {
  Object.prototype.hasOwnProperty.call(o, "no_confirma_accion") || (o.no_confirma_accion = () => {
  });
  const n = a.value.length - 1;
  J(
    { body: ae, footer: re },
    o.title,
    {
      texto: o.text,
      botones_footer: [
        {
          label: "No",
          severity: "secondary",
          autofocus: !0,
          onClick: () => {
            X(a.value[n].code), o.no_confirma_accion();
          }
        },
        {
          label: "Sí",
          severity: o.severity_confirmar || "success",
          autofocus: !1,
          onClick: () => {
            X(a.value[n].code), o.confirmar_accion();
          }
        }
      ]
    },
    { id: n, size: "sm", resizable: !1 }
  );
}
function Xe(o) {
  P.value = Number(o);
  for (let n = 0; n < a.value.length; n++)
    a.value[n].activo && (a.value[n].zIndex = U(a.value[n].id));
}
function ce() {
  return {
    modals_: a,
    z_index_base: P,
    mostrar_modal: J,
    ocultar_modal: X,
    minimizar: Be,
    restaurar: De,
    traer_al_frente: le,
    actualizar_posicion: He,
    mostrar_alerta: Oe,
    mostrar_confirm: Re,
    inic_modals: Ie,
    set_z_index_base: Xe
  };
}
const Ae = ["onMousedown"], je = ["data-modal-code", "onClick"], Fe = ["onMousedown"], Ye = {
  key: 1,
  class: "gmm-header-title"
}, Ze = { class: "gmm-header-controls" }, Ve = ["onClick"], We = ["onClick"], qe = { class: "gmm-body" }, Ge = { class: "gmm-content-wrapper" }, Pe = {
  key: 0,
  class: "gmm-footer"
}, Ue = ["onMousedown"], Je = ["onMousedown"], Ke = ["onMousedown"], Qe = { class: "gmm-taskbar-inner" }, et = ["title", "onClick"], tt = { class: "gmm-taskbar-title" }, ot = 12, nt = 280, it = 160, at = {
  __name: "ModalContainer",
  setup(o) {
    const { modals_: n, z_index_base: u, ocultar_modal: s, minimizar: l, restaurar: g, traer_al_frente: c, actualizar_posicion: b } = ce(), z = se(() => n.value.filter((t) => t.activo && !t.minimized)), w = se(() => n.value.filter((t) => t.activo && t.minimized)), I = G(!1);
    let p = null;
    function K(t) {
      window.innerHeight - t.clientY < ot && w.value.length && (p && (clearTimeout(p), p = null), I.value = !0);
    }
    function ue() {
      p && (clearTimeout(p), p = null), I.value = !0;
    }
    function de() {
      p && clearTimeout(p), p = setTimeout(() => {
        I.value = !1, p = null;
      }, 300);
    }
    ze(() => {
      document.addEventListener("mousemove", K), window.addEventListener("resize", Y);
    }), we(() => {
      document.removeEventListener("mousemove", K), window.removeEventListener("resize", Y), p && clearTimeout(p), k && clearTimeout(k);
    });
    const A = ["sm", "md", "lg", "full"];
    let N = null, f = null, B = null, D = null;
    function me(t) {
      var e;
      const i = ((e = t.config_modal) == null ? void 0 : e.styles) || {};
      return {
        ...i.width ? { width: i.width } : {},
        ...i.height ? { height: i.height } : {},
        ...t.resize.width ? { width: t.resize.width } : {},
        ...t.resize.height ? { height: t.resize.height } : {}
      };
    }
    function fe(t) {
      return {
        transform: `translate(${t.position.x}px, ${t.position.y}px)`
      };
    }
    function _e(t) {
      const i = t.config_modal || {}, e = i.styles || {}, m = !!e.width || !!t.resize.width, _ = !!e.height || !!t.resize.height;
      let r = null;
      return m || (i.size && !A.includes(i.size) && console.warn(
        `[ModalContainer] config_modal.size="${i.size}" no está en la escala (${A.join(", ")}); se ignora.`
      ), r = A.includes(i.size) ? `gmm-size-${i.size}` : "gmm-ancho-auto"), [i.cssClass, r, { "gmm-alto-auto": !_ }];
    }
    function j(t) {
      var i;
      return (((i = t.config_modal) == null ? void 0 : i.draggable) ?? !0) !== !1;
    }
    function he(t) {
      var i;
      return (((i = t.config_modal) == null ? void 0 : i.resizable) ?? !0) !== !1;
    }
    function ge(t, i) {
      var m;
      (((m = t.config_modal) == null ? void 0 : m.dismissableMask) ?? !1) && i.target === i.currentTarget && s(t.code);
    }
    function ve() {
      const t = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return Number.isFinite(t) && t > 0 ? t * 3 : 48;
    }
    function Q(t, i) {
      const e = ve(), m = Math.min(e, t), _ = Math.min(e, i);
      return {
        min_left: m - t,
        max_left: window.innerWidth - m,
        min_top: _ - i,
        max_top: window.innerHeight - _
      };
    }
    function x(t, i, e) {
      return Math.min(Math.max(t, i), e);
    }
    function pe(t, i) {
      N = i.code;
      const e = t.currentTarget.getBoundingClientRect();
      f = {
        mouse_x: t.clientX,
        mouse_y: t.clientY,
        header_left: e.left,
        header_top: e.top,
        bounds: Q(e.width, e.height),
        pos_x: i.position.x,
        pos_y: i.position.y
      }, document.addEventListener("mousemove", ee), document.addEventListener("mouseup", te);
    }
    function ee(t) {
      if (N == null || !f) return;
      const i = x(
        f.header_left + (t.clientX - f.mouse_x),
        f.bounds.min_left,
        f.bounds.max_left
      ), e = x(
        f.header_top + (t.clientY - f.mouse_y),
        f.bounds.min_top,
        f.bounds.max_top
      );
      b(
        N,
        f.pos_x + (i - f.header_left),
        f.pos_y + (e - f.header_top)
      );
    }
    function te() {
      N = null, f = null, document.removeEventListener("mousemove", ee), document.removeEventListener("mouseup", te);
    }
    function be() {
      return {
        max_width: window.innerWidth * 0.95,
        max_height: window.innerHeight * 0.92
      };
    }
    function F(t, i, e) {
      c(i.code), B = i.code;
      const _ = t.currentTarget.closest(".gmm-dialog").getBoundingClientRect();
      D = {
        mode: e,
        mouse_x: t.clientX,
        mouse_y: t.clientY,
        start_width: _.width,
        start_height: _.height,
        bounds: be()
      }, document.addEventListener("mousemove", oe), document.addEventListener("mouseup", ne);
    }
    function oe(t) {
      if (B == null || !D) return;
      const i = n.value.find((y) => y.activo && y.code === B);
      if (!i) return;
      const { mode: e, mouse_x: m, mouse_y: _, start_width: r, start_height: M, bounds: E } = D;
      if (e === "right" || e === "corner") {
        const y = x(
          r + (t.clientX - m),
          nt,
          E.max_width
        );
        i.resize.width = `${y}px`;
      }
      if (e === "bottom" || e === "corner") {
        const y = x(
          M + (t.clientY - _),
          it,
          E.max_height
        );
        i.resize.height = `${y}px`;
      }
    }
    function ne() {
      B = null, D = null, document.removeEventListener("mousemove", oe), document.removeEventListener("mouseup", ne);
    }
    function Y() {
      const t = document.querySelectorAll(".gmm-layer .gmm-overlay[data-modal-code]");
      for (const i of t) {
        const e = Number(i.dataset.modalCode), m = n.value.find((ie) => ie.activo && ie.code === e), _ = i.querySelector(".gmm-header");
        if (!m || !_) continue;
        const r = _.getBoundingClientRect(), M = Q(r.width, r.height), E = x(r.left, M.min_left, M.max_left), y = x(r.top, M.min_top, M.max_top);
        (E !== r.left || y !== r.top) && b(
          e,
          m.position.x + (E - r.left),
          m.position.y + (y - r.top)
        );
      }
    }
    let k = null;
    function ye() {
      k && clearTimeout(k), k = setTimeout(() => {
        k = null, Y();
      }, 200);
    }
    return xe(
      () => z.value.map((t) => t.code).join(","),
      ye
    ), (t, i) => (d(), H(ke, { to: "body" }, [
      v("div", {
        class: "gmm-stack",
        style: V(`z-index: ${T(u)}`)
      }, [
        (d(!0), h(S, null, q(z.value, (e) => {
          var m, _;
          return d(), h("div", {
            key: e.code,
            class: "gmm-layer",
            style: V(`z-index: ${e.zIndex}`),
            onMousedown: (r) => T(c)(e.code)
          }, [
            v("div", {
              class: "gmm-overlay",
              "data-modal-code": e.code,
              onClick: (r) => ge(e, r)
            }, [
              v("div", {
                class: O(["gmm-dialog", [..._e(e), ...j(e) ? ["gmm-draggable"] : []]]),
                style: V({ ...me(e), ...fe(e) }),
                role: "dialog",
                "aria-modal": "true",
                onMousedown: i[2] || (i[2] = C(() => {
                }, ["stop"]))
              }, [
                v("div", {
                  class: O(["gmm-header", j(e) ? "gmm-header-drag" : ""]),
                  onMousedown: (r) => j(e) && pe(r, e)
                }, [
                  e.componente_header ? (d(), H(W(e.componente_header), {
                    key: 0,
                    parametros: e.parametros
                  }, null, 8, ["parametros"])) : (d(), h("span", Ye, R(e.titulo), 1)),
                  v("div", Ze, [
                    ((m = e.config_modal) == null ? void 0 : m.minimizable) === !0 ? (d(), h("button", {
                      key: 0,
                      type: "button",
                      class: "gmm-header-minimize",
                      "aria-label": "Minimizar",
                      onMousedown: i[0] || (i[0] = C(() => {
                      }, ["stop"])),
                      onClick: (r) => T(l)(e.code)
                    }, " − ", 40, Ve)) : L("", !0),
                    ((_ = e.config_modal) == null ? void 0 : _.closable) !== !1 ? (d(), h("button", {
                      key: 1,
                      type: "button",
                      class: "gmm-header-close",
                      "aria-label": "Cerrar",
                      onMousedown: i[1] || (i[1] = C(() => {
                      }, ["stop"])),
                      onClick: (r) => T(s)(e.code)
                    }, " × ", 40, We)) : L("", !0)
                  ])
                ], 42, Fe),
                v("div", qe, [
                  v("div", Ge, [
                    (d(), H(W(e.componente), {
                      parametros: e.parametros
                    }, null, 8, ["parametros"]))
                  ])
                ]),
                e.componente_footer ? (d(), h("div", Pe, [
                  (d(), H(W(e.componente_footer), {
                    parametros: e.parametros
                  }, null, 8, ["parametros"]))
                ])) : L("", !0),
                he(e) ? (d(), h(S, { key: 1 }, [
                  v("div", {
                    class: "gmm-resize-handle gmm-resize-handle--right",
                    onMousedown: C((r) => F(r, e, "right"), ["stop"])
                  }, null, 40, Ue),
                  v("div", {
                    class: "gmm-resize-handle gmm-resize-handle--bottom",
                    onMousedown: C((r) => F(r, e, "bottom"), ["stop"])
                  }, null, 40, Je),
                  v("div", {
                    class: "gmm-resize-handle gmm-resize-handle--corner",
                    onMousedown: C((r) => F(r, e, "corner"), ["stop"])
                  }, null, 40, Ke)
                ], 64)) : L("", !0)
              ], 38)
            ], 8, je)
          ], 44, Ae);
        }), 128)),
        w.value.length ? (d(), h("div", {
          key: 0,
          class: O(["gmm-taskbar", { visible: I.value }]),
          onMouseenter: ue,
          onMouseleave: de
        }, [
          v("div", Qe, [
            (d(!0), h(S, null, q(w.value, (e) => (d(), h("div", {
              key: `min-${e.code}`,
              class: "gmm-taskbar-item",
              title: e.titulo,
              onClick: (m) => T(g)(e.code)
            }, [
              v("span", tt, R(e.titulo), 1)
            ], 8, et))), 128))
          ])
        ], 34)) : L("", !0)
      ], 4)
    ]));
  }
};
export {
  ae as DialogConfirm,
  at as ModalContainer,
  re as ModalFooter,
  at as default,
  ce as useModal
};
//# sourceMappingURL=vue-greenborn-modal-manager.js.map
