import fs from "node:fs";
import site from "../site-data.mjs";

const componentPath = "app/mobile-claytone.tsx";
const cssPath = "app/globals.css";

let source = fs.readFileSync(componentPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

const phone = String(site.contacts?.phoneHref || "").trim();
const personalTelegram = String(site.contacts?.personalTelegramUrl || "").trim();
const channelTelegram = String(site.contacts?.channelTelegramUrl || "").trim();
const mapUrl = String(site.links?.mapUrl || "").trim();
const promotions = Array.isArray(site.promotions) ? site.promotions : [];
const heroTitle = String(site.master?.heroTitle || site.master?.name || "").trim();

// Long client names/titles must never collide visually.
source = source.replace(
  /<h1(?: className="[^"]*")?>([\s\S]*?)<\/h1>/,
  `<h1 className="tanem-hero-title${heroTitle.length > 32 ? " tanem-hero-title-long" : ""}">$1</h1>`,
);

// Empty communication methods are not buttons. Remove them from header and final contact block.
if (!personalTelegram) {
  source = source.replace(/\s*<a className="dct-top-icon" href=\{personalTelegramUrl\}[\s\S]*?<\/a>/, "");
  source = source.replace(/\s*<a className="mct-final-secondary" href=\{personalTelegramUrl\}[\s\S]*?<\/a>/, "");
}
if (!channelTelegram) {
  source = source.replace(/\s*<a className="mct-final-secondary" href=\{channelTelegramUrl\}[\s\S]*?<\/a>/, "");
}
if (!mapUrl) {
  source = source.replace(/\s*<a className="dct-top-icon" href=\{mapUrl\}[\s\S]*?<\/a>/, "");
  source = source.replace(/\s*<a className="mct-final-secondary" href=\{mapUrl\}[\s\S]*?<\/a>/, "");
}

const contactCount = [phone, personalTelegram, channelTelegram, mapUrl].filter(Boolean).length;

// A single promotion is a feature card, not a carousel.
if (promotions.length === 1) {
  source = source.replace(
    'className={`mct-promotion-list${promotionHinting ? " is-hinting" : ""}`}',
    'className={`mct-promotion-list is-single${promotionHinting && promotions.length > 1 ? " is-hinting" : ""}`}',
  );
  source = source.replace(
    'if (!promotionInView || activePromotion !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;',
    'if (promotions.length <= 1 || !promotionInView || activePromotion !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;',
  );
}

// Desktop gallery: hovering must not stop autoplay. Manual drag begins only after a deliberate press + movement.
source = source.replace('              onMouseEnter={() => pauseDesktopGallery()}\n', '');
source = source.replace(
  '              onMouseLeave={() => { if (desktopGalleryPointerStartRef.current === null) resumeDesktopGallery(); }}',
  '              onMouseLeave={() => { if (desktopGalleryPointerStartRef.current !== null) resumeDesktopGallery(); }}',
);
source = source.replace(
  '              onMouseLeave={resumeDesktopGallery}',
  '              onMouseLeave={() => { if (desktopGalleryPointerStartRef.current !== null) resumeDesktopGallery(); }}',
);
source = source.replace(
`  const moveDesktopGallery = (clientX: number) => {
    const start = desktopGalleryPointerStartRef.current;
    if (start === null) return;
    const distance = clientX - start;
    if (Math.abs(distance) > 7) desktopGalleryWasDraggedRef.current = true;
    setDesktopGalleryOffset(desktopGalleryStartOffsetRef.current + distance);
  };`,
`  const moveDesktopGallery = (clientX: number) => {
    const start = desktopGalleryPointerStartRef.current;
    if (start === null) return;
    const distance = clientX - start;
    const threshold = 12;
    if (!desktopGalleryWasDraggedRef.current && Math.abs(distance) < threshold) return;
    desktopGalleryWasDraggedRef.current = true;
    const adjustedDistance = distance > 0 ? distance - threshold : distance + threshold;
    setDesktopGalleryOffset(desktopGalleryStartOffsetRef.current + adjustedDistance);
  };`,
);
source = source.replace(
  '              ref={desktopGalleryViewportRef}\n',
  '              ref={desktopGalleryViewportRef}\n              onDragStart={(event) => event.preventDefault()}\n',
);

css += `

/* TANEM adaptive polish: safe titles, real contacts, one-promotion mode. */
.tanem-hero-title {
  text-wrap: balance;
  overflow-wrap: normal;
}
.tanem-hero-title em {
  margin-top: .08em;
  line-height: .96 !important;
}
.dct-service-description:empty,
.mct-service-name small:empty {
  display: none !important;
}

/* Keep the client name together in the portfolio caption. */
#mobile-portfolio .mct-section-note {
  white-space: nowrap !important;
  max-width: none !important;
}

/* Desktop filmstrip: images never become browser drag ghosts. */
.dct-gallery-viewport,
.dct-gallery-track,
.dct-film-frame,
.dct-film-frame img {
  user-select: none !important;
  -webkit-user-select: none !important;
}
.dct-film-frame img {
  -webkit-user-drag: none !important;
  pointer-events: none !important;
}

@media (max-width: 767px) {
  .tanem-hero-title {
    line-height: .96 !important;
    letter-spacing: -.035em !important;
  }
  .tanem-hero-title-long {
    font-size: clamp(32px, 9.5vw, 40px) !important;
    line-height: .98 !important;
  }

  /* Service cards need breathing room; secondary details stay visually quiet. */
  .mct-service-row {
    padding-block: 17px !important;
    column-gap: 15px !important;
    min-height: 78px !important;
    align-items: center !important;
  }
  .mct-service-name {
    min-width: 0 !important;
  }
  .mct-service-name strong {
    display: block !important;
    font-size: 14px !important;
    line-height: 1.28 !important;
    letter-spacing: -.012em !important;
  }
  .mct-service-name .dct-service-description {
    display: block !important;
    margin: 5px 0 0 !important;
    max-width: 29ch !important;
    color: rgba(66, 54, 49, .58) !important;
    font: 500 11.5px/1.36 "Manrope", Arial, sans-serif !important;
    letter-spacing: 0 !important;
  }
  .mct-service-name small {
    display: block !important;
    margin-top: 6px !important;
    line-height: 1.25 !important;
  }
  .mct-service-action {
    min-width: 88px !important;
    align-self: center !important;
  }

  /* Give service category pills a little more separation without changing the Tahmina ribbon idea. */
  .mct-tabs-track {
    gap: 8px !important;
    padding: 5px !important;
  }
  .mct-tabs-scroll .mct-tab {
    padding-inline: 18px !important;
  }

  #mobile-portfolio .mct-section-note {
    font-size: 10.5px !important;
    letter-spacing: -.015em !important;
  }

  .mct-final-contact-grid {
    grid-template-columns: ${contactCount <= 1 ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))"} !important;
    width: 100% !important;
    max-width: ${contactCount <= 1 ? "360px" : "none"};
    margin-inline: ${contactCount <= 1 ? "auto" : "0"} !important;
  }

  .mct-promotion-list.is-single {
    display: flex !important;
    justify-content: center !important;
    overflow: hidden !important;
    scroll-snap-type: none !important;
    padding-inline: 21px !important;
  }
  .mct-promotion-list.is-single .mct-promotion-card {
    width: min(calc(100vw - 42px), 420px) !important;
    flex: 0 0 min(calc(100vw - 42px), 420px) !important;
    animation: none !important;
    scroll-snap-align: none !important;
  }
  .mct-promotion-list.is-single + .mct-promotion-pagination,
  .mct-promotion-list.is-single ~ .mct-promotion-pagination {
    display: none !important;
  }
}

@media (min-width: 768px) {
  .tanem-hero-title {
    line-height: .94 !important;
    letter-spacing: -.038em !important;
  }
  .tanem-hero-title-long {
    font-size: clamp(52px, 4.45vw, 72px) !important;
    line-height: .97 !important;
  }

  /* Desktop contact actions belong to the left side of the composition. */
  .mct-final-contact-grid {
    grid-template-columns: repeat(${Math.max(1, Math.min(contactCount, 4))}, minmax(240px, 340px)) !important;
    justify-content: start !important;
    width: min(100%, ${contactCount <= 2 ? "760px" : "1280px"}) !important;
    margin-inline: 0 !important;
  }

  .mct-promotion-list.is-single {
    display: flex !important;
    width: min(calc(100% - 96px), 1180px) !important;
    margin-inline: auto !important;
    justify-content: center !important;
    overflow: visible !important;
    scroll-snap-type: none !important;
  }
  .mct-promotion-list.is-single .mct-promotion-card {
    display: grid !important;
    grid-template-columns: minmax(330px, .92fr) minmax(390px, 1.08fr) !important;
    grid-template-rows: minmax(390px, 1fr) !important;
    width: min(100%, 1040px) !important;
    max-width: 1040px !important;
    min-height: 420px !important;
    flex: 0 1 1040px !important;
    animation: none !important;
    scroll-snap-align: none !important;
  }
  .mct-promotion-list.is-single .mct-promotion-card figure {
    min-height: 100% !important;
  }
  .mct-promotion-list.is-single .mct-promotion-card img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
  .mct-promotion-list.is-single .mct-promotion-copy {
    justify-content: center !important;
    padding: clamp(34px, 4vw, 62px) !important;
  }
  .mct-promotion-list.is-single + .mct-promotion-pagination,
  .mct-promotion-list.is-single ~ .mct-promotion-pagination {
    display: none !important;
  }
}
`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
console.log(`TANEM polish applied: contacts=${contactCount}, promotions=${promotions.length}, longHero=${heroTitle.length > 32}.`);
