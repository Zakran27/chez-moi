(() => {
  const NIGHT_PRICE = 65;
  const MIN_NIGHTS = 2;
  const MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  const DOW_FR = ["L", "M", "M", "J", "V", "S", "D"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Périodes indisponibles, en dur.
  const UNAVAILABLE_RANGES = [
    ["2026-06-29", "2026-07-06"],
    ["2026-07-13", "2026-07-19"],
    ["2026-08-24", "2026-08-31"],
    ["2026-09-01", "2026-09-14"],
    ["2026-12-21", "2027-01-04"],
  ];
  const unavailable = new Set();
  (function seedUnavailable() {
    UNAVAILABLE_RANGES.forEach(([from, to]) => {
      const a = fromKey(from);
      const b = fromKey(to);
      const d = new Date(a);
      while (d <= b) {
        unavailable.add(toKey(d));
        d.setDate(d.getDate() + 1);
      }
    });
  })();

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

  // --- State ---
  const state = {
    cursor: new Date(today.getFullYear(), today.getMonth(), 1),
    checkIn: null,
    checkOut: null,
  };

  // --- DOM ---
  const calendarEl = document.getElementById("calendar");
  const sumIn = document.getElementById("sum-in");
  const sumOut = document.getElementById("sum-out");
  const sumNights = document.getElementById("sum-nights");
  const submitBtn = document.getElementById("submit-btn");
  const form = document.getElementById("booking-form");

  function renderCalendar() {
    calendarEl.innerHTML = "";
    const m1 = new Date(state.cursor);
    const m2 = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
    calendarEl.appendChild(buildMonth(m1, /* withPrev */ true, /* withNext */ false));
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
    // Monday-first offset.
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

  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

  function updateSummary() {
    if (state.checkIn) {
      sumIn.textContent = fmtLong(state.checkIn);
    } else {
      sumIn.textContent = "— sélectionnez une date —";
    }
    if (state.checkOut) {
      sumOut.textContent = fmtLong(state.checkOut);
      const n = nightsBetween(state.checkIn, state.checkOut);
      sumNights.textContent = n;
      submitBtn.disabled = n < MIN_NIGHTS;
      submitBtn.textContent = n < MIN_NIGHTS
        ? `Minimum ${MIN_NIGHTS} nuits`
        : "Continuer la réservation";
    } else {
      sumOut.textContent = "—";
      sumNights.textContent = "0";
      submitBtn.disabled = true;
      submitBtn.textContent = "Continuer la réservation";
    }
  }

  // --- Form ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    const params = new URLSearchParams({
      in: toKey(state.checkIn),
      out: toKey(state.checkOut),
    });
    window.location.href = `reserver.html?${params.toString()}`;
  });

  // --- Nav scroll style ---
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (window.scrollY > 60) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- Reveal on scroll ---
  const revealTargets = document.querySelectorAll(
    ".intro, .split-text, .split-media, .gallery-grid figure, .around-grid article, .quote, .booking-shell"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealTargets.forEach((el) => io.observe(el));

  renderCalendar();
  updateSummary();
})();
