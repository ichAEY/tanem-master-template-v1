import fs from "node:fs";
import site from "../site-data.mjs";

const componentPath = "app/mobile-claytone.tsx";
const cssPath = "app/globals.css";
const layoutPath = "app/layout.tsx";

let source = fs.readFileSync(componentPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let layout = fs.readFileSync(layoutPath, "utf8");

const profileType = site.template?.profileType === "studio" ? "studio" : "master";
const profileWord = profileType === "studio" ? "студия" : "мастер";
const aboutLabel = profileType === "studio" ? "О студии" : "О мастере";
const experienceLabel = profileType === "studio" ? "лет работы" : "лет опыта";
const name = String(site.master?.name || site.brand?.name || "").trim();
const brand = String(site.brand?.name || name).trim();
const profession = String(site.master?.profession || "")
  .replace(/^(мастер|студия)\s+/i, "")
  .trim();

function replaceRequiredRegex(pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`TANEM final marker not found: ${label}`);
  pattern.lastIndex = 0;
  source = source.replace(pattern, replacement);
}

function replaceBetween(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return;
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`TANEM final end marker not found: ${label}`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

// The old base generator is master-specific. Restore the client profile type here.
const explicitHero = String(site.master?.heroTitle || "").trim();
let heroMarkup = "";
if (explicitHero.includes("—")) {
  const [lead, ...rest] = explicitHero.split("—");
  heroMarkup = `<h1>${lead.trim()} — <em>${rest.join("—").trim()}</em></h1>`;
} else if (explicitHero) {
  heroMarkup = `<h1>${explicitHero}</h1>`;
} else {
  heroMarkup = `<h1>${name} — ${profileWord}${profession ? ` <em>${profession}</em>` : ""}</h1>`;
}
replaceRequiredRegex(/<h1>[\s\S]*?<\/h1>/, heroMarkup, "hero title");

if (profileType === "studio") {
  source = source.replaceAll("О мастере", "О студии");
}

const aboutTitle = String(site.master?.aboutTitle || `${name} — ${profileWord}`).trim();
const aboutHeadingPattern = /<div><p className="mct-section-kicker">О (?:мастере|студии)<\/p><h2>[\s\S]*?<\/h2><\/div>/;
if (aboutHeadingPattern.test(source)) {
  source = source.replace(
    aboutHeadingPattern,
    `<div><p className="mct-section-kicker">${aboutLabel}</p><h2>${aboutTitle}</h2></div>`,
  );
}

// Make portrait descriptions profile-aware as well.
if (site.images?.portrait) {
  const portraitEscaped = String(site.images.portrait).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  source = source.replace(
    new RegExp(`<img src="${portraitEscaped}" alt="[^"]*" \/>`),
    `<img src="${site.images.portrait}" alt="${name}, ${profileWord}${profession ? ` ${profession}` : ""}" />`,
  );
}
if (site.images?.about) {
  const aboutEscaped = String(site.images.about).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  source = source.replace(
    new RegExp(`<img src="${aboutEscaped}" alt="[^"]*" loading="lazy" \/>`),
    `<img src="${site.images.about}" alt="${name}, ${profileWord}${profession ? ` ${profession}` : ""}" loading="lazy" />`,
  );
}

// Only confirmed facts belong in the hero stats. Empty values must not leave visual holes.
const stats = [];
if (String(site.master?.experienceYears || "").trim()) {
  stats.push(`<div className="mct-stat"><strong>${site.master.experienceYears}</strong><span>${experienceLabel}</span></div>`);
}
if (String(site.reputation?.rating || "").trim()) {
  stats.push(`<div className="mct-stat"><strong>${site.reputation.rating} <i className="mct-stat-star">★</i></strong><span>рейтинг</span></div>`);
}
if (String(site.reputation?.reviewCount || "").trim()) {
  stats.push(`<div className="mct-stat"><strong>${site.reputation.reviewCount}</strong><span>оценок</span></div>`);
}

const statsPattern = /<div className="mct-stats" aria-label="[^"]*">\s*<div className="mct-stat">[\s\S]*?<\/div>\s*<div className="mct-stat">[\s\S]*?<\/div>\s*<div className="mct-stat">[\s\S]*?<\/div>\s*<\/div>/;
if (statsPattern.test(source)) {
  source = source.replace(
    statsPattern,
    stats.length
      ? `<div className="mct-stats tanem-stats-${stats.length}" aria-label="Подтверждённая информация">${stats.join("")}</div>`
      : "",
  );
}

// The about experience badge follows the same rule.
const aboutExperiencePattern = /<div className="mct-about-experience" aria-label="[^"]*">\s*<strong>[\s\S]*?<\/strong>\s*<span>лет<br \/>опыта<\/span>\s*<\/div>/;
if (!String(site.master?.experienceYears || "").trim()) {
  source = source.replace(aboutExperiencePattern, "");
} else if (profileType === "studio") {
  source = source.replace("<span>лет<br />опыта</span>", "<span>лет<br />работы</span>");
}

// Never label an unknown external-platform score as a Yandex score.
if (!String(site.reputation?.rating || "").trim() || !String(site.reputation?.reviewCount || "").trim()) {
  source = source.replace(/\s*<a className="mct-review-summary"[\s\S]*?<\/a>/, "");
}

// No verified reviews = no decorative empty reviews section or navigation link.
if (!Array.isArray(site.reviews) || site.reviews.length === 0) {
  source = source.replace(/\s*<a href="#mobile-reviews"[^>]*><span>•<\/span>Отзывы<\/a>/g, "");
  source = source.replace(/\s*<a href="#mobile-reviews">Отзывы<\/a>/g, "");
  replaceBetween(
    '      <section className="mct-reviews mct-reveal" id="mobile-reviews">',
    '      <section className="mct-visit mct-reveal" id="mobile-location" ref={finalBookRef}>',
    "",
    "empty reviews section",
  );
}

// Categories mode inherits the last approved Tahmina interaction: a subtle first-view ribbon nudge.
if (site.template?.serviceMode === "categories" && source.includes("mct-tabs-scroll")) {
  const switchPattern = /(  const switchCategory = \(next: [^\n]+\) => \{\n    setCategory\(next\);\n    setExpanded\(false\);\n  \};)/;
  if (switchPattern.test(source) && !source.includes("tanemTabsHinted")) {
    source = source.replace(
      switchPattern,
`$1

  useEffect(() => {
    const ribbon = document.querySelector<HTMLElement>(".mct-tabs-scroll");
    if (!ribbon || ribbon.dataset.tanemTabsHinted === "true") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    ribbon.dataset.tanemTabsHinted = "true";
    const timer = window.setTimeout(() => {
      const max = Math.max(0, ribbon.scrollWidth - ribbon.clientWidth);
      if (max < 24 || ribbon.scrollLeft > 8) return;
      const target = Math.min(max, 54);
      ribbon.scrollTo({ left: target, behavior: "smooth" });
      window.setTimeout(() => ribbon.scrollTo({ left: 0, behavior: "smooth" }), 520);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);`,
    );
  }
}

// Keep desktop drag interactions deterministic after pointer release outside the gallery.
source = source.replace(
  "onMouseLeave={resumeDesktopGallery}",
  "onMouseLeave={() => { if (desktopGalleryPointerStartRef.current === null) resumeDesktopGallery(); }}",
);
source = source.replace(
`              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                resumeDesktopGallery();
              }}
              onPointerCancel={resumeDesktopGallery}`,
`              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                desktopGalleryPointerStartRef.current = null;
                resumeDesktopGallery();
              }}
              onPointerCancel={() => {
                desktopGalleryPointerStartRef.current = null;
                resumeDesktopGallery();
              }}`,
);

// Empty analytics IDs used to generate invalid inline JS (ym(, ...)). Remove analytics cleanly.
if (!String(site.analytics?.yandexMetrikaId || "").trim()) {
  layout = layout.replace(/const yandexMetrikaCode = `[\s\S]*?`;/, 'const yandexMetrikaCode = "";');
  layout = layout.replace(
    /\s*<script\s+type="text\/javascript"\s+dangerouslySetInnerHTML=\{\{ __html: yandexMetrikaCode \}\}\s*\/>/,
    "",
  );
  layout = layout.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, "");
}

css += `

/* TANEM final generic layer — derived from the approved Tahmina finish. */
.mct-brand,
.mct-intro-mark span,
.dct-footer > a {
  letter-spacing: .015em !important;
  word-spacing: 0 !important;
}

/* A failed hydration must never make the rest of the site permanently invisible. */
.mct-reveal:not(.is-visible) {
  animation: tanemRevealFailSafe 1ms 2400ms forwards;
}
@keyframes tanemRevealFailSafe {
  to { opacity: 1; transform: none; filter: none; }
}

.tanem-stats-1 { grid-template-columns: minmax(0, 1fr) !important; }
.tanem-stats-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.tanem-stats-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }

@media (max-width: 767px) {
  /* Final approved portfolio geometry: the two added works are equal. */
  .mct-work-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    grid-template-rows: 138px 154px auto !important;
    align-items: stretch;
  }
  .mct-work-tile:nth-child(4),
  .mct-work-tile:nth-child(5) {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
    min-height: 0 !important;
  }
  .mct-work-tile:nth-child(4) img,
  .mct-work-tile:nth-child(5) img {
    width: 100% !important;
    height: 100% !important;
    aspect-ratio: 1 / 1 !important;
    object-fit: cover !important;
  }

  .mct-about-experience strong {
    font-family: "Cormorant Garamond", Georgia, serif !important;
    font-size: 34px !important;
    font-weight: 500 !important;
    line-height: .9 !important;
    letter-spacing: -.035em !important;
  }
  .mct-about-experience span {
    font-weight: 500 !important;
    letter-spacing: .01em !important;
  }
}

@media (min-width: 768px) {
  .dct-hero-portrait img {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
  .dct-gallery-viewport { cursor: grab; }
  .dct-gallery-viewport:active { cursor: grabbing; }
}
`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
fs.writeFileSync(layoutPath, layout, "utf8");
console.log(`TANEM final layer applied: profile=${profileType}, stats=${stats.length}, reviews=${site.reviews?.length || 0}.`);
