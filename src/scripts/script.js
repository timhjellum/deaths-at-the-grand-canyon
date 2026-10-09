// Dark & Light toggle

document.querySelector(".day-night input").addEventListener("change", () => {
  document.querySelector("body").classList.add("toggle");
  setTimeout(() => {
    document.querySelector("body").classList.toggle("light");

    setTimeout(
      () => document.querySelector("body").classList.remove("toggle"),
      10
    );
  }, 5);
});


(async function () {
  "use strict";

  /* ============ DATA ============
	   records.json is generated from Grand_Canyon_Death_Register.xlsx
	   (Records sheet) by build-records.py. Re-run that script after
	   editing the spreadsheet -- nothing in this file needs to change. */
  var MONTH_NUM = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12"
  };

  async function loadRecords() {
    try {
      var res = await fetch("/records.json", { cache: "no-cache" });
      if (res && res.ok) {
        var json = await res.json();
        if (Array.isArray(json)) return json;
      }
    } catch (e) {
      /* fall through */
    }
    return [];
  }

  document.documentElement.classList.add("is-loading");
  var RECORDS = await loadRecords();
  document.documentElement.classList.remove("is-loading");

  RECORDS.forEach(function (r) {
    if (!r.gender) r.gender = "U";
  });

  /* ============ ORDERS / LABELS ============ */
  var CAUSE_ORDER = [
    "Aircraft / vehicle",
    "Fall",
    "Intentional",
    "Cardiac / heat",
    "Drowning",
    "Other medical",
    "Flash flood",
    "Exposure",
    "Rockfall",
    "Lightning",
    "Other",
    "Unknown"
  ];
  var STATUS_ORDER = ["Historical", "NPS record", "Park / news"];
  var AGE_ORDER = ["0-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  var GENDER_ORDER = ["M", "F", "U"];
  var GENDER_LABEL = { M: "Male", F: "Female", U: "Unknown" };

  var YEAR_ORDER = Array.from(
    new Set(
      RECORDS.map(function (r) {
        return r.year;
      }).filter(Boolean)
    )
  ).sort(function (a, b) {
    return +a - +b;
  });

  // Sidebar: one row per decade that has records.
  var DECADES = Array.from(
    new Set(
      RECORDS.map(function (r) {
        return r.decade;
      }).filter(Boolean)
    )
  ).sort();
  var decadeCounts = {};
  RECORDS.forEach(function (r) {
    if (r.decade) decadeCounts[r.decade] = (decadeCounts[r.decade] || 0) + 1;
  });

  // Victims per incident, for the "one of N" note in each story.
  var incidentSize = {};
  RECORDS.forEach(function (r) {
    incidentSize[r.incidentId] = (incidentSize[r.incidentId] || 0) + 1;
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(r) {
    if (!r.year) return "—";
    var mm = r.month && MONTH_NUM[r.month] ? MONTH_NUM[r.month] : "--";
    var dd = r.day ? ("0" + r.day).slice(-2) : "--";
    return mm + "/" + dd + "/" + r.year;
  }

  function safeUrl(u) {
    return /^https?:\/\//i.test(u || "") ? u : null;
  }

  function linkLabel(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "source";
    }
  }

  function storyHTML(r) {
    var headline = r.name || r.nameNote || "Unidentified";
    var html = "<h3 class='story-headline'>" + escapeHtml(headline) + "</h3>";
    if (r.summary) html += "<p>" + escapeHtml(r.summary) + "</p>";

    var n = incidentSize[r.incidentId] || 1;
    if (n > 1) {
      html +=
        "<p class='story-note'>One of " +
        n +
        " people recorded in this incident. <button type='button' class='incident-link' data-incident='" +
        escapeHtml(r.incidentId) +
        "'>Show all " +
        n +
        "</button></p>";
    }

    var items = [];
    function add(label, val) {
      if (val)
        items.push("<li><strong>" + label + ":</strong> " + val + "</li>");
    }
    add("Location", r.location && escapeHtml(r.location));
    add("Cause category", escapeHtml(r.causeCategory));
    add("Reported cause", r.mechanism && escapeHtml(r.mechanism));
    if (r.ageExact != null) add("Age", String(r.ageExact));
    else if (r.ageRange) add("Age range", escapeHtml(r.ageRange));
    add("Date basis", r.dateBasis && escapeHtml(r.dateBasis));
    add("Record status", r.statusFull && escapeHtml(r.statusFull));
    add("Park scope", r.scope && escapeHtml(r.scope));
    add("Reference", r.sourceRef && escapeHtml(r.sourceRef));
    add("Notes", r.notes && escapeHtml(r.notes));
    var links = [r.sourceUrl, r.sourceUrl2]
      .map(safeUrl)
      .filter(Boolean)
      .map(function (u) {
        return (
          "<a href='" +
          escapeHtml(u) +
          "' target='_blank' rel='noopener noreferrer'>" +
          escapeHtml(linkLabel(u)) +
          "</a>"
        );
      });
    add("Source", links.join(" · "));
    html += "<ul class='story-list'>" + items.join("") + "</ul>";
    html += "<p class='story-id'>Record " + escapeHtml(r.recordId) + "</p>";
    return html;
  }

  /* ============ MASTHEAD STATS ============ */
  // slider.js clones each slide (minus ids) for its infinite loop, so
  // stats are written to every element sharing the data-stat key.
  function setStat(key, text) {
    document
      .querySelectorAll('[data-stat="' + key + '"]')
      .forEach(function (el) {
        el.textContent = text;
      });
  }
  (function updateStats() {
    setStat("entries", RECORDS.length.toLocaleString());

    var years = YEAR_ORDER.map(Number);
    var spanText = !years.length
      ? "—"
      : years[0] === years[years.length - 1]
      ? String(years[0])
      : years[0] + "–" + years[years.length - 1];
    setStat("span", spanText);
    document.getElementById("footerSpan").textContent = spanText;

    setStat("incidents", Object.keys(incidentSize).length.toLocaleString());

    var causeCounts = {};
    RECORDS.forEach(function (r) {
      causeCounts[r.cause] = (causeCounts[r.cause] || 0) + 1;
    });
    var topCause = Object.keys(causeCounts).sort(function (a, b) {
      return causeCounts[b] - causeCounts[a];
    })[0];
    setStat("cause", topCause || "—");

    var bigId = Object.keys(incidentSize).sort(function (a, b) {
      return incidentSize[b] - incidentSize[a];
    })[0];
    var big = RECORDS.find(function (r) {
      return r.incidentId === bigId;
    });
    if (big) {
      setStat("deadliest", incidentSize[bigId] + " · " + big.year);
      setStat(
        "deadliestSub",
        "Deadliest incident (" + big.cause.toLowerCase() + ")"
      );
    }
  })();

  /* ============ STATE ============ */
  // {dim:'decade'|'cause'|'status'|'age'|'gender'|'year'|'incidentId', value}
  var filter = null;
  var sortKey = "date";
  var sortDir = 1;

  function matches(r) {
    if (!filter) return true;
    return r[filter.dim] === filter.value;
  }

  function setFilter(dim, value) {
    if (filter && filter.dim === dim && filter.value === value) filter = null;
    else filter = { dim: dim, value: value };
    renderAll();
  }
  function clearFilter() {
    filter = null;
    renderAll();
  }

  /* ============ DECADE SIDEBAR / MOBILE DROPDOWN ============ */
  var decadeSort = "chrono"; // 'chrono' | 'deadly'

  function onDecadeChoose(d) {
    if (!d) {
      clearFilter();
      return;
    }
    setFilter("decade", d);
    var panel = document.getElementById("selectedPanel");
    if (panel && !panel.hidden) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function sortedDecades() {
    var list = DECADES.slice();
    if (decadeSort === "deadly") {
      list.sort(function (a, b) {
        return decadeCounts[b] - decadeCounts[a] || a.localeCompare(b);
      });
    }
    return list;
  }

  function decadeRowHTML(d) {
    return (
      '<div class="peak-item">' +
      '<button type="button" class="peak-row" data-decade="' +
      d +
      '" aria-expanded="false">' +
      '<svg class="peak-icon" viewBox="0 0 16 14" width="14" height="12" aria-hidden="true" focusable="false"><path d="M1 3 H5 L6 7 H10 L11 11 H15 V13 H1 Z"></path></svg>' +
      "<span class='peak-row-name'>" +
      d +
      "</span>" +
      "<span class='peak-row-elev'>" +
      decadeCounts[d] +
      "</span>" +
      "</button>" +
      '<div class="peak-row-detail" data-decade="' +
      d +
      '" hidden></div>' +
      "</div>"
    );
  }

  function renderDecadeList() {
    var list = sortedDecades();
    var box = document.getElementById("peakList");
    box.innerHTML = list.map(decadeRowHTML).join("");
    box.querySelectorAll(".peak-row").forEach(function (row) {
      row.addEventListener("click", function () {
        onDecadeChoose(row.getAttribute("data-decade"));
      });
    });

    var select = document.getElementById("peakDropdown");
    select.innerHTML =
      '<option value="">Browse by decade…</option>' +
      list
        .map(function (d) {
          return (
            "<option value='" +
            d +
            "'>" +
            d +
            " — " +
            decadeCounts[d] +
            " recorded</option>"
          );
        })
        .join("");

    syncActiveStates();
  }

  document.querySelectorAll(".peak-sort-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.sort === decadeSort) return;
      decadeSort = btn.dataset.sort;
      document.querySelectorAll(".peak-sort-btn").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      renderDecadeList();
    });
  });

  document
    .getElementById("peakDropdown")
    .addEventListener("change", function (e) {
      onDecadeChoose(e.target.value);
    });

  function decadeDetailHTML(d) {
    var rows = RECORDS.filter(function (r) {
      return r.decade === d;
    });
    var causeCounts = {};
    rows.forEach(function (r) {
      causeCounts[r.cause] = (causeCounts[r.cause] || 0) + 1;
    });
    var html =
      "<div class='peak-detail-summary'><b>" +
      rows.length +
      "</b> recorded death" +
      (rows.length === 1 ? "" : "s") +
      "</div>";
    html += "<div class='breakdown'>";
    Object.keys(causeCounts)
      .sort(function (a, b) {
        return causeCounts[b] - causeCounts[a];
      })
      .forEach(function (c) {
        html +=
          "<div class='breakdown-row'><span class='cause-tag' data-cause='" +
          escapeHtml(c) +
          "'>" +
          escapeHtml(c) +
          "</span><b>" +
          causeCounts[c] +
          "</b></div>";
      });
    html += "</div>";
    return html;
  }

  /* ============ CHARTS ============ */
  function count(dim, value) {
    return RECORDS.filter(function (r) {
      return r[dim] === value;
    }).length;
  }

  function buildBarChart(containerId, dim, order, labelFn) {
    var el = document.getElementById(containerId);
    el.innerHTML = "";
    var counts = order.map(function (v) {
      return count(dim, v);
    });
    var max = Math.max.apply(null, counts);
    order.forEach(function (v, i) {
      var c = counts[i];
      if (!c) return;
      var row = document.createElement("button");
      row.className = "bar-row";
      row.type = "button";
      row.dataset.dim = dim;
      row.dataset.value = v;
      row.innerHTML =
        "<span class='bar-label'>" +
        escapeHtml(labelFn ? labelFn(v) : v) +
        "</span>" +
        "<span class='bar-track'><span class='bar-fill' style='width:" +
        (max ? (c / max) * 100 : 0) +
        "%'></span></span>" +
        "<span class='bar-count'>" +
        c +
        "</span>";
      row.addEventListener("click", function () {
        setFilter(dim, v);
      });
      el.appendChild(row);
    });
  }

  function buildYearChart() {
    var el = document.getElementById("chartYear");
    el.innerHTML = "";
    var inner = document.createElement("div");
    inner.className = "year-chart-inner";
    var counts = YEAR_ORDER.map(function (y) {
      return count("year", y);
    });
    var max = Math.max.apply(null, counts);
    YEAR_ORDER.forEach(function (y, i) {
      var c = counts[i];
      var col = document.createElement("div");
      col.className = "year-col";
      col.dataset.value = y;
      col.title = y + ": " + c + " recorded";
      col.innerHTML =
        "<span class='year-bar-value'>" +
        c +
        "</span>" +
        "<span class='year-bar' style='height:" +
        (max ? (c / max) * 100 : 0) +
        "%'></span>" +
        "<span class='year-label'>" +
        y +
        "</span>";
      col.addEventListener("click", function () {
        setFilter("year", y);
      });
      inner.appendChild(col);
    });
    el.appendChild(inner);
  }

  /* ============ TABLE ============ */
  var COLUMNS = [
    { key: "date", label: "Date", cls: "num" },
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    { key: "cause", label: "Cause" },
    { key: "gender", label: "Sex" },
    { key: "age", label: "Age band" }
  ];

  function buildTableHead() {
    var head = document.getElementById("tableHead");
    head.innerHTML = "";
    COLUMNS.forEach(function (col) {
      var th = document.createElement("th");
      if (col.cls) th.className = col.cls;
      var btn = document.createElement("button");
      btn.innerHTML = col.label + " <span class='arrow'>▲</span>";
      btn.addEventListener("click", function () {
        if (sortKey === col.key) sortDir *= -1;
        else {
          sortKey = col.key;
          sortDir = 1;
        }
        renderTable();
        updateSortIndicators();
      });
      th.appendChild(btn);
      head.appendChild(th);
    });
    updateSortIndicators();
  }

  function updateSortIndicators() {
    var ths = document.querySelectorAll("#tableHead th");
    COLUMNS.forEach(function (col, i) {
      var th = ths[i];
      th.classList.toggle("sorted", col.key === sortKey);
      th.querySelector(".arrow").textContent = sortDir === 1 ? "▲" : "▼";
    });
  }

  function sortValue(r, key) {
    if (key === "date") {
      var y = +r.year || 0;
      var mm = r.month && MONTH_NUM[r.month] ? +MONTH_NUM[r.month] : 0;
      var dd = r.day ? +r.day : 0;
      return y * 10000 + mm * 100 + dd;
    }
    if (key === "age") return r.age ? AGE_ORDER.indexOf(r.age) : 99;
    var v = r[key];
    return v ? String(v).toLowerCase() : "￿";
  }

  // Render rows in chunks so the full 800+ row log doesn't block the page.
  var PAGE = 100;
  var visibleLimit = PAGE;

  function renderTable() {
    var rows = RECORDS.filter(matches).sort(function (a, b) {
      var av = sortValue(a, sortKey),
        bv = sortValue(b, sortKey);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return a.id - b.id;
    });

    var body = document.getElementById("tableBody");
    body.innerHTML = "";
    var frag = document.createDocumentFragment();

    rows.slice(0, visibleLimit).forEach(function (r) {
      var tr = document.createElement("tr");
      tr.className = "has-story";
      if (filter) tr.classList.add("is-match");
      tr.innerHTML =
        "<td class='num'>" +
        formatDate(r) +
        "</td>" +
        "<td>" +
        (r.name
          ? escapeHtml(r.name)
          : "<span class='muted-cell'>Unidentified</span>") +
        " <span class='chevron'>▸</span></td>" +
        "<td class='loc-cell'>" +
        (r.location
          ? escapeHtml(r.location)
          : "<span class='muted-cell'>—</span>") +
        "</td>" +
        "<td><span class='cause-tag' data-cause='" +
        escapeHtml(r.cause) +
        "'>" +
        escapeHtml(r.cause) +
        "</span></td>" +
        "<td>" +
        GENDER_LABEL[r.gender] +
        "</td>" +
        "<td>" +
        (r.age || "<span class='muted-cell'>—</span>") +
        "</td>";
      frag.appendChild(tr);

      var storyTr = document.createElement("tr");
      storyTr.className = "story-row";
      storyTr.hidden = true;
      var td = document.createElement("td");
      td.colSpan = COLUMNS.length;
      storyTr.appendChild(td);
      frag.appendChild(storyTr);

      tr.addEventListener("click", function () {
        var willOpen = storyTr.hidden;
        if (willOpen && !td.firstChild) {
          td.innerHTML = "<div class='story-body'>" + storyHTML(r) + "</div>";
          var link = td.querySelector(".incident-link");
          if (link) {
            link.addEventListener("click", function (e) {
              e.stopPropagation();
              setFilter("incidentId", r.incidentId);
              document
                .querySelector(".log")
                .scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        }
        storyTr.hidden = !willOpen;
        tr.classList.toggle("expanded", willOpen);
      });
    });
    body.appendChild(frag);

    if (!RECORDS.length) {
      body.innerHTML =
        "<tr class='status-row'><td colspan='" +
        COLUMNS.length +
        "'>Incident data couldn't be loaded right now. Please try again shortly.</td></tr>";
    }

    var more = document.getElementById("showMoreBtn");
    var remaining = rows.length - Math.min(visibleLimit, rows.length);
    more.hidden = remaining <= 0;
    more.textContent =
      "Show " +
      Math.min(PAGE, remaining) +
      " more (" +
      remaining +
      " remaining)";

    document.getElementById("countReadout").textContent =
      "Showing " +
      Math.min(visibleLimit, rows.length) +
      " of " +
      rows.length +
      (filter ? " matching (" + RECORDS.length + " total)" : "");
    document.getElementById("clearBtn").disabled = !filter;
  }

  document.getElementById("clearBtn").addEventListener("click", clearFilter);
  document.getElementById("showMoreBtn").addEventListener("click", function () {
    visibleLimit += PAGE;
    renderTable();
  });

  /* ============ ACTIVE-STATE SYNC ============ */
  var FILTER_LABEL = {
    decade: function (v) {
      return v;
    },
    year: function (v) {
      return v;
    },
    cause: function (v) {
      return v;
    },
    status: function (v) {
      return "Source: " + v;
    },
    age: function (v) {
      return "Age " + v;
    },
    gender: function (v) {
      return GENDER_LABEL[v];
    },
    incidentId: function (v) {
      var r = RECORDS.find(function (x) {
        return x.incidentId === v;
      });
      return r
        ? "Incident · " + formatDate(r) + (r.location ? " · " + r.location : "")
        : "Incident";
    }
  };

  function syncActiveStates() {
    document.querySelectorAll(".bar-row").forEach(function (row) {
      row.classList.remove("is-active", "is-dim");
      if (!filter || filter.dim !== row.dataset.dim) return;
      row.classList.add(
        filter.value === row.dataset.value ? "is-active" : "is-dim"
      );
    });

    document.querySelectorAll(".year-col").forEach(function (col) {
      col.classList.remove("is-active", "is-dim");
      if (!filter || filter.dim !== "year") return;
      col.classList.add(
        filter.value === col.dataset.value ? "is-active" : "is-dim"
      );
    });

    document.querySelectorAll(".peak-row").forEach(function (row) {
      var d = row.getAttribute("data-decade");
      var isActive = !!filter && filter.dim === "decade" && filter.value === d;
      row.classList.toggle("is-active", isActive);
      row.setAttribute("aria-expanded", isActive ? "true" : "false");
    });
    var dropdown = document.getElementById("peakDropdown");
    if (dropdown)
      dropdown.value = filter && filter.dim === "decade" ? filter.value : "";

    document.querySelectorAll(".peak-row-detail").forEach(function (box) {
      var d = box.getAttribute("data-decade");
      var isActive = !!filter && filter.dim === "decade" && filter.value === d;
      box.hidden = !isActive;
      box.innerHTML = isActive ? decadeDetailHTML(d) : "";
    });

    var panel = document.getElementById("selectedPanel");
    var heading = document.getElementById("selectedName");
    panel.hidden = !filter;
    heading.textContent = filter ? FILTER_LABEL[filter.dim](filter.value) : "";
  }

  function buildCharts() {
    buildBarChart("chartCause", "cause", CAUSE_ORDER);
    buildBarChart("chartStatus", "status", STATUS_ORDER);
    buildBarChart("chartAge", "age", AGE_ORDER);
    buildBarChart("chartGender", "gender", GENDER_ORDER, function (v) {
      return GENDER_LABEL[v];
    });
    buildYearChart();
  }

  function renderAll() {
    visibleLimit = PAGE;
    renderTable();
    syncActiveStates();
  }

  buildCharts();
  buildTableHead();
  renderDecadeList();
  renderAll();
})();
