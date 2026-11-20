// vec.js - Vector mínimo de tres componentes. Reemplaza a THREE.Vector3 dentro de
// la especificación para que el paquete no necesite three.js ni DOM.

export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    clone() {
        return new Vec3(this.x, this.y, this.z);
    }
}
