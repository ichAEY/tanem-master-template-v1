const bookingUrl = "";
const service = (name, price, time = "", description = "") => ({ name, price, time, description, url: bookingUrl });

const portfolioCount = 0;

export default {
  template: {
    serviceMode: "simple", // "simple" | "categories"
    portfolioPreviewCount: 5,
  },

  brand: {
    name: "",
    subtitle: "Nail studio",
    monogram: "T",
  },

  master: {
    name: "",
    dative: "",
    genitive: "",
    monogram: "T",
    profession: "мастер маникюра и педикюра",
    heroTitle: "",
    heroCopy: "",
    experienceYears: "",
    experienceAria: "",
    aboutTitle: "",
    aboutLead: "",
    aboutParagraphs: ["", ""],
    skills: [],
  },

  location: {
    city: "",
    metro: "",
    cityMetro: "",
    address: "",
    mapCardAddress: "",
    schedule: "",
    scheduleCapitalized: "",
    latitude: 0,
    longitude: 0,
  },

  contacts: {
    phoneDisplay: "",
    phoneHref: "",
    personalTelegramUrl: "",
    channelTelegramUrl: "",
  },

  links: {
    bookingUrl,
    bookingWidgetScriptUrl: "/noop.js",
    reviewsUrl: "",
    mapUrl: "",
    routeUrl: "",
    mobileMapEmbedUrl: "",
    desktopMapEmbedUrl: "",
    yandexMapHrefMatch: "",
  },

  reputation: {
    rating: "",
    reviewCount: "",
  },

  images: {
    portrait: "/assets/client/master.jpg",
    about: "/assets/client/master.jpg",
    favicon: "/assets/client/logo.jpg",
    beforeAfter: [],
    gallery: Array.from({ length: portfolioCount }, (_, index) => ({
      src: `/assets/client/portfolio/${String(index + 1).padStart(2, "0")}.jpg`,
      alt: `Работа мастера — фото ${index + 1}`,
    })),
  },

  // SIMPLE mode: use these two arrays. This preserves the compact Nonna-style selector.
  services: {
    manicure: [
      // service("Название услуги", "0 ₽", "1 ч"),
    ],
    pedicure: [
      // service("Название услуги", "0 ₽", "1 ч"),
    ],
  },

  // CATEGORIES mode: rename/add/remove top-level categories and fill their items.
  // These are structural placeholders, not client data.
  serviceCategories: [
    { key: "manicure", label: "Маникюр", items: [] },
    { key: "pedicure", label: "Педикюр", items: [] },
    { key: "podology", label: "Подология", items: [] },
    { key: "training", label: "Обучение", items: [] },
  ],

  reviews: [],

  // Empty array = the whole promotions block and its navigation links are removed.
  promotions: [],

  amenities: [],

  seo: {
    title: "",
    description: "",
    keywords: [],
    locale: "ru_RU",
  },

  analytics: {
    yandexMetrikaId: "",
  },
};
