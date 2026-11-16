/*
 * Добавляй реальные опубликованные версии в RELEASES.
 * Первая запись считается самой новой и автоматически помечается «АКТУАЛЬНАЯ».
 * Не указывай выдуманные версии или ссылки.
 */
const RELEASES = [
  // { version: "1.0.0", date: "16 ноября 2026", downloadUrl: "ПРЯМАЯ_ССЫЛКА_НА_ФАЙЛ" }
];

const button = document.getElementById("downloadButton");
const menu = document.getElementById("versionMenu");
const list = document.getElementById("versionList");
const fullList = document.getElementById("fullVersionList");
document.getElementById("year").textContent = new Date().getFullYear();

function safe(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function renderVersions() {
  list.innerHTML = ""; fullList.innerHTML = "";
  if (!RELEASES.length) {
    const empty = '<div class="empty"><div class="star">✦</div><b>Релизов пока нет</b><small>Опубликованные версии появятся здесь.</small></div>';
    list.innerHTML = empty; fullList.innerHTML = empty;
    button.disabled = true;
    document.getElementById("downloadLabel").textContent = "Скоро";
    button.title = "Пока нет опубликованных версий";
    return;
  }
  button.disabled = false;
  document.getElementById("downloadLabel").textContent = "Скачать";
  RELEASES.forEach((release, index) => {
    const latest = index === 0;
    const option = document.createElement("button");
    option.className = "version-option";
    option.innerHTML = `<span>${safe(release.version)}</span>${latest ? '<span class="latest-pill">АКТУАЛЬНАЯ</span>' : ""}`;
    option.addEventListener("click", () => {
      if (release.downloadUrl) window.open(release.downloadUrl, "_blank", "noopener,noreferrer");
      menu.hidden = true; button.setAttribute("aria-expanded", "false");
    });
    list.appendChild(option);
    const row = document.createElement("div");
    row.className = "release";
    row.innerHTML = `<div><b>${safe(release.version)}</b><small>${safe(release.date || "Дата не указана")}</small></div>${latest ? '<span class="latest-pill">ПОСЛЕДНЯЯ</span>' : ""}`;
    fullList.appendChild(row);
  });
}
button.addEventListener("click", () => {
  if (button.disabled) return;
  menu.hidden = !menu.hidden;
  button.setAttribute("aria-expanded", String(!menu.hidden));
});
document.addEventListener("click", event => {
  if (!event.target.closest(".download-wrap")) {
    menu.hidden = true; button.setAttribute("aria-expanded", "false");
  }
});
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
  const showVersions = tab.dataset.tab === "versions";
  document.getElementById("aboutPanel").hidden = showVersions;
  document.getElementById("versionsPanel").hidden = !showVersions;
}));
renderVersions();
