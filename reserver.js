// Page Réserver : dates (calendar.js) → expériences → demande envoyée par la messagerie de l'invité
// (mailto prérempli, 100 % front). On ne peut pas savoir si le mail est parti : on le dit, et le
// récap reste affiché avec un bouton Copier en secours.
(() => {
  const { fromKey, fmtLong, nightsBetween, mountCalendar } = window.ChezNous;
  const NIGHT_PRICE = 65;
  const BOOKING_EMAIL = "tfb27@hotmail.fr";
  const PACKS = {
    beaujoire: { label: "Soirée à la Beaujoire", price: 35 },
    otaku: { label: "Pack Otaku", price: 25 },
    cocooning: { label: "Soirée canapé", price: 15 },
  };

  const params = new URLSearchParams(window.location.search);
  const state = {
    checkIn: fromKey(params.get("in")),
    checkOut: fromKey(params.get("out")),
    packs: new Set(),
    people: 2,
  };
  const $ = (id) => document.getElementById(id);
  const nights = () => (state.checkOut ? nightsBetween(state.checkIn, state.checkOut) : 0);
  const euros = (n) => `${n.toLocaleString("fr-FR")} €`;

  // --- Étape 1 : dates + personnes ---
  const toStep2 = $("to-step-2");
  mountCalendar($("calendar"), state, () => {
    $("sum-in").textContent = state.checkIn ? fmtLong(state.checkIn) : "choisissez une date";
    $("sum-out").textContent = state.checkOut ? fmtLong(state.checkOut) : "à choisir";
    $("sum-nights").textContent = nights();
    toStep2.disabled = !state.checkOut;
  });
  const renderPeople = () => {
    $("people-count").textContent = state.people;
    $("people-minus").disabled = state.people <= 1;
    $("people-plus").disabled = state.people >= 8;
  };
  $("people-minus").addEventListener("click", () => { state.people--; renderPeople(); });
  $("people-plus").addEventListener("click", () => { state.people++; renderPeople(); });
  renderPeople();

  // --- Navigation entre étapes ---
  const steps = [$("step-1"), $("step-2"), $("step-3")];
  function goToStep(n) {
    steps.forEach((el, i) => (el.hidden = i !== n - 1));
    document.querySelectorAll(".steps .step").forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle("active", s === n);
      el.classList.toggle("done", s < n);
      if (s === n) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    steps[n - 1].querySelector("h1").focus({ preventScroll: true });
  }
  toStep2.addEventListener("click", () => state.checkOut && goToStep(2));
  $("back-to-1").addEventListener("click", () => goToStep(1));
  $("to-step-3").addEventListener("click", () => { renderRecap(); goToStep(3); });
  $("back-to-2").addEventListener("click", () => goToStep(2));

  // --- Étape 2 : expériences ---
  document.querySelectorAll(".pack-card").forEach((card) => {
    const cb = card.querySelector("input[type=checkbox]");
    cb.addEventListener("change", () => {
      state.packs[cb.checked ? "add" : "delete"](card.dataset.pack);
      card.classList.toggle("selected", cb.checked);
    });
  });

  // --- Étape 3 : récap ---
  function renderRecap() {
    const n = nights();
    const packsTotal = [...state.packs].reduce((s, k) => s + PACKS[k].price, 0);
    $("r-in").textContent = state.checkIn ? fmtLong(state.checkIn) : "à choisir";
    $("r-out").textContent = state.checkOut ? fmtLong(state.checkOut) : "à choisir";
    $("r-nights-label").textContent = `${n} nuit${n > 1 ? "s" : ""} × ${NIGHT_PRICE} €`;
    $("r-nights-sub").textContent = euros(n * NIGHT_PRICE);
    $("r-people").textContent = state.people;
    $("r-packs").replaceChildren(
      ...[...state.packs].map((k) => {
        const row = document.createElement("div");
        row.className = "recap-row recap-pack";
        const label = document.createElement("span");
        label.textContent = PACKS[k].label;
        const price = document.createElement("strong");
        price.textContent = `+ ${PACKS[k].price} €`;
        row.append(label, price);
        return row;
      })
    );
    $("r-subtotal").textContent = euros(n * NIGHT_PRICE + packsTotal);
    $("r-strike").textContent = euros(n * NIGHT_PRICE + packsTotal);
  }

  // --- Transport : billet et heure d'arrivée seulement en train / avion ---
  const form = $("confirm-form");
  form.addEventListener("change", (e) => {
    if (e.target.name === "travel") {
      const v = e.target.value;
      $("ticket-block").hidden = v !== "train" && v !== "avion";
      $("arrival-label").textContent =
        v === "train" ? "Heure d'arrivée à la gare" : "Heure d'arrivée à l'aéroport";
      if ($("ticket-block").hidden) {
        $("arrival-block").hidden = true;
        form.querySelectorAll("input[name=ticket]").forEach((i) => (i.checked = false));
        form.elements.arrival.value = "";
      }
    }
    if (e.target.name === "ticket") {
      $("arrival-block").hidden = e.target.value !== "oui";
      if (e.target.value !== "oui") form.elements.arrival.value = "";
    }
  });

  // --- Envoi ---
  function bookingFields(data) {
    const travel = data.get("travel");
    const fields = {
      Nom: data.get("name").trim(),
      Email: data.get("email").trim(),
      Arrivée: fmtLong(state.checkIn),
      Départ: fmtLong(state.checkOut),
      Nuits: nights(),
      Personnes: state.people,
      Expériences: [...state.packs].map((k) => PACKS[k].label).join(", ") || "aucune",
      Transport: travel,
    };
    if (travel === "train" || travel === "avion") {
      fields["Billet déjà pris"] = data.get("ticket") || "pas précisé";
      if (data.get("ticket") === "oui") fields["Heure d'arrivée"] = data.get("arrival") || "pas précisée";
    }
    if (data.get("note")) fields.Mot = data.get("note").trim();
    return fields;
  }

  function fieldError(msg) {
    const err = $("form-error");
    err.textContent = msg;
    err.hidden = !msg;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const missing = [
      !data.get("name")?.trim() && "votre nom",
      !form.elements.email.checkValidity() || !data.get("email") ? "un email valide" : null,
      !data.get("travel") && "votre moyen de transport",
    ].filter(Boolean);
    if (!state.checkOut) missing.unshift("vos dates (étape 1)");
    if (missing.length) {
      fieldError(`Il manque ${missing.join(", ")}.`);
      return;
    }
    fieldError("");

    const fields = bookingFields(data);
    const subject = `Réservation Chez Nous : ${fields.Nom}, du ${fields.Arrivée} au ${fields.Départ}`;
    const body = Object.entries(fields).map(([k, v]) => `${k} : ${v}`).join("\n");
    const mailto = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    $("sent-recap").textContent = `${subject}\n\n${body}`;
    $("sent-mailto").href = mailto;
    form.hidden = true;
    $("sent").hidden = false;
    $("sent").focus();
    window.location.href = mailto;
  });

  $("copy-recap").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(`${BOOKING_EMAIL}\n\n${$("sent-recap").textContent}`);
      e.target.textContent = "Récapitulatif copié";
    } catch {
      e.target.textContent = "Copie impossible : sélectionnez le texte";
    }
  });
  $("edit-request").addEventListener("click", () => {
    $("sent").hidden = true;
    form.hidden = false;
  });
})();
