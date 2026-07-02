const APP_NAME = 'Health Web App';

const SHEET_SCHEMAS = {
  User_Logs: [
    'ID',
    'Log_Date',
    'Category',
    'Symptom',
    'Severity',
    'Notes',
    'Created_At',
    'Updated_At',
  ],
  Health_Metrics: [
    'ID',
    'Metric_Date',
    'Weight',
    'Blood_Sugar',
    'Blood_Pressure',
    'Heart_Rate',
    'Notes',
    'Created_At',
    'Updated_At',
  ],
  Doctor_Consultations: [
    'ID',
    'Visit_Date',
    'Doctor_Name',
    'Hospital',
    'Diagnosis',
    'Medication',
    'Lab_Result_URL',
    'Notes',
    'Created_At',
    'Updated_At',
  ],
  Appointments: [
    'ID',
    'Appointment_Date',
    'Appointment_Time',
    'Doctor_Name',
    'Hospital',
    'Purpose',
    'Status',
    'Preparation_Notes',
    'Prep_Start_Date',
    'Prep_End_Date',
    'Created_At',
    'Updated_At',
  ],
};

const SUMMARY_LIMIT = 5;

function doGet() {
  setupDatabase();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupDatabase() {
  const ss = getSpreadsheet_();

  Object.keys(SHEET_SCHEMAS).forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    const currentHeaders = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];

    if (currentHeaders.join('|') !== headers.join('|')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0f766e')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  });

  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheets: Object.keys(SHEET_SCHEMAS),
  };
}

function getDashboardData() {
  setupDatabase();

  const allData = {};
  Object.keys(SHEET_SCHEMAS).forEach((sheetName) => {
    allData[sheetName] = listRecords(sheetName);
  });

  return {
    schemas: SHEET_SCHEMAS,
    summaries: {
      User_Logs: takeLatest_(allData.User_Logs, 'Log_Date', SUMMARY_LIMIT),
      Health_Metrics: takeLatest_(allData.Health_Metrics, 'Metric_Date', SUMMARY_LIMIT),
      Appointments: takeLatest_(allData.Appointments, 'Appointment_Date', SUMMARY_LIMIT),
    },
    activeAppointments: getActiveAppointmentAlerts_(allData.Appointments),
    symptomTimeline: takeLatest_(allData.User_Logs, 'Log_Date', 50),
    allData,
    databaseUrl: getSpreadsheet_().getUrl(),
  };
}

function listRecords(sheetName) {
  validateSheetName_(sheetName);

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headers = SHEET_SCHEMAS[sheetName];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

  return values
    .filter((row) => row[0])
    .map((row) => rowToObject_(headers, row));
}

function getRecord(sheetName, id) {
  validateSheetName_(sheetName);
  const rowNumber = findRowById_(sheetName, id);
  if (rowNumber === -1) throw new Error('Record not found: ' + id);

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  return rowToObject_(headers, values);
}

function createRecord(sheetName, payload) {
  validateSheetName_(sheetName);

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const now = new Date();
  const record = Object.assign({}, payload || {});

  record.ID = createUniqueTimestampId_();
  record.Created_At = now;
  record.Updated_At = now;

  const row = headers.map((header) => valueOrBlank_(record[header]));
  sheet.appendRow(row);

  return {
    ok: true,
    message: 'Created',
    record: rowToObject_(headers, row),
  };
}

function updateRecord(sheetName, id, payload) {
  validateSheetName_(sheetName);

  const rowNumber = findRowById_(sheetName, id);
  if (rowNumber === -1) throw new Error('Record not found: ' + id);

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const current = getRecord(sheetName, id);
  const updated = Object.assign({}, current, payload || {}, {
    ID: id,
    Updated_At: new Date(),
  });

  const row = headers.map((header) => valueOrBlank_(updated[header]));
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);

  return {
    ok: true,
    message: 'Updated',
    record: rowToObject_(headers, row),
  };
}

function deleteRecord(sheetName, id) {
  validateSheetName_(sheetName);

  const rowNumber = findRowById_(sheetName, id);
  if (rowNumber === -1) throw new Error('Record not found: ' + id);

  getSpreadsheet_().getSheetByName(sheetName).deleteRow(rowNumber);

  return {
    ok: true,
    message: 'Deleted',
    id,
  };
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');

  if (savedId) {
    return SpreadsheetApp.openById(savedId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }

  const created = SpreadsheetApp.create(APP_NAME + ' Database');
  props.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function validateSheetName_(sheetName) {
  if (!SHEET_SCHEMAS[sheetName]) {
    throw new Error('Invalid sheet name: ' + sheetName);
  }
}

function findRowById_(sheetName, id) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return -1;

  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2;
    }
  }
  return -1;
}

function rowToObject_(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = normalizeCell_(row[index]);
    return record;
  }, {});
}

function normalizeCell_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value;
}

function valueOrBlank_(value) {
  return value === undefined || value === null ? '' : value;
}

function createUniqueTimestampId_() {
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMddHHmmssSSS'
  );
  return timestamp + '-' + Math.floor(Math.random() * 10000);
}

function takeLatest_(records, dateField, limit) {
  return records
    .slice()
    .sort((a, b) => new Date(b[dateField] || b.Updated_At || 0) - new Date(a[dateField] || a.Updated_At || 0))
    .slice(0, limit);
}

function getActiveAppointmentAlerts_(appointments) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return appointments
    .filter((appointment) => String(appointment.Status || '').toLowerCase() === 'active')
    .map((appointment) => {
      const prepStart = parseDate_(appointment.Prep_Start_Date);
      const prepEnd = parseDate_(appointment.Prep_End_Date);
      const appointmentDate = parseDate_(appointment.Appointment_Date);
      const shouldPrepare = isWithinDateRange_(today, prepStart, prepEnd)
        || isWithinUpcomingDays_(today, appointmentDate, 7);

      return Object.assign({}, appointment, {
        Should_Prepare: shouldPrepare,
        Preparation_List: splitPreparation_(appointment.Preparation_Notes),
      });
    })
    .sort((a, b) => new Date(a.Appointment_Date || 0) - new Date(b.Appointment_Date || 0));
}

function parseDate_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isWithinDateRange_(today, start, end) {
  if (!start || !end) return false;
  return today >= start && today <= end;
}

function isWithinUpcomingDays_(today, target, days) {
  if (!target) return false;
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function splitPreparation_(notes) {
  const fallback = ['เตรียมบัตรประชาชน/บัตรโรงพยาบาล', 'นำรายการยาเดิมไปด้วย'];
  if (!notes) return fallback;

  return String(notes)
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}
