// Accueil : calendrier (calendar.js) → reserver.html?in=&out=, menu mobile, barre « Voir les dates »,
// visionneuse de la galerie.
(() => {
  const { toKey, fmtLong, nightsBetween, mountCalendar } = window.ChezNous;

  // --- Calendrier ---
  const state = { checkIn: null, checkOut: null };
  const sumIn = document.getElementById("sum-in");
  const sumOut = document.getElementById("sum-out");
  const sumNights = document.getElementById("sum-nights");
  const submitBtn = document.getElementById("submit-btn");
  mountCalendar(document.getElementById("calendar"), state, () => {
    sumIn.textContent = state.checkIn ? fmtLong(state.checkIn) : "choisissez une date";
    sumOut.textContent = state.checkOut ? fmtLong(state.checkOut) : "à choisir";
    sumNights.textContent = state.checkOut ? nightsBetween(state.checkIn, state.checkOut) : "0";
    submitBtn.disabled = !state.checkOut;
  });
  document.getElementById("booking-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.checkOut) return;
    const params = new URLSearchParams({ in: toKey(state.checkIn), out: toKey(state.checkOut) });
    window.location.href = `reserver.html?${params}`;
  });

  // --- Nav : fond au scroll, menu mobile ---
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 60);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  nav.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    })
  );

  // --- Barre mobile : cachée quand le hero (qui a déjà son bouton) ou le calendrier est à l'écran ---
  const bar = document.getElementById("mobile-bar");
  const onScreen = new Set();
  const watch = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      bar.classList.toggle("hidden", onScreen.size > 0);
    },
    { threshold: 0.15 }
  );
  watch.observe(document.querySelector(".hero"));
  watch.observe(document.getElementById("reserver"));

  // --- Visionneuse (dialog natif : Échap ferme, ← → naviguent) ---
  const items = [...document.querySelectorAll(".gallery-grid button")];
  const dialog = document.getElementById("lightbox");
  const img = dialog.querySelector("img");
  let index = 0;
  const show = (i) => {
    index = (i + items.length) % items.length;
    const thumb = items[index].querySelector("img");
    img.src = items[index].dataset.full;
    img.alt = thumb.alt;
  };
  items.forEach((b, i) =>
    b.addEventListener("click", () => {
      show(i);
      dialog.showModal();
    })
  );
  dialog.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
  dialog.querySelector(".lb-next").addEventListener("click", () => show(index + 1));
  dialog.querySelector(".lb-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
})();
