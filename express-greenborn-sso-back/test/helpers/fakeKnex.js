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
      _limit: null,
      _orderBy: null,
      _returning: null,
      _op: null,
      _data: null,

      where(obj) { qb._wheres.push({ ...obj }); return qb; },
      andWhereNot(obj) { qb._wheres.push({ ...obj, __not: true }); return qb; },
      whereRaw() { return qb; },
      whereIn() { return qb; },
      limit(n) { qb._limit = n; return qb; },
      orderBy(col, dir) { qb._orderBy = { col, dir }; return qb; },
      returning(cols) { qb._returning = Array.isArray(cols) ? cols : [cols]; return qb; },
      insert(obj) { qb._op = 'insert'; qb._data = obj; return qb; },
      update(obj) { qb._op = 'update'; qb._data = obj; return qb; },
      del() { qb._op = 'del'; return qb; },

      _all() {
        let result = rows.filter((r) => matches(r, qb._wheres));
        if (qb._orderBy) {
          const { col, dir } = qb._orderBy;
          const sign = dir === 'desc' ? -1 : 1;
          result = [...result].sort((a, b) => ((a[col] ?? 0) > (b[col] ?? 0) ? sign : -sign));
        }
        if (qb._limit) result = result.slice(0, qb._limit);
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
          return 0;
        }
        if (qb._op === 'del') {
          for (const r of matched) {
            const idx = rows.indexOf(r);
            if (idx >= 0) rows.splice(idx, 1);
          }
          return matched.length;
        }
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
