    const lenis = new Lenis({
  orientation: "vertical",
  //lerp: 0.1,
  smooth: true,
  autoRaf: true
  //allowNestedScroll: true,
});
/* =========================================================
     INCIDENT DATA
     Add new entries to this array — that's it, nothing else
     in this file needs to change.

     Fields:
       date:     "YYYY-MM-DD" (used for sorting + display)
       title:    short headline of the incident
       location: trail / area name
       type:     one of "rescue" | "injury" | "fatality" | "search" | "closure" | "other"
                 (controls the marker/tag color)
       deaths:   number of deaths (fatality entries only; defaults to 1 if omitted)
       category: one of "fall" | "aviation" | "hike" | "natural" | "murder" | "unknown"
                 (fatality entries only; drives the filter chips + category color)
       cause:    short cause tag, e.g. "Fall", "Mid-air collision" (optional, fatality entries)
       desc:     1-3 sentence summary
     ========================================================= */
const INCIDENTS = [
  {
    date: "2024-06-14",
    title: "Heat exhaustion rescue near river",
    location: "Bright Angel Trail",
    type: "rescue",
    desc:
      "Hiker treated for heat exhaustion after ascending during peak afternoon heat; helicopter evacuation from Indian Garden."
  },
  {
    date: "2023-08-02",
    title: "Overdue hiker located after two-day search",
    location: "Tonto Trail",
    type: "search",
    desc:
      "Solo hiker reported overdue by family; located dehydrated but stable after a two-day ground and air search."
  },
  {
    date: "2022-11-19",
    title: "Trail closure following rockfall",
    location: "South Kaibab Trail",
    type: "closure",
    desc:
      "Section of trail closed for 48 hours after a rockfall damaged switchbacks near Cedar Ridge."
  },
  {
    date: "2021-07-09",
    title: "Ankle fracture on descent",
    location: "Hermit Trail",
    type: "injury",
    desc:
      "Hiker fractured an ankle on loose scree roughly three miles in; assisted out by park rescue team."
  },
  {
    date: "2019-05-27",
    title: "Fatality attributed to fall near rim",
    location: "Near Mather Point",
    type: "fatality",
    deaths: 1,
    category: "fall",
    cause: "Fall",
    desc:
      "Visitor fell from an unprotected section of the rim while attempting a photograph. Reported by park officials."
  },
  {
    date: "2018-02-10",
    title: "Papillon Grand Canyon Helicopters crash",
    location: "Quartermaster Canyon, Hualapai tribal land",
    type: "fatality",
    deaths: 5,
    category: "aviation",
    cause: "Helicopter crash",
    desc:
      "An Airbus EC130 B4 tour helicopter crashed and caught fire in a remote section of the canyon. Five British tourists died from the impact and subsequent fire."
  },
  {
    date: "1991-05-13",
    title: "Air Grand Canyon Cessna 207 crash",
    location: "Forested area near the canyon",
    type: "fatality",
    deaths: 7,
    category: "aviation",
    cause: "Engine failure",
    desc:
      "A single-engine Cessna 207 tour plane suffered catastrophic engine failure and crashed into dense forest eight minutes after takeoff, killing the pilot and six passengers."
  },
  {
    date: "1989-09-27",
    title: "Grand Canyon Airlines Flight 5 crash",
    location: "Grand Canyon National Park Airport",
    type: "fatality",
    deaths: 10,
    category: "aviation",
    cause: "Aborted landing",
    desc:
      "A De Havilland Twin Otter scenic tour plane crashed into a wooded hill during an aborted landing (go-around). Eight passengers and both crew members died."
  },
  {
    date: "1986-06-18",
    title: "Grand Canyon Airlines & Helitech mid-air collision",
    location: "Near Crystal Rapids",
    type: "fatality",
    deaths: 25,
    category: "aviation",
    cause: "Mid-air collision",
    desc:
      "A De Havilland Twin Otter sightseeing plane and a Bell 206 helicopter collided mid-air during scenic tours. All 20 aboard the plane and all 5 aboard the helicopter were killed, prompting strict new rules on tour flight altitudes and corridors."
  },
  {
    date: "1956-06-30",
    title: "The Great Mid-Air Collision",
    location:
      "Confluence of the Colorado & Little Colorado, near Temple & Chuar Buttes",
    type: "fatality",
    deaths: 128,
    category: "aviation",
    cause: "Mid-air collision",
    desc:
      "TWA Flight 2 and United Airlines Flight 718 collided at 21,000 feet directly over the canyon after both pilots deviated from their routes for a better view of the landscape. Flying under visual rules in uncontrolled airspace, neither crew saw the other in time. The deadliest disaster in the park's history, it directly led Congress to establish the FAA and require radar control over commercial flights."
  }
];

/* ========================================================= */

const TYPE_COLORS = {
  rescue: "#5B84A0",
  injury: "#C97C4B",
  fatality: "#4A3140",
  search: "#6B7A5E",
  closure: "#A6512C",
  other: "#8a7a5c"
};

const CATEGORY_COLORS = {
  fall: "#B5502C",
  aviation: "#5B84A0",
  hike: "#6B7A5E",
  natural: "#7B5EA8",
  murder: "#4A3140",
  unknown: "#9C9080"
};
const CATEGORY_LABELS = {
  fall: "Fall",
  aviation: "Aviation",
  hike: "Hiking",
  natural: "Natural Causes",
  murder: "Murder",
  unknown: "Unknown"
};

let activeCategory = "all";

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderCategoryFilter() {
  const el = document.getElementById("categoryFilter");
  const present = [
    ...new Set(
      INCIDENTS.filter((i) => i.type === "fatality" && i.category).map(
        (i) => i.category
      )
    )
  ];
  const chips = ["all", ...present];
  el.innerHTML = chips
    .map((cat) => {
      const isAll = cat === "all";
      const color = isAll
        ? "var(--plum)"
        : CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown;
      const label = isAll ? "All" : CATEGORY_LABELS[cat] || cat;
      const activeClass = cat === activeCategory ? "is-active" : "";
      return `<button class="category-chip ${activeClass}" style="--chip-color:${color}" data-category="${cat}">${label}</button>`;
    })
    .join("");

  el.querySelectorAll(".category-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderCategoryFilter();
      renderTimeline();
      renderHeatmap();
    });
  });
}

function renderTimeline() {
  const filtered = INCIDENTS.filter((item) => {
    if (item.type !== "fatality") return true; // non-fatality entries always shown
    if (activeCategory === "all") return true;
    return item.category === activeCategory;
  });
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const container = document.getElementById("strata");
  container.innerHTML = sorted
    .map((item) => {
      const color = TYPE_COLORS[item.type] || TYPE_COLORS.other;
      const isFatality = item.type === "fatality";
      const deathBadge = isFatality
        ? `<span class="stratum__deaths">${item.deaths || 1} ${
            (item.deaths || 1) === 1 ? "death" : "deaths"
          }</span>`
        : "";
      const catColor =
        isFatality && item.category
          ? CATEGORY_COLORS[item.category] || CATEGORY_COLORS.unknown
          : null;
      const categoryBadge = catColor
        ? `<span class="stratum__category" style="--cat-color:${catColor}">${
            CATEGORY_LABELS[item.category] || item.category
          }</span>`
        : "";
      const causeTag =
        isFatality && item.cause
          ? `<span class="stratum__cause">${item.cause}</span>`
          : "";
      return `
        <article class="stratum" style="--marker-color:${color}" data-year="${new Date(
        item.date
      ).getFullYear()}" data-type="${item.type}">
          <div class="stratum__head">
            <span class="stratum__date">${formatDate(item.date)}</span>
            <span class="stratum__tags">${categoryBadge}${deathBadge}<span class="stratum__type">${
        item.type
      }</span></span>
          </div>
          <h3 class="stratum__title">${item.title}</h3>
          <div class="stratum__location">${item.location} ${causeTag}</div>
          <p class="stratum__desc">${item.desc}</p>
        </article>
      `;
    })
    .join("");

  // stats (reflect the full dataset, not the category filter)
  document.getElementById("statCount").textContent = INCIDENTS.length;
  if (INCIDENTS.length) {
    const years = INCIDENTS.map((i) => new Date(i.date).getFullYear());
    const min = Math.min(...years),
      max = Math.max(...years);
    document.getElementById("statSpan").textContent =
      min === max ? min : min + "–" + max;
  }

  // reveal-on-scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".stratum").forEach((el) => observer.observe(el));
}

function renderHeatmap() {
  const fatalities = INCIDENTS.filter(
    (i) =>
      i.type === "fatality" &&
      (activeCategory === "all" || i.category === activeCategory)
  );
  const counts = document.getElementById("heatmap");
  if (!fatalities.length) {
    const label =
      activeCategory === "all"
        ? "fatalities"
        : (CATEGORY_LABELS[activeCategory] || activeCategory).toLowerCase() +
          " fatalities";
    counts.innerHTML = `<p style="font-family:var(--font-mono); font-size:0.75rem; opacity:0.6;">No ${label} logged yet.</p>`;
    document.getElementById("heatmapSummary").textContent = "";
    return;
  }

  const years = fatalities.map((i) => new Date(i.date).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years, new Date().getFullYear());

  const deathsByYear = {};
  const incidentsByYear = {};
  fatalities.forEach((i) => {
    const y = new Date(i.date).getFullYear();
    deathsByYear[y] = (deathsByYear[y] || 0) + (i.deaths || 1);
    incidentsByYear[y] = (incidentsByYear[y] || 0) + 1;
  });

  const totalDeaths = Object.values(deathsByYear).reduce((a, b) => a + b, 0);

  /* ---------------------------------------------------------
       HEATMAP COLOR SCALE — edit the "color" values below to
       swap in your own palette. Buckets and labels can also be
       changed; "max" is the upper bound (inclusive) for that
       bucket, use Infinity for the last one.
       --------------------------------------------------------- */
  const HEATMAP_SCALE = [
    { max: 0, color: "#EFE3C8", label: "0" },
    { max: 5, color: "#E3B88C", label: "1–5" },
    { max: 10, color: "#D98F62", label: "6–10" },
    { max: 20, color: "#C2673F", label: "11–20" },
    { max: 50, color: "#8C4A32", label: "21–50" },
    { max: Infinity, color: "#4A3140", label: "51+" }
  ];
  function colorFor(deaths) {
    const bucket = HEATMAP_SCALE.find((b) => deaths <= b.max);
    return bucket
      ? bucket.color
      : HEATMAP_SCALE[HEATMAP_SCALE.length - 1].color;
  }

  // render the legend from the same scale so it never drifts out of sync
  document.getElementById("heatmapLegend").innerHTML = HEATMAP_SCALE.map(
    (b) => `
      <span class="heatmap-legend__item">
        <span class="heatmap-legend__swatch" style="background:${b.color}"></span>
        <span>${b.label}</span>
      </span>
    `
  ).join("");

  let html = "";
  for (let y = minYear; y <= maxYear; y++) {
    const deaths = deathsByYear[y] || 0;
    const incidentCount = incidentsByYear[y] || 0;
    const clickable = deaths > 0;
    const showLabel = y % 5 === 0 || deaths > 0;
    const tooltip = deaths
      ? `${y}: ${deaths} death${
          deaths === 1 ? "" : "s"
        } (${incidentCount} incident${incidentCount === 1 ? "" : "s"})`
      : `${y}: no recorded fatalities`;
    html += `
        <div class="heatmap-cell" data-clickable="${clickable}" data-year="${y}" title="${tooltip}">
          <div class="heatmap-cell__swatch" style="background:${colorFor(
            deaths
          )}"></div>
          <div class="heatmap-cell__year">${showLabel ? y : ""}</div>
        </div>
      `;
  }
  counts.innerHTML = html;

  document.getElementById("heatmapSummary").innerHTML =
    `${totalDeaths} total lives lost, ${minYear}–${maxYear}` +
    `<br><span class="heatmap-context">Aviation incidents account for the majority of recorded deaths — most occurred before tour-flight altitude and corridor restrictions were established in the late 1980s and 1990s.</span>`;

  counts.querySelectorAll('[data-clickable="true"]').forEach((cell) => {
    cell.addEventListener("click", () => {
      const year = cell.dataset.year;
      const target = document.querySelector(
        `.stratum[data-year="${year}"][data-type="fatality"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.outline = "2px solid var(--plum)";
        setTimeout(() => {
          target.style.outline = "none";
        }, 1400);
      }
    });
  });
}

renderCategoryFilter();
renderTimeline();
renderHeatmap();