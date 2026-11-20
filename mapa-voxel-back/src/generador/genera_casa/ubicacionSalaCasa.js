// Encapsula la creación física de habitaciones dentro de una parcela.
// El arreglo `types` contiene los nombres de salas en el orden que deben
// disponerse; el índice cero es la sala principal.
export function placeRooms(types, plotX0, plotZ0, plotWidth, plotDepth,
                           baseY, structures, orientation, parcelId,
                           ROOM_CONFIGS, createRoom) {
    // the y-coordinate of a room is now exactly the terrain level (baseY)
    // instead of one block above.  previously we added +1 which caused all
    // floors to "float" over the ground because heightMap stores the first
    // air layer, not the top solid block.  the surrounding surface stays at
    // baseY, so using baseY here makes the floor flush with the terrain.
    const y0 = baseY;
    let offset = 0;              // desplaza a lo largo del frente o del costado
    let backOffset = 0;          // desplazamiento hacia "detrás" (filas sucesivas)
    let rowMaxCross = 0;         // máxima profundidad/anchura de la fila actual
    let rowStartOffset = Infinity; // inicio de la fila en el eje de offset
    let rowEndOffset = 0;         // fin de la fila en el eje de offset
    const gap = 6;               // separación entre filas (pasillo)
    let assignedEntrance = false;

    // cola de tipos; la vamos a modificar (reinsertar salas desplazadas, ROW_BREAK, etc.)
    const queue = types.slice();

    // filas actualmente pobladas (para cálculo de huecos y relocalización)
    let rowRooms = [];

    // filas ya completadas (para intentar reubicar salas solapadas ahí)
    const completedRows = [];

    // último pasillo horizontal insertado (para conectar con el siguiente)
    let lastHall = null;

    const ROW_BREAK = '__ROW_BREAK__';

    // división previa en dos líneas si cabe todo en una sola fila
    // y todas las salas quedarían en la misma línea. En ese caso
    // repartimos por conteo: la mitad en la fila 0 y la otra mitad en la fila 1.
    if (queue.length > 1) {
        const dims = queue.map(t => {
            const cfg = ROOM_CONFIGS[t];
            if (!cfg) return 0;
            let w = cfg.width;
            let d = cfg.depth;
            if (orientation === 'E' || orientation === 'O') [w, d] = [d, w];
            return (orientation === 'N' || orientation === 'S') ? w : d;
        });
        const totalLength = dims.reduce((a, b) => a + b, 0);
        const maxLine = (orientation === 'N' || orientation === 'S') ? plotWidth : plotDepth;
        if (totalLength <= maxLine) {
            // cabe todo en una línea; dividir estrictamente por el número de
            // salas en dos mitades iguales (la segunda puede tener uno más si
            // hay impar).
            if (queue.length > 2) {
                const mid = Math.floor(queue.length / 2);
                const first = queue.slice(0, mid);
                const second = queue.slice(mid);
                queue.length = 0;
                queue.push(...first, ROW_BREAK, ...second);
            }
        }
    }

    // búsqueda de un hueco de al menos `minWidth` bloques en una lista de salas
    // `rooms` debe contener objetos {start, width} similares a `rowRooms`.
    // Busca un hueco en la lista de `rooms` entre rangeStart y rangeEnd.
    // Devuelve un objeto {pos,width} indicando la posición inicial y la anchura
    // del hueco encontrado (>=minWidth), o null si no hay ninguno.
    function findGapInList(rooms, rangeStart, rangeEnd, minWidth) {
        const sorted = rooms.slice().sort((a, b) => a.start - b.start);
        let prevEnd = rangeStart;
        for (const r of sorted) {
            const gap = r.start - prevEnd;
            if (gap >= minWidth && prevEnd + minWidth <= rangeEnd) {
                return { pos: prevEnd, width: gap };
            }
            prevEnd = Math.max(prevEnd, r.start + r.width);
        }
        const gap = rangeEnd - prevEnd;
        if (gap >= minWidth) return { pos: prevEnd, width: gap };
        return null;
    }

    // convierte un offset primario y backOffset de fila a coordenadas (x0,z0)
    // usando la orientación actual y las dimensiones w,d de la sala a ubicar.
    function coordsFor(offsetPrim, w, d, rowBack) {
        let xx, zz;
        switch (orientation) {
            case 'N':
                xx = plotX0 + offsetPrim;
                zz = plotZ0 + rowBack;
                break;
            case 'S':
                xx = plotX0 + offsetPrim;
                zz = plotZ0 + plotDepth - d - rowBack;
                break;
            case 'O':
                xx = plotX0 + rowBack;
                zz = plotZ0 + offsetPrim;
                break;
            case 'E':
                xx = plotX0 + plotWidth - w - rowBack;
                zz = plotZ0 + offsetPrim;
                break;
            default:
                xx = zz = NaN;
        }
        return { x0: xx, z0: zz };
    }

    // función auxiliar para crear un pasillo horizontal y, si existe uno previo,
    // insertar además el pasillo vertical conectante y relocalizar salas según sea
    // necesario.
    function addHorizontalHall(cx, cz, cw, cd) {
        // before placing the hall, ensure it spans the union of the current
        // row offsets (rowStartOffset/rowEndOffset) and the previous row
        // represented by lastHall. this guarantees every room on both sides
        // will be adjacent to the corridor.
        let finalCx = cx, finalCz = cz, finalCw = cw, finalCd = cd;
        if (lastHall) {
            if (orientation === 'N' || orientation === 'S') {
                const prevStart = lastHall.x;
                const prevEnd = lastHall.x + lastHall.width;
                const currStart = plotX0 + rowStartOffset;
                const currEnd = plotX0 + rowEndOffset;
                const unionStart = Math.min(prevStart, currStart);
                const unionEnd = Math.max(prevEnd, currEnd);
                finalCx = unionStart;
                finalCw = unionEnd - unionStart;
                // enlarge previous hall as well to match the union
                lastHall.x = unionStart;
                lastHall.width = unionEnd - unionStart;
            } else {
                const prevStart = lastHall.z;
                const prevEnd = lastHall.z + lastHall.depth;
                const currStart = plotZ0 + rowStartOffset;
                const currEnd = plotZ0 + rowEndOffset;
                const unionStart = Math.min(prevStart, currStart);
                const unionEnd = Math.max(prevEnd, currEnd);
                finalCz = unionStart;
                finalCd = unionEnd - unionStart;
                lastHall.z = unionStart;
                lastHall.depth = unionEnd - unionStart;
            }
        }
        const hallCfg = ROOM_CONFIGS.hallway || {};
        const hinst = Object.assign({}, hallCfg, { width: finalCw, depth: finalCd });
        if (parcelId) hinst.parcelId = parcelId;
        createRoom(finalCx, y0, finalCz, hinst, structures);
        // grab the structure object that was just pushed so callers can adjust it
        const hallStruct = structures[structures.length - 1];
        const newHall = { x: finalCx, y: y0, z: finalCz, width: finalCw, depth: finalCd };

        if (lastHall) {
            // calcular rango permitido en el eje "primario" (offset) intersectando
            // los anchos de ambos pasillos horizontales y además limitándolo al
            // segmento real ocupado por los pasillos. esto garantiza que el
            // pasillo perpendicular siempre quede dentro de los dos horizontales
            // y por ende puedan conectarse.
            let rangeStart = rowStartOffset;
            let rangeEnd = rowEndOffset;
            let lastStart, lastEnd;
            // límites del pasillo que acabamos de generar (newHall) también
            // deben contribuir a la intersección.
            let currentStart, currentEnd;
            if (orientation === 'N' || orientation === 'S') {
                lastStart = lastHall.x;
                lastEnd = lastHall.x + lastHall.width;
                currentStart = cx;
                currentEnd = cx + cw;
            } else {
                lastStart = lastHall.z;
                lastEnd = lastHall.z + lastHall.depth;
                currentStart = cz;
                currentEnd = cz + cd;
            }
            rangeStart = Math.max(rangeStart, lastStart, currentStart);
            rangeEnd = Math.min(rangeEnd, lastEnd, currentEnd) - 6;
            if (rangeEnd < rangeStart) {
                // si no hay intersección con los tres, al menos garantizamos el
                // área común entre los dos pasillos horizontales
                rangeStart = Math.max(lastStart, currentStart);
                rangeEnd = Math.min(lastEnd, currentEnd) - 6;
            }

            const gapInfo = findGapInList(rowRooms, rangeStart, rangeEnd, 6);
            let verticalPos;
            if (gapInfo === null) {
                // ningún hueco libre: posicionamos al azar dentro del rango completo
                verticalPos = rangeStart + Math.floor(Math.random() * (rangeEnd - rangeStart + 1));
            } else {
                // también varía dentro del hueco encontrado para más diversidad
                const maxOffset = gapInfo.width - 6;
                verticalPos = gapInfo.pos + Math.floor(Math.random() * (maxOffset + 1));
            }
            // crear pasillo vertical de ancho fijo 6 entre los dos horizontales
            let vx, vz, vw, vd;
            let zLow, zHigh;
            if (orientation === 'N') {
                vx = verticalPos;
                vz = lastHall.z + lastHall.depth;
                vw = 6;
                vd = cz - vz;
                zLow = vz;
                zHigh = cz;
            } else if (orientation === 'S') {
                vx = verticalPos;
                vz = Math.min(cz + cd, lastHall.z);
                vw = 6;
                vd = Math.abs((lastHall.z) - (cz + cd));
                zLow = vz;
                zHigh = vz + vd;
            } else if (orientation === 'O') {
                vz = verticalPos;
                vx = lastHall.x + lastHall.width;
                vd = 6;
                vw = cz - vx;
                zLow = vx;
                zHigh = cz;
            } else { // E
                vz = verticalPos;
                vx = Math.min(cz + cd, lastHall.x);
                vd = Math.abs((lastHall.x) - (cz + cd));
                vw = 6;
                zLow = vx;
                zHigh = vx + vd;
            }
            const vinst = Object.assign({}, hallCfg, { width: vw, depth: vd });
            if (parcelId) vinst.parcelId = parcelId;
            createRoom(vx, y0, vz, vinst, structures);

            // tras generar el pasillo, detectar y relocalizar cualquier sala solapada
            const toRequeue = [];
            const handled = new Set();

            // utilitario para superposición de rectángulos axis-aligned
            function rectOverlap(ax1, az1, ax2, az2, bx1, bz1, bx2, bz2) {
                return ax1 < bx2 && ax2 > bx1 && az1 < bz2 && az2 > bz1;
            }

            // rectángulo del pasillo vertical recién creado
            const cabX1 = vx;
            const cabZ1 = vz;
            const cabX2 = vx + vw;
            const cabZ2 = vz + vd;

            const checkOverlap = (roomsList, rowBack) => {
                const overlaps = [];
                for (const r of roomsList) {
                    if (handled.has(r)) continue;
                    const { x0, z0 } = coordsFor(r.start, r.w, r.d, rowBack);
                    const roomX1 = x0;
                    const roomZ1 = z0;
                    const roomX2 = x0 + r.w;
                    const roomZ2 = z0 + r.d;
                    if (!rectOverlap(roomX1, roomZ1, roomX2, roomZ2, cabX1, cabZ1, cabX2, cabZ2))
                        continue;
                    overlaps.push(r);
                    handled.add(r);
                    // intentar reubicar inmediatamente en la última fila completada
                    let relocated = false;
                    if (completedRows.length) {
                        const lastRow = completedRows[completedRows.length - 1];
                        const gapPos = findGapInList(lastRow.rooms, 0,
                                (orientation === 'N' || orientation === 'S') ? plotWidth : plotDepth,
                                r.width);
                        if (gapPos !== null) {
                            const { x0: nx, z0: nz } = coordsFor(gapPos, r.w, r.d, lastRow.backOffset);
                            const inst = Object.assign({}, r.cfg, { width: r.w, depth: r.d });
                            if (orientation === 'N') inst.frontNorth = true;
                            else if (orientation === 'S') inst.frontSouth = true;
                            else if (orientation === 'E') inst.frontEast = true;
                            else if (orientation === 'O') inst.frontWest = true;
                            createRoom(nx, y0, nz, inst, structures);
                            lastRow.rooms.push({ type: r.type, start: gapPos, width: r.width, cfg: r.cfg, w: r.w, d: r.d, structIndex: structures.length - 1 });
                            // update the offset bounds for that row and extend hall if needed
                            lastRow.startOffset = Math.min(lastRow.startOffset, gapPos);
                            lastRow.endOffset = Math.max(lastRow.endOffset, gapPos + r.width);
                            if (lastRow.hall) {
                                if (orientation === 'N' || orientation === 'S') {
                                    lastRow.hall.x = plotX0 + lastRow.startOffset;
                                    lastRow.hall.width = lastRow.endOffset - lastRow.startOffset;
                                } else {
                                    lastRow.hall.z = plotZ0 + lastRow.startOffset;
                                    lastRow.hall.depth = lastRow.endOffset - lastRow.startOffset;
                                }
                            }
                            relocated = true;
                        }
                    }
                    if (!relocated) {
                        toRequeue.push(r.type);
                    }
                }
                if (overlaps.length) {
                    const oldStructs = structures.slice();
                    structures.length = 0;
                    oldStructs.forEach((s, idx) => {
                        if (!overlaps.some(rr => rr.structIndex === idx)) structures.push(s);
                    });
                }
                return overlaps;
            };
            const currOver = checkOverlap(rowRooms, backOffset);
            rowRooms = rowRooms.filter(r => !currOver.includes(r));
            if (completedRows.length) {
                const lastRow = completedRows[completedRows.length - 1];
                const prevOver = checkOverlap(lastRow.rooms, lastRow.backOffset);
                lastRow.rooms = lastRow.rooms.filter(r => !prevOver.includes(r));
            }
            if (toRequeue.length) queue.push(...toRequeue);
        }

        lastHall = newHall;
        return hallStruct;
    }

    // contador para asignar la primera sala como entrada
    let roomCounter = 0;

    while (queue.length) {
        const t = queue.shift();
        // sala especial: forzar salto de fila
        if (t === ROW_BREAK) {
            if (rowStartOffset < Infinity) {
                let cx, cz, cw, cd;
                if (orientation === 'N') {
                    cx = plotX0 + rowStartOffset;
                    cz = plotZ0 + backOffset + rowMaxCross;
                    cw = rowEndOffset - rowStartOffset;
                    cd = gap;
                } else if (orientation === 'S') {
                    cx = plotX0 + rowStartOffset;
                    cz = plotZ0 + plotDepth - (backOffset + rowMaxCross) - gap;
                    cw = rowEndOffset - rowStartOffset;
                    cd = gap;
                } else if (orientation === 'O') {
                    cz = plotZ0 + rowStartOffset;
                    cx = plotX0 + backOffset + rowMaxCross;
                    cd = rowEndOffset - rowStartOffset;
                    cw = gap;
                } else { // E
                    cz = plotZ0 + rowStartOffset;
                    cx = plotX0 + plotWidth - (backOffset + rowMaxCross) - gap;
                    cd = rowEndOffset - rowStartOffset;
                    cw = gap;
                }
                // antes de colocar el pasillo, cerrar la fila actual
                // registrar fila antes de mover el offset (igual que en canAdvance)
                // capture hall reference and offset ranges
                const hallRef = addHorizontalHall(cx, cz, cw, cd);
                completedRows.push({ rooms: rowRooms.slice(), backOffset: backOffset,
                                      startOffset: rowStartOffset,
                                      endOffset: rowEndOffset,
                                      hall: hallRef });
            }
            // avanzar al inicio de la siguiente fila (se usa el mismo incremento
            // que en la lógica normal de avance de fila)
            backOffset += rowMaxCross + gap;

            // preparar variables para la nueva fila
            offset = 0;
            rowMaxCross = 0;
            rowStartOffset = Infinity;
            rowEndOffset = 0;
            rowRooms = [];
            continue;
        }

        const cfg = ROOM_CONFIGS[t];
        if (!cfg) continue;

        let w = cfg.width;
        let d = cfg.depth;
        if (orientation === 'E' || orientation === 'O') {
            [w, d] = [d, w];
        }

        const computeCoords = () => {
            let xx, zz;
            switch (orientation) {
                case 'N':
                    xx = plotX0 + offset;
                    zz = plotZ0 + backOffset;
                    break;
                case 'S':
                    xx = plotX0 + offset;
                    zz = plotZ0 + plotDepth - d - backOffset;
                    break;
                case 'O':
                    xx = plotX0 + backOffset;
                    zz = plotZ0 + offset;
                    break;
                case 'E':
                    xx = plotX0 + plotWidth - w - backOffset;
                    zz = plotZ0 + offset;
                    break;
                default:
                    xx = zz = NaN;
            }
            return { x0: xx, z0: zz };
        };

        let placed = false;
        while (!placed) {
            const offsetBefore = offset;
            const { x0, z0 } = computeCoords();
            const fits = !(x0 < plotX0 || z0 < plotZ0 ||
                x0 + w > plotX0 + plotWidth || z0 + d > plotZ0 + plotDepth);

            if (fits) {
                rowStartOffset = Math.min(rowStartOffset, offsetBefore);
                rowEndOffset = Math.max(rowEndOffset, offsetBefore + ((orientation === 'N' || orientation === 'S') ? w : d));

                const inst = Object.assign({}, cfg, { width: w, depth: d });
                if (orientation === 'N') inst.frontNorth = true;
                else if (orientation === 'S') inst.frontSouth = true;
                else if (orientation === 'E') inst.frontEast = true;
                else if (orientation === 'O') inst.frontWest = true;

                if (roomCounter === 0) {
                    inst.hasFrontDoor = true;
                    roomCounter = 1;
                }
                if (parcelId) inst.parcelId = parcelId;

                // registrar sala antes de crearla para poder relocalizar si hace falta
                const startPrimary = offsetBefore;
                const widthPrimary = (orientation === 'N' || orientation === 'S') ? w : d;
                rowRooms.push({ type: t, start: startPrimary, width: widthPrimary,
                               cfg, w, d, structIndex: structures.length });

                createRoom(x0, y0, z0, inst, structures);

                rowMaxCross = Math.max(rowMaxCross, (orientation === 'N' || orientation === 'S') ? d : w);
                offset += (orientation === 'N' || orientation === 'S') ? w : d;
                placed = true;
            } else {
                const canAdvance = (orientation === 'N' || orientation === 'S') ?
                    (backOffset + rowMaxCross + gap + d <= plotDepth) :
                    (backOffset + rowMaxCross + gap + w <= plotWidth);
                if (canAdvance) {
                    if (rowStartOffset < Infinity) {
                        let cx, cz, cw, cd;
                        if (orientation === 'N') {
                            cx = plotX0 + rowStartOffset;
                            cz = plotZ0 + backOffset + rowMaxCross;
                            cw = rowEndOffset - rowStartOffset;
                            cd = gap;
                        } else if (orientation === 'S') {
                            cx = plotX0 + rowStartOffset;
                            cz = plotZ0 + plotDepth - (backOffset + rowMaxCross) - gap;
                            cw = rowEndOffset - rowStartOffset;
                            cd = gap;
                        } else if (orientation === 'O') {
                            cz = plotZ0 + rowStartOffset;
                            cx = plotX0 + backOffset + rowMaxCross;
                            cd = rowEndOffset - rowStartOffset;
                            cw = gap;
                        } else { // E
                            cz = plotZ0 + rowStartOffset;
                            cx = plotX0 + plotWidth - (backOffset + rowMaxCross) - gap;
                            cd = rowEndOffset - rowStartOffset;
                            cw = gap;
                        }
                        // registrar fila actual antes de colocar el pasillo; capturamos el hall
                        const hallRef = addHorizontalHall(cx, cz, cw, cd);
                        completedRows.push({ rooms: rowRooms.slice(), backOffset: backOffset,
                                             startOffset: rowStartOffset,
                                             endOffset: rowEndOffset,
                                             hall: hallRef });
                    }
                    backOffset += rowMaxCross + gap;
                    offset = 0;
                    rowMaxCross = 0;
                    rowStartOffset = Infinity;
                    rowEndOffset = 0;
                    rowRooms = [];
                    queue.unshift(t);
                    placed = true;
                } else {
                    placed = true;
                }
            }
        }
    }
}
