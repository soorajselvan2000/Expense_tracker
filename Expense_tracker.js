const TOKEN = ""
const ALLOWED_CHAT_ID = "";

// ===== Constants =====
const BACK_BTN = "⬅ Back";
const EDIT_DESC = "✏️ Edit Description";
const EDIT_AMT = "✏️ Edit Amount";
const CONFIRM_SAVE = "✅ Confirm Save";

function doPost(e) {

  const SHEET_NAME = "Daily_Expenses";
  const data = JSON.parse(e.postData.contents);
  if (!data.message || !data.message.text) return;

  const chatId = data.message.chat.id.toString();
  const text = data.message.text;
  const name = data.message.from.first_name || "User";

  /* ================= SECURITY ================= */
  if (chatId !== ALLOWED_CHAT_ID) {
    sendMessage(chatId, "🚫 Access Restricted\n\nThis is a private assistant.");
    return;
  }

  const props = PropertiesService.getUserProperties();
  const state = props.getProperty(chatId);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  /* ================= START + DRAFT ================= */

  if (text === "/start") {

    if (props.getProperty(chatId + "_date")) {
      sendCustomKeyboard(chatId,
        "💾 You have an unfinished expense.\nWhat would you like to do?",
        [
          [{ text: "▶️ Continue Draft" }],
          [{ text: "❌ Discard Draft" }]
        ]
      );
      return;
    }

    props.deleteAllProperties();

    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

    sendMainKeyboard(chatId,
      `${greet}, ${name} 👋\n\nI’m ready to help you manage your expenses.`
    );
    return;
  }

  if (text === "▶️ Continue Draft") {
    props.setProperty(chatId, "DESCRIPTION");
    removeKeyboard(chatId, "Continue entering description:");
    return;
  }

  if (text === "❌ Cancel") {
    props.deleteAllProperties();
    sendMainKeyboard(chatId, "❌ Action cancelled.");
    return;
  }

  if (text === "❌ Discard Draft") {
    props.deleteAllProperties();
    sendMainKeyboard(chatId, "Draft discarded.");
    return;
  }

  /* ================= BACK ================= */

  if (text === BACK_BTN) {
    const prev = props.getProperty(chatId + "_prev");
    if (prev) {
      props.setProperty(chatId, prev);
      sendMessage(chatId, "⬅ Going back…");
    }
    return;
  }

  /* ================= MAIN MENU ================= */

  if (text === "➕ Add Expense") {
    props.setProperty(chatId, "DATE_OPTION");
    sendQuickDateKeyboard(chatId);
    return;
  }

  if (text === "⚡ Quick Add") {
    sendQuickAddKeyboard(chatId);
    return;
  }

  if (text === "✏️ Edit Expense") {
    listLastExpenses(chatId, "EDIT_SELECT");
    return;
  }

  if (text === "🗑 Delete Expense") {
    listLastExpenses(chatId, "DELETE_SELECT");
    return;
  }

  if (text === "📈 Monthly Summary") {
    sendMonthlySummaryText(chatId);
    return;
  }

  if (text === "🖼 Dashboard Image") {
    sendDashboardImage(chatId);
    return;
  }

  if (text === "📊 This Month Overview") {
    sendMonthOverview(chatId);
    return;
  }

  if (text === "📅 Today's Expenses") {
    sendTodaysExpenses(chatId);
    return;
  }

  if (text === "🏦 Savings") {
    const d = ss.getSheetByName("Dashboard");
    sendMessage(chatId, `🏦 Savings\n₹${d.getRange("I4").getValue()}`);
    sendMainKeyboard(chatId, "What next?");
    return;
  }

  if (text === "💼 Edit Salary") {

    const dashboard = ss.getSheetByName("Dashboard");
    const currentSalary = dashboard.getRange("H4").getValue();

    props.setProperty(chatId, "EDIT_SALARY");

    removeKeyboard(
      chatId,
      `💼 Current Salary\n━━━━━━━━━━━━━━━━━━\n₹${currentSalary}\n\n✏️ Enter new salary:`
    );
    return;
  }

  /* ================= REVIEW EDIT HANDLING ================= */

if (state === "REVIEW") {

  if (text === EDIT_DESC) {
    props.setProperty(chatId, "DESCRIPTION");
    removeKeyboard(chatId, "✏️ Edit description:");
    return;
  }

  if (text === EDIT_AMT) {
    props.setProperty(chatId, "AMOUNT");
    removeKeyboard(chatId, "✏️ Edit amount:");
    return;
  }

  if (text === CONFIRM_SAVE) {
    const dateStr = props.getProperty(chatId + "_date");
    const parts = dateStr.split("-");

    const day = parts[0];
    const monthNum = parts[1];
    const year = parts[2];

    const monthName = new Date(year, monthNum - 1, 1)
      .toLocaleString("en-US", { month: "long" });

    ss.getSheetByName(SHEET_NAME).appendRow([
      dateStr,
      props.getProperty(chatId + "_category"),
      props.getProperty(chatId + "_description"),
      Number(props.getProperty(chatId + "_amount")),
      day,
      monthName,
      year
    ]);

    const category = props.getProperty(chatId + "_category");

    props.deleteAllProperties();

    sendMessage(chatId, "✅ Expense recorded successfully.");
    sendCategorySummary(chatId, category);
    sendMainKeyboard(chatId, "What would you like to do next?");
    return;
  }
}

  if (state === "EDIT_SALARY") {

    const newSalary = Number(text);
    if (isNaN(newSalary) || newSalary <= 0) {
      sendMessage(chatId, "❌ Please enter a valid salary amount.");
      return;
    }

    const dashboard = ss.getSheetByName("Dashboard");
    const oldSalary = dashboard.getRange("H4").getValue();

    dashboard.getRange("H4").setValue(newSalary);

    props.deleteAllProperties();

    sendMainKeyboard(
      chatId,
      `✅ Salary updated successfully!\n\n` +
      `Old : ₹${oldSalary}\n` +
      `New : ₹${newSalary}`
    );
    return;
  }

  if (text === "📅 This Week Expenses") {
    sendWeeklyExpenses(chatId);
    return;
  }

  if (text === "🤔 Where is my money going?") {
    sendMoneyInsight(chatId);
    return;
  }

  /* ================= ADD EXPENSE FLOW ================= */

  if (state === "DATE_OPTION") {

    let d = new Date();
    if (text === "📅 Yesterday") d.setDate(d.getDate() - 1);

    if (text === "📅 Today" || text === "📅 Yesterday") {
      const date = Utilities.formatDate(d, "Asia/Kolkata", "dd-MM-yyyy");
      props.setProperty(chatId + "_date", date);
      props.setProperty(chatId, "CATEGORY");
      sendMessage(chatId, `📅 Date set to ${date}`);
      sendCategoryKeyboard(chatId);
      return;
    }

    if (text === "📆 Pick Another Date") {
      props.setProperty(chatId, "YEAR");
      sendYearKeyboard(chatId);
      return;
    }
  }

  if (state === "YEAR") {
    props.setProperty(chatId + "_year", text);
    props.setProperty(chatId, "MONTH");
    sendMonthKeyboard(chatId);
    return;
  }

  if (state === "MONTH") {
    props.setProperty(chatId + "_month", getMonthNumber(text));
    props.setProperty(chatId, "DAY");
    sendDayKeyboard(chatId);
    return;
  }

  if (state === "DAY") {
    const date = `${text}-${props.getProperty(chatId + "_month")}-${props.getProperty(chatId + "_year")}`;
    props.setProperty(chatId + "_date", date);
    props.setProperty(chatId, "CATEGORY");
    sendMessage(chatId, `📅 Date set to ${date}`);
    sendCategoryKeyboard(chatId);
    return;
  }

  if (state === "CATEGORY") {
    props.setProperty(chatId + "_category", removeEmoji(text));
    props.setProperty(chatId, "DESCRIPTION");
    removeKeyboard(chatId, "Enter description:");
    return;
  }

  if (state === "DESCRIPTION") {
    props.setProperty(chatId + "_description", text);
    props.setProperty(chatId, "AMOUNT");
    removeKeyboard(chatId, "Enter amount:");
    return;
  }

  if (state === "AMOUNT") {
    const amt = Number(text);
    if (isNaN(amt)) {
      sendMessage(chatId, "Enter valid amount.");
      return;
    }

    props.setProperty(chatId + "_amount", amt);
    props.setProperty(chatId, "REVIEW");

    sendCustomKeyboard(chatId,
      `🧾 Review Expense\n\n📅 ${props.getProperty(chatId + "_date")}\n📂 ${props.getProperty(chatId + "_category")}\n📝 ${props.getProperty(chatId + "_description")}\n💰 ₹${amt}`,
      [
        [{ text: EDIT_DESC }, { text: EDIT_AMT }],
        [{ text: CONFIRM_SAVE }],
        [{ text: "❌ Cancel" }]
      ]
    );
    return;
  }

  if (text === CONFIRM_SAVE) {
    const dateStr = props.getProperty(chatId + "_date");
    const parts = dateStr.split("-");

    const day = parts[0];
    const monthNum = parts[1];
    const year = parts[2];

    const monthName = new Date(year, monthNum - 1, 1)
      .toLocaleString("en-US", { month: "long" });

    ss.getSheetByName(SHEET_NAME).appendRow([
      dateStr,
      props.getProperty(chatId + "_category"),
      props.getProperty(chatId + "_description"),
      Number(props.getProperty(chatId + "_amount")),
      day,
      monthName,
      year
    ]);

    const cat = props.getProperty(chatId + "_category");
    props.deleteAllProperties();

    sendMessage(chatId, "✅ Expense recorded.");
    sendCategorySummary(chatId, cat);
    sendMainKeyboard(chatId, "What next?");
    return;
  }

  if (state === "EDIT_CATEGORY") {

    const row = Number(props.getProperty(chatId + "_editRow"));
    const category = removeEmoji(text);

    ss.getSheetByName("Daily_Expenses")
      .getRange(row, 2)
      .setValue(category);

    props.deleteAllProperties();
    sendMainKeyboard(chatId, "✅ Category updated successfully.");
    return;
  }

  if (state === "EDIT_DESCRIPTION") {

    const row = Number(props.getProperty(chatId + "_editRow"));

    ss.getSheetByName("Daily_Expenses")
      .getRange(row, 3)
      .setValue(text);

    props.deleteAllProperties();
    sendMainKeyboard(chatId, "✅ Description updated successfully.");
    return;
  }

  if (state === "EDIT_AMOUNT") {

    const amount = Number(text);
    if (isNaN(amount)) {
      sendMessage(chatId, "❌ Please enter a valid amount.");
      return;
    }

    const row = Number(props.getProperty(chatId + "_editRow"));

    ss.getSheetByName("Daily_Expenses")
      .getRange(row, 4)
      .setValue(amount);

    props.deleteAllProperties();
    sendMainKeyboard(chatId, "✅ Amount updated successfully.");
    return;
  }


  /* ================= EDIT / DELETE ================= */

  if (state === "EDIT_YEAR" || state === "DELETE_YEAR") {
    if (!/^\d{4}$/.test(text)) return;

    props.setProperty(chatId + "_year", text);
    props.setProperty(chatId, state === "EDIT_YEAR" ? "EDIT_MONTH" : "DELETE_MONTH");
    sendMonthKeyboard(chatId);
    return;
  }

  if (state === "EDIT_MONTH" || state === "DELETE_MONTH") {
    const month = getMonthNumber(text);
    if (!month) return;

    props.setProperty(chatId + "_month", month);
    props.setProperty(chatId, state === "EDIT_MONTH" ? "EDIT_DAY" : "DELETE_DAY");
    sendDayKeyboard(chatId);
    return;
  }

  if (state === "EDIT_DAY" || state === "DELETE_DAY") {
    if (!/^\d{2}$/.test(text)) return;

    const date =
      text + "-" +
      props.getProperty(chatId + "_month") + "-" +
      props.getProperty(chatId + "_year");

    listExpensesByDate(
      chatId,
      date,
      state === "EDIT_DAY" ? "EDIT_SELECT" : "DELETE_SELECT"
    );
    return;
  }

  if (state === "EDIT_SELECT") {
    const map = JSON.parse(props.getProperty(chatId + "_rowMap"));
    if (!map[text]) return;

    props.setProperty(chatId + "_editRow", map[text]);
    props.setProperty(chatId, "EDIT_FIELD");

    sendCustomKeyboard(chatId, "What do you want to edit?", [
      [{ text: "📂 Category" }],
      [{ text: "📝 Description" }],
      [{ text: "💰 Amount" }],
      [{ text: "❌ Cancel" }]
    ]);
    return;
  }

  if (text.startsWith("🍽️ Tea with Snacks")) {
    quickAddSave(chatId, "Food & Beverages", "Tea with Snacks", 20);
    return;
  }

  if (text.startsWith("🍵 Tea")) {
    quickAddSave(chatId, "Food & Beverages", "Tea", 10);
    return;
  }

  if (text.startsWith("🚌 Bus")) {
    quickAddSave(chatId, "Public Transport", "Bus Fare", 18);
    return;
  }

  /* ================= EDIT FIELD SELECTION ================= */

  if (state === "EDIT_FIELD") {

    // Save which field user wants to edit
    props.setProperty(chatId + "_editField", text);

    // Decide next state
    if (text === "📂 Category") {
      props.setProperty(chatId, "EDIT_CATEGORY");
      sendCategoryKeyboard(chatId);
      return;
    }

    if (text === "📝 Description") {
      props.setProperty(chatId, "EDIT_DESCRIPTION");
      removeKeyboard(chatId, "✏️ Enter new description:");
      return;
    }

    if (text === "💰 Amount") {
      props.setProperty(chatId, "EDIT_AMOUNT");
      removeKeyboard(chatId, "✏️ Enter new amount:");
      return;
    }

    return;
  }

  if (state === "DELETE_SELECT") {
    const map = JSON.parse(props.getProperty(chatId + "_rowMap"));
    if (!map[text]) return;

    props.setProperty(chatId + "_deleteRow", map[text]);
    props.setProperty(chatId, "DELETE_CONFIRM");

    sendCustomKeyboard(chatId, "⚠️ Confirm delete?", [
      [{ text: "🗑 Yes, Delete" }],
      [{ text: "❌ Cancel" }]
    ]);
    return;
  }

  if (state === "DELETE_CONFIRM" && text === "🗑 Yes, Delete") {

    ss.getSheetByName("Daily_Expenses")
      .deleteRow(Number(props.getProperty(chatId + "_deleteRow")));

    props.deleteAllProperties();
    sendMainKeyboard(chatId, "🗑 Expense deleted successfully.");
    return;
  }

  if (text === "❌ Cancel") {
    props.deleteAllProperties();
    sendMainKeyboard(chatId, "Cancelled.");
    return;
  }
}

/* ================= EDIT / DELETE HELPERS ================= */

function listLastExpenses(chatId, nextState) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Daily_Expenses");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sendMessage(chatId, "No expenses found.");
    return;
  }

  const startRow = Math.max(2, lastRow - 9);
  const numRows = lastRow - startRow + 1;

  const data = sheet
    .getRange(startRow, 1, numRows, 4)
    .getValues()
    .reverse(); // newest first

  const tz = "Asia/Kolkata";

  let msg = "🧾 Last 10 Expenses\n\n";
  let rowMap = {};
  let count = 1;

  data.forEach((row, i) => {

    const actualRow = lastRow - i;
    rowMap[count] = actualRow;

    let dateStr = "";
    if (row[0] instanceof Date) {
      dateStr = Utilities.formatDate(row[0], tz, "dd-MMM-yyyy");
    } else {
      dateStr = String(row[0]).trim();
    }

    msg +=
      `━━━━━━━━━━━━━━━━━━\n` +
      `*${count}.* ${row[1]}\n` +
      `📅 ${dateStr}\n` +
      `📝 ${row[2]}\n` +
      `💰 ₹${row[3]}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    count++;
  });

  const props = PropertiesService.getUserProperties();
  props.setProperty(chatId + "_rowMap", JSON.stringify(rowMap));
  props.setProperty(chatId, nextState);

  // Send list
  sendMessage(chatId, msg);

  // Guidance message
  if (nextState === "EDIT_SELECT") {
    sendNumberKeyboard(chatId, "✏️ Select the number to edit:");
  }

  if (nextState === "DELETE_SELECT") {
    sendNumberKeyboard(chatId, "🗑 Select the number to delete:");
  }
}

function sendMessage(chatId, text) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    })
  });
}

function handleEditSelection(chatId, text) {
  const props = PropertiesService.getUserProperties();
  const map = JSON.parse(props.getProperty(chatId + "_rowMap"));
  if (!map[text]) return;

  props.setProperty(chatId + "_editRow", map[text]);
  props.setProperty(chatId, "EDIT_FIELD");

  sendCustomKeyboard(chatId, "What to edit?", [
    [{ text: "📂 Category" }],
    [{ text: "📝 Description" }],
    [{ text: "💰 Amount" }],
    [{ text: "❌ Cancel" }]
  ]);
}

function handleDeleteSelection(chatId, text) {
  const props = PropertiesService.getUserProperties();
  const map = JSON.parse(props.getProperty(chatId + "_rowMap"));
  if (!map[text]) return;

  props.setProperty(chatId + "_deleteRow", map[text]);
  props.setProperty(chatId, "DELETE_CONFIRM");

  sendCustomKeyboard(chatId, "Confirm delete?", [
    [{ text: "🗑 Yes, Delete" }],
    [{ text: "❌ Cancel" }]
  ]);
}

/* ================= KEYBOARDS ================= */

function sendMainKeyboard(chatId, text) {
  sendCustomKeyboard(chatId, text, [

    // 🔹 Start / Core Actions
    [{ text: "/start" }],
    [{ text: "➕ Add Expense" }, { text: "⚡ Quick Add" }],

    // 🔹 Edit / Manage Data
    [{ text: "✏️ Edit Expense" }, { text: "🗑 Delete Expense" }],

    // 🔹 Time-based Views
    [{ text: "📅 Today's Expenses" }, { text: "📅 This Week Expenses" }],

    // 🔹 Insights
    [{ text: "🤔 Where is my money going?" }],
    [{ text: "📊 This Month Overview" }, { text: "📈 Monthly Summary" }],

    // 🔹 Visuals
    [{ text: "🖼 Dashboard Image" }],

    // 🔹 Settings
    [{ text: "🏦 Savings" }, { text: "💼 Edit Salary" }]
  ]);
}

function sendQuickDateKeyboard(chatId) {
  sendCustomKeyboard(chatId, "Select a date:", [
    [{ text: "📅 Today" }, { text: "📅 Yesterday" }],
    [{ text: "📆 Pick Another Date" }]
  ]);
}

function sendYearKeyboard(chatId) {
  sendCustomKeyboard(chatId, "Select year:", [
    [{ text: "2024" }, { text: "2025" }],
    [{ text: "2026" }, { text: "2027" }]
  ]);
}

function sendMonthKeyboard(chatId) {
  sendCustomKeyboard(chatId, "Select month:", [
    [{ text: "Jan" }, { text: "Feb" }, { text: "Mar" }],
    [{ text: "Apr" }, { text: "May" }, { text: "Jun" }],
    [{ text: "Jul" }, { text: "Aug" }, { text: "Sep" }],
    [{ text: "Oct" }, { text: "Nov" }, { text: "Dec" }]
  ]);
}

function sendDayKeyboard(chatId) {
  let days = [];
  for (let i = 1; i <= 31; i++) {
    days.push({ text: String(i).padStart(2, "0") });
  }
  let keyboard = [];
  for (let i = 0; i < days.length; i += 5) {
    keyboard.push(days.slice(i, i + 5));
  }
  sendCustomKeyboard(chatId, "Select day:", keyboard);
}

function sendCategoryKeyboard(chatId) {
  sendCustomKeyboard(chatId, "Choose category:", [
    [{ text: BACK_BTN }],
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

/* ================= HELPERS ================= */

function isSameDay(d1, d2) {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

function normalizeDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sendMessage(chatId, text) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text })
  });
}

function sendQuickAddKeyboard(chatId) {
  sendCustomKeyboard(chatId, "⚡ Quick Add Expense", [
    [{ text: "🍵 Tea ₹10" }, { text: "🍽️ Tea with Snacks ₹20" }],
    [{ text: "🚌 Bus ₹18" }],
    [{ text: "❌ Cancel" }]
  ]);
}

function sendCustomKeyboard(chatId, text, keyboard) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { keyboard, resize_keyboard: true }
    })
  });
}

function removeKeyboard(chatId, text) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { remove_keyboard: true }
    })
  });
}

function getMonthNumber(m) {
  return {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  }[m];
}

function removeEmoji(text) {
  return text.replace(/^[^\w]+/g, "").trim();
}

/* ================= MONTHLY SUMMARY ================= */

function fmt(n) {
  return Number(n || 0).toFixed(2);
}

function sendMonthOverview(chatId) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summary = ss.getSheetByName("Monthly_Summary");
  const dashboard = ss.getSheetByName("Dashboard");

  if (!summary || !dashboard) {
    sendMessage(chatId, "⚠️ Monthly data not available.");
    return;
  }

  const month = summary.getRange("B1").getValue();
  const year = summary.getRange("B2").getValue();
  const total      = fmt(summary.getRange("B21").getValue());
  const cashback   = fmt(summary.getRange("E2").getValue());
  const savings = fmt(dashboard.getRange("I4").getValue());
  const salary  = fmt(dashboard.getRange("H4").getValue());

  const netExpense = fmt(Number(total) - Number(cashback));
  const balance    = fmt(Number(salary) - Number(netExpense));

  let msg =
    `📊 This Month Overview\n` +
    `${month} ${year}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💼 Salary        : ₹${salary}\n` +
    `💸 Total Expense : ₹${total}\n` +
    `💰 Cashback      : ₹${cashback}\n` +
    `➖ Net Expense   : ₹${netExpense}\n` +
    `🏦 Savings       : ₹${savings}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💵 Balance Left : ₹${balance}`;

  sendMessage(chatId, msg);
}

function sendMonthlySummaryText(chatId) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName("Monthly_Summary");
  const dashboardSheet = ss.getSheetByName("Dashboard");

  const month = summarySheet.getRange("B1").getValue();
  const year = summarySheet.getRange("B2").getValue();
  const totalExpense = summarySheet.getRange("B21").getValue();
  const cashback = summarySheet.getRange("E2").getValue();
  const salary = dashboardSheet.getRange("H4").getValue() || "—";

  const data = summarySheet.getRange("A5:D").getValues();

  let msg =
    `📈 Monthly Summary  - ${month} ${year}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let index = 1;
  data.forEach(row => {
    if (!row[0]) return;
    let emoji = row[3] === "Over Budget" ? "🔴" :
                row[3] === "Near Limit" ? "🟡" : "🟢";
    msg += `${index}. ${row[0]} => ₹${row[1]} / ₹${row[2]} ${emoji}\n\n`;
    index++;
  });

  msg +=
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💼 Salary        : ₹${salary}\n` +
    `💸 Total Expense : ₹${totalExpense}\n` +
    `💰 Cashback      : ₹${cashback}`;

  sendMessage(chatId, msg);
}

/* ================= CATEGORY SUMMARY ================= */

function sendCategorySummary(chatId, category) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Monthly_Summary");

  const month = sheet.getRange("B1").getValue();
  const year = sheet.getRange("B2").getValue();
  const data = sheet.getRange("A5:C").getValues();

  let total = 0;
  let budget = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === category) {
      total = data[i][1];
      budget = data[i][2];
      break;
    }
  }

  let status = total > budget ? "🔴 Over Budget" :
               total > budget * 0.8 ? "🟡 Near Limit" :
               "🟢 Within Budget";

  sendMessage(
    chatId,
    `📊 ${category} Summary\n${month} ${year}\n━━━━━━━━━━━━━━━━━━\n` +
    `Spent : ₹${total}\n` +
    `Budget: ₹${budget}\n` +
    `Status: ${status}`
  );
}

/* ================= DASHBOARD IMAGE ================= */

function sendDashboardImage(chatId) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Dashboard");

  const url =
    "https://docs.google.com/spreadsheets/d/" +
    ss.getId() +
    "/export?format=pdf&gid=" +
    sheet.getSheetId() +
    "&portrait=false&fitw=true&gridlines=false";

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
  });

  UrlFetchApp.fetch(
    `https://api.telegram.org/bot${TOKEN}/sendDocument`,
    {
      method: "post",
      payload: {
        chat_id: chatId,
        document: response.getBlob().setName("Dashboard.pdf"),
        caption: "📊 Dashboard Snapshot"
      }
    }
  );
}

function sendNumberKeyboard(chatId, text, max = 10) {

  let numbers = [];
  for (let i = 1; i <= max; i++) {
    numbers.push({ text: String(i) });
  }

  let keyboard = [];
  for (let i = 0; i < numbers.length; i += 5) {
    keyboard.push(numbers.slice(i, i + 5));
  }

  keyboard.push([{ text: "❌ Cancel" }]);

  sendCustomKeyboard(chatId, text, keyboard);
}

function parseAmount(val) {
  if (typeof val === "number") return val;
  return Number(String(val).replace(/[^\d.-]/g, "")) || 0;
}

function sendTodaysExpenses(chatId) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Daily_Expenses");

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    sendMessage(chatId, "📅 No expenses recorded today 🙂");
    return;
  }

  // 🔹 Get today's day, month, year
  const today = new Date();

  const todayDay = String(today.getDate()).padStart(2, "0"); 
  const todayMonth = today.toLocaleString("en-US", { month: "long" });
  const todayYear = String(today.getFullYear());

  // 🔹 Read A to G columns
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();

  let msg =
    `📅 Today's Expenses\n` +
    `${todayDay} ${todayMonth} ${todayYear}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n`;

  let total = 0;
  let found = false;

  // 🔹 Check every row
  for (let i = 0; i < values.length; i++) {

    const row = values[i];

    const day = row[4];   // Column E
    const month = row[5]; // Column F
    const year = row[6];  // Column G

    if (day === todayDay && month === todayMonth && year === todayYear) {

      found = true;

      const date = row[0];       
      const category = row[1];   
      const desc = row[2];       
      const amountStr = row[3];

      let amt = Number(String(amountStr).replace(/[^\d.-]/g, ""));
      total += amt;

      msg +=
        `📂 ${category}\n` +
        `📝 ${desc}\n` +
        `💰 ₹${amt.toFixed(2)}\n\n`;
    }
  }

  if (!found) {
    sendMessage(chatId, "📅 No expenses recorded today 🙂");
    return;
  }

  msg +=
    `━━━━━━━━━━━━━━━━━━\n` +
    `💸 Total Today : ₹${total.toFixed(2)}`;

  sendMessage(chatId, msg);
}

function sendDailySummaryAuto() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Daily_Expenses");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // 🔹 Read A to G columns
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();

  const today = new Date();

  const todayDay = String(today.getDate()).padStart(2, "0");
  const todayMonth = today.toLocaleString("en-US", { month: "long" });
  const todayYear = String(today.getFullYear());

  let categoryTotals = {};
  let total = 0;
  let found = false;

  data.forEach(row => {

    const day = row[4];   // Column E
    const month = row[5]; // Column F
    const year = row[6];  // Column G

    if (day === todayDay && month === todayMonth && year === todayYear) {

      found = true;

      const cat = row[1]; // Column B
      const amt = Number(String(row[3]).replace(/[^\d.-]/g, "")) || 0;

      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      total += amt;
    }
  });

  let msg =
    `🌙 Daily Expense Summary\n` +
    `${todayDay} ${todayMonth} ${todayYear}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n`;

  if (!found) {
    msg += "No expenses recorded today 🙂";
  } else {

    for (let cat in categoryTotals) {
      msg += `📂 ${cat}  ₹${categoryTotals[cat].toFixed(2)}\n`;
    }

    msg +=
      `\n━━━━━━━━━━━━━━━━━━\n` +
      `💸 Total Today : ₹${total.toFixed(2)}`;
  }

  msg += "\n\nGood night 🌙";

  // 🔔 Send to your Telegram chat
  sendMessage(ALLOWED_CHAT_ID, msg);
}

function sendMoneyInsight(chatId) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Daily_Expenses");
  const summarySheet = ss.getSheetByName("Monthly_Summary");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sendMessage(chatId, "📉 Spending Insight\n\nNo expenses recorded yet 🙂");
    return;
  }

  // Month & Year from Monthly_Summary (already used in your bot)
  const month = summarySheet.getRange("B1").getValue();
  const year = summarySheet.getRange("B2").getValue();

  const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const tz = "Asia/Kolkata";
  const now = new Date();

  let categoryTotals = {};
  let total = 0;

  data.forEach(row => {
    if (!row[0]) return;

    let d;

    // Handle Date object
    if (row[0] instanceof Date) {
      d = row[0];
    } else {
      const p = String(row[0]).split("-");
      if (p.length !== 3) return;
      d = new Date(p[2], p[1] - 1, p[0]);
    }

    // Only THIS month
    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      const cat = row[1];
      const amt = Number(row[3]) || 0;

      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      total += amt;
    }
  });

  if (total === 0) {
    sendMessage(chatId, "📉 Spending Insight\n\nNo expenses recorded this month 🙂");
    return;
  }

  // Convert to sortable array
  const sorted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  let msg =
    `📉 Top Spending This Month\n` +
    `${month} ${year}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n`;

  let index = 1;

  sorted.forEach(([cat, amt]) => {
    const percent = ((amt / total) * 100).toFixed(1);
    msg += `${index}. ${cat} – ${percent}% (₹${amt})\n`;
    index++;
  });

  msg +=
    `\n━━━━━━━━━━━━━━━━━━\n` +
    `💸 Total : ₹${total}`;

  sendMessage(chatId, msg);
}

function sendWeeklyExpenses(chatId) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Daily_Expenses");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sendMessage(chatId, "📊 Weekly Summary\n\nNo expenses recorded this week 🙂");
    return;
  }

  // 🔹 Read A to G columns
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
  const tz = "Asia/Kolkata";

  const today = new Date();

  // ⏱️ Get Monday of this week
  const day = today.getDay(); // Sun=0
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // ⏱️ Get Sunday of this week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let categoryTotals = {};
  let total = 0;
  let found = false;

  data.forEach(row => {

    const dayStr = row[4];   // Column E
    const monthStr = row[5]; // Column F
    const yearStr = row[6];  // Column G

    if (!dayStr || !monthStr || !yearStr) return;

    // Convert E, F, G to Date
    const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth(); // Convert month name to index
    const d = new Date(Number(yearStr), monthIndex, Number(dayStr));
    d.setHours(0, 0, 0, 0);

    if (d >= weekStart && d <= weekEnd) {

      found = true;

      const cat = row[1]; // Column B
      const amt = Number(String(row[3]).replace(/[^\d.-]/g, "")) || 0;

      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      total += amt;
    }
  });

  let msg =
    `📊 Weekly Summary\n` +
    `${Utilities.formatDate(weekStart, tz, "dd-MM-yyyy")} → ` +
    `${Utilities.formatDate(weekEnd, tz, "dd-MM-yyyy")}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n`;

  if (!found) {
    msg += "No expenses recorded this week 🙂";
    sendMessage(chatId, msg);
    return;
  }

  for (let cat in categoryTotals) {
    msg += `${cat}  ₹${fmt(categoryTotals[cat])}\n`;
  }

  msg +=
    `\n━━━━━━━━━━━━━━━━━━\n` +
    `💸 Total : ₹${fmt(total)}`;

  sendMessage(chatId, msg);
}

function sendWeeklySummaryAuto() {
  sendWeeklyExpenses(ALLOWED_CHAT_ID);
}

function quickAddSave(chatId, category, description, amount) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Daily_Expenses");

  const tz = "Asia/Kolkata";
  const today = Utilities.formatDate(new Date(), tz, "dd-MM-yyyy");

  sheet.appendRow([
    today,
    category,
    description,
    amount
  ]);

  removeKeyboard(chatId,
    `✅ Added Quickly!\n\n` +
    `📅 ${today}\n` +
    `📂 ${category}\n` +
    `📝 ${description}\n` +
    `💰 ₹${amount}`
  );

  sendMainKeyboard(chatId, "Anything else?");
}

function createWeeklySummaryTrigger() {

  // Remove old weekly triggers
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendWeeklySummaryAuto") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("sendWeeklySummaryAuto")
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(21)       // 9 PM
    .nearMinute(30)   // 9:30 PM
    .create();
}

function createDailySummaryTrigger() {

  // Remove old triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendDailySummaryAuto") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger at 9:30 PM
  ScriptApp.newTrigger("sendDailySummaryAuto")
    .timeBased()
    .everyDays(1)
    .atHour(21)      // 9 PM
    .nearMinute(30)  // 9:30 PM
    .create();
}
