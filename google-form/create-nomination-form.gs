/**
 * Taguig Rebs | Lead & Co-Lead nominations
 *
 * Creates, in your own Google Drive:
 *   - a folder "Taguig Rebs Election 2026"
 *   - the Google Form with the 5 questions the nomination page sends
 *   - a Google Sheet that collects every nomination
 * Then prints the CONFIG lines for taguig-rebs-nomination.html.
 *
 * How to run: script.google.com → New project → delete the sample code →
 * paste all of this → Save → Run → allow access.
 * Run it once only (each run makes a new form).
 */
function createNominationForm() {
  const TITLE = 'Taguig Rebs | Lead & Co-Lead Nominations 2026';

  const form = FormApp.create(TITLE);
  form.setDescription(
    'Nomination period: Oct 28 to Nov 4, 2026 (Manila time). ' +
    'All current officers are eligible except the incumbent Lead. ' +
    'Nominations are sent from the Taguig Rebs nomination page.'
  );

  // Same order as the page. None are required: the page checks answers itself,
  // and a required question left blank would make Google reject the nomination.
  const items = {
    nominator:    form.addTextItem().setTitle('Nominator name'),
    lead:         form.addTextItem().setTitle('Lead nominee'),
    leadReason:   form.addParagraphTextItem().setTitle('Why this Lead nominee'),
    coLead:       form.addTextItem().setTitle('Co-Lead nominee'),
    coLeadReason: form.addParagraphTextItem().setTitle('Why this Co-Lead nominee')
  };
  Object.keys(items).forEach(function (k) { items[k].setRequired(false); });

  // No sign-in, no email, no response limit, so the page can post to the form
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT); }
  catch (e) { try { form.setCollectEmail(false); } catch (e2) {} }
  try { form.setRequireLogin(false); } catch (e) {}          // work/school accounts only
  try { if (typeof form.setPublished === 'function') form.setPublished(true); } catch (e) {}
  form.setAcceptingResponses(true);
  form.setConfirmationMessage('Salamat, Kap! Your nomination is in.');

  // Response sheet
  const sheet = SpreadsheetApp.create(TITLE + ' (Responses)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  // Keep everything in one Drive folder
  const folder = DriveApp.createFolder('Taguig Rebs Election 2026');
  DriveApp.getFileById(form.getId()).moveTo(folder);
  DriveApp.getFileById(sheet.getId()).moveTo(folder);

  // Read the real entry IDs from a pre-filled link (nothing is submitted)
  const keys = Object.keys(items);
  const prefill = form.createResponse();
  keys.forEach(function (k, n) { prefill.withItemResponse(items[k].createResponse('q' + n)); });
  const url = prefill.toPrefilledUrl();
  const entry = {};
  const re = /entry\.(\d+)=q(\d)/g;
  let m;
  while ((m = re.exec(url)) !== null) entry[keys[Number(m[2])]] = 'entry.' + m[1];

  const action = form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse');
  const config =
    '  FORM_ACTION: "' + action + '",\n' +
    '  ENTRY: {\n' +
    keys.map(function (k) { return '    ' + (k + ':').padEnd(14) + '"' + entry[k] + '"'; }).join(',\n') + '\n' +
    '  },';

  Logger.log(
    'Done. Your Drive now has the folder "Taguig Rebs Election 2026".\n\n' +
    'Edit the form:   ' + form.getEditUrl() + '\n' +
    'Live form:       ' + form.getPublishedUrl() + '\n' +
    'Responses sheet: ' + sheet.getUrl() + '\n\n' +
    '---- Copy from here and send to Claude (or paste into CONFIG in the page) ----\n' +
    config
  );
}
