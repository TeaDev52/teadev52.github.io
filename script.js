const OWNER = "voanechay42";
const REPO = "NoBan";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const VERSION_URL = "https://raw.githubusercontent.com/voanechay42/NoBan/main/service/version.txt";
const $ = (id) => document.getElementById(id);
let releases = [];

function escapeHTML(value = "") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function formatNumber(value) { return new Intl.NumberFormat("ru-RU").format(value || 0); }
function formatDate(value) { if (!value) return "Дата не указана"; return new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"long",year:"numeric"}).format(new Date(value)); }
function safeURL(url) { try { const u = new URL(url); return ["https:","http:"].includes(u.protocol) ? u.href : "#"; } catch { return "#"; } }

// Inline markdown: code, bold (**text**), italic (_text_), links.
function inlineMarkdown(text = "") {
  return escapeHTML(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(«"])_([^_\n]+)_(?=$|[\s.,!?:;)»"])/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function parseReleaseBody(markdown = "") {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let inList = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) { html += `<p>${paragraph.join("<br>")}</p>`; paragraph = []; }
  };
  const closeList = () => {
    if (inList) { html += "</ul>"; inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); closeList(); continue; }

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) { flushParagraph(); closeList(); html += `<h4>${inlineMarkdown(heading[1])}</h4>`; continue; }

    const item = line.match(/^[-*+]\s+(.+)$/);
    if (item) {
      flushParagraph();
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMarkdown(item[1])}</li>`;
      continue;
    }

    closeList();
    paragraph.push(inlineMarkdown(line));
  }

  flushParagraph();
  closeList();
  return html;
}

function renderReleaseNotes(body) {
  if (!body || !body.trim()) return '<p class="release-empty-note">В этом релизе нет отдельного описания изменений.</p>';
  return `<div class="release-notes">${parseReleaseBody(body)}</div>`;
}

function releaseAssets(r) { return Array.isArray(r.assets) ? r.assets : []; }
function releaseDownloads(r) { return releaseAssets(r).reduce((n,a) => n + (a.download_count || 0), 0); }
function releaseLabel(r) { return r.name || r.tag_name || "Без названия"; }

const EMPTY_RELEASES = '<div class="empty-state"><span>✧</span><b>Релизы пока не опубликованы</b><p>Когда в GitHub появится релиз с файлами, он отобразится здесь.</p></div>';

function renderVersionRows() {
  const archive = $("fullVersionList");
  if (!archive) return;
  if (!releases.length) { archive.innerHTML = EMPTY_RELEASES; return; }

  archive.innerHTML = releases.map((r, i) => {
    const latest = i === 0 && !r.prerelease;
    const assets = releaseAssets(r);
    const files = assets.length
      ? assets.map(a => `<a class="asset-link" href="${safeURL(a.browser_download_url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(a.name)}"><span class="asset-icon">↓</span><b>Скачать</b><small>${formatNumber(a.download_count)} скачиваний</small></a>`).join("")
      : '<div class="no-assets">Файлы к этому релизу не прикреплены.</div>';
    return `<article class="release-card ${latest ? "release-latest" : ""}"><div class="release-top"><div><div class="release-version-line"><h3>${escapeHTML(releaseLabel(r))}</h3>${latest ? '<span class="latest-badge">ПОСЛЕДНЯЯ</span>' : r.prerelease ? '<span class="latest-badge">PRE-RELEASE</span>' : ''}</div><p>${formatDate(r.published_at)} · ${formatNumber(releaseDownloads(r))} скачиваний</p></div><a class="release-open" href="${safeURL(r.html_url)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><div class="release-assets">${files}</div></article>`;
  }).join("");
}

function renderChangelog() {
  const target = $("changelogList");
  if (!target) return;
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
    if ($("fullVersionList")) $("fullVersionList").innerHTML = empty;
    if ($("changelogList")) $("changelogList").innerHTML = empty;
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
  // Кнопка «Скачать» живёт только на вкладке «Описание»
  const heroActions = document.querySelector(".hero-actions");
  if (heroActions) heroActions.hidden = name !== "description";
  requestAnimationFrame(moveIndicator);
}

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));
window.addEventListener("resize",moveIndicator);
window.addEventListener("load",moveIndicator);

// Кнопка «Скачать» — переход на вкладку «Версии»
const downloadButton = $("downloadButton");
if (downloadButton) downloadButton.addEventListener("click", () => activateTab("versions"));

// Кастомный селект «Тип обращения»
(() => {
  const field = $("issueTypeField");
  if (!field) return;
  const trigger = $("issueTypeTrigger"), menu = $("issueTypeMenu"), label = $("issueTypeLabel"), input = $("issueType");
  const close = () => { menu.hidden = true; trigger.setAttribute("aria-expanded","false"); };
  const open = () => { menu.hidden = false; trigger.setAttribute("aria-expanded","true"); };

  trigger.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden ? open() : close(); });

  menu.querySelectorAll(".select-option").forEach(option => {
    option.addEventListener("click", () => {
      menu.querySelectorAll(".select-option").forEach(o => o.setAttribute("aria-selected","false"));
      option.setAttribute("aria-selected","true");
      label.textContent = option.textContent;
      input.value = option.dataset.value;
      close();
      trigger.focus();
    });
  });

  document.addEventListener("click", (e) => { if (!field.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();

const supportForm = $("supportForm");
if (supportForm) supportForm.addEventListener("submit", e => {
  e.preventDefault();
  const title=$("issueTitle").value.trim(), type=$("issueType").value, body=$("issueBody").value.trim();
  if(!title||!body)return;
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

// Interactive background particles: points gently brighten around the pointer.
(() => {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, dpr = 1, points = [], frame = 0;
  const pointer = { x: -1000, y: -1000, active: false };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = width < 700 ? 31 : 27;
    points = [];
    for (let y = 18; y < height; y += gap) {
      for (let x = 16; x < width; x += gap) {
        points.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          phase: Math.random() * Math.PI * 2,
          glow: 0
        });
      }
    }
    draw(0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    for (const point of points) {
      const distance = pointer.active
        ? Math.hypot(pointer.x - point.x, pointer.y - point.y)
        : 9999;
      const target = Math.max(0, 1 - distance / 145);
      point.glow += (target - point.glow) * (reduceMotion ? 0.12 : 0.075);
      const pulse = reduceMotion ? 0 : (Math.sin(time * 0.00055 + point.phase) + 1) * 0.012;
      const alpha = 0.10 + pulse + point.glow * 0.58;
      const radius = 1.05 + point.glow * 1.15;

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(196, 165, 255, ${alpha})`;
      ctx.fill();

      if (point.glow > 0.12) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(166, 125, 255, ${point.glow * 0.045})`;
        ctx.fill();
      }
    }
    if (!reduceMotion) frame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
  resize();
  if (!reduceMotion) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }
})();
