const OWNER = "voanechay42";
const REPO = "NoBan";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const $ = (id) => document.getElementById(id);
let releases = [];

const icons = {
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"/></svg>'
};
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value || 0);
}
function formatDate(value) {
  if (!value) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
function safeURL(url) {
  try { const parsed = new URL(url); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "#"; }
  catch { return "#"; }
}
function parseReleaseBody(markdown = "") {
  // A small safe renderer for the common Markdown used in GitHub release notes.
  return escapeHTML(markdown)
    .replace(/^###?\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(?:\r?\n){2,}/g, '</p><p>')
    .replace(/\r?\n/g, '<br>');
}
function renderReleaseNotes(body) {
  if (!body || !body.trim()) return '<p class="release-empty-note">Автор не добавил описание изменений к этому релизу.</p>';
  let html = parseReleaseBody(body);
  html = html.replace(/(?:<li>.*?<\/li>\s*)+/gs, match => `<ul>${match}</ul>`);
  return `<div class="release-notes"><p>${html}</p></div>`;
}
function releaseAssets(release) {
  return Array.isArray(release.assets) ? release.assets : [];
}
function releaseDownloads(release) {
  return releaseAssets(release).reduce((sum, asset) => sum + (asset.download_count || 0), 0);
}
function releaseLabel(release) {
  return release.name || release.tag_name || "Без названия";
}
function renderVersionRows() {
  const dropdown = $("versionList");
  const archive = $("fullVersionList");
  if (!releases.length) {
    const empty = '<div class="empty-state"><span>✧</span><b>Пока нет опубликованных версий</b><p>Когда автор создаст первый релиз на GitHub, он появится здесь автоматически.</p></div>';
    dropdown.innerHTML = empty;
    archive.innerHTML = empty;
    $("downloadLabel").textContent = "Скоро";
    $("downloadButton").disabled = true;
    return;
  }
  $("downloadLabel").textContent = "Скачать";
  $("downloadButton").disabled = false;
  dropdown.innerHTML = releases.slice(0, 8).map((release, index) => {
    const assets = releaseAssets(release);
    const file = assets[0];
    const latest = index === 0 && !release.prerelease;
    return `<a class="version-option ${latest ? "is-latest" : ""}" href="${safeURL(file?.browser_download_url || release.html_url)}" target="_blank" rel="noopener noreferrer"><span><b>${escapeHTML(releaseLabel(release))}</b><small>${assets.length ? `${assets.length} файл(а)` : "Страница релиза"}</small></span>${latest ? '<em>АКТУАЛЬНАЯ</em>' : '<span class="option-arrow">↗</span>'}</a>`;
  }).join("");
  archive.innerHTML = releases.map((release, index) => {
    const assets = releaseAssets(release);
    const latest = index === 0 && !release.prerelease;
    const files = assets.length ? assets.map(asset => `<a class="asset-link" href="${safeURL(asset.browser_download_url)}" target="_blank" rel="noopener noreferrer"><span>↓</span>${escapeHTML(asset.name)}<small>${formatNumber(asset.download_count)} скачиваний</small></a>`).join("") : '<div class="no-assets">Файлы к этому релизу не прикреплены.</div>';
    return `<article class="release-card ${latest ? "release-latest" : ""}"><div class="release-top"><div><div class="release-version-line"><h3>${escapeHTML(releaseLabel(release))}</h3>${latest ? '<span class="latest-badge">ПОСЛЕДНЯЯ</span>' : release.prerelease ? '<span class="preview-badge">PRE-RELEASE</span>' : ''}</div><p>${formatDate(release.published_at)} · ${formatNumber(releaseDownloads(release))} скачиваний</p></div><a class="release-open" href="${safeURL(release.html_url)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><div class="release-assets">${files}</div></article>`;
  }).join("");
}
function renderChangelog() {
  const target = $("changelogList");
  if (!releases.length) {
    target.innerHTML = '<div class="empty-state"><span>✧</span><b>История изменений пока пуста</b><p>Здесь автоматически появятся заметки из описаний GitHub Releases.</p></div>';
    return;
  }
  target.innerHTML = releases.map((release, index) => `<article class="timeline-item"><div class="timeline-marker ${index === 0 ? "current" : ""}"></div><div class="timeline-content"><div class="timeline-meta"><span>${formatDate(release.published_at)}</span>${index === 0 ? '<b>ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ</b>' : ''}</div><h3>${escapeHTML(releaseLabel(release))}</h3>${renderReleaseNotes(release.body)}<a class="changelog-source" href="${safeURL(release.html_url)}" target="_blank" rel="noopener noreferrer">Открыть релиз на GitHub ↗</a></div></article>`).join("");
}
async function loadGitHubData() {
  const statsSource = $("statsSource");
  try {
    const headers = { "Accept": "application/vnd.github+json" };
    const [repoResponse, releaseResponse] = await Promise.all([
      fetch(API, { headers, cache: "no-store" }),
      fetch(`${API}/releases?per_page=100`, { headers, cache: "no-store" })
    ]);
    if (!repoResponse.ok) throw new Error("GitHub repository API unavailable");
    const repo = await repoResponse.json();
    $("starCount").textContent = formatNumber(repo.stargazers_count);
    if (releaseResponse.ok) {
      releases = await releaseResponse.json();
      const totalDownloads = releases.reduce((sum, release) => sum + releaseDownloads(release), 0);
      $("downloadCount").textContent = formatNumber(totalDownloads);
      renderVersionRows();
      renderChangelog();
    } else {
      $("downloadCount").textContent = "—";
      $("versionList").innerHTML = '<div class="menu-loading">Не удалось загрузить релизы.</div>';
      $("fullVersionList").innerHTML = '<div class="empty-state"><b>Не удалось загрузить версии</b><p>Открой страницу релизов напрямую на GitHub.</p></div>';
      $("changelogList").innerHTML = '<div class="empty-state"><b>Не удалось загрузить изменения</b><p>Открой описания релизов на GitHub.</p></div>';
    }
    statsSource.textContent = "Обновляется с GitHub";
  } catch (error) {
    statsSource.textContent = "GitHub временно недоступен";
    $("starCount").textContent = "—";
    $("downloadCount").textContent = "—";
    const fallback = '<div class="empty-state"><span>↗</span><b>Не удалось получить данные GitHub</b><p>Проверь подключение или открой страницу релизов напрямую.</p></div>';
    $("versionList").innerHTML = fallback;
    $("fullVersionList").innerHTML = fallback;
    $("changelogList").innerHTML = fallback;
  }
}

function activateTab(name) {
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(panel => {
    const active = panel.id === `${name}Panel`;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  if (window.innerWidth < 900) document.querySelector(".content-layout").scrollIntoView({ behavior: "smooth", block: "start" });
}
document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.tab)));

const downloadButton = $("downloadButton");
const versionMenu = $("versionMenu");
downloadButton.addEventListener("click", () => {
  if (downloadButton.disabled) return;
  versionMenu.hidden = !versionMenu.hidden;
  downloadButton.setAttribute("aria-expanded", String(!versionMenu.hidden));
});
document.addEventListener("click", event => {
  if (!event.target.closest(".download-wrap")) {
    versionMenu.hidden = true;
    downloadButton.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    versionMenu.hidden = true;
    downloadButton.setAttribute("aria-expanded", "false");
  }
});

$("supportForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("issueTitle").value.trim();
  const type = $("issueType").value;
  const body = $("issueBody").value.trim();
  if (!title || !body) return;
  const issueTitle = `[${type}] ${title}`;
  const issueBody = `${body}\n\n---\nОтправлено через сайт NoBan.`;
  const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}&labels=${encodeURIComponent("support")}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

$("year").textContent = new Date().getFullYear();
loadGitHubData();
