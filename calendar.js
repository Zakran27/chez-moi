// Calendrier partagé par l'accueil et la page Réserver.
// Dates bloquées : c'est ICI et seulement ici (ISO, bornes incluses).
window.ChezNous = (() => {
  const UNAVAILABLE_RANGES = [
    ["2026-06-05", "2026-06-12"],
    ["2026-06-18", "2026-06-22"],
    ["2026-06-26", "2026-06-28"],
    ["2026-06-29", "2026-07-08"],
    ["2026-07-13", "2026-07-22"],
    ["2026-08-24", "2026-09-07"],
    ["2026-10-16", "2026-10-18"],
    ["2026-10-31", "2026-11-02"],
    ["2026-11-06", "2026-11-12"],
    ["2026-11-13", "2026-11-16"],
    ["2026-11-23", "2026-11-23"],
    ["2026-11-27", "2026-11-29"],
    ["2026-12-21", "2027-01-04"],
    ["2027-01-22", "2027-01-24"],
  ];
  const DOW_FR = ["L", "M", "M", "J", "V", "S", "D"];
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const longFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const dayLabelFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // Date locale depuis 'AAAA-MM-JJ' (null si la chaîne n'est pas une vraie date)
  const fromKey = (k) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k || "")) return null;
    const [y, m, d] = k.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return toKey(date) === k ? date : null;
  };
  const fmtLong = (d) => longFmt.format(d);
  const nightsBetween = (a, b) => Math.round((b - a) / 86400000);
  const sameDay = (a, b) => !!a && !!b && toKey(a) === toKey(b);

  const unavailable = new Set();
  UNAVAILABLE_RANGES.forEach(([from, to]) => {
    for (const d = fromKey(from); d <= fromKey(to); d.setDate(d.getDate() + 1)) unavailable.add(toKey(d));
  });
  const isFree = (d) => d >= today && !unavailable.has(toKey(d));
  const rangeIsFree = (a, b) => {
    for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (!isFree(d)) return false;
    return true;
  };

  // Rend 2 mois dans `el` et met à jour state.checkIn / state.checkOut ; onChange après chaque choix.
  function mountCalendar(el, state, onChange) {
    const first = state.checkIn || today;
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const minCursor = new Date(today.getFullYear(), today.getMonth(), 1);

    function navButton(label, text, delta, hidden) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cal-nav";
      b.textContent = text;
      b.setAttribute("aria-label", label);
      if (hidden) b.style.visibility = "hidden";
      if (delta < 0 && cursor <= minCursor) b.disabled = true;
      b.addEventListener("click", () => {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
        render();
      });
      return b;
    }

    function dayButton(d) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = d.getDate();
      const free = isFree(d);
      let status = free ? "disponible" : d < today ? "passé" : "indisponible";
      if (!free) {
        btn.classList.add(d < today ? "past" : "unavailable");
        btn.disabled = true;
      } else {
        btn.classList.add("available");
        btn.addEventListener("click", () => pick(d));
      }
      if (state.checkIn && state.checkOut && d >= state.checkIn && d <= state.checkOut) {
        btn.classList.add("in-range");
      }
      if (sameDay(d, state.checkIn)) {
        btn.classList.add(state.checkOut ? "range-start" : "selected");
        status = "arrivée choisie";
      }
      if (sameDay(d, state.checkOut)) {
        btn.classList.add("range-end");
        status = "départ choisi";
      }
      btn.setAttribute("aria-label", `${dayLabelFmt.format(d)}, ${status}`);
      btn.setAttribute("aria-pressed", String(sameDay(d, state.checkIn) || sameDay(d, state.checkOut)));
      return btn;
    }

    function month(monthDate, withPrev, withNext) {
      const wrap = document.createElement("div");
      wrap.className = "cal-month";
      const head = document.createElement("div");
      head.className = "cal-head";
      const title = document.createElement("h3");
      title.className = "cal-title";
      title.textContent = monthFmt.format(monthDate);
      head.append(
        navButton("Mois précédent", "‹", -1, !withPrev),
        title,
        navButton("Mois suivant", "›", 1, !withNext)
      );
      const grid = document.createElement("div");
      grid.className = "cal-grid";
      DOW_FR.forEach((d) => {
        const el = document.createElement("div");
        el.className = "cal-dow";
        el.setAttribute("aria-hidden", "true");
        el.textContent = d;
        grid.appendChild(el);
      });
      const offset = (new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() + 6) % 7; // lundi en premier
      for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-day empty";
        grid.appendChild(empty);
      }
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        grid.appendChild(dayButton(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)));
      }
      wrap.append(head, grid);
      return wrap;
    }

    function pick(d) {
      const startOver = !state.checkIn || state.checkOut || d <= state.checkIn;
      if (startOver || !rangeIsFree(new Date(state.checkIn.getTime() + 86400000), d)) {
        state.checkIn = d;
        state.checkOut = null;
      } else {
        state.checkOut = d;
      }
      render();
      onChange();
    }

    function render() {
      el.replaceChildren(
        month(cursor, true, false),
        month(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1), false, true)
      );
    }

    // Dates reçues par l'URL : gardées seulement si elles sont libres et cohérentes
    if (state.checkIn && !isFree(state.checkIn)) state.checkIn = state.checkOut = null;
    if (state.checkOut && !(state.checkOut > state.checkIn && rangeIsFree(state.checkIn, state.checkOut))) {
      state.checkOut = null;
    }
    render();
    onChange();
  }

  return { toKey, fromKey, fmtLong, nightsBetween, mountCalendar };
})();
