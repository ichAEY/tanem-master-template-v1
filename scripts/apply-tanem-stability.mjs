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
    const component = `function TanemServiceDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const value = String(text || "").trim();
  if (!value) return null;

  const limit = 46;
  if (value.length <= limit) return <p className="dct-service-description tanem-service-description">{value}</p>;

  const rawCut = value.lastIndexOf(" ", limit);
  const cut = rawCut > 24 ? rawCut : limit;
  const preview = value.slice(0, cut).trimEnd();
  const rest = value.slice(cut).trimStart();

  return (
    <p className="dct-service-description tanem-service-description">
      <span>{preview}{open ? " " + rest : "…"}</span>{" "}
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Скрыть" : "Показать еще..."}
      </button>
    </p>
  );
}`;
    source = source.replace(typeMarker, `${typeMarker}\n\n${component}`);
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

css += `

/* TANEM stability layer: no layout rebuilds, only paint and interaction fixes. */
.tanem-service-description {
  max-width: 38ch;
}
.tanem-service-description button {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8b7167;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: .06em;
  text-underline-offset: .2em;
}
.tanem-skill-highlight {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  white-space: nowrap;
  text-align: center !important;
  color: transparent !important;
  background: linear-gradient(105deg,#5b4840 0 42%,#fffaf5 49%,#b99484 52%,#5b4840 59% 100%) 130% / 260% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: tanemSkillShine 4.5s ease-in-out infinite;
}
@keyframes tanemSkillShine {
  0%,68% { background-position: 130% 50%; }
  84%,100% { background-position: -30% 50%; }
}
@media (max-width: 767px) {
  .tanem-service-description { max-width: 30ch !important; }
}
@media (prefers-reduced-motion: reduce) {
  .tanem-skill-highlight {
    color: #494441 !important;
    background: none !important;
    animation: none !important;
  }
}
`;

fs.writeFileSync(componentPath, source, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
console.log(`TANEM stability layer applied. Font CSS patched: ${patchedFontFiles}.`);
