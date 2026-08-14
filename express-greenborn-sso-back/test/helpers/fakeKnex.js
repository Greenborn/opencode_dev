export function createFakeKnex(initialStore = {}) {
  const store = { ...initialStore };

  function tableRef(name) {
    if (!store[name]) store[name] = [];
    return store[name];
  }

  function matches(row, wheres) {
    return wheres.every((where) => {
      for (const [key, value] of Object.entries(where)) {
        if (key === '__not') continue;
        if (where.__not && row[key] === value) return false;
        if (row[key] !== value) return false;
      }
      return true;
    });
  }

  function makeQueryBuilder(name) {
    const rows = tableRef(name);
    const qb = {
      _wheres: [],
      _whereIns: [],
      _joins: [],
      _selects: [],
      _distinct: false,
      _limit: null,
      _orderBy: null,
      _returning: null,
      _op: null,
      _data: null,

      where(obj) { qb._wheres.push({ ...obj }); return qb; },
      andWhereNot(obj) { qb._wheres.push({ ...obj, __not: true }); return qb; },
      whereRaw() { return qb; },
      whereIn(col, values) { qb._whereIns.push({ col, values: Array.isArray(values) ? values : [values] }); return qb; },
      join(table, a, b) { qb._joins.push({ table, a, b }); return qb; },
      select(...cols) { qb._selects = cols.flat(); return qb; },
      distinct() { qb._distinct = true; return qb; },
      limit(n) { qb._limit = n; return qb; },
      orderBy(col, dir) { qb._orderBy = { col, dir }; return qb; },
      returning(cols) { qb._returning = Array.isArray(cols) ? cols : [cols]; return qb; },
      insert(obj) { qb._op = 'insert'; qb._data = obj; return qb; },
      update(obj) { qb._op = 'update'; qb._data = obj; return qb; },
      del() { qb._op = 'del'; return qb; },

      _resolveJoinValue(row, ref) {
        const [t, col] = ref.split('.');
        if (t && col) {
          const trows = tableRef(t);
          const other = trows.find((r) => r.id === row[col]);
          return other;
        }
        return undefined;
      },

      _all() {
        let result = rows;
        for (const join of qb._joins) {
          const joinedRows = [];
          for (const row of result) {
            const leftVal = join.a.includes('.') ? row[join.a.split('.')[1]] : row[join.a];
            const joined = tableRef(join.table);
            const matches = joined.filter((r) => r[join.b.split('.')[1] || join.b] === leftVal);
            for (const m of matches) {
              joinedRows.push({ ...row, ...m, [`${join.table}.${join.b}`]: m[join.b.split('.')[1] || join.b] });
            }
          }
          result = joinedRows;
        }
        result = result.filter((r) => matches(r, qb._wheres));
        for (const wi of qb._whereIns) {
          const colKey = wi.col.split('.').pop();
          result = result.filter((r) => wi.values.includes(r[colKey]));
        }
        if (qb._orderBy) {
          const { col, dir } = qb._orderBy;
          const sign = dir === 'desc' ? -1 : 1;
          result = [...result].sort((a, b) => ((a[col] ?? 0) > (b[col] ?? 0) ? sign : -sign));
        }
        if (qb._limit) result = result.slice(0, qb._limit);
        if (qb._selects.length) {
          result = result.map((r) => {
            const out = {};
            for (const sel of qb._selects) {
              const key = sel.includes('.') ? sel.split('.').pop() : sel;
              out[key] = r[key];
            }
            return out;
          });
        }
        if (qb._distinct) {
          const seen = new Set();
          result = result.filter((r) => {
            const key = JSON.stringify(r);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        return result;
      },

      async _execute() {
        const matched = qb._all();
        if (qb._op === 'insert') {
          const rowsRef = tableRef(name);
          const nextId = rowsRef.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
          const row = { id: nextId, ...qb._data };
          rowsRef.push(row);
          if (qb._returning) return qb._returning.map((c) => ({ [c]: row[c] }));
          return [nextId];
        }
        if (qb._op === 'update') {
          for (const r of matched) Object.assign(r, qb._data);
          return matched.length;
        }
        if (qb._op === 'del') {
          for (const r of matched) {
            const idx = rows.indexOf(r);
            if (idx >= 0) rows.splice(idx, 1);
          }
          return matched.length;
        }
        if (qb._op === null) return qb._all();
        throw new Error('fakeKnex: se debe especificar una operación');
      },

      then(resolve, reject) {
        return qb._execute().then(resolve, reject);
      },
      catch(reject) { return qb.then(undefined, reject); },

      async first() { return qb._all()[0] || undefined; },
      async count() { return { total: qb._all().length }; },
    };
    return qb;
  }

  const knex = (name) => makeQueryBuilder(name);
  knex.raw = async () => ({ rows: [] });
  knex.destroy = async () => {};
  return knex;
}
