const TOKEN = "" //place the token here

function doPost(e) {

  const BOT_TOKEN = TOKEN;
  const SHEET_NAME = "Daily_Expenses";

  const data = JSON.parse(e.postData.contents);
  if (!data.message || !data.message.text) return;

  const chatId = data.message.chat.id;
  const text = data.message.text;
  const name = data.message.from.first_name || "User";

  const props = PropertiesService.getUserProperties();
  const state = props.getProperty(chatId);

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  /* ================= START ================= */

  if (text === "/start") {
    sendMainKeyboard(chatId, `Hi ${name} 👋\nChoose an option:`);
    return;
  }

  /* ================= DASHBOARD BUTTONS ================= */

  // 📊 This Month Summary
  if (text === "📊 This Month Summary") {

    const summary = ss.getSheetByName("Monthly_Summary");
    const dashboard = ss.getSheetByName("Dashboard");

    const month = summary.getRange("B1").getValue();
    const year = summary.getRange("B2").getValue();
    const total = summary.getRange("B21").getValue();
    const cashback = summary.getRange("E2").getValue();
    const net = total - cashback;
    const savings = dashboard.getRange("I4").getValue();

    const message =
      `📊 ${month} ${year} Summary\n\n` +
      `💸 Total Expense: ₹${total}\n` +
      `🎁 Cashback: ₹${cashback}\n` +
      `📉 Net Expense: ₹${net}\n` +
      `💾 Savings: ₹${savings}`;

    sendMessage(chatId, message);
    return;
  }

  // 💰 Total Expense
  if (text === "💰 Total Expense") {

    const summary = ss.getSheetByName("Monthly_Summary");
    const month = summary.getRange("B1").getValue();
    const total = summary.getRange("B21").getValue();

    sendMessage(chatId, `💰 Total Expense (${month})\n₹${total}`);
    return;
  }

  if (text === "📷 Dashboard Snapshot") {
    sendDashboardSnapshot(chatId);
    return;
  }

  // 🎁 Cashback
  if (text === "🎁 Cashback") {

    const summary = ss.getSheetByName("Monthly_Summary");
    const month = summary.getRange("B1").getValue();
    const cashback = summary.getRange("E2").getValue();

    sendMessage(chatId, `🎁 Cashback (${month})\n₹${cashback}`);
    return;
  }

  // 📉 Net Expense
  if (text === "📉 Net Expense") {

    const summary = ss.getSheetByName("Monthly_Summary");
    const total = summary.getRange("B21").getValue();
    const cashback = summary.getRange("E2").getValue();

    sendMessage(chatId, `📉 Net Expense\n₹${total - cashback}`);
    return;
  }

  // 💾 Savings
  if (text === "💾 Savings") {

    const dashboard = ss.getSheetByName("Dashboard_New");
    const savings = dashboard.getRange("I4").getValue();

    sendMessage(chatId, `💾 Savings\n₹${savings}`);
    return;
  }

  /* ================= NEW ENTRY FLOW ================= */

  if (text === "📝 New Entry") {
    props.setProperty(chatId, "YEAR");
    sendYearKeyboard(chatId);
    return;
  }

  if (state === "YEAR") {
    props.setProperty(chatId + "_year", text);
    props.setProperty(chatId, "MONTH");
    sendMonthKeyboard(chatId);
    return;
  }

  if (state === "MONTH") {
    props.setProperty(chatId + "_month", text);
    props.setProperty(chatId, "DAY");
    sendDayKeyboard(chatId);
    return;
  }

  if (state === "DAY") {

    const year = props.getProperty(chatId + "_year");

    const monthMap = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12"
    };

    const month = monthMap[props.getProperty(chatId + "_month")];
    const day = text.padStart(2, "0");

    props.setProperty(chatId + "_date", `${day}-${month}-${year}`);
    props.setProperty(chatId, "CATEGORY");

    sendCategoryKeyboard(chatId);
    return;
  }

  if (state === "CATEGORY") {
    const cleanCategory = removeEmoji(text);
    props.setProperty(chatId + "_category", cleanCategory);
    props.setProperty(chatId, "DESCRIPTION");
    sendMessage(chatId, "📝 Enter Description\nExample: At Trivandrum");
    return;
  }

  if (state === "DESCRIPTION") {
    props.setProperty(chatId + "_description", text);
    props.setProperty(chatId, "AMOUNT");
    sendMessage(chatId, "💰 Enter Amount\nExample: 5000");
    return;
  }

 if (state === "AMOUNT") {
    const amount = Number(text);
    if (isNaN(amount)) {
      sendMessage(chatId, "❌ Amount must be a number");
      return;
    }

    const sheet = ss.getSheetByName(SHEET_NAME);

    sheet.appendRow([
      props.getProperty(chatId + "_date"),
      props.getProperty(chatId + "_category"),
      props.getProperty(chatId + "_description"),
      amount
    ]);

    // 🔑 STORE CATEGORY BEFORE CLEARING STATE
    const category = props.getProperty(chatId + "_category");

    // Clear state
    props.deleteProperty(chatId);
    props.deleteProperty(chatId + "_year");
    props.deleteProperty(chatId + "_month");
    props.deleteProperty(chatId + "_date");
    props.deleteProperty(chatId + "_category");
    props.deleteProperty(chatId + "_description");

    // 🔥 SMART CATEGORY SUMMARY (NEW)
    sendCategorySummary(chatId, category);
    return;
  }
}

/* ================= HELPER FUNCTIONS ================= */

function sendMessage(chatId, text) {
  const BOT_TOKEN = TOKEN;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text })
  });
}

function sendMainKeyboard(chatId, text) {
  sendCustomKeyboard(chatId, text, [
    [{ text: "📝 New Entry" }],
    [{ text: "📊 This Month Summary" }],
    [{ text: "📷 Dashboard Snapshot" }],
    [{ text: "💰 Total Expense" }, { text: "🎁 Cashback" }],
    [{ text: "📉 Net Expense" }, { text: "💾 Savings" }]
  ]);
}

function sendYearKeyboard(chatId) {
  sendCustomKeyboard(chatId, "📅 Choose Year", [
    [{ text: "2024" }, { text: "2025" }],
    [{ text: "2026" }, { text: "2027" }]
  ]);
}

function sendMonthKeyboard(chatId) {
  sendCustomKeyboard(chatId, "📆 Choose Month", [
    [{ text: "Jan" }, { text: "Feb" }, { text: "Mar" }],
    [{ text: "Apr" }, { text: "May" }, { text: "Jun" }],
    [{ text: "Jul" }, { text: "Aug" }, { text: "Sep" }],
    [{ text: "Oct" }, { text: "Nov" }, { text: "Dec" }]
  ]);
}

function sendDayKeyboard(chatId) {
  const rows = [];
  let row = [];

  for (let i = 1; i <= 31; i++) {
    row.push({ text: i.toString() });
    if (row.length === 5) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);

  sendCustomKeyboard(chatId, "📅 Choose Day", rows);
}

function sendCategoryKeyboard(chatId) {
  sendCustomKeyboard(chatId, "🏷 Choose Category", [
    [{ text: "🏠 House Rent" }, { text: "💳 Loan EMI" }],
    [{ text: "🍔 Food & Beverages" }, { text: "🚌 Public Transport" }],
    [{ text: "⛽ Fuel (Bike / Petrol)" }, { text: "🎫 Travel Pass / Ticket" }],
    [{ text: "📺 Subscriptions" }, { text: "📶 Mobile & Internet" }],
    [{ text: "🛒 Groceries" }, { text: "🏥 Medical & Health" }],
    [{ text: "🧴 Personal Care" }, { text: "👕 Clothing" }],
    [{ text: "🎬 Entertainment" }, { text: "🛠 Vehicle Maintenance" }],
    [{ text: "🚨 Emergency / Unexpected" }, { text: "📦 Miscellaneous" }],
    [{ text: "💰 Cashback / Reward" }]
  ]);
}

function removeEmoji(text) {
  return text.replace(/^[^\w]+/g, "").trim();
}

function sendCustomKeyboard(chatId, text, keyboard) {
  const BOT_TOKEN = TOKEN;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: true
      }
    })
  });
}

function sendCategorySummary(chatId, category) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName("Monthly_Summary");

  const month = summarySheet.getRange("B1").getValue();
  const year = summarySheet.getRange("B2").getValue();

  const data = summarySheet.getRange("A5:C").getValues();

  let total = 0;
  let budget = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === category) {
      total = data[i][1];
      budget = data[i][2];
      break;
    }
  }

  const status =
    total > budget ? "🚨 Over Budget" : "✅ Within Budget";

  const message =
    `✅ Expense Added: ${category}\n\n` +
    `📊 Category Summary (${month} ${year})\n\n` +
    `💸 Total Spent: ₹${total}\n` +
    `🎯 Budget: ₹${budget}\n` +
    `📌 Status: ${status}`;

  sendMessage(chatId, message);
}

function sendDashboardSnapshot(chatId) {

  const BOT_TOKEN = TOKEN;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Dashboard");

  if (!sheet) {
    sendMessage(chatId, "❌ Dashboard sheet not found");
    return;
  }

  const spreadsheetId = ss.getId();
  const sheetId = sheet.getSheetId();

  // Build export URL
  const exportUrl =
    "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export" +
    "?format=pdf" +
    "&gid=" + sheetId +
    "&portrait=false" +
    "&fitw=true" +
    "&sheetnames=false" +
    "&printtitle=false" +
    "&pagenumbers=false" +
    "&gridlines=false";

  const token = ScriptApp.getOAuthToken();

  // Fetch PDF
  const pdfBlob = UrlFetchApp.fetch(exportUrl, {
    headers: {
      Authorization: "Bearer " + token
    }
  }).getBlob();

  // 🔑 CRITICAL LINE (MUST EXIST)
  pdfBlob.setName("Dashboard.pdf");

  // Telegram API URL
  const telegramUrl =
    "https://api.telegram.org/bot" + BOT_TOKEN + "/sendDocument";

  // 🔑 MUST be a plain object (multipart/form-data)
  const payload = {
    chat_id: String(chatId), // force string
    document: pdfBlob
  };

  // 🚀 Send to Telegram
  UrlFetchApp.fetch(telegramUrl, {
    method: "post",
    payload: payload
  });
}
