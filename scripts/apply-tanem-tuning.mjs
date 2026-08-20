import fs from "node:fs";

const componentPath = "app/mobile-claytone.tsx";
const cssPath = "app/globals.css";

let source = fs.readFileSync(componentPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

// Desktop gallery: do not pause/capture on a simple mouse press.
// Drag starts only after a deliberate left-button movement threshold.
const oldHandlers = `              onPointerDown={(event) => {
                if (!event.isPrimary) return;
                pauseDesktopGallery(event.clientX);
                if (event.pointerType === "mouse" && !event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!event.isPrimary || desktopGalleryPointerStartRef.current === null) return;
                moveDesktopGallery(event.clientX);
              }}`;

const newHandlers = `              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                desktopGalleryPointerStartRef.current = event.clientX;
                desktopGalleryStartOffsetRef.current = desktopGalleryOffsetRef.current;
                desktopGalleryWasDraggedRef.current = false;
              }}
              onPointerMove={(event) => {
                const start = desktopGalleryPointerStartRef.current;
                if (!event.isPrimary || start === null) return;
                if (event.pointerType === "mouse" && (event.buttons & 1) !== 1) {
                  resumeDesktopGallery();
                  return;
                }

                const distance = event.clientX - start;
                const threshold = 16;
                if (!desktopGalleryWasDraggedRef.current && Math.abs(distance) < threshold) return;

                if (!desktopGalleryWasDraggedRef.current) {
                  desktopGalleryWasDraggedRef.current = true;
                  desktopGalleryPausedRef.current = true;
                  setDesktopGalleryPaused(true);
                  if (event.pointerType === "mouse" && !event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                }

                event.preventDefault();
                const adjustedDistance = distance > 0 ? distance - threshold : distance + threshold;
                setDesktopGalleryOffset(desktopGalleryStartOffsetRef.current + adjustedDistance);
              }}`;

if (!source.includes(oldHandlers)) {
  throw new Error("TANEM tuning: desktop gallery handler marker not found");
}
source = source.replace(oldHandlers, newHandlers);

css += `

/* TANEM final tuning — preserve the successful mobile layout, improve legibility and desktop interaction. */
@media (max-width: 767px) {
  /* Restore the original prominent service-title size; secondary detail remains compact. */
  .mct-service-name strong {
    font: 600 clamp(17px, 5vw, 20px)/1.05 "Cormorant Garamond", Georgia, serif !important;
    letter-spacing: -.012em !important;
  }
}

@media (min-width: 768px) {
  /* Every service category stays on one visual line. */
  .mct-tabs-track {
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 5px !important;
  }
  .mct-tabs-scroll .mct-tab {
    min-width: 0 !important;
    padding-inline: clamp(7px, .8vw, 12px) !important;
    white-space: nowrap !important;
    font-size: clamp(10px, .82vw, 12px) !important;
    line-height: 1 !important;
  }

  .dct-gallery-viewport {
    cursor: grab !important;
  }
  .dct-gallery-viewport.is-paused {
    cursor: grabbing !important;
  }
}
`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
console.log("TANEM final tuning applied: mobile service titles, nowrap desktop tabs, deliberate gallery drag.");
