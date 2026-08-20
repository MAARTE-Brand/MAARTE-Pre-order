# MAARTE Pre-Order Form — Revised GitHub Version

This version keeps the approved MAARTE colors and adds the requested updates.

## Included
- Instagram Username
- Real product images for Tote Bag, Pins, and Cap
- Cascading Philippine address selection:
  - Region
  - Province
  - City / Municipality
  - Barangay
- Shipping prices are hidden from the delivery choices
- Shipping is calculated automatically in the order total
- Promo mechanics are displayed and calculated automatically
- Removed the entire "Copy This & Send It To Us" section
- Removed the Copy & Send Instagram instruction
- Payment methods:
  - GCash
  - Bank Transfer / BPI
  - PayPal
- Supplied GCash QR image
- Supplied BPI QR image
- Payment Reference Number
- Payment Screenshot upload with preview
- Final Order Summary
- Submit button prepared for a secure Airtable endpoint

## Product pricing
- Tote Bag: ₱1,599
- Pins: ₱499
- Cap: ₱799

## Promo rules
1. ₱99 OFF for every matching 1 Tote + 1 Pins pair.
   Formula: `min(toteQty, pinsQty) × 99`
2. Buy 10 Caps, Get 1 Free.
   Formula: `floor(capsQty / 10) × 799`

## Shipping calculation
The shipping rates are intentionally NOT displayed in the delivery option cards.

The browser calculates:
- Pickup in Kamias, QC: ₱0
- Courier: determined automatically by NCR vs provincial address and box count

Box count:
`max(ceil(capsQty / 5), toteQty, 1)` when an order has products.

## Philippine address data
The dropdowns load live from:
`https://psgc.cloud/api/v2`

This allows the form to provide Philippine Region → Province → City/Municipality → Barangay options without hard-coding tens of thousands of barangays into one HTML file.

## Airtable connection
The form is ready to submit through a secure endpoint.

In `script.js`, set:
```js
const SUBMIT_ENDPOINT = "https://YOUR-SECURE-ENDPOINT/submit";
```

Do NOT place an Airtable personal access token directly inside this GitHub repository.

The secure backend should:
1. Receive the order + screenshot.
2. Upload the screenshot to storage that can provide a public/temporary URL.
3. Create the Airtable record.
4. Add the screenshot URL to the Airtable attachment field.

GitHub Pages alone cannot securely hold Airtable secrets or directly store uploaded files.
