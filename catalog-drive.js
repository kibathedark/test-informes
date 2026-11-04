(() => {
  // shared/catalog-data.js
  var catalogFields = [
    ["code", "C\xF3digo de equipo", true, 60],
    ["rut", "RUT", true, 20],
    ["name", "Raz\xF3n social", true, 180],
    ["address", "Direcci\xF3n", true, 180],
    ["equipment", "Equipo", true, 180],
    ["serial", "Serie del equipo", false, 180],
    ["power", "Potencia", false, 180],
    ["engine", "Marca motor", false, 180],
    ["contact", "Nombre contacto", false, 180],
    ["phone", "Fono contacto", false, 50],
    ["email", "Correo contacto", false, 180],
    ["airFilter", "Filtro de aire", false, 6e3],
    ["fuelFilter", "Filtro de combustible", false, 6e3],
    ["oilFilter", "Filtro de aceite", false, 6e3],
    ["oilLitres", "Cantidad de aceite (L)", false, 30],
    ["coolantLitres", "Cantidad de refrigerante (L)", false, 30],
    ["batteryAh", "Bater\xEDa AH", false, 30],
    ["batteryCca", "Bater\xEDa CCA", false, 30],
    ["batteryQty", "Cantidad de bater\xEDas", false, 30],
    ["model", "Modelo equipo", false, 180],
    ["control", "Marca / modelo control", false, 180],
    ["engineSerial", "Serie motor", false, 180],
    ["engineModel", "Modelo motor", false, 180],
    ["coolantFilter", "Filtro de refrigerante", false, 6e3],
    ["separatorFilter", "Filtro separador", false, 6e3]
  ].map(([id, label, required, max]) => ({ id, label, required, max }));
  function catalogRut(v) {
    return String(v || "").replace(/[.\s-]/g, "").toUpperCase();
  }
  function catalogValidRut(v) {
    const s = catalogRut(v);
    if (!/^\d{7,8}[0-9K]$/.test(s)) return false;
    let sum = 0, m = 2;
    for (const c of s.slice(0, -1).split("").reverse()) {
      sum += Number(c) * m;
      m = m === 7 ? 2 : m + 1;
    }
    const n = 11 - sum % 11;
    return s.at(-1) === (n === 11 ? "0" : n === 10 ? "K" : String(n));
  }
  function catalogNormalize(rows, partial = false) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw Error("Carga de 1 a 100 equipos por archivo. Divide archivos mayores.");
    const seen = /* @__PURE__ */ new Set(), customers = /* @__PURE__ */ new Map();
    return rows.map((input, index) => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Fila " + (index + 2) + ": datos inv\xE1lidos.");
      const r = {};
      for (const f of catalogFields) {
        const v = input[f.id];
        if (v !== void 0 && typeof v !== "string" && typeof v !== "number") throw Error(`Fila ${index + 2}: ${f.label} debe ser texto o n\xFAmero, sin f\xF3rmulas.`);
        r[f.id] = String(v ?? "").trim();
        if (r[f.id].length > f.max) throw Error(`Fila ${index + 2}: ${f.label} excede ${f.max} caracteres.`);
        if (f.required && !r[f.id] && !(partial && !input.equipment && ["code", "address", "equipment"].includes(f.id))) throw Error(`Fila ${index + 2}: falta ${f.label}.`);
      }
      r.name = r.name.toUpperCase();
      r.power = r.power.replace(/kva|kw|hz|v\b/gi, (v) => v.toUpperCase());
      for (const id of catalogFilterIds) if (r[id] && !r[id].startsWith("[{")) r[id] = /^no utiliza$/i.test(r[id]) ? "No utiliza" : r[id].toUpperCase();
      r.code = r.code.toUpperCase();
      r.rut = catalogRut(r.rut);
      if (r.equipment && !/^[A-Z0-9][A-Z0-9._-]{0,59}$/.test(r.code)) throw Error("Fila " + (index + 2) + ": c\xF3digo de equipo inv\xE1lido (usa letras, n\xFAmeros, guion, punto o guion bajo).");
      if (!catalogValidRut(r.rut)) throw Error("Fila " + (index + 2) + ": RUT o d\xEDgito verificador inv\xE1lido.");
      if (r.code && seen.has(r.code)) throw Error("C\xF3digo duplicado en el archivo: " + r.code);
      if (r.code) seen.add(r.code);
      if (customers.has(r.rut) && customers.get(r.rut) !== r.name) throw Error("Un mismo RUT tiene razones sociales diferentes en el archivo.");
      customers.set(r.rut, r.name);
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) throw Error("Fila " + (index + 2) + ": correo inv\xE1lido.");
      for (const id of ["oilLitres", "coolantLitres", "batteryAh", "batteryCca", "batteryQty"]) if (r[id] && r[id] !== "No utiliza") {
        r[id] = r[id].replace(",", ".");
        if (!/^\d+(\.\d{1,3})?$/.test(r[id]) || Number(r[id]) > 1e6) throw Error("Fila " + (index + 2) + ": " + catalogFields.find((f) => f.id === id).label + " debe ser un n\xFAmero no negativo, sin unidades.");
        if (id === "batteryQty" && (!Number.isInteger(Number(r[id])) || Number(r[id]) < 1 || Number(r[id]) > 100)) throw Error("Cantidad de bater\xEDas: entero de 1 a 100.");
      }
      for (const k of catalogFilterIds) if (r[k].startsWith("[{")) {
        const parsed = catalogCleanFilters({ [k]: JSON.parse(r[k]) });
        r._filters = { ...r._filters, ...parsed };
        r[k] = parsed[k][0]?.code || "";
      }
      if (input._filters !== void 0) {
        r._filters = { ...r._filters, ...catalogCleanFilters(input._filters) };
        for (const [k, rows2] of Object.entries(r._filters)) {
          if (r[k] === "No utiliza" && rows2.length) throw Error("Un filtro No utiliza no admite referencias.");
          if (rows2.length) r[k] = rows2[0].code;
        }
      }
      if (partial && !r.equipment) {
        if (catalogReferenceIds.some((k) => r[k]) || r.serial || r.power || r.engine || r.model || r.control || r.engineSerial) throw Error("Fila " + (index + 2) + ": los datos t\xE9cnicos requieren un equipo.");
        r.code = "";
      }
      return r;
    });
  }
  var catalogReferenceIds = ["airFilter", "fuelFilter", "oilFilter", "coolantFilter", "separatorFilter", "oilLitres", "coolantLitres", "batteryAh", "batteryCca", "batteryQty"];
  var catalogFilterIds = ["airFilter", "fuelFilter", "oilFilter", "coolantFilter", "separatorFilter"];
  function catalogCleanFilters(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Filtros inv\xE1lidos.");
    const out = {};
    for (const [key, rows] of Object.entries(value)) {
      if (!catalogFilterIds.includes(key) || !Array.isArray(rows) || rows.length > 10) throw Error("Usa hasta 10 referencias por categor\xEDa de filtro.");
      out[key] = rows.map((r) => {
        if (!r || typeof r !== "object" || typeof r.code !== "string" || !["string", "number", "undefined"].includes(typeof r.qty)) throw Error("Referencia de filtro inv\xE1lida.");
        const code = r.code.trim().toUpperCase(), qty = String(r.qty ?? "").trim();
        if (code.length > 300 || qty && (!/^\d+$/.test(qty) || Number(qty) < 1 || Number(qty) > 100)) throw Error("Revisa referencia y cantidad de filtro (1 a 100).");
        if (!code && qty) throw Error("Una cantidad de filtro requiere referencia.");
        return { code, qty };
      }).filter((r) => r.code);
      if (new Set(out[key].map((r) => r.code.toUpperCase())).size !== out[key].length) throw Error("No repitas la misma referencia; utiliza su cantidad.");
    }
    return out;
  }
  function catalogFilterRows(row) {
    return Object.fromEntries(catalogFilterIds.map((k) => [k, row._filters?.[k] || (!row[k] || row[k] === "No utiliza" ? [] : [{ code: row[k], qty: "" }])]));
  }

  // shared/catalog-merge.js
  function catalogMerge(local, remote, choices = {}) {
    const conflicts = [], rows = [], seen = /* @__PURE__ */ new Set();
    const customerNames = /* @__PURE__ */ new Map();
    for (const r of local) customerNames.set(r.rut, r.name);
    remote = remote.map((r) => {
      const name = customerNames.get(r.rut);
      if (name && r.name && name !== r.name) {
        const id = "RUT:" + r.rut + ":name";
        if (!choices[id] && !conflicts.some((c) => c.id === id)) conflicts.push({ id, code: r.rut, field: "Raz\xF3n social de todos los equipos del cliente", d1: name, excel: r.name });
        return { ...r, name: choices[id] === "excel" ? r.name : name };
      }
      return r;
    });
    local = local.map((r) => {
      const choice = choices["RUT:" + r.rut + ":name"];
      return choice === "excel" ? { ...r, name: remote.find((x) => x.rut === r.rut)?.name || r.name } : r;
    });
    const key = (r) => r.equipment ? "E:" + r.code.toUpperCase() : "C:" + r.rut + ":" + (r.address || "") + ":" + (r.contact || "");
    const right = /* @__PURE__ */ new Map();
    for (const r of remote) {
      const k = key(r);
      if (right.has(k)) throw Error("Registro duplicado en Excel: " + k);
      right.set(k, r);
    }
    for (const a of local) {
      const k = key(a), b = right.get(k);
      seen.add(k);
      if (!b) {
        rows.push(structuredClone(a));
        continue;
      }
      const out = { ...a };
      for (const f of catalogFields) {
        if (catalogFilterIds.includes(f.id) || f.id === "serial") continue;
        const x = String(a[f.id] || ""), y = String(b[f.id] || "");
        if (!x && y) out[f.id] = y;
        else if (x && y && x !== y) {
          const id = k + ":" + f.id;
          if (choices[id] === "excel") out[f.id] = y;
          else if (choices[id] !== "d1") conflicts.push({ id, code: a.code || a.rut, field: f.label, d1: x, excel: y });
        }
      }
      const af = catalogFilterRows(a), bf = catalogFilterRows(b);
      out._filters = {};
      for (const f of catalogFilterIds) {
        if (a[f] === "No utiliza" || b[f] === "No utiliza") {
          const x = a[f] || "", y = b[f] || "";
          if (x && y && x !== y) {
            const id = k + ":" + f;
            if (!choices[id]) conflicts.push({ id, code: a.code, field: catalogFields.find((v) => v.id === f).label, d1: x, excel: y });
            out[f] = choices[id] === "excel" ? y : x;
          } else out[f] = x || y;
          out._filters[f] = out[f] === "No utiliza" ? [] : choices[k + ":" + f] === "excel" ? bf[f] : af[f];
          continue;
        }
        const merged = af[f].map((r) => ({ ...r }));
        for (const r of bf[f]) {
          const old = merged.find((x) => x.code.toUpperCase() === r.code.toUpperCase());
          if (!old) merged.push({ ...r });
          else if (!old.qty && r.qty) old.qty = r.qty;
          else if (old.qty && r.qty && old.qty !== r.qty) {
            const id = k + ":" + f + ":" + r.code.toUpperCase();
            if (choices[id] === "excel") old.qty = r.qty;
            else if (choices[id] !== "d1") conflicts.push({ id, code: a.code, field: f + " \xB7 " + r.code + " \xB7 cantidad", d1: old.qty, excel: r.qty });
          }
        }
        out._filters[f] = merged;
        out[f] = merged[0]?.code || a[f] || b[f] || "";
      }
      rows.push(out);
    }
    for (const b of remote) if (!seen.has(key(b))) rows.push(structuredClone(b));
    return { rows, conflicts };
  }
  function catalogResolveNames(rows, choices = {}) {
    const groups = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (!groups.has(r.rut)) groups.set(r.rut, /* @__PURE__ */ new Set());
      if (r.name) groups.get(r.rut).add(r.name);
    }
    const conflicts = [];
    for (const [rut, names] of groups) {
      if (names.size > 1 && !names.has(choices[rut])) conflicts.push({ rut, names: [...names] });
    }
    return { conflicts, rows: rows.map((r) => ({ ...r, name: groups.get(r.rut).has(choices[r.rut]) ? choices[r.rut] : r.name })) };
  }

  // shared/catalog-excel.js
  var catalogHeader = (s) => String(s || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
  function catalogReadWorkbook(workbook, partial = false, max = 100, raw = false) {
    const sheet = workbook.getWorksheet("Equipos");
    if (!sheet) throw Error("Falta la hoja Equipos. Utiliza la plantilla Genset.");
    const headers = /* @__PURE__ */ new Map(), known = new Map(catalogFields.map((f) => [catalogHeader(f.label), f.id]));
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      if (typeof cell.value !== "string") throw Error("Los encabezados deben ser texto.");
      const key = catalogHeader(cell.value);
      if (["tipo de aceite", "tipo de refrigerante", "otros datos de consulta"].includes(key)) {
        headers.set(col, "ignored");
        return;
      }
      const id = known.get(key);
      if (!id) throw Error("Columna desconocida: " + cell.value);
      if ([...headers.values()].includes(id)) throw Error("Columna repetida: " + cell.value);
      headers.set(col, id);
    });
    for (const f of catalogFields.filter((f2) => f2.required)) if (![...headers.values()].includes(f.id)) throw Error("Falta la columna " + f.label + ".");
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, n) => {
      if (n === 1) return;
      const values = {};
      let filled = false;
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        if (cell.isMerged) throw Error("Fila " + n + ": no se admiten celdas combinadas.");
        const v = cell.value;
        if (v === null || v === void 0 || v === "") return;
        const id = headers.get(col);
        if (id === "ignored") return;
        if (!id) throw Error("Fila " + n + ": hay datos en una columna sin encabezado.");
        if (typeof v !== "string" && typeof v !== "number") throw Error("Fila " + n + ": " + id + " debe ser texto o n\xFAmero. No se admiten f\xF3rmulas, fechas, enlaces ni celdas combinadas.");
        values[id] = v;
        if (String(v).trim()) filled = true;
      });
      if (filled) {
        rows.push(values);
        if (rows.length > max) throw Error("M\xE1ximo 100 equipos por archivo. Divide la carga en archivos menores.");
      }
    });
    if (partial) {
      const pending = workbook.getWorksheet("Pendientes");
      if (pending) {
        const copy = new workbook.constructor();
        copy.addWorksheet("Equipos");
        pending.eachRow({ includeEmpty: false }, (row, n) => copy.getWorksheet("Equipos").getRow(n).values = row.values);
        rows.push(...catalogReadWorkbook(copy, true, max, raw).map((r) => r));
      }
    }
    if (raw) return rows;
    return rows.length > 100 ? rows.flatMap((_, i) => i % 100 ? [] : catalogNormalize(rows.slice(i, i + 100), partial)) : catalogNormalize(rows, partial);
  }

  // ui/catalog-drive.js
  (function() {
    let cfg, proposal = null, pendingWrite = null, pendingKey = "";
    const $ = (id) => document.getElementById(id), status = (t) => $("driveCatalogStatus").textContent = t;
    async function rows() {
      return cfg.api("master/catalog-drive/rows");
    }
    async function writeWorkbook(data, remote2) {
      const book = new window.ExcelJS.Workbook(), sheet = book.addWorksheet("Equipos");
      sheet.addRow(catalogFields.map((f) => f.label));
      for (const r of data.rows) sheet.addRow(catalogFields.map((f) => catalogFilterIds.includes(f.id) && r._filters?.[f.id]?.length ? JSON.stringify(r._filters[f.id]) : String(r[f.id] || "")));
      sheet.getRow(1).font = { bold: true };
      for (const c of sheet.columns) c.width = 24;
      sheet.getColumn(catalogFields.findIndex((f) => f.id === "serial") + 1).hidden = true;
      const bytes = new Uint8Array(await book.xlsx.writeBuffer());
      let text = "";
      for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      pendingWrite = { data: btoa(text), revision: data.revision, item: remote2?.item || "", etag: remote2?.etag || "" };
      if (pendingKey) await window.GensetDrafts.save(pendingKey, pendingWrite);
      await flushWrite();
    }
    async function flushWrite() {
      await cfg.api("master/catalog-drive/write", { method: "POST", body: JSON.stringify(pendingWrite) });
      pendingWrite = null;
      if (pendingKey) await window.GensetDrafts.remove(pendingKey);
      $("driveCatalogConfirm").hidden = true;
      $("driveCatalogConfirm").textContent = "Confirmar sincronizaci\xF3n";
    }
    async function remote() {
      const d = await cfg.api("master/catalog-drive/read");
      if (!d.exists) return { ...d, rows: [] };
      const book = new window.ExcelJS.Workbook();
      await book.xlsx.load(Uint8Array.from(atob(d.data), (c) => c.charCodeAt(0)));
      return { ...d, rows: catalogReadWorkbook(book, true, 1e4, true).flatMap((r) => catalogNormalize([r], true)) };
    }
    function render() {
      const box = $("driveCatalogConflicts");
      box.replaceChildren();
      const names = catalogResolveNames(proposal.remote.rows, proposal.names);
      if (names.conflicts.length) {
        for (const c of names.conflicts) {
          const label = document.createElement("label");
          label.textContent = "RUT " + c.rut + " tiene varios nombres en Excel. Elige la raz\xF3n social para todas sus direcciones y equipos: ";
          const select = document.createElement("select");
          select.add(new Option("Selecciona la raz\xF3n social", ""));
          for (const name of c.names) select.add(new Option(name, name));
          select.onchange = () => {
            proposal.names[c.rut] = select.value;
            render();
          };
          label.append(select);
          box.append(label);
        }
        $("driveCatalogConfirm").hidden = true;
        status("Unifica los nombres del mismo RUT. Luego podr\xE1s confirmar el cambio respecto de D1.");
        return;
      }
      const merged = catalogMerge(proposal.local.rows, names.rows, proposal.choices);
      for (const c of merged.conflicts) {
        const label = document.createElement("label");
        label.textContent = c.code + " \xB7 " + c.field + " \u2014 D1: " + c.d1 + " / Excel: " + c.excel;
        const select = document.createElement("select");
        select.add(new Option("Selecciona qu\xE9 conservar", ""));
        select.add(new Option("Conservar D1", "d1"));
        select.add(new Option("Conservar Excel", "excel"));
        select.onchange = () => {
          proposal.choices[c.id] = select.value;
          render();
        };
        label.append(select);
        box.append(label);
      }
      proposal.merged = merged.rows;
      $("driveCatalogConfirm").hidden = merged.conflicts.length > 0;
      status(merged.conflicts.length ? merged.conflicts.length + " diferencias requieren una decisi\xF3n." : merged.rows.length + " registros combinados. Vac\xEDos y filas ausentes no eliminan datos. Confirma para actualizar D1 y Excel.");
    }
    async function task(b, fn) {
      b.disabled = true;
      try {
        await fn();
      } catch (e) {
        status(e.message + (pendingWrite ? " D1 conserva sus datos. Cierra el Excel y pulsa Reintentar guardar Excel. Si cambi\xF3 alguna base, vuelve a previsualizar." : " No se borraron datos."));
        if (pendingWrite) {
          $("driveCatalogConfirm").hidden = false;
          $("driveCatalogConfirm").textContent = "Reintentar guardar Excel";
        }
      } finally {
        b.disabled = false;
      }
    }
    window.GensetCatalogDrive = { init(options) {
      cfg = options;
      $("driveCatalogExport").onclick = () => task($("driveCatalogExport"), async () => {
        if (!confirm("\xBFCrear el Excel de respaldo en la carpeta seleccionada?")) return;
        await writeWorkbook(await rows());
        status("Excel creado en OneDrive.");
      });
      $("driveCatalogSync").onclick = () => task($("driveCatalogSync"), async () => {
        proposal = { local: await rows(), remote: await remote(), choices: {}, names: {} };
        pendingWrite = null;
        if (pendingKey) await window.GensetDrafts.remove(pendingKey);
        $("driveCatalogConfirm").textContent = "Confirmar sincronizaci\xF3n";
        render();
      });
      $("driveCatalogConfirm").onclick = () => task($("driveCatalogConfirm"), async () => {
        if (pendingWrite) {
          await flushWrite();
          proposal = null;
          status("Excel actualizado con los datos ya guardados en D1.");
          return;
        }
        if (!proposal || !confirm("\xBFAplicar la combinaci\xF3n revisada a D1 y actualizar el Excel?")) return;
        const original = await rows();
        if (original.revision !== proposal.local.revision) throw Error("D1 cambi\xF3; vuelve a previsualizar.");
        const currentRemote = await remote();
        if (currentRemote.item !== proposal.remote.item || currentRemote.etag !== proposal.remote.etag) throw Error("Excel cambi\xF3; vuelve a previsualizar.");
        for (let i = 0; i < proposal.merged.length; i += 100) {
          const batch = proposal.merged.slice(i, i + 100), preview = await cfg.api("catalog/preview", { method: "POST", body: JSON.stringify({ rows: batch, update: true, partial: true }) });
          await cfg.api("catalog/commit", { method: "POST", body: JSON.stringify({ id: crypto.randomUUID(), rows: batch, update: true, partial: true, digest: preview.digest }) });
          status("D1 actualizado: " + Math.min(i + 100, proposal.merged.length) + " / " + proposal.merged.length);
        }
        await writeWorkbook(await rows(), proposal.remote);
        proposal = null;
        $("driveCatalogConfirm").hidden = true;
        $("driveCatalogConflicts").replaceChildren();
        status("D1 y Excel actualizados.");
      });
    }, async folder(kind, id, label) {
      await cfg.api("master/catalog-drive/settings", { method: "POST", body: JSON.stringify({ kind: kind === "apk" ? "apk_folder" : "folder", folder: id }) });
      $(kind === "apk" ? "apkFolderLabel" : "catalogFolderLabel").textContent = label || id;
      if (kind !== "apk") {
        pendingWrite = null;
        proposal = null;
        $("driveCatalogConfirm").hidden = true;
        await this.load();
      }
    }, async load() {
      const s = await cfg.api("master/catalog-drive/settings");
      pendingKey = "genset-training-drive-write:" + String(cfg.user?.() || "") + ":" + s.connection + ":" + s.folder;
      pendingWrite = await window.GensetDrafts.read(pendingKey);
      if (pendingWrite) {
        $("driveCatalogConfirm").hidden = false;
        $("driveCatalogConfirm").textContent = "Reintentar guardar Excel";
        status("Hay un guardado de Excel pendiente. Cierra el archivo y reintenta; si hubo otros cambios, vuelve a previsualizar.");
      }
      $("catalogFolderLabel").textContent = s.folder ? "Carpeta: " + s.folder + " \xB7 \xFAltima actualizaci\xF3n " + (s.updated || "pendiente") : "Sin seleccionar";
      $("apkFolderLabel").textContent = s.apk_folder || "Sin seleccionar";
    } };
  })();
})();
