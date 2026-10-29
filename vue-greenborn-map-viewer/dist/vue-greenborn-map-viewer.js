import r from "leaflet";
import { openBlock as s, createElementBlock as n, toDisplayString as i, createCommentVNode as c, createElementVNode as u, markRaw as d } from "vue";
const m = (e, a) => {
  const t = e.__vccOpts || e;
  for (const [o, l] of a)
    t[o] = l;
  return t;
}, p = {
  name: "MapViewerComponent",
  props: {
    puntos: {
      type: Array,
      default: () => []
    },
    centro: {
      type: Array,
      default: () => [-37.3186, -59.1341]
      // Tandil, Buenos Aires por defecto
    },
    zoom: {
      type: Number,
      default: 13
    },
    altura: {
      type: String,
      default: "420px"
    },
    tileUrl: {
      type: String,
      default: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    },
    colorPunto: {
      type: String,
      default: "#0d6efd"
    },
    radioPunto: {
      type: Number,
      default: 8
    },
    mostrarResumen: {
      type: Boolean,
      default: !0
    },
    cargando: {
      type: Boolean,
      default: !1
    },
    error: {
      type: String,
      default: ""
    },
    labelAccesibilidad: {
      type: String,
      default: "Mapa interactivo con múltiples puntos"
    },
    mensajeCargando: {
      type: String,
      default: ""
    },
    mensajeSinPuntos: {
      type: String,
      default: ""
    },
    // Zoom con la rueda del mouse (desactivado por defecto para no capturar el scroll de la página)
    scrollWheelZoom: {
      type: Boolean,
      default: !1
    },
    // Zoom mínimo permitido (límite de alejamiento)
    minZoom: {
      type: Number,
      default: null
    },
    // Límites de desplazamiento: [[latSur, lngOeste], [latNorte, lngEste]]
    maxBounds: {
      type: Array,
      default: null
    },
    // 0 = el borde cede al arrastrar, 1 = el borde es sólido
    maxBoundsViscosity: {
      type: Number,
      default: 1
    }
  },
  emits: ["punto-click", "mapa-listo"],
  data() {
    return {
      mapa: null,
      capaPuntos: null,
      marcadores: /* @__PURE__ */ new Map()
    };
  },
  watch: {
    puntos: {
      deep: !0,
      handler() {
        this.dibujarPuntos();
      }
    },
    altura(e) {
      this.mapa && this.$nextTick(() => {
        this.mapa.invalidateSize();
      });
    }
  },
  mounted() {
    this.iniciarMapa(), this.$emit("mapa-listo");
  },
  beforeUnmount() {
    this.mapa && (this.mapa.remove(), this.mapa = null);
  },
  methods: {
    opcionesMapa() {
      const e = { scrollWheelZoom: this.scrollWheelZoom };
      return this.minZoom !== null && (e.minZoom = this.minZoom), this.maxBounds && (e.maxBounds = this.maxBounds, e.maxBoundsViscosity = this.maxBoundsViscosity), e;
    },
    iniciarMapa() {
      this.$refs.mapaEl && (this.mapa = d(r.map(this.$refs.mapaEl, this.opcionesMapa()).setView(this.centro, this.zoom)), r.tileLayer(this.tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(this.mapa), this.capaPuntos = d(r.layerGroup().addTo(this.mapa)), delete r.Icon.Default.prototype._getIconUrl, r.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAABSCAMAAAAhFXfZAAAC91BMVEVMaXEzeak2f7I4g7g3g7cua5gzeKg8hJo3grY4g7c3grU0gLI2frE0daAubJc2gbQwd6QzeKk2gLMtd5sxdKIua5g1frA2f7IydaM0e6w2fq41fK01eqo3grgubJgta5cxdKI1f7AydaQydaMxc6EubJgvbJkwcZ4ubZkwcJwubZgubJcydqUydKIxapgubJctbJcubZcubJcvbJYubJcvbZkubJctbJctbZcubJg2f7AubJcrbZcubJcubJcua5g3grY0fq8ubJcubJdEkdEwhsw6i88vhswuhcsuhMtBjMgthMsrg8srgss6is8qgcs8i9A9iMYtg8spgcoogMo7hcMngMonf8olfso4gr8kfck5iM8jfMk4iM8he8k1fro7itAgesk2hs8eecgzfLcofssdeMg0hc4cd8g2hcsxeLQbdsgZdcgxeLImfcszhM0vda4xgckzhM4xg84wf8Yxgs4udKsvfcQucqhUndROmdM1fK0wcZ8vb5w0eqpQm9MzeKhXoNVcpdYydKNWn9VZotVKltJFjsIwcJ1Rms9OlslLmtH///8+kc9epdYzd6dbo9VHkMM2f7FHmNBClM8ydqVcpNY9hro3gLM9hLczealQmcw3fa46f7A8gLMxc6I3eagyc6FIldJMl9JSnNRSntNNl9JPnNJFi75UnM9ZodVKksg8kM45jc09e6ZHltFBk883gbRBh7pDk9EwcaBzn784g7dKkcY2i81Om9M7j85Llc81is09g7Q4grY/j9A0eqxKmdFFltBEjcXf6fFImdBCiLxJl9FGlNFBi78yiMxVndEvbpo6js74+vx+psPP3+o/ks5HkcpGmNCjwdZCkNDM3ehYoNJEls+lxNkxh8xHks0+jdC1zd5Lg6r+/v/H2ufz9/o3jM3t8/edvdM/k89Th61OiLBSjbZklbaTt9BfptdjmL1AicBHj8hGk9FAgK1dkLNTjLRekrdClc/k7fM0icy0y9tgp9c4jc2NtM9Dlc8zicxeXZn3AAAAQ3RSTlMAHDdTb4yPA+LtnEQmC4L2EmHqB7XA0d0sr478x4/Yd5i1zOfyPkf1sLVq4Nh3FvjxopQ2/STNuFzUwFIwxKaejILpIBEV9wAABhVJREFUeF6s1NdyFEcY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", import.meta.url).toString(),
        iconUrl: new URL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=", import.meta.url).toString(),
        shadowUrl: new URL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAQAAAACach9AAACMUlEQVR4Ae3ShY7jQBAE0Aoz/f9/HTMzhg1zrdKUrJbdx+Kd2nD8VNudfsL/Th///dyQN2TH6f3y/BGpC379rV+S+qqetBOxImNQXL8JCAr2V4iMQXHGNJxeCfZXhSRBcQMfvkOWUdtfzlLgAENmZDcmo2TVmt8OSM2eXxBp3DjHSMFutqS7SbmemzBiR+xpKCNUIRkdkkYxhAkyGoBvyQFEJEefwSmmvBfJuJ6aKqKWnAkvGZOaZXTUgFqYULWNSHUckZuR1HIIimUExutRxwzOLROIG4vKmCKQt364mIlhSyzAf1m9lHZHJZrlAOMMztRRiKimp/rpdJDc9Awry5xTZCte7FHtuS8wJgeYGrex28xNTd086Dik7vUMscQOa8y4DoGtCCSkAKlNwpgNtphjrC6MIHUkR6YWxxs6Sc5xqn222mmCRFzIt8lEdKx+ikCtg91qS2WpwVfBelJCiQJwvzixfI9cxZQWgiSJelKnwBElKYtDOb2MFbhmUigbReQBV0Cg4+qMXSxXSyGUn4UbF8l+7qdSGnTC0XLCmahIgUHLhLOhpVCtw4CzYXvLQWQbJNmxoCsOKAxSgBJno75avolkRw8iIAFcsdc02e9iyCd8tHwmeSSoKTowIgvscSGZUOA7PuCN5b2BX9mQM7S0wYhMNU74zgsPBj3HU7wguAfnxxjFQGBE6pwN+GjME9zHY7zGp8wVxMShYX9NXvEWD3HbwJf4giO4CFIQxXScH1/TM+04kkBiAAAAAElFTkSuQmCC", import.meta.url).toString()
      }), this.dibujarPuntos());
    },
    dibujarPuntos() {
      if (!this.mapa || !this.capaPuntos) return;
      this.capaPuntos.clearLayers(), this.marcadores.clear();
      const e = [];
      for (const a of this.puntos) {
        if (a.lat === null || a.lat === void 0 || a.lng === null || a.lng === void 0)
          continue;
        const t = [a.lat, a.lng];
        e.push(t);
        const o = r.circleMarker(t, {
          radius: this.radioPunto,
          color: "#fff",
          weight: 2,
          fillColor: this.colorPunto,
          fillOpacity: 0.9
        });
        a.popup && o.bindPopup(this.crearPopup(a)), o.on("click", () => {
          this.$emit("punto-click", a);
        }), o.addTo(this.capaPuntos), this.marcadores.set(a.id, o);
      }
      e.length > 0 ? this.mapa.fitBounds(e, { padding: [30, 30], maxZoom: 14 }) : this.mapa.setView(this.centro, this.zoom);
    },
    crearPopup(e) {
      const a = document.createElement("div");
      if (e.nombre) {
        const t = document.createElement("strong");
        t.textContent = e.nombre, a.appendChild(t);
      }
      if (e.subtitulo) {
        const t = document.createElement("div");
        t.className = "small", t.textContent = e.subtitulo, a.appendChild(t);
      }
      if (e.descripcion) {
        const t = document.createElement("div");
        t.className = "small text-muted", t.textContent = e.descripcion, a.appendChild(t);
      }
      return a;
    },
    resaltarPunto(e) {
      const a = this.marcadores.get(e);
      a && a.openPopup();
    },
    quitarResaltePunto(e) {
      const a = this.marcadores.get(e);
      a && a.closePopup();
    }
  }
}, g = { class: "vgmv-viewer" }, h = {
  key: 0,
  class: "alert alert-danger mb-2"
}, f = {
  key: 1,
  class: "alert alert-secondary mb-2"
}, A = {
  key: 2,
  class: "alert alert-info mb-2"
}, b = ["aria-label"], k = {
  key: 3,
  class: "vgmv-resumen small text-muted mt-2 mb-0"
};
function x(e, a, t, o, l, y) {
  return s(), n("div", g, [
    t.error ? (s(), n("div", h, i(t.error), 1)) : c("", !0),
    !t.error && t.puntos.length === 0 && !t.cargando ? (s(), n("div", f, i(t.mensajeSinPuntos || "No hay puntos para mostrar en el mapa."), 1)) : c("", !0),
    t.cargando ? (s(), n("div", A, i(t.mensajeCargando || "Cargando mapa…"), 1)) : c("", !0),
    u("div", {
      ref: "mapaEl",
      class: "vgmv-map",
      role: "region",
      "aria-label": t.labelAccesibilidad
    }, null, 8, b),
    !t.error && t.mostrarResumen ? (s(), n("p", k, i(t.cargando ? t.mensajeCargando || "Cargando…" : `${t.puntos.length} ${t.puntos.length === 1 ? "punto" : "puntos"} en el mapa.`), 1)) : c("", !0)
  ]);
}
const w = /* @__PURE__ */ m(p, [["render", x], ["__scopeId", "data-v-5d7ceba9"]]);
function B() {
  return { MapViewerComponent: w };
}
export {
  w as MapViewerComponent,
  B as useMapViewer
};
