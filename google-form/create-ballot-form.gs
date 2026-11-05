/**
 * Taguig Rebs | Election ballot setup
 *
 * In the "Taguig Rebs Election 2026" Drive folder this creates:
 *   - the Google Form the ballot page sends votes to
 *   - "Taguig Rebs | Election 2026 Ballots & Tally", a Google Sheet with:
 *       Tally         live votes per nominee, turnout, the 7-vote rule
 *       Ballot check  every ballot, checked: first vote under this name? valid picks?
 *                     Two yellow columns are for the committee:
 *                       Same Kap as   type a name here to count this ballot under it
 *                                     (when one Kap's name was typed two ways)
 *                       Exclude       tick to drop a ballot (e.g. not an official member)
 *       Voters        everyone whose vote counted, A to Z, to check against the roster
 *       Ballots       raw votes from the form (don't edit or sort)
 * Then prints the CONFIG lines for the ballot page.
 *
 * How to run: script.google.com → New project → paste all of this → Save →
 * Run (setUpBallot) → allow access → copy the block from the Execution log.
 * Safe to run again: it reuses the form and Sheet, keeps the committee's
 * yellow columns and the member count, and rebuilds the formulas.
 */
const FOLDER_ID   = '1hh8a2EKlqLsg3c048Knpt9KjNs6yLWmB';   // "Taguig Rebs Election 2026"
const FORM_TITLE  = 'Taguig Rebs | Election Ballot 2026';
const SHEET_TITLE = 'Taguig Rebs | Election 2026 Ballots & Tally';

// Spell these exactly as on the ballot page.
const LEAD    = ['Noel Fortaleza', 'Jeus Rivera', 'Jhe Valera', 'Pakito'];
const CO_LEAD = ['Nad Pangilinan', 'Frank', 'Robinson'];
const MIN_LEAD_VOTES = 7;   // FAQ: a replacement Lead needs at least 7 votes
const CHECKBOX_ROWS = 500;

const STATUS = {
  counted:  'Counted',
  repeat:   'Repeat voter (not counted)',
  excluded: 'Excluded by committee',
  noName:   'No name (not counted)',
  invalid:  'Invalid choice (not counted)'
};
const YELLOW = '#fff4cc';

function setUpBallot() {
  const folder = DriveApp.getFolderById(FOLDER_ID);

  // 1. Ballot form (reused if it already exists)
  let form = findInFolder_(folder, FORM_TITLE, MimeType.GOOGLE_FORMS, function (id) { return FormApp.openById(id); });
  if (!form) {
    form = FormApp.create(FORM_TITLE);
    form.setDescription(
      'Election week: Nov 9 to 13, 2026 (Manila time). ' +
      'Ballots are cast from the Taguig Rebs ballot page.'
    );
    // Not required: the page checks answers, and a required blank would make Google drop the ballot.
    form.addTextItem().setTitle('Voter name').setRequired(false);
    form.addTextItem().setTitle('Lead vote').setRequired(false);
    form.addTextItem().setTitle('Co-Lead vote').setRequired(false);
    form.setLimitOneResponsePerUser(false);
    form.setAllowResponseEdits(false);
    try { form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT); }
    catch (e) { try { form.setCollectEmail(false); } catch (e2) {} }
    try { form.setRequireLogin(false); } catch (e) {}
    try { if (typeof form.setPublished === 'function') form.setPublished(true); } catch (e) {}
    form.setAcceptingResponses(true);
    form.setConfirmationMessage('Salamat, Kap! Your vote is in.');
    DriveApp.getFileById(form.getId()).moveTo(folder);
  }

  // 2. Ballots & Tally sheet (reused if it already exists)
  let ss = findInFolder_(folder, SHEET_TITLE, MimeType.GOOGLE_SHEETS, function (id) { return SpreadsheetApp.openById(id); });
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_TITLE);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
  }

  // 3. Link the form to the sheet; its response tab becomes "Ballots"
  let ballots = ss.getSheetByName('Ballots');
  if (!ballots) {
    const before = ss.getSheets().map(function (s) { return s.getSheetId(); });
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    for (let i = 0; i < 30 && !ballots; i++) {
      SpreadsheetApp.flush();
      Utilities.sleep(500);
      ss = SpreadsheetApp.openById(ss.getId());
      const fresh = ss.getSheets().filter(function (s) { return before.indexOf(s.getSheetId()) < 0; })[0];
      if (fresh) { fresh.setName('Ballots'); ballots = fresh; }
    }
    if (!ballots) throw new Error('The ballot form did not link to the Sheet yet. Run setUpBallot again.');
  }

  // 4. Tabs
  const tally  = getOrMakeSheet_(ss, 'Tally', 'Sheet1');
  const check  = getOrMakeSheet_(ss, 'Ballot check');
  const voters = getOrMakeSheet_(ss, 'Voters');

  // Tally layout (row numbers are needed by the Ballot check formulas)
  const leadHead = 7, leadStart = 8, leadEnd = leadStart + LEAD.length - 1;
  const coHead = leadEnd + 2, coStart = coHead + 1, coEnd = coStart + CO_LEAD.length - 1;
  const ncHead = coEnd + 2;
  const leadRange = 'Tally!$A$' + leadStart + ':$A$' + leadEnd;
  const coRange   = 'Tally!$A$' + coStart + ':$A$' + coEnd;
  const q = function (s) { return '"' + s + '"'; };
  const RAW = function (col) { return 'INDIRECT("Ballots!' + col + '2:' + col + '")'; };

  // Ballot check. Columns E and F belong to the committee and are kept on re-runs.
  check.getRange('A:D').clearContent();
  check.getRange('G:I').clearContent();
  check.getRange('A1:I1').setValues([[
    'Time', 'Voter name', 'Lead vote', 'Co-Lead vote',
    'Same Kap as (committee)', 'Exclude (committee)',
    'Voter key', 'Vote # for this Kap', 'Status'
  ]]).setFontWeight('bold');
  check.getRange('E1').setNote('Optional. If one Kap\'s name was typed two ways, type the spelling to count this ballot under, e.g. the name on his first ballot.');
  check.getRange('F1').setNote('Tick to drop this ballot, e.g. if it is not from an official member. The next ballot under the same name then counts.');
  check.getRange('A2').setFormula('=ARRAYFORMULA(IF(' + RAW('A') + '="",,' + RAW('A') + '))');
  check.getRange('B2').setFormula('=ARRAYFORMULA(IF(' + RAW('A') + '="",,TRIM(' + RAW('B') + ')))');
  check.getRange('C2').setFormula('=ARRAYFORMULA(IF(' + RAW('A') + '="",,TRIM(' + RAW('C') + ')))');
  check.getRange('D2').setFormula('=ARRAYFORMULA(IF(' + RAW('A') + '="",,TRIM(' + RAW('D') + ')))');
  // Voter key: same rule as the ballot page (ignore case, spaces, punctuation, a leading "Kap").
  // Excluded ballots get no key, so they don't block the next ballot under that name.
  check.getRange('G2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="",,IF(F2:F=TRUE,"",' +
    'REGEXREPLACE(REGEXREPLACE(UPPER(TRIM(IF(E2:E<>"",E2:E,B2:B))),"^KAP[\\s.]+",""),"[^A-Z0-9]",""))))'
  );
  check.getRange('H2').setFormula('=ARRAYFORMULA(IF(G2:G="",,COUNTIFS(G2:G,G2:G,ROW(G2:G),"<="&ROW(G2:G))))');
  check.getRange('I2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="",,' +
    'IF(F2:F=TRUE,' + q(STATUS.excluded) + ',' +
    'IF(G2:G="",' + q(STATUS.noName) + ',' +
    'IF(H2:H>1,' + q(STATUS.repeat) + ',' +
    'IF(ISNA(MATCH(C2:C,' + leadRange + ',0))+ISNA(MATCH(D2:D,' + coRange + ',0)),' + q(STATUS.invalid) + ',' +
    q(STATUS.counted) + '))))))'
  );
  if (!check.getRange('F2').getDataValidation()) check.getRange(2, 6, CHECKBOX_ROWS, 1).insertCheckboxes();
  check.getRange(1, 5, CHECKBOX_ROWS + 1, 2).setBackground(YELLOW);
  check.getRange('A2:A').setNumberFormat('mmm d, h:mm am/pm');
  check.setFrozenRows(1);
  check.setColumnWidth(1, 130); check.setColumnWidth(2, 190); check.setColumnWidth(5, 190);
  check.setColumnWidth(6, 120); check.setColumnWidth(7, 140); check.setColumnWidth(9, 220);

  // Voters
  voters.clear();
  voters.getRange('A1').setValue('Kaps whose vote counted (A to Z)').setFontWeight('bold');
  voters.getRange('A2').setFormula(
    '=IFERROR(SORT(UNIQUE(FILTER(IF(\'Ballot check\'!E2:E<>"",\'Ballot check\'!E2:E,\'Ballot check\'!B2:B),' +
    '\'Ballot check\'!I2:I=' + q(STATUS.counted) + '))),"No counted votes yet")'
  );
  voters.setColumnWidth(1, 260);

  // Tally (keeps the member count the committee typed in B3)
  const memberCount = tally.getRange('A3').getValue() === 'Official members (type the number)' ? tally.getRange('B3').getValue() : '';
  tally.clear();
  tally.getRange('A1').setValue('Taguig Rebs Election 2026 | Live tally').setFontSize(16).setFontWeight('bold');
  tally.getRange('A2:B5').setValues([
    ['Counted votes', '=COUNTIF(\'Ballot check\'!I2:I,' + q(STATUS.counted) + ')'],
    ['Official members (type the number)', memberCount],
    ['Turnout', '=IF(N(B3)=0,"",B2/B3)'],
    ['Last ballot', '=IF(COUNT(\'Ballot check\'!A2:A)=0,"",MAX(\'Ballot check\'!A2:A))']
  ]);
  tally.getRange('B3').setBackground(YELLOW);
  tally.getRange('B4').setNumberFormat('0%');
  tally.getRange('B5').setNumberFormat('mmm d, h:mm am/pm');

  tally.getRange(leadHead, 1, 1, 5).setValues([['Lead', 'Votes', 'Share', 'Rank', MIN_LEAD_VOTES + '+ votes']]).setFontWeight('bold');
  LEAD.forEach(function (name, i) {
    const r = leadStart + i;
    tally.getRange(r, 1, 1, 5).setValues([[
      name,
      '=COUNTIFS(\'Ballot check\'!$C$2:$C,$A' + r + ',\'Ballot check\'!$I$2:$I,' + q(STATUS.counted) + ')',
      '=IF($B$2=0,"",B' + r + '/$B$2)',
      '=IF($B$2=0,"",RANK(B' + r + ',$B$' + leadStart + ':$B$' + leadEnd + '))',
      '=IF(B' + r + '>=' + MIN_LEAD_VOTES + ',"Yes","No")'
    ]]);
  });
  tally.getRange(coHead, 1, 1, 4).setValues([['Co-Lead', 'Votes', 'Share', 'Rank']]).setFontWeight('bold');
  CO_LEAD.forEach(function (name, i) {
    const r = coStart + i;
    tally.getRange(r, 1, 1, 4).setValues([[
      name,
      '=COUNTIFS(\'Ballot check\'!$D$2:$D,$A' + r + ',\'Ballot check\'!$I$2:$I,' + q(STATUS.counted) + ')',
      '=IF($B$2=0,"",B' + r + '/$B$2)',
      '=IF($B$2=0,"",RANK(B' + r + ',$B$' + coStart + ':$B$' + coEnd + '))'
    ]]);
  });
  tally.getRange(leadStart, 3, LEAD.length, 1).setNumberFormat('0%');
  tally.getRange(coStart, 3, CO_LEAD.length, 1).setNumberFormat('0%');

  const nc = [STATUS.repeat, STATUS.excluded, STATUS.noName, STATUS.invalid];
  tally.getRange(ncHead, 1, 1, 2).setValues([['Not counted', 'Ballots']]).setFontWeight('bold');
  nc.forEach(function (s, i) {
    tally.getRange(ncHead + 1 + i, 1, 1, 2).setValues([[s, '=COUNTIF(\'Ballot check\'!$I$2:$I,' + q(s) + ')']]);
  });
  tally.getRange(ncHead + nc.length + 2, 1, 3, 1).setValues([
    ['The first vote under each name counts. Names match even with different capitals, spaces or a "Kap" in front.'],
    ['Check the Voters tab against the official roster. Use the yellow columns on Ballot check to merge or exclude ballots.'],
    ['Each ballot shows who voted for whom, so keep this Sheet to the election committee and share only the totals.']
  ]).setFontColor('#666666');
  tally.setColumnWidth(1, 270);
  [2, 3, 4, 5].forEach(function (c) { tally.setColumnWidth(c, 90); });
  ss.setActiveSheet(tally); ss.moveActiveSheet(1);
  SpreadsheetApp.flush();

  // 5. Entry IDs for the ballot page (from a pre-filled link; nothing is submitted)
  const keys = ['voter', 'lead', 'coLead'];
  const items = form.getItems();
  const pre = form.createResponse();
  keys.forEach(function (k, n) { pre.withItemResponse(items[n].asTextItem().createResponse('q' + n)); });
  const url = pre.toPrefilledUrl();
  const entry = {};
  const re = /entry\.(\d+)=q(\d)/g;
  let m;
  while ((m = re.exec(url)) !== null) entry[keys[Number(m[2])]] = 'entry.' + m[1];

  const action = form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse');
  const config =
    '  FORM_ACTION: "' + action + '",\n' +
    '  ENTRY: {\n' +
    keys.map(function (k) { return '    ' + (k + ':').padEnd(8) + '"' + entry[k] + '"'; }).join(',\n') + '\n' +
    '  },';

  Logger.log(
    'Done. The ballot form and "' + SHEET_TITLE + '" are in your Taguig Rebs Election 2026 folder.\n\n' +
    'Edit the form:   ' + form.getEditUrl() + '\n' +
    'Tally sheet:     ' + ss.getUrl() + '\n\n' +
    '---- Copy from here and send to Claude ----\n' +
    config
  );
}

function findInFolder_(folder, title, mime, open) {
  const it = folder.getFilesByName(title);
  while (it.hasNext()) {
    const f = it.next();
    if (!f.isTrashed() && f.getMimeType() === mime) return open(f.getId());
  }
  return null;
}

function getOrMakeSheet_(ss, name, renameFrom) {
  let sh = ss.getSheetByName(name);
  if (!sh && renameFrom) {
    const old = ss.getSheetByName(renameFrom);
    if (old) sh = old.setName(name);
  }
  return sh || ss.insertSheet(name);
}
