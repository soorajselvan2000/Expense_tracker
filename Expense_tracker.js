const TOKEN = ""

function doPost(e) {

  const BOT_TOKEN = TOKEN; //***token from bot */
  const SHEET_NAME = "Daily_Expenses";

  const data = JSON.parse(e.postData.contents);
  if (!data.message || !data.message.text) return;

  const chatId = data.message.chat.id;
  const text = data.message.text;
  const name = data.message.from.first_name || "User";

  const props = PropertiesService.getUserProperties();
  const state = props.getProperty(chatId);

  // /start
  if (text === "/start") {
    sendKeyboard(chatId, `Hi ${name} 👋\nChoose an option:`);
    return;
  }

  // New Entry
  if (text === "📝 New Entry") {
    props.setProperty(chatId, "YEAR");
    sendYearKeyboard(chatId);
    return;
  }

  // YEAR
  if (state === "YEAR") {
    props.setProperty(chatId + "_year", text);
    props.setProperty(chatId, "MONTH");
    sendMonthKeyboard(chatId);
    return;
  }

  // MONTH
  if (state === "MONTH") {
    props.setProperty(chatId + "_month", text);
    props.setProperty(chatId, "DAY");
    sendDayKeyboard(chatId);
    return;
  }

  // DAY → build DD-MM-YYYY string
  if (state === "DAY") {

    const year = props.getProperty(chatId + "_year");
    const monthMap = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12"
    };

    const month = monthMap[props.getProperty(chatId + "_month")];
    const day = text.padStart(2, "0");

    const formattedDate = `${day}-${month}-${year}`;

    props.setProperty(chatId + "_date", formattedDate);
    props.setProperty(chatId, "CATEGORY");

    sendCategoryKeyboard(chatId);
    return;
  }

  // CATEGORY
  if (state === "CATEGORY") {
    props.setProperty(chatId + "_category", text);
    props.setProperty(chatId, "DESCRIPTION");
    sendMessage(chatId, "📝 Enter Description\nExample: At Trivandrum");
    return;
  }

  // DESCRIPTION
  if (state === "DESCRIPTION") {
    props.setProperty(chatId + "_description", text);
    props.setProperty(chatId, "AMOUNT");
    sendMessage(chatId, "💰 Enter Amount\nExample: 5000");
    return;
  }

  // AMOUNT → SAVE (DATE AS TEXT)
  if (state === "AMOUNT") {

    const date = props.getProperty(chatId + "_date"); // DD-MM-YYYY TEXT
    const category = props.getProperty(chatId + "_category");
    const description = props.getProperty(chatId + "_description");
    const amount = text;

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME);

    sheet.appendRow([date, category, description, amount]);

    // clear state
    props.deleteProperty(chatId);
    props.deleteProperty(chatId + "_year");
    props.deleteProperty(chatId + "_month");
    props.deleteProperty(chatId + "_date");
    props.deleteProperty(chatId + "_category");
    props.deleteProperty(chatId + "_description");

    sendMessage(chatId, "✅ Expense saved successfully!");
    return;
  }
}

/* ========== HELPERS ========== */

function sendMessage(chatId, text) {
  const BOT_TOKEN = TOKEN; //***token from bot */
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text })
  });
}

function sendKeyboard(chatId, text) {
  sendCustomKeyboard(chatId, text, [[{ text: "📝 New Entry" }]]);
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
    [{ text: "House Rent" }, { text: "Loan EMI" }],
    [{ text: "Food & Beverages" }, { text: "Public Transport" }],
    [{ text: "Fuel (Bike / Petrol)" }, { text: "Travel Pass / Ticket" }],
    [{ text: "Subscriptions" }, { text: "Mobile & Internet" }],
    [{ text: "Groceries" }, { text: "Medical & Health" }],
    [{ text: "Personal Care" }, { text: "Clothing" }],
    [{ text: "Entertainment" }, { text: "Vehicle Maintenance" }],
    [{ text: "Emergency / Unexpected" }, { text: "Miscellaneous" }]
  ]);
}

function sendCustomKeyboard(chatId, text, keyboard) {
  const BOT_TOKEN = TOKEN; //***token from bot */
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
