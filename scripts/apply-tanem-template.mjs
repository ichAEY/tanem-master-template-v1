import fs from "node:fs";
import site from "../site-data.mjs";

const componentPath = "app/mobile-claytone.tsx";
const cssPath = "app/globals.css";
let source = fs.readFileSync(componentPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

function replaceRequired(from, to, label = from) {
  if (!source.includes(from)) throw new Error(`TANEM template marker not found: ${label}`);
  source = source.replace(from, to);
}

function replaceBetween(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`TANEM template start marker not found: ${label}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`TANEM template end marker not found: ${label}`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

const ts = (value) => JSON.stringify(value, null, 2);
const portfolioPreviewCount = Math.max(5, Number(site.template?.portfolioPreviewCount || 5));

// TANEM portfolio standard: no before/after, five visible works, full gallery after them.
replaceRequired(
  "const featuredWorks = galleryWorks.slice(0, 3);",
  `const featuredWorks = galleryWorks.slice(0, ${portfolioPreviewCount});`,
  "portfolio preview count",
);
replaceRequired(
  "const lightboxItems = [...beforeAfter, ...galleryWorks];",
  "const lightboxItems = [...galleryWorks];",
  "gallery without before/after",
);

const portfolioStart = '      <section className="mct-section" id="mobile-portfolio">';
const worksMarker = '        <div className="mct-shell mct-reveal">\n          <div className="mct-work-grid"';
replaceBetween(
  portfolioStart,
  worksMarker,
`      <section className="mct-section" id="mobile-portfolio">
        <div className="mct-shell mct-reveal">
          <div className="mct-section-head">
            <div><p className="mct-section-kicker">Портфолио</p><h2>Работы</h2></div>
            <p className="mct-section-note">Подборка работ ${site.master.genitive || site.master.name || "мастера"}</p>
          </div>
        </div>
`,
  "remove before/after preview",
);

const galleryContentStart = '          <div className="mct-gallery-content">\n            <h3>До / после</h3>';
const galleryWorksHeading = '            <h3>Работы</h3>';
replaceBetween(
  galleryContentStart,
  galleryWorksHeading,
  '          <div className="mct-gallery-content">\n',
  "remove before/after full gallery",
);

// Promotions are a real optional block, never a placeholder.
if (!Array.isArray(site.promotions) || site.promotions.length === 0) {
  source = source.replace('                  <a href="#mobile-promotions" onClick={() => setMenuOpen(false)}><span>•</span>Акции</a>\n', '');
  source = source.replace('              <a href="#mobile-promotions">Акции</a>\n', '');
  const promotionSectionStart = '      <section className="mct-promotions mct-reveal" id="mobile-promotions" ref={promotionSectionRef}>';
  const aboutSection = '      <section className="mct-about mct-reveal" id="mobile-about">';
  if (source.includes(promotionSectionStart)) {
    replaceBetween(promotionSectionStart, aboutSection, '', "remove empty promotions block");
  }
}

// Expanded service mode: any number of top-level categories.
if (site.template?.serviceMode === "categories") {
  const categories = Array.isArray(site.serviceCategories) ? site.serviceCategories.filter((item) => item?.key && item?.label) : [];
  if (categories.length < 3) {
    throw new Error('serviceMode="categories" requires at least 3 serviceCategories. Use "simple" for two ordinary directions.');
  }

  const firstKey = categories[0].key;
  const union = categories.map((item) => ts(item.key)).join(" | ");
  const categoryData = ts(categories);

  replaceRequired(
    "const beforeAfter = [];",
`const tanemServiceCategories = ${categoryData};
const tanemServiceMap = Object.fromEntries(tanemServiceCategories.map((group) => [group.key, group.items])) as Record<string, Service[]>;
const tanemAllServices: Array<Service & { sectionLabel?: string; sectionKey?: string }> = tanemServiceCategories.flatMap((group) =>
  group.items.map((service, index) => ({ ...service, sectionLabel: index === 0 ? group.label : undefined, sectionKey: group.key }))
);

const beforeAfter = [];`,
    "insert service categories",
  );

  replaceRequired(
    'const [category, setCategory] = useState<"manicure" | "pedicure">("manicure");',
    `const [category, setCategory] = useState<"all" | ${union}>(${ts(firstKey)});`,
    "service category state",
  );

  replaceRequired(
    'const services = category === "manicure" ? manicure : pedicure;',
`const services: Array<Service & { sectionLabel?: string; sectionKey?: string }> =
    category === "all" ? tanemAllServices : (tanemServiceMap[category] || []);`,
    "service category resolver",
  );

  replaceRequired(
`  const visibleServices = useMemo(
    () => category === "manicure" && !expanded ? services.slice(0, 5) : services,
    [category, expanded, services],
  );`,
`  const isCollapsibleCategory = category === "all" || services.length > 5;
  const visibleServices = useMemo(
    () => isCollapsibleCategory && !expanded ? services.slice(0, 5) : services,
    [expanded, isCollapsibleCategory, services],
  );`,
    "collapsible category services",
  );

  replaceRequired(
    'const switchCategory = (next: "manicure" | "pedicure") => {',
    `const switchCategory = (next: "all" | ${union}) => {`,
    "service category switcher",
  );

  const baseTabs = `          <div className="mct-tabs" role="tablist" aria-label="Категории услуг">
            <button className={\`mct-tab\${category === "manicure" ? " is-active" : ""}\`} type="button" role="tab" aria-selected={category === "manicure"} onClick={() => switchCategory("manicure")}>Маникюр</button>
            <button className={\`mct-tab\${category === "pedicure" ? " is-active" : ""}\`} type="button" role="tab" aria-selected={category === "pedicure"} onClick={() => switchCategory("pedicure")}>Педикюр</button>
          </div>`;

  const categoryButtons = categories.map((item) =>
    `                <button className={\`mct-tab\${category === ${ts(item.key)} ? " is-active" : ""}\`} type="button" role="tab" aria-selected={category === ${ts(item.key)}} onClick={() => switchCategory(${ts(item.key)})}>${item.label}</button>`
  ).join("\n");

  const expandedTabs = `          <div className="mct-tabs-ribbon-wrap">
            <span className="mct-tabs-swipe-cue" aria-hidden="true">
              <svg viewBox="0 0 18 10" fill="none"><path d="M1 5h14M11 1.5 15 5l-4 3.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="mct-tabs mct-tabs-scroll" role="tablist" aria-label="Категории услуг">
              <div className="mct-tabs-track" role="presentation">
                <button className={\`mct-tab mct-tab-all\${category === "all" ? " is-active" : ""}\`} type="button" role="tab" aria-selected={category === "all"} onClick={() => switchCategory("all")}>Все</button>
                <span className="mct-tab-divider" aria-hidden="true" />
${categoryButtons}
              </div>
            </div>
          </div>`;

  replaceRequired(baseTabs, expandedTabs, "expanded service tabs");

  replaceRequired(
`            {visibleServices.map((service) => (
              <article className="mct-service-row" key={service.name}>
                <div className="mct-service-name"><strong>{service.name}</strong><p className="dct-service-description">{service.description}</p><small>{service.time}</small></div>
                <div className="mct-service-action"><b>{service.price}</b><a href={service.url} target="_blank" rel="noopener noreferrer">Записаться →</a></div>
              </article>
            ))}`,
`            {visibleServices.map((service) => (
              <article className={\`mct-service-row\${service.sectionLabel && category === "all" ? " has-group-label" : ""}\`} key={\`\${service.sectionKey ?? category}-\${service.name}\`}>
                {service.sectionLabel && category === "all" && <span className="mct-service-group-label">{service.sectionLabel}</span>}
                <div className="mct-service-name"><strong>{service.name}</strong><p className="dct-service-description">{service.description}</p><small>{service.time}</small></div>
                <div className="mct-service-action"><b>{service.price}</b><a href={service.url} target="_blank" rel="noopener noreferrer">Записаться →</a></div>
              </article>
            ))}`,
    "service labels in all category",
  );

  replaceRequired(
`          {category === "manicure" && (
            <button className={\`mct-more-services\${expanded ? " is-open" : ""}\`} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Свернуть услуги" : \`Показать ещё \${manicure.length - 5} услуг\`}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}`,
`          {services.length > 5 && (
            <button className={\`mct-more-services\${expanded ? " is-open" : ""}\`} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Свернуть услуги" : \`Показать ещё \${services.length - 5} услуг\`}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}`,
    "expanded service list control",
  );

  css += `
@media (max-width: 767px) {
  .mct-tabs-ribbon-wrap { position: relative; padding-top: 15px; }
  .mct-tabs-scroll {
    --mct-ribbon-edge: max(var(--mct-shell-pad), calc((100vw - 520px) / 2 + var(--mct-shell-pad)));
    display: block !important; width: 100vw !important;
    margin: 0 calc(50% - 50vw) 7px !important;
    padding: 4px 0 7px var(--mct-ribbon-edge) !important;
    overflow-x: auto !important; overflow-y: hidden !important;
    border-radius: 0 !important; background: transparent !important;
    scroll-padding-left: var(--mct-ribbon-edge) !important;
    scrollbar-width: none; overscroll-behavior-inline: contain;
    touch-action: pan-x pan-y; -webkit-overflow-scrolling: touch;
  }
  .mct-tabs-scroll::-webkit-scrollbar { display: none; }
  .mct-tabs-track { display: flex; width: max-content; min-width: max-content; align-items: center; gap: 5px; margin-right: var(--mct-ribbon-edge); padding: 4px; border-radius: 999px; background: #eee5df; }
  .mct-tabs-scroll .mct-tab { flex: 0 0 auto !important; width: auto !important; min-width: 106px !important; padding-inline: 16px !important; white-space: nowrap; }
  .mct-tabs-scroll .mct-tab-all { min-width: 64px !important; padding-inline: 14px !important; }
  .mct-tab-divider { display: block; width: 1px; height: 21px; flex: 0 0 1px; margin: 0 3px; background: rgba(65,52,47,.18); }
  .mct-tabs-swipe-cue { position: absolute; z-index: 3; top: 1px; right: 2px; display: block; width: 18px; height: 10px; color: rgba(80,67,61,.58); pointer-events: none; animation: mctSwipeCue 1.65s cubic-bezier(.45,0,.25,1) infinite; }
  .mct-tabs-swipe-cue svg { display:block; width:18px; height:10px; }
  @keyframes mctSwipeCue { 0%,26%,100%{transform:translate3d(0,0,0)} 52%{transform:translate3d(4px,0,0)} 72%{transform:translate3d(1px,0,0)} }
  .mct-service-group-label { grid-column:1/-1; display:flex; align-items:center; gap:9px; margin:2px 0 1px; color:#6f5d55; font:600 10px/1 "Manrope",Arial,sans-serif; letter-spacing:.095em; text-transform:uppercase; }
  .mct-service-group-label::after { height:1px; flex:1 1 auto; background:rgba(65,52,47,.2); content:""; }
}
@media (min-width: 768px) {
  .mct-tabs-ribbon-wrap { display:block; }
  .mct-tabs-scroll { display:block !important; width:100% !important; overflow:hidden !important; padding:4px !important; }
  .mct-tabs-track { display:grid !important; grid-template-columns:repeat(${categories.length},minmax(0,1fr)); width:100% !important; gap:4px; }
  .mct-tab-all,.mct-tab-divider,.mct-tabs-swipe-cue { display:none !important; }
  .mct-tabs-scroll .mct-tab { width:100% !important; min-width:0 !important; padding-inline:10px !important; text-align:center; }
}
`;
}

// Fixed five-image portfolio layout: three-image composition + two balanced images before the gallery button.
css += `
@media (max-width: 767px) {
  .mct-work-grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr) !important;
    grid-template-rows: 138px 154px auto !important;
    align-items: stretch;
  }
  .mct-work-tile:nth-child(4), .mct-work-tile:nth-child(5) {
    grid-row: 3 !important; width:100% !important; height:auto !important;
    aspect-ratio:1/1 !important; min-height:0 !important;
  }
  .mct-work-tile:nth-child(4) { grid-column:1 !important; }
  .mct-work-tile:nth-child(5) { grid-column:2 !important; }
  .mct-work-tile:nth-child(4) img, .mct-work-tile:nth-child(5) img {
    width:100% !important; height:100% !important; aspect-ratio:1/1 !important; object-fit:cover !important;
  }

  /* Tactile mobile controls, inherited from the approved Tahmina behavior. */
  .mct-main-cta, .mct-gallery-button, .mct-final-cta, .mct-final-secondary, .mct-sticky, .mct-more-services, .mct-tab {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transform: translate3d(0,0,0) scale(1);
    transition: transform 115ms cubic-bezier(.2,.72,.28,1), filter 115ms ease, box-shadow 115ms ease;
    will-change: transform;
  }
  .mct-main-cta:active, .mct-gallery-button:active, .mct-final-cta:active, .mct-final-secondary:active, .mct-sticky:active, .mct-more-services:active, .mct-tab:active {
    transform: translate3d(0,1px,0) scale(.985);
    filter: brightness(.985);
  }
  .mct-gallery-button:active, .mct-final-secondary:active { box-shadow: inset 0 1px 3px rgba(65,52,47,.08); }
  @media (prefers-reduced-motion: reduce) {
    .mct-tabs-swipe-cue { animation:none; }
    .mct-main-cta, .mct-gallery-button, .mct-final-cta, .mct-final-secondary, .mct-sticky, .mct-more-services, .mct-tab { transition:none; }
  }
}
`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
console.log(`TANEM Master Template applied: ${site.template?.serviceMode || "simple"} services, ${site.promotions?.length || 0} promotions.`);
