(() => {
  const NIGHT_PRICE = 65;
  const MIN_NIGHTS = 2;
  const MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  const DOW_FR = ["L", "M", "M", "J", "V", "S", "D"];

  const PACKS = {
    beaujoire: { label: "Soirée à la Beaujoire", price: 35 },
    otaku:     { label: "Pack Otaku",            price: 25 },
    cocooning: { label: "Soirée canapé",         price: 15 },
  };

  const UNAVAILABLE_RANGES = [
    ["2026-06-29", "2026-07-06"],
    ["2026-07-13", "2026-07-19"],
    ["2026-08-24", "2026-08-31"],
    ["2026-09-01", "2026-09-14"],
    ["2026-12-21", "2027-01-04"],
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function toKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function fromKey(k) {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtLong(d) {
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  }
  function nightsBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }
  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  const unavailable = new Set();
  UNAVAILABLE_RANGES.forEach(([from, to]) => {
    const d = fromKey(from);
    const end = fromKey(to);
    while (d <= end) {
      unavailable.add(toKey(d));
      d.setDate(d.getDate() + 1);
    }
  });

  // --- Pre-fill from URL ---
  const params = new URLSearchParams(window.location.search);
  const preIn = params.get("in");
  const preOut = params.get("out");

  const state = {
    cursor: new Date(today.getFullYear(), today.getMonth(), 1),
    checkIn: preIn ? fromKey(preIn) : null,
    checkOut: preOut ? fromKey(preOut) : null,
    packs: new Set(),
  };
  if (state.checkIn) {
    state.cursor = new Date(state.checkIn.getFullYear(), state.checkIn.getMonth(), 1);
  }

  // --- DOM ---
  const calendarEl = document.getElementById("calendar");
  const sumIn = document.getElementById("sum-in");
  const sumOut = document.getElementById("sum-out");
  const sumNights = document.getElementById("sum-nights");
  const sumTotal = document.getElementById("sum-total");
  const toStep2 = document.getElementById("to-step-2");
  const backTo1 = document.getElementById("back-to-1");
  const toStep3 = document.getElementById("to-step-3");
  const backTo2 = document.getElementById("back-to-2");
  const steps = [
    document.getElementById("step-1"),
    document.getElementById("step-2"),
    document.getElementById("step-3"),
  ];
  const stepIndicators = document.querySelectorAll(".steps .step");
  const packCards = document.querySelectorAll(".pack-card");
  const confirmForm = document.getElementById("confirm-form");
  const successEl = document.getElementById("success");

  // --- Calendar ---
  function renderCalendar() {
    calendarEl.innerHTML = "";
    const m1 = new Date(state.cursor);
    const m2 = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
    calendarEl.appendChild(buildMonth(m1, true, false));
    calendarEl.appendChild(buildMonth(m2, false, true));
  }

  function buildMonth(monthDate, withPrev, withNext) {
    const wrap = document.createElement("div");
    wrap.className = "cal-month";

    const head = document.createElement("div");
    head.className = "cal-head";

    const prev = document.createElement("button");
    prev.className = "cal-nav";
    prev.type = "button";
    prev.innerHTML = "‹";
    prev.setAttribute("aria-label", "Mois précédent");
    if (!withPrev) prev.style.visibility = "hidden";
    const minCursor = new Date(today.getFullYear(), today.getMonth(), 1);
    if (state.cursor <= minCursor) prev.disabled = true;
    prev.addEventListener("click", () => {
      state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1);
      renderCalendar();
    });

    const title = document.createElement("div");
    title.className = "cal-title";
    title.textContent = `${MONTHS_FR[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

    const next = document.createElement("button");
    next.className = "cal-nav";
    next.type = "button";
    next.innerHTML = "›";
    next.setAttribute("aria-label", "Mois suivant");
    if (!withNext) next.style.visibility = "hidden";
    next.addEventListener("click", () => {
      state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
      renderCalendar();
    });

    head.appendChild(prev);
    head.appendChild(title);
    head.appendChild(next);
    wrap.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "cal-grid";
    DOW_FR.forEach((d) => {
      const el = document.createElement("div");
      el.className = "cal-dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    let offset = first.getDay() - 1;
    if (offset < 0) offset = 6;
    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-day empty";
      grid.appendChild(empty);
    }
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const key = toKey(d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = day;
      btn.dataset.key = key;

      if (d < today) {
        btn.classList.add("past");
        btn.disabled = true;
      } else if (unavailable.has(key)) {
        btn.classList.add("unavailable");
        btn.disabled = true;
      } else {
        btn.classList.add("available");
        btn.addEventListener("click", () => onDayClick(d));
      }

      if (state.checkIn && state.checkOut) {
        if (d >= state.checkIn && d <= state.checkOut) btn.classList.add("in-range");
        if (sameDay(d, state.checkIn)) btn.classList.add("range-start");
        if (sameDay(d, state.checkOut)) btn.classList.add("range-end");
      } else if (state.checkIn && sameDay(d, state.checkIn)) {
        btn.classList.add("selected");
      }

      grid.appendChild(btn);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function rangeHasUnavailable(a, b) {
    const d = new Date(a);
    while (d <= b) {
      if (unavailable.has(toKey(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function onDayClick(d) {
    if (!state.checkIn || (state.checkIn && state.checkOut)) {
      state.checkIn = d;
      state.checkOut = null;
    } else if (d <= state.checkIn) {
      state.checkIn = d;
      state.checkOut = null;
    } else {
      if (rangeHasUnavailable(new Date(state.checkIn.getTime() + 86400000), d)) {
        state.checkIn = d;
        state.checkOut = null;
      } else {
        state.checkOut = d;
      }
    }
    renderCalendar();
    updateSummary();
  }

  function nightsCount() {
    if (!state.checkIn || !state.checkOut) return 0;
    return nightsBetween(state.checkIn, state.checkOut);
  }

  function nightsSubtotal() {
    return nightsCount() * NIGHT_PRICE;
  }

  function packsSubtotal() {
    let s = 0;
    state.packs.forEach((k) => { s += PACKS[k].price; });
    return s;
  }

  function updateSummary() {
    const n = nightsCount();
    if (state.checkIn) {
      sumIn.textContent = fmtLong(state.checkIn);
    } else {
      sumIn.textContent = "sélectionnez une date";
    }
    if (state.checkOut) {
      sumOut.textContent = fmtLong(state.checkOut);
      sumNights.textContent = n;
      sumTotal.textContent = `${nightsSubtotal().toLocaleString("fr-FR")} €`;
      toStep2.disabled = n < MIN_NIGHTS;
      toStep2.textContent = n < MIN_NIGHTS ? `Minimum ${MIN_NIGHTS} nuits` : "Suivant";
    } else {
      sumOut.textContent = "—";
      sumNights.textContent = "0";
      sumTotal.textContent = "0 €";
      toStep2.disabled = true;
      toStep2.textContent = "Suivant";
    }
  }

  // --- Steps ---
  function goToStep(n) {
    steps.forEach((el, i) => { el.hidden = (i !== n - 1); });
    stepIndicators.forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle("active", s === n);
      el.classList.toggle("done", s < n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  toStep2.addEventListener("click", () => {
    if (toStep2.disabled) return;
    goToStep(2);
  });
  backTo1.addEventListener("click", () => goToStep(1));
  toStep3.addEventListener("click", () => {
    renderRecap();
    goToStep(3);
  });
  backTo2.addEventListener("click", () => goToStep(2));

  packCards.forEach((card) => {
    const cb = card.querySelector("input[type=checkbox]");
    cb.addEventListener("change", () => {
      const key = card.dataset.pack;
      if (cb.checked) {
        state.packs.add(key);
        card.classList.add("selected");
      } else {
        state.packs.delete(key);
        card.classList.remove("selected");
      }
    });
  });

  // --- Recap ---
  function renderRecap() {
    document.getElementById("r-in").textContent = state.checkIn ? fmtLong(state.checkIn) : "—";
    document.getElementById("r-out").textContent = state.checkOut ? fmtLong(state.checkOut) : "—";
    const n = nightsCount();
    document.getElementById("r-nights-label").textContent =
      `${n} nuit${n > 1 ? "s" : ""} × ${NIGHT_PRICE} €`;
    document.getElementById("r-nights-sub").textContent =
      `${nightsSubtotal().toLocaleString("fr-FR")} €`;

    const packsWrap = document.getElementById("r-packs");
    packsWrap.innerHTML = "";
    state.packs.forEach((k) => {
      const row = document.createElement("div");
      row.className = "recap-row recap-pack";
      row.innerHTML = `<span>${PACKS[k].label}</span><strong>+ ${PACKS[k].price} €</strong>`;
      packsWrap.appendChild(row);
    });

    const sub = nightsSubtotal() + packsSubtotal();
    document.getElementById("r-subtotal").textContent = `${sub.toLocaleString("fr-FR")} €`;
    document.getElementById("r-strike").textContent = `${sub.toLocaleString("fr-FR")} €`;
  }

  // --- Confirm ---
  confirmForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(confirmForm);
    if (!data.get("name") || !data.get("email")) return;
    confirmForm.style.display = "none";
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  renderCalendar();
  updateSummary();
})();
