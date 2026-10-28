/* J·Study 기록장 — Supabase 연결 계층
   앱 본문(index.html)은 collection()/doc()/onSnapshot() 형태로 저장소를 부른다.
   이 파일이 그 호출을 Supabase(Postgres) 테이블로 옮겨 준다. */
(function () {
  const C = window.JSTUDY_CONFIG;
  const sb = window.supabase.createClient(C.url, C.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // 앱 필드명 ↔ DB 컬럼명
  const SPECIAL = { check: "check_status", order: "ord" };
  const SPECIAL_R = { check_status: "check", ord: "order" };
  const toCol = k => SPECIAL[k] || k.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
  const toKey = c => SPECIAL_R[c] || c.replace(/_([a-z])/g, (_, m) => m.toUpperCase());
  // 날짜·uuid·숫자 컬럼은 빈 문자열을 null로 저장
  const TYPED = new Set(["date", "checked_at", "checked_by", "alert_date", "created_by", "edited_by",
    "updated_by", "by", "created_at", "edited_at", "updated_at", "at", "grade_year", "alert_days", "student_id"]);
  const KEEP_NULL = new Set(["alertDays", "gradeYear"]);

  function toRow(obj) {
    const r = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || k === "id") continue;
      const c = toCol(k);
      r[c] = (v === "" && TYPED.has(c)) ? null : v;
    }
    return r;
  }
  function fromRow(row) {
    const o = {};
    for (const [c, v] of Object.entries(row)) {
      const k = toKey(c);
      o[k] = (v === null && !KEEP_NULL.has(k)) ? "" : v;
    }
    return o;
  }
  function wrapErr(error) {
    const e = new Error(error.message || "db");
    e.code = (error.code === "42501" || /row-level security|permission/i.test(error.message || "")) ? "permission_denied" : (error.code || "unknown");
    return e;
  }

  // 테이블별 구독: 처음 전체 조회 + 변경 알림이 오면 다시 조회
  const subs = {};   // table -> {cbs:Set, timer, channel}
  async function fetchTable(table) {
    const all = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select("*").range(from, from + 999);
      if (error) throw wrapErr(error);
      all.push(...data);
      if (data.length < 1000) break;
    }
    return all;
  }
  function snapOf(rows, idCol) {
    return { docs: rows.map(r => ({ id: String(r[idCol]), data: () => { const o = fromRow(r); delete o.id; delete o.key; return o; } })) };
  }
  function refresh(table) {
    const s = subs[table]; if (!s) return;
    clearTimeout(s.timer);
    s.timer = setTimeout(async () => {
      try { const rows = await fetchTable(table); s.last = rows; s.cbs.forEach(cb => cb.ok(rows)); }
      catch (e) { s.cbs.forEach(cb => cb.err && cb.err(e)); }
    }, 120);
  }
  function subscribe(table, ok, err) {
    let s = subs[table];
    if (!s) {
      s = subs[table] = { cbs: new Set(), timer: null };
      s.channel = sb.channel("rt-" + table)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => refresh(table))
        .subscribe();
    }
    const cb = { ok, err };
    s.cbs.add(cb);
    if (s.last) ok(s.last); else refresh(table);
    return () => s.cbs.delete(cb);
  }
  // 창으로 돌아오면 전체 새로고침 (실시간 연결이 끊겼던 경우 대비)
  document.addEventListener("visibilitychange", () => { if (!document.hidden) Object.keys(subs).forEach(refresh); });

  const db = {
    collection(table) {
      return {
        async add(data) {
          const { data: row, error } = await sb.from(table).insert(toRow(data)).select("id").single();
          if (error) throw wrapErr(error);
          refresh(table);
          return { id: String(row.id) };
        },
        onSnapshot(ok, err) { return subscribe(table, rows => ok(snapOf(rows, "id")), err); },
      };
    },
    doc(path) {
      const [table, id] = path.split("/");
      if (table === "config") {
        return {
          async set(value) {
            const { error } = await sb.from("config").upsert({ key: id, value });
            if (error) throw wrapErr(error);
            refresh("config");
          },
          onSnapshot(ok, err) {
            return subscribe("config", rows => {
              const r = rows.find(x => x.key === id);
              ok({ exists: !!r, data: () => (r ? r.value : undefined) });
            }, err);
          },
        };
      }
      const run = async q => {
        const { data, error } = await q.select("id");
        if (error) throw wrapErr(error);
        if (!data || !data.length) { const e = new Error("no row"); e.code = "permission_denied"; throw e; }
        refresh(table);
      };
      return {
        update: data => run(sb.from(table).update(toRow(data)).eq("id", id)),
        set: data => run(sb.from(table).upsert({ id, ...toRow(data) })),
        delete: () => run(sb.from(table).delete().eq("id", id)),
      };
    },
  };

  window.JDB = { sb, db };
})();
