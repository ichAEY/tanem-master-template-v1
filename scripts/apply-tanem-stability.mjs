import fs from "node:fs";
import path from "node:path";
import site from "../site-data.mjs";

const componentPath = "app/mobile-claytone.tsx";
const cssPath = "app/globals.css";
let source = fs.readFileSync(componentPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

// Prevent the visible fallback -> brand-font swap on first paint.
// Font files are local in the bundle, so a short block period is preferable to a wrong-font flash.
const fontPackages = ["cormorant-garamond", "manrope"];
let patchedFontFiles = 0;
for (const pkg of fontPackages) {
  const dir = path.join("node_modules", "@fontsource", pkg);
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".css")) continue;
    const file = path.join(dir, entry);
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(/font-display\s*:\s*swap/g, "font-display:block");
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      patchedFontFiles += 1;
    }
  }
}

// Long descriptions stay compact and expand in place instead of making every service row huge.
if (!source.includes("function TanemServiceDescription")) {
  const typeMarker = "type Service = { name: string; price: string; time: string; description: string; url: string };";
  if (source.includes(typeMarker)) {
    source = source.replace(typeMarker, `${typeMarker}\n\nfunction TanemServiceDescription({ text }: { text: string }) {\n  const [open, setOpen] = useState(false);\n  const value = String(text || \"\").trim();\n  if (!value) return null;\n\n  const limit = 46;\n  if (value.length <= limit) return <p className=\"dct-service-description tanem-service-description\">{value}</p>;\n\n  const rawCut = value.lastIndexOf(\" \", limit);\n  const cut = rawCut > 24 ? rawCut : limit;\n  const preview = value.slice(0, cut).trimEnd();\n  const rest = value.slice(cut).trimStart();\n\n  return (\n    <p className=\"dct-service-description tanem-service-description\">\n      <span>{preview}{open ? \\` ${rest}\\` : \"…\"}</span>{\" \"}\n      <button type=\"button\" aria-expanded={open} onClick={() => setOpen((value) => !value)}>\n        {open ? \"Скрыть\" : \"Показать еще...\"}\n      </button>\n    </p>\n  );\n}`);
  }
}
source = source.replaceAll(
  '<p className="dct-service-description">{service.description}</p>',
  '<TanemServiceDescription text={service.description} />',
);

// Client-specific label for the factual info block.
const amenitiesTitle = String(site.amenitiesHeading?.title || "Удобства для визита").trim();
const amenitiesNote = String(site.amenitiesHeading?.note || "Всё необходимое для спокойного посещения").trim();
source = source.replace(
  '<div className="mct-amenities-head"><p className="mct-section-kicker">Удобства для визита</p><span>Всё необходимое для спокойного посещения</span></div>',
  `<div className="mct-amenities-head"><p className="mct-section-kicker">${amenitiesTitle}</p><span>${amenitiesNote}</span></div>`,
);
source = source.replace(/aria-label="Удобства для визита в [^"]*"/, `aria-label="${amenitiesTitle}"`);

// One highlighted expertise item may occupy its own centered row without leaving an empty grid cell.
const highlightedSkill = String(site.master?.highlightSkill || "").trim();
if (highlightedSkill) {
  source = source.replace(
    `<li>${highlightedSkill}</li>`,
    `<li className="tanem-skill-highlight">${highlightedSkill}</li>`,
  );
}

css += `\n\n/* TANEM stability layer: no layout rebuilds, only paint and interaction fixes. */\n.tanem-service-description {\n  max-width: 38ch;\n}\n.tanem-service-description button {\n  display: inline;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: #8b7167;\n  cursor: pointer;\n  font: inherit;\n  font-weight: 600;\n  text-decoration: underline;\n  text-decoration-thickness: .06em;\n  text-underline-offset: .2em;\n}\n.tanem-skill-highlight {\n  grid-column: 1 / -1 !important;\n  width: 100% !important;\n  white-space: nowrap;\n  text-align: center !important;\n  color: transparent !important;\n  background: linear-gradient(105deg,#5b4840 0 42%,#fffaf5 49%,#b99484 52%,#5b4840 59% 100%) 130% / 260% 100%;\n  -webkit-background-clip: text;\n  background-clip: text;\n  animation: tanemSkillShine 4.5s ease-in-out infinite;\n}\n@keyframes tanemSkillShine {\n  0%,68% { background-position: 130% 50%; }\n  84%,100% { background-position: -30% 50%; }\n}\n@media (max-width: 767px) {\n  .tanem-service-description { max-width: 30ch !important; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .tanem-skill-highlight {\n    color: #494441 !important;\n    background: none !important;\n    animation: none !important;\n  }\n}\n`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
console.log(`TANEM stability layer applied. Font CSS patched: ${patchedFontFiles}.`);
