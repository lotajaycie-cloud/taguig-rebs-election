# Taguig Rebs: Lead & Co-Lead election

Mobile-first pages for the ADV Juan Sikty Taguig Rebs RT election.

- **Nomination period:** Oct 28 – Nov 4, 2026 (Manila time)
- **Election week:** Nov 9 – 13, 2026
- **Results:** Nov 14, 2026, at the Tambike

Each page locks itself outside its dates. Add `?preview=1` to a URL to test outside them, then delete test rows from the Sheet.

## Nomination page: `index.html`

Posts each nomination to the nominations Google Form, which saves it to the linked Sheet in the "Taguig Rebs Election 2026" Drive folder. Settings are in the `CONFIG` block near the bottom. `VOTING_URL` points to the ballot, so the page shows "See the nominees" after nominations close and "Go to the ballot" during election week.

## Ballot: `vote/index.html` (served at `/vote/`)

Each Kap types his name and picks one Lead and one Co-Lead. Nominees are shuffled for each voter. Votes post to the "Taguig Rebs | Election Ballot 2026" Google Form. Settings, including the nominee names, are in the `CONFIG` block near the bottom.

The "Taguig Rebs | Election 2026 Ballots & Tally" Sheet does the counting:

- **Tally** – live votes, share and rank per nominee, turnout, and who has 7+ votes for Lead
- **Ballot check** – every ballot with its status. The first vote under each name counts (case, spacing, punctuation and a leading "Kap" are ignored). The yellow columns are for the committee: **Same Kap as** merges a name typed two ways, **Exclude** drops a ballot
- **Voters** – every Kap whose vote counted, A to Z, to check against the roster
- **Ballots** – raw form responses (don't edit or sort)

Keep the Sheet to the election committee: it shows who voted for whom.

## Google Form scripts: `google-form/`

- `create-nomination-form.gs` – created the nominations form and Sheet
- `create-ballot-form.gs` – creates the ballot form and the Ballots & Tally Sheet, and prints the `CONFIG` lines for the ballot page. Safe to re-run: it keeps the committee's yellow columns and the member count

## Closing

After each deadline, also set that Google Form to "Not accepting responses".
