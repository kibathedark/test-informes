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

  // ui/catalog-filters.js
  var node = (tag, text) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    return n;
  };
  function filterEditor(host, row, locked = false, onChange = () => {
  }, protectedRow = row) {
    const groups = catalogFilterRows(row), original = catalogFilterRows(protectedRow), none = new Set(catalogFilterIds.filter((k) => row[k] === "No utiliza"));
    const render = () => {
      host.replaceChildren();
      for (const key of catalogFilterIds) {
        const group = node("section"), title = node("h3", catalogFields.find((f) => f.id === key).label);
        group.append(title);
        if (none.has(key)) {
          group.append(node("p", "No utiliza"));
          if (!locked) {
            const use = node("button", "Agregar referencia");
            use.type = "button";
            use.onclick = () => {
              none.delete(key);
              groups[key] = [{ code: "", qty: "" }];
              onChange();
              render();
            };
            group.append(use);
          }
        } else {
          groups[key].forEach((r, i) => {
            const line = node("div");
            line.className = "grid";
            for (const [field, caption] of [["code", "C\xF3digo / referencia"], ["qty", "Cantidad (opcional)"]]) {
              const label = node("label", caption), input = node("input");
              input.value = r[field];
              input.maxLength = field === "code" ? 300 : 3;
              input.readOnly = locked && i < original[key].length && (field === "code" || Boolean(original[key][i].qty));
              if (field === "qty") {
                input.type = "number";
                input.min = 1;
                input.max = 100;
                input.step = 1;
              }
              input.oninput = () => {
                if (field === "code") input.value = input.value.toUpperCase();
                r[field] = input.value;
                onChange();
              };
              label.append(input);
              line.append(label);
            }
            if (!locked || i >= original[key].length) {
              const remove = node("button", "Eliminar");
              remove.type = "button";
              remove.onclick = () => {
                groups[key].splice(i, 1);
                onChange();
                render();
              };
              line.append(remove);
            }
            group.append(line);
          });
          const add = node("button", "+ Agregar otro filtro");
          add.type = "button";
          add.disabled = groups[key].length >= 10;
          add.onclick = () => {
            groups[key].push({ code: "", qty: "" });
            onChange();
            render();
          };
          group.append(add);
        }
        host.append(group);
      }
    };
    render();
    return () => {
      const values = catalogCleanFilters(groups);
      return { _filters: values, ...Object.fromEntries(catalogFilterIds.map((k) => [k, none.has(k) ? "No utiliza" : values[k][0]?.code || ""])) };
    };
  }
  async function editFilters(cfg2, id, proposed = null) {
    const data = await cfg2.api("catalog/equipment/" + encodeURIComponent(id));
    await cfg2.beforePopup?.();
    const dialog = node("dialog"), form = node("form"), host = node("div"), status2 = node("p");
    dialog.style.cssText = "width:calc(100% - 32px);max-width:760px;max-height:90dvh;overflow:auto";
    let attempt2 = null;
    const widgetRow = { ...data.row, _filters: catalogFilterRows(data.row) };
    const protectedRow = JSON.parse(JSON.stringify(widgetRow));
    if (proposed) for (const key of catalogFilterIds) {
      if (data.row[key] === "No utiliza") continue;
      for (const ref of proposed[key] || []) {
        const existing = widgetRow._filters[key].find((r) => r.code === ref.code);
        if (existing) {
          if (!existing.qty) existing.qty = ref.qty;
        } else widgetRow._filters[key].push({ ...ref });
      }
    }
    const read = filterEditor(host, widgetRow, !data.canEdit, () => attempt2 = null, protectedRow);
    const save = node("button", "Guardar filtros"), close = node("button", "Cerrar");
    save.type = "submit";
    close.type = "button";
    close.onclick = () => {
      dialog.close();
      dialog.remove();
    };
    form.append(node("h2", "Filtros \xB7 " + data.row.code), node("p", "Las referencias adicionales son opcionales. Si el c\xF3digo es igual, utiliza su cantidad."), host, status2, save, close);
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    form.onsubmit = async (e) => {
      e.preventDefault();
      save.disabled = true;
      close.disabled = true;
      try {
        if (!attempt2) attempt2 = { id: crypto.randomUUID(), revision: data.revision, filters: read()._filters };
        await cfg2.api("catalog/equipment/" + encodeURIComponent(id) + "/filters", { method: "POST", body: JSON.stringify(attempt2) });
        dialog.close();
        dialog.remove();
        await cfg2.afterFilters?.(id);
      } catch (e2) {
        status2.textContent = e2.message;
      } finally {
        save.disabled = false;
        close.disabled = false;
      }
    };
  }

  // ui/catalog-complete.js
  var make = (tag, text) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    return n;
  };
  function choose(text, choices) {
    return new Promise((resolve) => {
      const d = make("dialog"), p = make("p", text), actions = make("div");
      actions.className = "actions";
      d.append(p, actions);
      for (const [value, label] of choices) {
        const b = make("button", label);
        b.onclick = () => {
          d.close();
          d.remove();
          resolve(value);
        };
        actions.append(b);
      }
      d.oncancel = (e) => {
        e.preventDefault();
        d.close();
        d.remove();
        resolve("pending");
      };
      document.body.append(d);
      d.showModal();
    });
  }
  function catalogSurveyValues(snapshot) {
    if (snapshot?.reportType !== "levantamiento") return {};
    const survey = snapshot.survey || {}, out = { _filters: {} };
    for (const [key, field] of [["aceite", "oilLitres"], ["refrigerante", "coolantLitres"]]) if (survey[key]?.trim()) out[field] = survey[key].trim();
    for (const [key, field] of [["aceite", "oilFilter"], ["aire", "airFilter"], ["combustible", "fuelFilter"], ["refrigerante", "coolantFilter"]]) {
      const f = survey.filters?.[key];
      if (f?.none === true) out[field] = "No utiliza";
      else {
        const codes = f?.rows?.map((r) => r.code.trim()).filter(Boolean) || [];
        if (codes.length) {
          const grouped = /* @__PURE__ */ new Map();
          for (const r of f.rows.filter((r2) => r2.code.trim())) {
            const code = r.code.trim(), key2 = code.toUpperCase(), qty = String(r.qty || ""), prior = grouped.get(key2);
            if (!prior) grouped.set(key2, { code, qty });
            else prior.qty = /^\d+$/.test(prior.qty) && /^\d+$/.test(qty) ? String(Number(prior.qty) + Number(qty)) : "";
          }
          const refs = [...grouped.values()];
          out[field] = refs[0].code;
          out._filters[field] = refs;
        }
      }
    }
    const batteries = survey.batteries?.filter((b) => b.ah || b.cca || b.qty) || [];
    if (batteries.length === 1) {
      for (const [key, field] of [["ah", "batteryAh"], ["cca", "batteryCca"], ["qty", "batteryQty"]]) if (batteries[0][key]) out[field] = String(batteries[0][key]);
    }
    return out;
  }
  function catalogComplete(cfg2, data, proposed = {}) {
    return new Promise((resolve) => {
      const dialog = make("dialog"), form = make("form"), title = make("h2", "Ficha del generador \xB7 " + data.row.code), hint = make("p", "Completa los espacios destacados. Los datos existentes est\xE1n protegidos."), msg = make("p"), inputs = {}, none = /* @__PURE__ */ new Set();
      dialog.className = "catalog-completion";
      dialog.style.cssText = "width:calc(100% - 32px);max-width:760px;max-height:90dvh;overflow:auto";
      form.append(title, hint);
      let differences = [];
      for (const f of catalogFields.filter((f2) => f2.id !== "serial")) {
        const l = make("label", f.label), input = make("input");
        input.value = data.row[f.id] || "";
        input.readOnly = Boolean(input.value) || f.required;
        input.maxLength = f.max;
        input.required = f.required;
        input.dataset.field = f.id;
        if (["airFilter", "fuelFilter", "oilFilter", "coolantFilter", "separatorFilter"].includes(f.id)) input.addEventListener("input", () => {
          input.value = input.value.toUpperCase();
        });
        if (!input.readOnly) {
          l.className = "catalog-missing";
          l.style.cssText = "padding:10px;background:#fff5ce;border-left:4px solid #c29b1d;border-radius:6px";
          if (proposed[f.id] && proposed[f.id] !== "No utiliza") input.value = proposed[f.id];
        } else if (proposed[f.id] && proposed[f.id] !== input.value) differences.push(f.label);
        l.append(input);
        form.append(l);
        inputs[f.id] = input;
      }
      if (differences.length) form.append(make("p", "El levantamiento difiere de las referencias guardadas en: " + differences.join(", ") + ". El Administrador puede revisar esos cambios."));
      const save = make("button", "Guardar ficha"), cancel = make("button", "Continuar sin guardar"), actions = make("div");
      actions.className = "actions";
      save.type = "submit";
      cancel.type = "button";
      actions.append(save, cancel);
      form.append(msg, actions);
      dialog.append(form);
      document.body.append(dialog);
      let posting = false, attempt2 = null;
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      cancel.onclick = () => {
        if (!posting) finish(false);
      };
      dialog.oncancel = (e) => {
        e.preventDefault();
        if (!posting) finish(false);
      };
      for (const input of Object.values(inputs)) input.oninput = () => {
        attempt2 = null;
        none.delete(input.dataset.field);
      };
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (posting) return;
        posting = true;
        save.disabled = true;
        cancel.disabled = true;
        try {
          if (!attempt2) {
            for (const id of catalogReferenceIds) {
              const input = inputs[id];
              if (input.readOnly || input.value.trim()) continue;
              const f = catalogFields.find((f2) => f2.id === id), decision = await choose("Ha dejado " + f.label.toLowerCase() + " en blanco. \xBFDesea completar la informaci\xF3n o el equipo no utiliza?", [["fill", "Completar informaci\xF3n"], ["none", "El equipo no utiliza"], ["pending", "Dejar pendiente"]]);
              if (decision === "fill") {
                input.focus();
                input.scrollIntoView({ block: "center" });
                return;
              }
              if (decision === "none") {
                input.value = "No utiliza";
                none.add(id);
              }
            }
            for (const id of catalogReferenceIds) {
              const input = inputs[id];
              if (!input.readOnly && input.value.trim() === "No utiliza" && !none.has(id)) {
                const answer = await choose("\xBFConfirma que el equipo no utiliza " + catalogFields.find((f) => f.id === id).label.toLowerCase() + "?", [["none", "Confirmar No utiliza"], ["fill", "Revisar informaci\xF3n"]]);
                if (answer !== "none") {
                  input.focus();
                  return;
                }
                none.add(id);
              }
            }
            const values = Object.fromEntries(Object.entries(inputs).filter(([, n]) => !n.readOnly && n.value.trim()).map(([k, n]) => [k, n.value.trim()]));
            if (!Object.keys(values).length) {
              finish(false);
              return;
            }
            attempt2 = { id: crypto.randomUUID(), revision: data.revision, values, none: [...none] };
          }
          msg.textContent = "Guardando ficha\u2026";
          for (const input of Object.values(inputs)) input.disabled = true;
          await cfg2.api("catalog/equipment/" + encodeURIComponent(data.id) + "/complete", { method: "POST", body: JSON.stringify(attempt2) });
          finish(true);
        } catch (e) {
          msg.textContent = e.message + " Puedes reintentar o continuar sin guardar.";
        } finally {
          posting = false;
          for (const input of Object.values(inputs)) input.disabled = false;
          save.disabled = false;
          cancel.disabled = false;
        }
      };
      dialog.showModal();
    });
  }
  async function catalogOffer(cfg2, id, snapshot = null) {
    if (!id) return false;
    let data;
    try {
      data = await cfg2.api("catalog/equipment/" + encodeURIComponent(id));
    } catch (e) {
      cfg2.notify?.("No se pudo consultar la ficha. Puedes continuar el informe y completarla cuando tengas conexi\xF3n.");
      return false;
    }
    const proposal = catalogSurveyValues(snapshot), missing = catalogReferenceIds.some((k) => !data.row[k]), hasProposal = Object.entries(proposal).some(([k, v]) => !data.row[k] && v);
    const hasFilters = proposal._filters && Object.values(proposal._filters).some((rows) => rows.length);
    if (!missing && !hasProposal && !hasFilters) {
      if (snapshot) cfg2.notify?.("La ficha ya est\xE1 completa. Las modificaciones de datos existentes deben revisarse con el Administrador.");
      return false;
    }
    await cfg2.beforePopup?.();
    const decision = await choose(snapshot ? "\xBFQuieres actualizar la ficha del generador con los datos del levantamiento?" : "Este generador tiene datos de referencia pendientes: \xBFQuieres completarlos?", [["yes", "Completar ficha"], ["pending", "Continuar con el informe"]]);
    if (decision !== "yes") return false;
    if (!missing && hasFilters) {
      await editFilters(cfg2, id, proposal._filters);
      return false;
    }
    const saved = await catalogComplete(cfg2, data, proposal);
    if (saved && hasFilters) await editFilters(cfg2, id, proposal._filters);
    return saved;
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
      const pending2 = workbook.getWorksheet("Pendientes");
      if (pending2) {
        const copy = new workbook.constructor();
        copy.addWorksheet("Equipos");
        pending2.eachRow({ includeEmpty: false }, (row, n) => copy.getWorksheet("Equipos").getRow(n).values = row.values);
        rows.push(...catalogReadWorkbook(copy, true, max, raw).map((r) => r));
      }
    }
    if (raw) return rows;
    return rows.length > 100 ? rows.flatMap((_, i) => i % 100 ? [] : catalogNormalize(rows.slice(i, i + 100), partial)) : catalogNormalize(rows, partial);
  }

  // ui/catalog.js
  var el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  var cfg;
  var pending = null;
  var attempt = null;
  var consultVersion = 0;
  var busy = false;
  var panel = () => document.getElementById("catalogPanel");
  function status(text, error = false) {
    const n = document.getElementById("catalogStatus");
    n.textContent = text;
    n.style.color = error ? "#a12020" : "";
  }
  function controls(disabled) {
    busy = disabled;
    for (const b of panel().querySelectorAll("button,input")) b.disabled = disabled;
  }
  async function task(fn) {
    if (busy) return;
    controls(true);
    try {
      await fn();
    } catch (e) {
      status(e.message, true);
    } finally {
      controls(false);
      const save = document.getElementById("catalogCommit");
      if (save) save.disabled = !pending;
    }
  }
  async function download(blob, name) {
    if (window.GensetNative) return window.GensetNative.savePdf(blob, name);
    const url = URL.createObjectURL(blob), a = el("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function reset() {
    pending = null;
    attempt = null;
    const p = document.getElementById("catalogPreview");
    if (p) p.replaceChildren();
    const b = document.getElementById("catalogCommit");
    if (b) b.disabled = true;
  }
  function displayPreview(result, rows, update) {
    pending = { ...result, rows, update };
    attempt = { id: crypto.randomUUID(), digest: result.digest, rows, update };
    const area = document.getElementById("catalogPreview");
    area.replaceChildren(el("p", `${result.counts.created} nuevos \xB7 ${result.counts.updated} actualizaciones \xB7 ${result.counts.unchanged} sin cambios.`));
    for (const a of result.actions) {
      const row = el("div", "", "selection");
      row.append(el("strong", a.code + " \xB7 " + a.equipment), el("p", a.action + " \xB7 RUT " + a.rut + " \xB7 " + a.address));
      if (a.changes.length) row.append(el("p", "Cambiar\xE1: " + a.changes.join(", ")));
      if (a.previousAddress && a.previousAddress !== a.address) row.append(el("p", "Direcci\xF3n anterior: " + a.previousAddress));
      if (a.clientNameChanged) row.append(el("p", "La raz\xF3n social se actualizar\xE1 para todos los equipos de este RUT."));
      area.append(row);
    }
    status("Revisa la lista y confirma la carga.");
  }
  async function preview(rows, update, partial = false) {
    reset();
    const result = await cfg.api("catalog/preview", { method: "POST", body: JSON.stringify({ rows, update, partial }) });
    displayPreview(result, rows, update);
    attempt.partial = partial;
  }
  async function customerNames(rows) {
    const groups = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const rut = String(row.rut || "").replace(/[.\s-]/g, "").toUpperCase();
      if (!groups.has(rut)) groups.set(rut, []);
      groups.get(rut).push(row);
    }
    for (const [rut, group] of groups) {
      const names = [...new Set(group.map((r) => String(r.name || "").trim()))];
      const existing = (await cfg.api("clients?rut=" + encodeURIComponent(rut)))[0];
      if (existing && !names.includes(existing.name)) names.unshift(existing.name);
      if (names.length < 2) continue;
      const chosen = await new Promise((resolve, reject) => {
        const d = el("dialog"), title = el("h2", "Raz\xF3n social \xB7 RUT " + rut), text = el("p", "Hay nombres diferentes para este RUT. Selecciona uno para todos sus equipos y contactos."), select = el("select");
        for (const name of names) select.add(new Option(name, name));
        const save = el("button", "Usar este nombre"), cancel = el("button", "Cancelar");
        d.append(title, text, select, save, cancel);
        document.body.append(d);
        save.onclick = () => {
          const value = select.value;
          d.remove();
          resolve(value);
        };
        cancel.onclick = () => {
          d.remove();
          reject(Error("Importaci\xF3n cancelada."));
        };
        d.oncancel = () => {
          d.remove();
          reject(Error("Importaci\xF3n cancelada."));
        };
        d.showModal();
      });
      for (const row of group) row.name = chosen;
    }
    return rows;
  }
  function importPanel() {
    reset();
    const root = panel();
    root.replaceChildren();
    root.append(el("p", "Se admiten clientes y contactos sin direcci\xF3n ni equipo, incluyendo la hoja Pendientes. Una fila por generador cuando se conoce el equipo. Los c\xF3digos distinguen generadores del mismo cliente y direcci\xF3n. Los datos t\xE9cnicos se guardan para consulta; no se a\xF1aden autom\xE1ticamente al informe."));
    const actions = el("div", "", "actions"), template = el("button", "Descargar plantilla Excel"), exportBtn = el("button", "Exportar cat\xE1logo (CSV)"), newBtn = el("button", "+ Nuevo equipo con ficha");
    newBtn.onclick = () => edit(Object.fromEntries(catalogFields.map((f) => [f.id, ""])), true);
    actions.append(template, exportBtn, newBtn);
    root.append(actions);
    template.onclick = () => task(async () => {
      const r = await fetch(window.GensetNative ? "Genset-Catalogo.xlsx" : "/Genset-Catalogo.xlsx");
      if (!r.ok) throw Error("Plantilla no disponible.");
      const book = new window.ExcelJS.Workbook();
      await book.xlsx.load(await r.arrayBuffer());
      for (const sheet of book.worksheets) {
        if (!["Equipos", "Ejemplo", "Pendientes"].includes(sheet.name)) continue;
        let hasModel = false;
        sheet.getRow(1).eachCell((cell, col) => {
          if (cell.value === "Serie del equipo") sheet.getColumn(col).hidden = true;
          if (cell.value === "Modelo motor") hasModel = true;
        });
        if (!hasModel) {
          const col = sheet.columnCount + 1;
          sheet.getCell(1, col).value = "Modelo motor";
          sheet.getCell(1, col).font = { bold: true };
          sheet.getColumn(col).width = 24;
        }
      }
      await download(new Blob([await book.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Genset-Catalogo.xlsx");
    });
    exportBtn.onclick = () => task(async () => {
      const data = await cfg.api("catalog/export");
      if (!data.rows.length) throw Error("No hay equipos para exportar.");
      const safe = (v) => {
        let t = String(v ?? "");
        if (/^[=+@-]/.test(t)) t = "'" + t;
        return '"' + t.replaceAll('"', '""') + '"';
      };
      const csv = "\uFEFF" + [catalogFields.filter((f) => f.id !== "serial").map((f) => safe(f.label)).join(";"), ...data.rows.map((r) => catalogFields.filter((f) => f.id !== "serial").map((f) => safe(catalogFilterIds.includes(f.id) && r._filters?.[f.id]?.length ? JSON.stringify(r._filters[f.id]) : r[f.id])).join(";"))].join("\r\n");
      await download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "Genset-Catalogo.csv");
      status("Cat\xE1logo exportado. \xC1brelo en Excel y guarda como .xlsx en una hoja llamada Equipos para volver a importarlo.");
    });
    const label = el("label", "Archivo Excel (.xlsx, m\xE1ximo 5 MB y 100 equipos)"), file = el("input");
    file.type = "file";
    file.accept = ".xlsx";
    file.id = "catalogFile";
    label.append(file);
    root.append(label);
    const checkLabel = el("label", ""), check = el("input");
    check.type = "checkbox";
    check.id = "catalogUpdate";
    check.style.width = "auto";
    checkLabel.append(check, document.createTextNode(" Actualizar los equipos existentes"));
    root.append(checkLabel, el("p", "Las celdas vac\xEDas conservan los datos actuales. No se eliminan equipos. Exporta primero el cat\xE1logo para conocer los c\xF3digos existentes."));
    const buttons = el("div", "", "actions"), read = el("button", "Previsualizar Excel"), commit = el("button", "Confirmar importaci\xF3n", "primary");
    commit.id = "catalogCommit";
    commit.disabled = true;
    buttons.append(read, commit);
    root.append(buttons, el("p", "", "muted"), el("div"));
    root.lastElementChild.id = "catalogPreview";
    root.children[root.children.length - 2].id = "catalogStatus";
    file.onchange = () => {
      reset();
      status("");
    };
    check.onchange = () => {
      reset();
      status("Previsualiza otra vez para aplicar esta opci\xF3n.");
    };
    read.onclick = () => task(async () => {
      reset();
      const f = file.files[0];
      if (!f) throw Error("Selecciona un archivo Excel.");
      if (!/\.xlsx$/i.test(f.name) || f.size > 5 * 1024 * 1024) throw Error("Utiliza .xlsx de hasta 5 MB.");
      status("Leyendo el archivo\u2026");
      const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(await f.arrayBuffer());
      await preview(await customerNames(catalogReadWorkbook(workbook, true, 100, true)), check.checked, true);
    });
    commit.onclick = () => task(async () => {
      if (!pending || !attempt) return;
      if (!confirm("\xBFGuardar los cambios de esta vista previa en D1?")) return;
      const result = await cfg.api("catalog/commit", { method: "POST", body: JSON.stringify(attempt) });
      reset();
      status(`Guardado: ${result.created} nuevos, ${result.updated} actualizados y ${result.unchanged} sin cambios. Vuelve a buscar el cliente para actualizar la selecci\xF3n.`);
      await cfg.refresh();
    });
  }
  function edit(row, isNew = false) {
    cfg.show("catalog");
    importPanel();
    const root = panel(), form = el("form");
    form.style.marginTop = "24px";
    form.append(el("h2", isNew ? "Crear equipo con ficha" : "Editar ficha \xB7 " + row.code), el("p", isNew ? "Completa los cinco campos obligatorios; los dem\xE1s son opcionales." : "El c\xF3digo y RUT se conservan. Los campos t\xE9cnicos vac\xEDos mantienen el valor guardado. Corregir una direcci\xF3n conserva este generador y sus filtros; si la ubicaci\xF3n tiene otros equipos, el cambio se aplica solamente al equipo editado."));
    const inputs = {};
    for (const f of catalogFields.filter((f2) => !catalogFilterIds.includes(f2.id) && f2.id !== "serial")) {
      const label = el("label", f.label + (f.required ? " *" : "")), input = el("input");
      input.value = f.id === "name" ? String(row[f.id] || "").toUpperCase() : row[f.id] || "";
      input.maxLength = f.max;
      input.required = f.required;
      if (isNew && f.id === "code") input.value = row.code || "GE-" + crypto.randomUUID().toUpperCase();
      input.readOnly = f.id === "code" || !isNew && f.id === "rut";
      label.append(input);
      form.append(label);
      inputs[f.id] = input;
    }
    const filterHost = el("div");
    form.append(filterHost);
    const filterValues = filterEditor(filterHost, row, false, reset);
    const button = el("button", "Previsualizar cambios");
    button.type = "submit";
    form.append(button);
    root.insertBefore(form, document.getElementById("catalogStatus"));
    form.onsubmit = (e) => {
      e.preventDefault();
      task(async () => {
        const rows = catalogNormalize([{ ...Object.fromEntries(catalogFields.filter((f) => inputs[f.id]).map((f) => [f.id, inputs[f.id].value])), ...filterValues() }]);
        await preview(rows, true);
      });
    };
    for (const [id, input] of Object.entries(inputs)) input.oninput = () => {
      if (id === "name") input.value = input.value.toUpperCase();
      if (id === "power") input.value = input.value.replace(/kva|kw|hz|v\b/gi, (v) => v.toUpperCase());
      reset();
    };
  }
  async function consult(id) {
    const version = ++consultVersion, box = document.getElementById("equipmentReference");
    box.replaceChildren();
    if (!id) return;
    box.append(el("p", "Cargando ficha de consulta\u2026"));
    try {
      const data = await cfg.api("catalog/equipment/" + encodeURIComponent(id));
      if (version !== consultVersion) return;
      box.replaceChildren();
      const details = el("details"), summary = el("summary", "Ficha de equipo \xB7 " + data.row.code);
      details.append(summary, el("p", "Datos de consulta. No se agregan autom\xE1ticamente al PDF."));
      const list = el("dl");
      for (const f of catalogFields.filter((f2) => !["rut", "name", "address", "equipment", "serial"].includes(f2.id))) {
        const refs = catalogFilterIds.includes(f.id) ? catalogFilterRows(data.row)[f.id] : null;
        const value = refs?.length ? refs.map((r) => r.code.toUpperCase() + (r.qty ? " \xD7 " + r.qty : "")).join(" \xB7 ") : data.row[f.id];
        if (value) {
          list.append(el("dt", f.label), el("dd", value));
        }
      }
      details.append(list);
      const addFilters = el("button", "Agregar / revisar filtros");
      addFilters.onclick = () => editFilters({ ...cfg, afterFilters: consult }, id).catch((e) => cfg.notify?.(e.message));
      details.append(addFilters);
      if (data.canEdit) {
        const b = el("button", "Editar ficha");
        b.onclick = () => edit(data.row);
        details.append(b);
      }
      box.append(details);
    } catch (e) {
      if (version === consultVersion) box.replaceChildren(el("p", "Ficha no disponible: " + e.message));
    }
  }
  window.GensetCatalog = { init(options) {
    cfg = options;
    document.getElementById("catalogNav").onclick = () => {
      cfg.show("catalog");
      importPanel();
    };
  }, consult, offer(id, snapshot) {
    return catalogOffer(cfg, id, snapshot);
  }, async contact(id) {
    try {
      const d = await cfg.api("catalog/equipment/" + encodeURIComponent(id));
      return { contact: d.row.contact, phone: d.row.phone };
    } catch {
      return null;
    }
  } };
})();
