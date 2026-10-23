import { ref as u, computed as de, getCurrentInstance as le, onBeforeUnmount as oe, onMounted as ne, unref as f, watch as X, nextTick as K, openBlock as D, createElementBlock as _, toDisplayString as Q, Fragment as ie, createElementVNode as J, renderList as ue, createCommentVNode as Z, renderSlot as te, withDirectives as ve, vShow as fe, createTextVNode as me } from "vue";
const he = {
  NotAllowedError: "permiso de cámara denegado",
  PermissionDeniedError: "permiso de cámara denegado",
  NotFoundError: "no se encontró ninguna cámara",
  DevicesNotFoundError: "no se encontró ninguna cámara",
  NotReadableError: "la cámara está en uso por otra aplicación o no responde",
  TrackStartError: "la cámara está en uso por otra aplicación o no responde",
  OverconstrainedError: "la cámara no soporta la resolución solicitada",
  ConstraintNotSatisfiedError: "la cámara no soporta la resolución solicitada",
  SecurityError: "acceso a la cámara bloqueado (se requiere HTTPS o localhost)",
  AbortError: "se interrumpió el acceso a la cámara"
};
function pe(a) {
  const S = a && a.name;
  return he[S] || `no se pudo acceder a la cámara (${S || a && a.message || "error desconocido"})`;
}
const ge = {
  width: { ideal: 1280 },
  height: { ideal: 720 }
};
function be(a = {}) {
  var ae;
  const {
    autoIniciar: S = !1,
    restricciones: H = ge,
    videoRef: r = null,
    dispositivoId: h = "",
    maxLado: o = 480,
    calidad: k = 0.8,
    calidadFoto: F = 0.92
  } = a, E = r || u(null), W = u(!1), I = u(!1), m = u([]), l = u(h), i = u(""), p = u(null), s = u(null), L = de(() => i.value);
  let b = null, T = null, M = null, N = null, R = 0, C = !1;
  function O() {
    return f(E);
  }
  function j() {
    i.value = "", p.value = null;
  }
  function B(n) {
    p.value = n, i.value = pe(n);
  }
  function G(n) {
    const t = O();
    t && (t.srcObject = n, t.onloadedmetadata = () => {
      t.play().catch(() => {
      });
    });
  }
  async function $() {
    var n;
    if (typeof navigator > "u" || !((n = navigator.mediaDevices) != null && n.enumerateDevices))
      return [];
    try {
      const t = await navigator.mediaDevices.enumerateDevices();
      return m.value = t.filter((w) => w.kind === "videoinput"), m.value;
    } catch {
      return m.value;
    }
  }
  async function P(n = {}) {
    var x;
    if (I.value || C) return !1;
    if (typeof navigator > "u" || !((x = navigator.mediaDevices) != null && x.getUserMedia))
      return B(new Error("getUserMedia no está disponible")), !1;
    I.value = !0, j(), V();
    const t = ++R, w = n.dispositivoId ?? l.value;
    try {
      const g = await navigator.mediaDevices.getUserMedia({
        video: {
          ...w ? { deviceId: { exact: w } } : {},
          ...H
        },
        audio: !1
      });
      if (C || t !== R) {
        for (const v of g.getTracks()) v.stop();
        return !1;
      }
      if (s.value = g, G(g), W.value = !0, await $(), C || t !== R) return !1;
      if (!l.value && m.value.length) {
        const v = g.getVideoTracks()[0], Y = v && v.getSettings ? v.getSettings().deviceId : "";
        l.value = Y || m.value[0].deviceId;
      }
      return !0;
    } catch (g) {
      return B(g), V(), !1;
    } finally {
      I.value = !1;
    }
  }
  function V() {
    R++;
    const n = s.value;
    if (n) {
      for (const w of n.getTracks()) w.stop();
      s.value = null;
    }
    const t = O();
    t && (t.srcObject = null), W.value = !1;
  }
  async function ee(n = {}) {
    return V(), P(n);
  }
  function U() {
    return b || (b = document.createElement("canvas"), T = b.getContext("2d")), b;
  }
  function A() {
    return M || (M = document.createElement("canvas"), N = M.getContext("2d")), M;
  }
  async function q(n = {}) {
    const t = O(), w = n.maxLado ?? o, x = n.calidad ?? k;
    if (!t || !t.videoWidth || typeof document > "u") return null;
    const g = Math.min(1, w / Math.max(t.videoWidth, t.videoHeight)), v = U();
    v.width = Math.max(1, Math.round(t.videoWidth * g)), v.height = Math.max(1, Math.round(t.videoHeight * g)), T.drawImage(t, 0, 0, v.width, v.height);
    const Y = await new Promise((se) => {
      v.toBlob(se, "image/jpeg", x);
    });
    return Y ? { blob: Y, width: v.width, height: v.height } : null;
  }
  async function e(n = {}) {
    const t = O(), w = n.calidad ?? F;
    if (!t || !t.videoWidth || typeof document > "u") return null;
    const x = A();
    return x.width = t.videoWidth, x.height = t.videoHeight, N.drawImage(t, 0, 0, x.width, x.height), new Promise((g) => {
      x.toBlob(g, "image/jpeg", w);
    });
  }
  function c() {
    V();
  }
  function d() {
    $();
  }
  function y() {
    var n;
    C = !0, V(), typeof window < "u" && (window.removeEventListener("pagehide", c), window.removeEventListener("beforeunload", c)), typeof navigator < "u" && ((n = navigator.mediaDevices) != null && n.removeEventListener) && navigator.mediaDevices.removeEventListener("devicechange", d);
  }
  return typeof window < "u" && (window.addEventListener("pagehide", c), window.addEventListener("beforeunload", c)), typeof navigator < "u" && ((ae = navigator.mediaDevices) != null && ae.addEventListener) && navigator.mediaDevices.addEventListener("devicechange", d), le() && (oe(y), S && ne(() => P())), {
    videoRef: E,
    stream: s,
    streaming: W,
    iniciando: I,
    dispositivos: m,
    dispositivoId: l,
    error: i,
    errorOriginal: p,
    errorTexto: L,
    iniciar: P,
    detener: V,
    reiniciar: ee,
    enumerarDispositivos: $,
    capturarFrame: q,
    capturarFoto: e,
    limpiar: y
  };
}
function re(a, S, H, r, h = {}) {
  if (!a || !H || !r) return;
  const o = a.getContext("2d");
  if (!o) return;
  const {
    grosor: k = 2,
    fuente: F = "13px system-ui, sans-serif",
    mostrarEtiquetas: E = !0,
    mostrarScore: W = !0,
    colorTexto: I = "#10131a"
  } = h, m = a.width / H, l = a.height / r;
  o.clearRect(0, 0, a.width, a.height), o.lineWidth = k, o.font = F;
  for (const i of S || []) {
    if (!i || !i.p1 || !i.p2) continue;
    const p = i.p1.x * m, s = i.p1.y * l, L = (i.p2.x - i.p1.x) * m, b = (i.p2.y - i.p1.y) * l, T = ce(i.id);
    if (o.strokeStyle = T, o.strokeRect(p, s, L, b), !E) continue;
    const M = typeof i.score == "number" ? ` ${(i.score * 100).toFixed(0)}%` : "", N = `${i.name ?? i.id}${W ? M : ""}`, R = o.measureText(N).width + 8, C = Math.max(0, s - 18);
    o.fillStyle = T, o.fillRect(p, C, R, 16), o.fillStyle = I, o.fillText(N, p + 4, C + 12.5);
  }
}
function ce(a) {
  return `hsl(${(Number(a) || 0) * 47 % 360} 75% 55%)`;
}
const Fe = re, We = ce, ye = { class: "gb-webcam-viewer" }, we = {
  key: 0,
  class: "gb-webcam-viewer__barra"
}, xe = ["disabled"], Ee = {
  key: 0,
  class: "gb-webcam-viewer__ctl"
}, Ie = ["value"], Ce = ["value"], De = {
  key: 1,
  class: "gb-webcam-viewer__error"
}, _e = { class: "gb-webcam-viewer__escenario" }, Se = {
  key: 2,
  class: "gb-webcam-viewer__ayuda"
}, Le = {
  __name: "GbWebcamViewer",
  props: {
    dispositivoId: { type: String, default: "" },
    autoIniciar: { type: Boolean, default: !1 },
    puedeIniciar: { type: Boolean, default: !0 },
    mostrarControles: { type: Boolean, default: !0 },
    mostrarSelector: { type: Boolean, default: !0 },
    restricciones: {
      type: Object,
      default: () => ({ width: { ideal: 1280 }, height: { ideal: 720 } })
    },
    textoIniciar: { type: String, default: "Iniciar cámara" },
    textoIniciando: { type: String, default: "Iniciando..." },
    textoAyuda: {
      type: String,
      default: "La cámara requiere permiso del navegador (y localhost o HTTPS)."
    },
    detecciones: { type: Array, default: () => [] },
    anchoDetecciones: { type: Number, default: 0 },
    altoDetecciones: { type: Number, default: 0 },
    mostrarDetecciones: { type: Boolean, default: !0 },
    opcionesDetecciones: { type: Object, default: () => ({}) },
    maxLado: { type: Number, default: 480 },
    calidad: { type: Number, default: 0.8 },
    calidadFoto: { type: Number, default: 0.92 }
  },
  emits: [
    "update:dispositivoId",
    "iniciada",
    "detenida",
    "error",
    "video-listo",
    "cambio-tamano"
  ],
  setup(a, { expose: S, emit: H }) {
    const r = a, h = H, o = u(null), k = u(null), F = u(0), E = u(0), W = u(0), I = u(0), {
      stream: m,
      streaming: l,
      iniciando: i,
      dispositivos: p,
      dispositivoId: s,
      error: L,
      errorOriginal: b,
      errorTexto: T,
      iniciar: M,
      detener: N,
      capturarFrame: R,
      capturarFoto: C,
      enumerarDispositivos: O
    } = be({
      restricciones: r.restricciones,
      videoRef: o,
      dispositivoId: r.dispositivoId
    });
    async function j() {
      const e = await M();
      return e ? (h("iniciada", { stream: m.value, dispositivoId: s.value }), U()) : L.value && h("error", {
        codigo: b.value && b.value.name || "camera_error",
        mensaje: L.value,
        original: b.value
      }), e;
    }
    function B() {
      N(), h("detenida");
    }
    async function G() {
      return N(), h("detenida"), j();
    }
    function $(e = {}) {
      return R({
        maxLado: r.maxLado,
        calidad: r.calidad,
        ...e
      });
    }
    function P(e = {}) {
      return C({
        calidad: r.calidadFoto,
        ...e
      });
    }
    function V(e) {
      s.value = e.target.value, G();
    }
    function ee() {
      const e = o.value;
      e && (F.value = e.videoWidth || 0, E.value = e.videoHeight || 0, h("video-listo", {
        ancho: F.value,
        alto: E.value,
        anchoVisible: e.clientWidth,
        altoVisible: e.clientHeight
      }), K(U));
    }
    function U() {
      const e = o.value, c = k.value;
      if (!e || !c) return;
      const d = e.clientWidth || 0, y = e.clientHeight || 0;
      if (!d || !y) return;
      const z = c.width !== d || c.height !== y;
      z && (c.width = d, c.height = y), W.value = d, I.value = y, z && h("cambio-tamano", { anchoCanvas: d, altoCanvas: y }), A();
    }
    function A() {
      const e = k.value;
      if (!e) return;
      if (!r.mostrarDetecciones) {
        const z = e.getContext("2d");
        z && z.clearRect(0, 0, e.width, e.height);
        return;
      }
      const c = o.value, d = r.anchoDetecciones || F.value || c && c.videoWidth || 0, y = r.altoDetecciones || E.value || c && c.videoHeight || 0;
      re(e, r.detecciones, d, y, r.opcionesDetecciones);
    }
    X(s, (e) => {
      h("update:dispositivoId", e);
    }), X(
      () => r.dispositivoId,
      (e) => {
        e !== s.value && (s.value = e, l.value && G());
      }
    ), X(
      () => r.detecciones,
      () => K(A),
      { deep: !0 }
    ), X(
      [() => r.anchoDetecciones, () => r.altoDetecciones],
      () => K(A)
    ), X(
      () => r.mostrarDetecciones,
      () => K(A)
    );
    let q = null;
    return ne(() => {
      typeof ResizeObserver < "u" && o.value && (q = new ResizeObserver(U), q.observe(o.value)), O(), U(), r.autoIniciar && j();
    }), oe(() => {
      q && q.disconnect();
    }), S({
      videoEl: o,
      canvasEl: k,
      stream: m,
      streaming: l,
      iniciando: i,
      dispositivos: p,
      dispositivoId: s,
      error: L,
      errorTexto: T,
      iniciar: j,
      detener: B,
      reiniciar: G,
      capturarFrame: $,
      capturarFoto: P,
      dibujarDetecciones: A
    }), (e, c) => (D(), _("div", ye, [
      a.mostrarControles ? (D(), _("div", we, [
        f(l) ? (D(), _(ie, { key: 1 }, [
          J("button", {
            type: "button",
            class: "gb-webcam-viewer__btn",
            onClick: B
          }, "Detener"),
          a.mostrarSelector && f(p).length ? (D(), _("label", Ee, [
            c[0] || (c[0] = J("span", null, "Cámara", -1)),
            J("select", {
              value: f(s),
              onChange: V
            }, [
              (D(!0), _(ie, null, ue(f(p), (d) => (D(), _("option", {
                key: d.deviceId,
                value: d.deviceId
              }, Q(d.label || d.deviceId), 9, Ce))), 128))
            ], 40, Ie)
          ])) : Z("", !0)
        ], 64)) : (D(), _("button", {
          key: 0,
          type: "button",
          class: "gb-webcam-viewer__btn gb-webcam-viewer__btn--primary",
          disabled: !a.puedeIniciar || f(i),
          onClick: j
        }, Q(f(i) ? a.textoIniciando : a.textoIniciar), 9, xe)),
        te(e.$slots, "acciones", {
          streaming: f(l),
          iniciando: f(i),
          iniciar: j,
          detener: B,
          capturarFrame: $,
          capturarFoto: P
        })
      ])) : Z("", !0),
      f(L) ? (D(), _("div", De, Q(f(T)), 1)) : Z("", !0),
      ve(J("div", _e, [
        J("video", {
          ref_key: "videoEl",
          ref: o,
          class: "gb-webcam-viewer__video",
          autoplay: "",
          playsinline: "",
          muted: "",
          onLoadedmetadata: ee
        }, null, 544),
        J("canvas", {
          ref_key: "canvasEl",
          ref: k,
          class: "gb-webcam-viewer__overlay"
        }, null, 512),
        te(e.$slots, "capa-extra", {
          anchoVideo: F.value,
          altoVideo: E.value,
          anchoCanvas: W.value,
          altoCanvas: I.value
        })
      ], 512), [
        [fe, f(l)]
      ]),
      !f(l) && (a.textoAyuda || e.$slots.ayuda) ? (D(), _("div", Se, [
        te(e.$slots, "ayuda", {}, () => [
          me(Q(a.textoAyuda), 1)
        ])
      ])) : Z("", !0)
    ]));
  }
};
export {
  Le as GbWebcamViewer,
  he as MENSAJES_CAMARA,
  We as classColor,
  ce as colorClase,
  Le as default,
  re as dibujarDetecciones,
  Fe as drawDetections,
  pe as traducirErrorCamara,
  be as useWebcam
};
//# sourceMappingURL=vue-greenborn-webcam-viewer.js.map
