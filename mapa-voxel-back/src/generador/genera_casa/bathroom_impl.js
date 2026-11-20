export function connectBathrooms(structures) {
    const len = structures.length;
    for (let i = 0; i < len; i++) {
        const s = structures[i];
        if (s.type !== 'banio' || !s.parcelId) continue;
        if (s.openNorth || s.openSouth || s.openEast || s.openWest) continue;

        const tryLink = (t) => {
            const sx0 = s.x, sx1 = s.x + s.width;
            const sz0 = s.z, sz1 = s.z + s.depth;
            const tx0 = t.x, tx1 = t.x + t.width;
            const tz0 = t.z, tz1 = t.z + t.depth;
            // vertical wall
            if (sx1 === tx0 || tx1 === sx0) {
                const overlapZ0 = Math.max(sz0, tz0);
                const overlapZ1 = Math.min(sz1, tz1);
                const overlapLen = overlapZ1 - overlapZ0;
                if (overlapLen > 2) {
                    const doorWidth = Math.min(4, overlapLen - 2);
                    const doorZStart = overlapZ0 + Math.floor((overlapLen - doorWidth) / 2);
                    if (sx1 === tx0) {
                        s.openEast = true;
                        s.openEastRange = { start: doorZStart, end: doorZStart + doorWidth };
                        t.openWest = true;
                        t.openWestRange = { start: doorZStart, end: doorZStart + doorWidth };
                    } else {
                        s.openWest = true;
                        s.openWestRange = { start: doorZStart, end: doorZStart + doorWidth };
                        t.openEast = true;
                        t.openEastRange = { start: doorZStart, end: doorZStart + doorWidth };
                    }
                    return true;
                }
            }
            // horizontal wall
            if (sz1 === tz0 || tz1 === sz0) {
                const overlapX0 = Math.max(sx0, tx0);
                const overlapX1 = Math.min(sx1, tx1);
                const overlapLen = overlapX1 - overlapX0;
                if (overlapLen > 2) {
                    const doorWidth = Math.min(4, overlapLen - 2);
                    const doorXStart = overlapX0 + Math.floor((overlapLen - doorWidth) / 2);
                    if (sz1 === tz0) {
                        s.openSouth = true;
                        s.openSouthRange = { start: doorXStart, end: doorXStart + doorWidth };
                        t.openNorth = true;
                        t.openNorthRange = { start: doorXStart, end: doorXStart + doorWidth };
                    } else {
                        s.openNorth = true;
                        s.openNorthRange = { start: doorXStart, end: doorXStart + doorWidth };
                        t.openSouth = true;
                        t.openSouthRange = { start: doorXStart, end: doorXStart + doorWidth };
                    }
                    return true;
                }
            }
            return false;
        };

        // classify structures by priority
        const halls = [];
        let mainRoom = null;
        const others = [];
        for (let j = 0; j < len; j++) {
            const t = structures[j];
            if (t.parcelId !== s.parcelId || t === s) continue;
            if (t.type === 'hallway') halls.push(t);
            else if (t.frontNorth || t.frontSouth || t.frontEast || t.frontWest) {
                if (!mainRoom) mainRoom = t;
            } else if (t.type !== 'banio') {
                others.push(t);
            }
        }

        const tryList = (list) => {
            for (const t of list) {
                if (tryLink(t)) return true;
            }
            return false;
        };

        // attempt each priority in turn
        if (tryList(halls)) continue;
        if (mainRoom && tryLink(mainRoom)) continue;
        tryList(others);
    }
}