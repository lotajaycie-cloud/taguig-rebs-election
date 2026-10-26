# Taguig Rebs: Lead & Co-Lead nominations

Mobile-first nomination page for the ADV Juan Sikty Taguig Rebs RT election.

- **Nomination period:** Oct 28 – Nov 4, 2026 (Manila time). The page locks itself outside these dates.
- **Election week:** Nov 9 – 13, 2026
- **Results:** Nov 14, 2026, at the Tambike

## How it works

`index.html` is a single self-contained page (photos and logo are embedded). It posts each nomination to a Google Form, which saves it to the linked Google Sheet in the "Taguig Rebs Election 2026" Drive folder.

Settings live in the `CONFIG` block near the bottom of `index.html`:

- `FORM_ACTION` and `ENTRY` – the Google Form the page posts to
- dates for each phase
- `ELIGIBLE_OFFICERS` – list current officers (minus the incumbent Lead) to turn the nominee fields into dropdowns
- `VOTING_URL` – optional ballot link shown during election week

## Testing

Add `?preview=1` to the URL to submit outside the nomination dates. Delete test rows from the Sheet afterwards.

## Google Form

`google-form/create-nomination-form.gs` is the Apps Script that created the form and Sheet. Run it only to make a fresh copy; the live page is already connected.

## Closing

After Nov 4, 11:59 PM, also set the Google Form to "Not accepting responses".
