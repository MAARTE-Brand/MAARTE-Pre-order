const PSGC_API = "https://psgc.cloud/api/v2";
const SUBMIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxvwfcOXo4D55MclN8SCqc-hQi0ogOik9hIWliDOByEbBeYsrfiChd8nDVHDNH3NIqbHw/exec";

const PRICES = { tote: 1599, pins: 499, caps: 799 };
const SHIPPING = { metro: 300, provincial: 350 };

const $ = id => document.getElementById(id);

const form = $("preorderForm");
const region = $("region");
const province = $("province");
const city = $("city");
const barangay = $("barangay");

const toteQty = $("toteQty");
const pinsQty = $("pinsQty");
const capsQty = $("capsQty");

const paymentDetails = $("paymentDetails");
const gcashDetails = $("gcashDetails");
const bankDetails = $("bankDetails");
const paypalDetails = $("paypalDetails");

const orderSummary = $("orderSummary");
const summaryTotal = $("summaryTotal");
const formStatus = $("formStatus");
const submitBtn = $("submitBtn");
const instagramSuccess = $("instagramSuccess");

let regionProvinces = [];
let regionCities = [];

const fmt = n =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

function intVal(el) {
  const n = parseInt(el?.value || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function value(id) {
  return ($(id)?.value || "").trim();
}

function selected(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function selectedText(el) {
  return el && el.selectedIndex >= 0 ? el.options[el.selectedIndex]?.text || "" : "";
}

function cleanOptionText(text) {
  if (!text) return "";
  return /^(Select|Loading|Unable|Address service)/i.test(text) ? "" : text;
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Address data unavailable.");
  const json = await response.json();
  return Array.isArray(json) ? json : (json.data || []);
}

function makeOptions(rows, firstLabel) {
  return `<option value="">${firstLabel}</option>` +
    rows.map(row => `<option value="${String(row.code || row.name).replaceAll('"', '&quot;')}">${row.name}</option>`).join("");
}

async function loadRegions() {
  try {
    const rows = await getJSON(`${PSGC_API}/regions`);
    region.innerHTML = makeOptions(rows, "Select Region");
  } catch (error) {
    region.innerHTML = `<option value="">Address service unavailable</option>`;
    formStatus.textContent = "The Philippine address list could not load. Please refresh and try again.";
  }
}

region.addEventListener("change", async () => {
  province.disabled = true;
  city.disabled = true;
  barangay.disabled = true;

  province.innerHTML = `<option value="">Loading provinces...</option>`;
  city.innerHTML = `<option value="">Select a province first</option>`;
  barangay.innerHTML = `<option value="">Select a city / municipality first</option>`;

  if (!region.value) {
    updateSummary();
    return;
  }

  try {
    [regionProvinces, regionCities] = await Promise.all([
      getJSON(`${PSGC_API}/regions/${encodeURIComponent(region.value)}/provinces`),
      getJSON(`${PSGC_API}/regions/${encodeURIComponent(region.value)}/cities-municipalities`)
    ]);

    const isNCR = /NATIONAL CAPITAL REGION|NCR/i.test(selectedText(region));
    const specialLabel = isNCR
      ? "Metro Manila / NCR Cities"
      : "Independent / Highly Urbanized Cities";

    province.innerHTML =
      `<option value="">Select Province</option>` +
      `<option value="__independent__">${specialLabel}</option>` +
      regionProvinces.map(p => `<option value="${p.code}">${p.name}</option>`).join("");

    province.disabled = false;
  } catch (error) {
    province.innerHTML = `<option value="">Unable to load provinces</option>`;
  }

  updateSummary();
});

province.addEventListener("change", async () => {
  city.disabled = true;
  barangay.disabled = true;

  city.innerHTML = `<option value="">Loading cities / municipalities...</option>`;
  barangay.innerHTML = `<option value="">Select a city / municipality first</option>`;

  if (!province.value) {
    updateSummary();
    return;
  }

  try {
    const rows = province.value === "__independent__"
      ? regionCities
      : await getJSON(`${PSGC_API}/provinces/${encodeURIComponent(province.value)}/cities-municipalities`);

    city.innerHTML = makeOptions(rows, "Select City / Municipality");
    city.disabled = false;
  } catch (error) {
    city.innerHTML = `<option value="">Unable to load cities / municipalities</option>`;
  }

  updateSummary();
});

city.addEventListener("change", async () => {
  barangay.disabled = true;
  barangay.innerHTML = `<option value="">Loading barangays...</option>`;

  if (!city.value) {
    updateSummary();
    return;
  }

  try {
    const rows = await getJSON(`${PSGC_API}/cities-municipalities/${encodeURIComponent(city.value)}/barangays`);
    barangay.innerHTML = makeOptions(rows, "Select Barangay");
    barangay.disabled = false;
  } catch (error) {
    barangay.innerHTML = `<option value="">Unable to load barangays</option>`;
  }

  updateSummary();
});

function isMetroManila() {
  return /NATIONAL CAPITAL REGION|NCR/i.test(selectedText(region));
}

function calculateOrder() {
  const tote = intVal(toteQty);
  const pins = intVal(pinsQty);
  const caps = intVal(capsQty);

  const toteSubtotal = tote * PRICES.tote;
  const pinsSubtotal = pins * PRICES.pins;
  const capSubtotal = caps * PRICES.caps;
  const subtotal = toteSubtotal + pinsSubtotal + capSubtotal;

  const matchingPairs = Math.min(tote, pins);
  const totePinsDiscount = matchingPairs * 99;

  const freeCaps = Math.floor(caps / 10);
  const capPromoDiscount = freeCaps * PRICES.caps;

  const totalDiscount = totePinsDiscount + capPromoDiscount;

  const hasProducts = tote + pins + caps > 0;
  const boxes = hasProducts ? Math.max(Math.ceil(caps / 5), tote, 1) : 0;

  const deliveryMethod = selected("deliveryMethod");
  const shipping = deliveryMethod === "Courier Delivery"
    ? boxes * (isMetroManila() ? SHIPPING.metro : SHIPPING.provincial)
    : 0;

  return {
    tote, pins, caps,
    toteSubtotal, pinsSubtotal, capSubtotal,
    subtotal, matchingPairs, totePinsDiscount,
    freeCaps, capPromoDiscount, totalDiscount,
    boxes, deliveryMethod, shipping,
    total: subtotal - totalDiscount + shipping
  };
}

function updatePaymentUI() {
  const method = selected("paymentMethod");
  paymentDetails?.classList.toggle("hidden", !method);
  gcashDetails?.classList.toggle("hidden", method !== "GCash");
  bankDetails?.classList.toggle("hidden", method !== "Bank Transfer");
  paypalDetails?.classList.toggle("hidden", method !== "PayPal");
}

function getAddress() {
  return [
    value("house"),
    value("street"),
    cleanOptionText(selectedText(barangay)),
    cleanOptionText(selectedText(city)),
    province.value === "__independent__" ? "" : cleanOptionText(selectedText(province)),
    cleanOptionText(selectedText(region)),
    value("zip")
  ].filter(Boolean).join(", ");
}

function updateSummary() {
  const c = calculateOrder();
  const paymentMethod = selected("paymentMethod");
  const fullName = [value("firstName"), value("surname")].filter(Boolean).join(" ");

  let html = `
    <div class="summary-group">
      <h3>CUSTOMER DETAILS</h3>
      <div class="summary-row"><span>Name</span><strong>${fullName || "—"}</strong></div>
      <div class="summary-row"><span>Instagram</span><strong>${value("instagram") || "—"}</strong></div>
      <div class="summary-row"><span>Mobile</span><strong>${value("mobile") || "—"}</strong></div>
      <div class="summary-row"><span>Email</span><strong>${value("email") || "—"}</strong></div>
    </div>

    <div class="summary-group">
      <h3>DELIVERY DETAILS</h3>
      <div class="summary-row"><span>Address</span><strong>${getAddress() || "—"}</strong></div>
      <div class="summary-row"><span>Delivery Method</span><strong>${c.deliveryMethod || "—"}</strong></div>
    </div>

    <div class="summary-group">
      <h3>ORDER</h3>`;

  if (c.tote) html += `<div class="summary-row"><span>MAARTE Tote Bag × ${c.tote}</span><strong>${fmt(c.toteSubtotal)}</strong></div>`;
  if (c.pins) html += `<div class="summary-row"><span>MAARTE Pins × ${c.pins}</span><strong>${fmt(c.pinsSubtotal)}</strong></div>`;
  if (c.caps) html += `<div class="summary-row"><span>MAARTE Cap × ${c.caps}</span><strong>${fmt(c.capSubtotal)}</strong></div>`;
  if (!c.tote && !c.pins && !c.caps) html += `<div class="summary-row"><span>No products selected yet.</span><strong>—</strong></div>`;

  html += `<div class="summary-row"><span>Subtotal</span><strong>${fmt(c.subtotal)}</strong></div>`;

  if (c.totePinsDiscount) {
    html += `<div class="summary-row discount"><span>Tote + Pins Promo (${c.matchingPairs} matching pair${c.matchingPairs > 1 ? "s" : ""})</span><strong>−${fmt(c.totePinsDiscount)}</strong></div>`;
  }

  if (c.capPromoDiscount) {
    html += `<div class="summary-row discount"><span>Buy 10 Caps Promo (${c.freeCaps} free cap${c.freeCaps > 1 ? "s" : ""})</span><strong>−${fmt(c.capPromoDiscount)}</strong></div>`;
  }

  if (c.deliveryMethod) {
    html += `<div class="summary-row"><span>Shipping</span><strong>${fmt(c.shipping)}</strong></div>`;
  }

  html += `
    </div>

    <div class="summary-group">
      <h3>PAYMENT</h3>
      <div class="summary-row"><span>Payment Method</span><strong>${paymentMethod || "—"}</strong></div>
      <div class="summary-row"><span>Reference Number</span><strong>${value("paymentReference") || "—"}</strong></div>
    </div>`;

  orderSummary.innerHTML = html;
  summaryTotal.textContent = fmt(c.total);
}

document.querySelectorAll(".qty-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    const current = intVal(input);
    input.value = btn.dataset.action === "plus" ? current + 1 : Math.max(0, current - 1);
    updateSummary();
  });
});

[toteQty, pinsQty, capsQty].forEach(el => el?.addEventListener("input", updateSummary));

document.querySelectorAll('input[name="deliveryMethod"]').forEach(el => {
  el.addEventListener("change", updateSummary);
});

document.querySelectorAll('input[name="paymentMethod"]').forEach(el => {
  el.addEventListener("change", () => {
    updatePaymentUI();
    updateSummary();
  });
});

form?.querySelectorAll('input:not([type="radio"]):not([type="file"])').forEach(el => {
  el.addEventListener("input", updateSummary);
});

region?.addEventListener("change", updateSummary);
province?.addEventListener("change", updateSummary);
city?.addEventListener("change", updateSummary);
barangay?.addEventListener("change", updateSummary);

function validate() {
  let valid = true;

  form.querySelectorAll("[required]").forEach(el => {
    let ok;

    if (el.type === "radio") {
      ok = !!document.querySelector(`input[name="${el.name}"]:checked`);
    } else {
      ok = !!el.value;
    }

    if (el.matches("input,select")) {
      el.classList.toggle("invalid", !ok);
    }

    if (!ok) valid = false;
  });

  const mobileDigits = value("mobile").replace(/\D/g, "");

  if (mobileDigits && !/^(09\d{9}|9\d{9}|63\d{10})$/.test(mobileDigits)) {
    $("mobile")?.classList.add("invalid");
    valid = false;
  }

  if (intVal(toteQty) + intVal(pinsQty) + intVal(capsQty) === 0) {
    alert("Please select at least one MAARTE product.");
    valid = false;
  }

  return valid;
}

function buildSubmission() {
  const c = calculateOrder();

  return {
    name: [value("firstName"), value("surname")].filter(Boolean).join(" "),
    instagram: value("instagram"),
    mobile: value("mobile"),
    email: value("email"),
    address: getAddress(),
    toteQty: c.tote,
    pinsQty: c.pins,
    capsQty: c.caps,
    subtotal: c.subtotal,
    promoDiscount: c.totalDiscount,
    shipping: c.shipping,
    total: c.total,
    deliveryMethod: c.deliveryMethod,
    paymentMethod: selected("paymentMethod"),
    paymentReference: value("paymentReference")
  };
}

form?.addEventListener("submit", async e => {
  e.preventDefault();
  updateSummary();

  if (!validate()) {
    formStatus.textContent = "Please complete all required fields and payment details.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "SUBMITTING...";
  formStatus.textContent = "";

  try {
    await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(buildSubmission())
    });

    formStatus.textContent = "Thank you! Your MAARTE pre-order has been submitted successfully.";
    submitBtn.textContent = "SUBMITTED ✓";

    if (instagramSuccess) {
      instagramSuccess.classList.remove("hidden");
      instagramSuccess.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  } catch (error) {
    console.error(error);
    formStatus.textContent = "We couldn't submit your order. Please try again.";
    submitBtn.disabled = false;
    submitBtn.textContent = "SUBMIT PRE-ORDER";
  }
});

loadRegions();
updatePaymentUI();
updateSummary();
