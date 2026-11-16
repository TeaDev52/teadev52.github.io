const OWNER = "voanechay42";
const REPO = "NoBan";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const VERSION_URL = "https://raw.githubusercontent.com/voanechay42/NoBan/refs/heads/main/service/version.txt";
const $ = (id) => document.getElementById(id);
let releases = [];

function escapeHTML(value = "") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function formatNumber(value) { return new Intl.NumberFormat("ru-RU").format(value || 0); }
function formatDate(value) { if (!value) return "Дата не указана"; return new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"long",year:"numeric"}).format(new Date(value)); }
function safeURL(url) { try { const u = new URL(url); return ["https:","http:"].includes(u.protocol) ? u.href : "#"; } catch { return "#"; } }
function parseReleaseBody(markdown = "") {
  return escapeHTML(markdown)
    .replace(/^###?\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(?:\r?\n){2,}/g, '</p><p>').replace(/\r?\n/g, '<br>');
}
function renderReleaseNotes(body) {
  if (!body || !body.trim()) return '<p class="release-empty-note">В этом релизе нет отдельного описания изменений.</p>';
  let html = parseReleaseBody(body).replace(/(?:<li>.*?<\/li>\s*)+/gs, m => `<ul>${m}</ul>`);
  return `<div class="release-notes"><p>${html}</p></div>`;
}
function releaseAssets(r) { return Array.isArray(r.assets) ? r.assets : []; }
function releaseDownloads(r) { return releaseAssets(r).reduce((n,a) => n + (a.download_count || 0), 0); }
function releaseLabel(r) { return r.name || r.tag_name || "Без названия"; }
function renderVersionRows() {
  const dropdown = $("versionList"), archive = $("fullVersionList");
  if (!releases.length) {
    const empty = '<div class="empty-state"><span>✧</span><b>Релизы пока не опубликованы</b><p>Когда в GitHub появится релиз с файлами, он отобразится здесь.</p></div>';
    dropdown.innerHTML = empty; archive.innerHTML = empty; $("downloadLabel").textContent = "Скоро"; $("downloadButton").disabled = true; return;
  }
  $("downloadLabel").textContent = "Скачать"; $("downloadButton").disabled = false;
  dropdown.innerHTML = releases.slice(0,10).map((r,i) => {
    const file = releaseAssets(r)[0], latest = i === 0 && !r.prerelease;
    return `<a class="version-option ${latest ? "is-latest" : ""}" href="${safeURL(file?.browser_download_url || r.html_url)}" target="_blank" rel="noopener noreferrer"><span><b>${escapeHTML(releaseLabel(r))}</b><small>${releaseAssets(r).length ? `${releaseAssets(r).length} файл(а)` : "Страница релиза"}</small></span>${latest ? '<em>АКТУАЛЬНАЯ</em>' : '<span class="option-arrow">↗</span>'}</a>`;
  }).join("");
  archive.innerHTML = releases.map((r,i) => {
    const latest = i === 0 && !r.prerelease;
    const files = releaseAssets(r).length ? releaseAssets(r).map(a => `<a class="asset-link" href="${safeURL(a.browser_download_url)}" target="_blank" rel="noopener noreferrer"><span>↓</span>${escapeHTML(a.name)}<small>${formatNumber(a.download_count)} скачиваний</small></a>`).join("") : '<div class="no-assets">Файлы к этому релизу не прикреплены.</div>';
    return `<article class="release-card ${latest ? "release-latest" : ""}"><div class="release-top"><div><div class="release-version-line"><h3>${escapeHTML(releaseLabel(r))}</h3>${latest ? '<span class="latest-badge">ПОСЛЕДНЯЯ</span>' : r.prerelease ? '<span class="latest-badge">PRE-RELEASE</span>' : ''}</div><p>${formatDate(r.published_at)} · ${formatNumber(releaseDownloads(r))} скачиваний</p></div><a class="release-open" href="${safeURL(r.html_url)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><div class="release-assets">${files}</div></article>`;
  }).join("");
}
function renderChangelog() {
  const target = $("changelogList");
  if (!releases.length) { target.innerHTML = '<div class="empty-state"><span>✧</span><b>История изменений пока пуста</b><p>Заметки появятся здесь после публикации GitHub Releases.</p></div>'; return; }
  target.innerHTML = releases.map((r,i) => `<article class="timeline-item"><div class="timeline-marker ${i===0?"current":""}"></div><div class="timeline-content"><div class="timeline-meta"><span>${formatDate(r.published_at)}</span>${i===0?'<b>ПОСЛЕДНИЙ РЕЛИЗ</b>':''}</div><h3>${escapeHTML(releaseLabel(r))}</h3>${renderReleaseNotes(r.body)}<a class="changelog-source" href="${safeURL(r.html_url)}" target="_blank" rel="noopener noreferrer">Открыть релиз на GitHub ↗</a></div></article>`).join("");
}
async function loadVersion() {
  const targets = [$("siteVersion"),$("latestVersion")].filter(Boolean);
  const setVersion = v => { targets.forEach(el => el.textContent = `v${v}`); document.title = `NoBan v${v} — voanechay`; };
  try {
    let response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {cache:"no-store"});
    if (!response.ok) throw new Error(`raw version HTTP ${response.status}`);
    let version = (await response.text()).replace(/^\uFEFF/,"").trim().replace(/^v/i,"").trim();
    if (!version || version.length > 40 || /[\r\n<>]/.test(version)) throw new Error("Invalid version string");
    setVersion(version);
  } catch (rawError) {
    // Fallback to GitHub Contents API in case raw.githubusercontent.com is unavailable.
    try {
      const r = await fetch(`${API}/contents/service/version.txt?ref=main`, {headers:{Accept:"application/vnd.github+json"},cache:"no-store"});
      if (!r.ok) throw new Error(`contents API HTTP ${r.status}`);
      const data = await r.json();
      const version = atob((data.content || "").replace(/\s/g,"")).trim().replace(/^v/i,"");
      if (!version || /[\r\n<>]/.test(version)) throw new Error("Invalid version string");
      setVersion(version);
    } catch (apiError) {
      console.warn("NoBan version could not be loaded:", rawError, apiError);
      // Keep the known current version as a visible fallback instead of blanking the label.
      setVersion("8.0");
    }
  }
}
async function loadGitHubData() {
  try {
    const [repoRes, releasesRes] = await Promise.all([
      fetch(API,{headers:{Accept:"application/vnd.github+json"},cache:"no-store"}),
      fetch(`${API}/releases?per_page=100`,{headers:{Accept:"application/vnd.github+json"},cache:"no-store"})
    ]);
    if (!repoRes.ok) throw new Error(`GitHub API ${repoRes.status}`);
    const repo = await repoRes.json(); $("starCount").textContent = formatNumber(repo.stargazers_count);
    if (!releasesRes.ok) throw new Error(`Releases API ${releasesRes.status}`);
    releases = await releasesRes.json();
    $("downloadCount").textContent = formatNumber(releases.reduce((n,r)=>n+releaseDownloads(r),0));
    renderVersionRows(); renderChangelog();
  } catch (error) {
    console.warn("GitHub data unavailable:",error);
    $("starCount").textContent = "—"; $("downloadCount").textContent = "—";
    const empty = '<div class="empty-state"><b>Не удалось загрузить данные GitHub</b><p>Проверь подключение или открой репозиторий напрямую.</p></div>';
    $("versionList").innerHTML = empty; $("fullVersionList").innerHTML = empty; $("changelogList").innerHTML = empty;
  }
}
function moveIndicator() {
  const nav = $("mainNav"), active = nav?.querySelector(".nav-item.active"), indicator = $("navIndicator");
  if (!nav || !active || !indicator) return;
  const navRect = nav.getBoundingClientRect(), itemRect = active.getBoundingClientRect();
  indicator.style.width = `${itemRect.width}px`;
  indicator.style.transform = `translateX(${itemRect.left - navRect.left}px)`;
}
function activateTab(name) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".tab-panel").forEach(panel => {
    const active = panel.id === `${name}Panel`;
    panel.hidden = !active; panel.classList.toggle("active",active);
    if (active) { panel.classList.remove("active"); void panel.offsetWidth; panel.classList.add("active"); }
  });
  requestAnimationFrame(moveIndicator);
}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));
window.addEventListener("resize",moveIndicator);
window.addEventListener("load",moveIndicator);

const downloadButton = $("downloadButton"), versionMenu = $("versionMenu");
downloadButton.addEventListener("click",()=>{if(downloadButton.disabled)return;versionMenu.hidden=!versionMenu.hidden;downloadButton.setAttribute("aria-expanded",String(!versionMenu.hidden));});
document.addEventListener("click",e=>{if(!e.target.closest(".download-wrap")){versionMenu.hidden=true;downloadButton.setAttribute("aria-expanded","false");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){versionMenu.hidden=true;downloadButton.setAttribute("aria-expanded","false");}});
$("supportForm").addEventListener("submit",e=>{
  e.preventDefault(); const title=$("issueTitle").value.trim(), type=$("issueType").value, body=$("issueBody").value.trim(); if(!title||!body)return;
  const issueTitle=`[${type}] ${title}`, issueBody=`${body}\n\n---\nОтправлено через сайт NoBan.`;
  const url=`${REPO_URL}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
  window.open(url,"_blank","noopener,noreferrer");
});
$("year").textContent=new Date().getFullYear();
loadVersion(); loadGitHubData();

// Gentle pointer parallax for the SVG orbital artwork; all artwork remains in code.
(() => {
  const art = document.querySelector('.hero-art');
  if (!art || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = 0;
  window.addEventListener('pointermove', (event) => {
    if (window.innerWidth < 801) return;
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - .5) * 10;
      const y = (event.clientY / window.innerHeight - .5) * 8;
      art.style.marginLeft = `${x}px`;
      art.style.marginTop = `${y}px`;
    });
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    art.style.marginLeft = '0px';
    art.style.marginTop = '0px';
  });
})();
