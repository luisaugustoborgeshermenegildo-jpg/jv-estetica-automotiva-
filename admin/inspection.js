/* Vistoria de chegada e fotos (Cloudflare: D1 + R2).
   Usa setStatus, showLogin e dashboardStatus de admin.js (mesmo escopo global). */
const INSPECTION_STAGES = ["received", "washing", "ready", "delivered"];
const ANGLES = [
  ["frente", "Frente"],
  ["traseira", "Traseira"],
  ["lateral-esquerda", "Lateral esquerda"],
  ["lateral-direita", "Lateral direita"],
  ["painel", "Painel"],
  ["tanque", "Tanque"],
  ["extra", "Detalhe"],
];
const CHECK_ITEMS = [
  "Riscos",
  "Manchas",
  "Amassados",
  "Peças soltas ou quebradas",
  "Outros",
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function inspectionPanel(booking) {
  const details = el("details", "inspection");
  const summary = el("summary", "", "Vistoria e fotos");
  const body = el("div", "inspection-body");
  details.append(summary, body);
  details.addEventListener("toggle", () => {
    if (details.open && !body.dataset.loaded) loadInspection(booking, body);
  });
  return details;
}

async function loadInspection(booking, body) {
  body.dataset.loaded = "1";
  body.replaceChildren(el("p", "inspection-note", "Carregando…"));
  try {
    const response = await fetch(`/api/admin/inspection?id=${booking.id}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) return showLogin();
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Não foi possível abrir a vistoria.");
    renderInspection(booking, body, data);
  } catch (error) {
    delete body.dataset.loaded;
    body.replaceChildren(el("p", "inspection-note error", error.message));
  }
}

function renderInspection(booking, body, data) {
  const confirmed = Boolean(data.inspection?.confirmedAt);
  body.replaceChildren();

  let stateText =
    "Tire as fotos de chegada e marque as avarias antes de começar.";
  if (confirmed)
    stateText = `Confirmada pelo cliente em ${new Date(data.inspection.confirmedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Não pode mais ser alterada.`;
  else if (data.inspection)
    stateText = "Vistoria salva. Aguardando o cliente confirmar no app.";
  body.append(el("p", `inspection-state${confirmed ? " ok" : ""}`, stateText));

  body.append(el("h3", "", "Fotos de chegada"));
  body.append(photoGrid(booking, body, data.photos, "arrival", confirmed));

  body.append(el("h3", "", "Avarias encontradas"));
  const saved = new Map((data.inspection?.items ?? []).map((i) => [i.item, i]));
  const list = el("div", "check-list");
  const fields = CHECK_ITEMS.map((item) => {
    const row = el("label", "check-row");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = Boolean(saved.get(item)?.damage);
    box.disabled = confirmed;
    const note = document.createElement("input");
    note.type = "text";
    note.maxLength = 200;
    note.placeholder = "Onde e como (opcional)";
    note.value = saved.get(item)?.note ?? "";
    note.disabled = confirmed;
    row.append(box, el("span", "", item), note);
    list.append(row);
    return { item, box, note };
  });
  body.append(list);

  const notes = document.createElement("textarea");
  notes.className = "inspection-notes";
  notes.maxLength = 1000;
  notes.rows = 3;
  notes.placeholder =
    "Observação geral (ex.: moto chegou com barro seco na roda traseira)";
  notes.value = data.inspection?.notes ?? "";
  notes.disabled = confirmed;
  body.append(notes);

  if (!confirmed) {
    const save = el("button", "stage-next", "Salvar vistoria");
    save.type = "button";
    save.addEventListener("click", async () => {
      save.disabled = true;
      const items = fields.map(({ item, box, note }) => ({
        item,
        damage: box.checked,
        note: note.value,
      }));
      try {
        const response = await fetch("/api/admin/inspection", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: booking.id, items, notes: notes.value }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) return showLogin();
        if (!response.ok)
          throw new Error(result.error || "Não foi possível salvar.");
        setStatus(dashboardStatus, `#${booking.id}: vistoria salva.`, true);
        renderInspection(booking, body, result);
      } catch (error) {
        setStatus(dashboardStatus, error.message);
        save.disabled = false;
      }
    });
    body.append(save);
  }

  if (["ready", "delivered"].includes(booking.status)) {
    body.append(el("h3", "", "Fotos de entrega"));
    body.append(photoGrid(booking, body, data.photos, "delivery", false));
  }
}

function photoGrid(booking, body, photos, kind, locked) {
  const grid = el("div", "photo-grid");
  ANGLES.forEach(([angle, label]) => {
    const slot = el("div", "photo-slot");
    slot.append(el("strong", "", label));
    photos
      .filter((p) => p.kind === kind && p.angle === angle)
      .forEach((photo) => {
        const figure = el("figure", "photo-thumb");
        const img = document.createElement("img");
        img.src = `/api/admin/photo/${photo.id}`;
        img.alt = `${label} (${kind === "arrival" ? "chegada" : "entrega"})`;
        img.loading = "lazy";
        figure.append(img);
        if (!locked) {
          const remove = el("button", "photo-remove", "Apagar");
          remove.type = "button";
          remove.addEventListener("click", () =>
            deletePhoto(booking, body, photo.id),
          );
          figure.append(remove);
        }
        slot.append(figure);
      });
    if (!locked) {
      const pick = el("label", "photo-pick", "+ Foto");
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.addEventListener("change", () => {
        if (input.files[0])
          uploadPhoto(booking, body, kind, angle, input.files[0], pick);
      });
      pick.append(input);
      slot.append(pick);
    }
    grid.append(slot);
  });
  return grid;
}

// Reduz a foto no celular antes de enviar (máx. 1600 px, ~300 KB).
async function compress(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = (type, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.8);
  if (!blob || blob.type !== "image/webp")
    blob = await toBlob("image/jpeg", 0.82);
  return blob;
}

async function uploadPhoto(booking, body, kind, angle, file, pick) {
  pick.classList.add("is-busy");
  setStatus(dashboardStatus, "Enviando foto…");
  try {
    const blob = await compress(file);
    const form = new FormData();
    form.append("id", booking.id);
    form.append("kind", kind);
    form.append("angle", angle);
    form.append(
      "file",
      blob,
      blob.type === "image/webp" ? "foto.webp" : "foto.jpg",
    );
    const response = await fetch("/api/admin/photos", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) return showLogin();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível enviar a foto.");
    setStatus(dashboardStatus, "Foto salva.", true);
    loadInspection(booking, body);
  } catch (error) {
    setStatus(dashboardStatus, error.message);
    pick.classList.remove("is-busy");
  }
}

async function deletePhoto(booking, body, photoId) {
  if (!confirm("Apagar esta foto?")) return;
  try {
    const response = await fetch("/api/admin/photos/delete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) return showLogin();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível apagar.");
    loadInspection(booking, body);
  } catch (error) {
    setStatus(dashboardStatus, error.message);
  }
}
