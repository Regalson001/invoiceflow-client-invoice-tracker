
"use strict";

/* =====================================================
   INVOICEFLOW — INVOICE MANAGEMENT APPLICATION
===================================================== */

const STORAGE_KEY = "invoiceflow_records_v1";

let invoices = loadInvoices();
let lineItems = [];
let activePreviewId = null;
let toastTimer = null;

const $ = (id) => document.getElementById(id);

const form = $("invoiceForm");
const lineItemsBody = $("lineItemsBody");

/* =====================================================
   STORAGE
===================================================== */

function loadInvoices() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(invoice => {
      return (
        invoice &&
        typeof invoice.id === "string" &&
        typeof invoice.invoiceNumber === "string" &&
        typeof invoice.clientName === "string" &&
        ["Draft", "Sent", "Paid"].includes(invoice.status) &&
        Array.isArray(invoice.items)
      );
    });
  } catch (error) {
    console.error("Could not load invoices:", error);
    return [];
  }
}

function saveInvoices() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    return true;
  } catch (error) {
    console.error("Could not save invoices:", error);
    showToast("Could not save data. Browser storage may be full.");
    return false;
  }
}

/* =====================================================
   GENERAL UTILITIES
===================================================== */

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "invoice-" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 9);
}

function todayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[character];
  });
}

function formatCurrency(amount, currency = "KES") {
  const value = Number(amount) || 0;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();

  const existingNumbers = invoices
    .map(invoice => invoice.invoiceNumber);

  let counter = invoices.length + 1;
  let candidate = "";

  do {
    candidate = `INV-${year}-${String(counter).padStart(3, "0")}`;
    counter++;
  } while (existingNumbers.includes(candidate));

  return candidate;
}

/* =====================================================
   LINE ITEM MANAGEMENT
===================================================== */

function createLineItem(description = "", quantity = 1, price = 0) {
  return {
    id: createId(),
    description,
    quantity,
    price
  };
}

function addLineItem(description = "", quantity = 1, price = 0) {
  lineItems.push(createLineItem(description, quantity, price));
  renderLineItems();
}

function renderLineItems() {
  lineItemsBody.replaceChildren();

  lineItems.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <input
          type="text"
          class="item-description"
          data-id="${escapeHTML(item.id)}"
          value="${escapeHTML(item.description)}"
          placeholder="e.g. Website development"
          maxlength="150"
          aria-label="Item description"
        >
      </td>

      <td>
        <input
          type="number"
          class="item-quantity"
          data-id="${escapeHTML(item.id)}"
          value="${item.quantity}"
          min="0.01"
          max="1000000"
          step="0.01"
          aria-label="Quantity"
        >
      </td>

      <td>
        <input
          type="number"
          class="item-price"
          data-id="${escapeHTML(item.id)}"
          value="${item.price}"
          min="0"
          max="1000000000000"
          step="0.01"
          aria-label="Unit price"
        >
      </td>

      <td class="line-amount" data-amount-id="${escapeHTML(item.id)}">
        ${formatCurrency(item.quantity * item.price, $("currency").value)}
      </td>

      <td>
        <button
          type="button"
          class="remove-item-btn"
          data-remove-id="${escapeHTML(item.id)}"
          aria-label="Remove line item"
          title="Remove item"
        >×</button>
      </td>
    `;

    lineItemsBody.append(row);
  });

  calculateTotals();
}

/* =====================================================
   UPDATE LINE ITEM VALUES
===================================================== */

lineItemsBody.addEventListener("input", event => {
  const target = event.target;
  const id = target.dataset.id;

  if (!id) return;

  const item = lineItems.find(entry => entry.id === id);

  if (!item) return;

  if (target.classList.contains("item-description")) {
    item.description = target.value;
  }

  if (target.classList.contains("item-quantity")) {
    item.quantity = Math.max(0, Number(target.value) || 0);
  }

  if (target.classList.contains("item-price")) {
    item.price = Math.max(0, Number(target.value) || 0);
  }

  calculateTotals();
});

lineItemsBody.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-id]");

  if (!button) return;

  const id = button.dataset.removeId;

  lineItems = lineItems.filter(item => item.id !== id);

  renderLineItems();
});

/* =====================================================
   CALCULATIONS
===================================================== */

function getCalculations(items = lineItems, taxRate = $("taxRate").value) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;

    return sum + quantity * price;
  }, 0);

  const tax = subtotal * (Number(taxRate) || 0) / 100;

  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total
  };
}

function calculateTotals() {
  const currency = $("currency").value;
  const taxRate = Math.min(100, Math.max(0, Number($("taxRate").value) || 0));

  const calculations = getCalculations(lineItems, taxRate);

  $("subtotalValue").textContent =
    formatCurrency(calculations.subtotal, currency);

  $("taxValue").textContent =
    formatCurrency(calculations.tax, currency);

  $("grandTotal").textContent =
    formatCurrency(calculations.total, currency);

  lineItems.forEach(item => {
    const amountCell = document.querySelector(
      `[data-amount-id="${item.id}"]`
    );

    if (amountCell) {
      amountCell.textContent = formatCurrency(
        item.quantity * item.price,
        currency
      );
    }
  });
}

$("taxRate").addEventListener("input", calculateTotals);

$("currency").addEventListener("change", () => {
  calculateTotals();
  renderInvoices();
  updateDashboard();
});

/* =====================================================
   FORM RESET
===================================================== */

function resetForm() {
  form.reset();

  $("editingId").value = "";
  $("invoiceNumber").value = generateInvoiceNumber();

  $("invoiceDate").value = todayString();

  const due = new Date();
  due.setDate(due.getDate() + 14);

  const dueYear = due.getFullYear();
  const dueMonth = String(due.getMonth() + 1).padStart(2, "0");
  const dueDay = String(due.getDate()).padStart(2, "0");

  $("dueDate").value = `${dueYear}-${dueMonth}-${dueDay}`;

  $("invoiceStatus").value = "Draft";
  $("currency").value = "KES";
  $("taxRate").value = "0";

  $("formHeading").textContent = "Create a new invoice";
  $("saveInvoiceBtn").textContent = "Save invoice";

  lineItems = [];
  addLineItem();
  addLineItem();
}

$("resetFormBtn").addEventListener("click", () => {
  resetForm();
  showToast("Form cleared.");
});

$("addItemBtn").addEventListener("click", () => {
  addLineItem();
});

/* =====================================================
   VALIDATE INVOICE FORM
===================================================== */

function validateInvoice() {
  if (!form.reportValidity()) {
    return false;
  }

  const invoiceNumber = $("invoiceNumber").value.trim();
  const editingId = $("editingId").value;

  if (!invoiceNumber) {
    showToast("Please enter an invoice number.");
    return false;
  }

  const duplicateNumber = invoices.some(invoice => {
    return (
      invoice.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase() &&
      invoice.id !== editingId
    );
  });

  if (duplicateNumber) {
    showToast("That invoice number is already in use.");
    $("invoiceNumber").focus();
    return false;
  }

  const invoiceDate = $("invoiceDate").value;
  const dueDate = $("dueDate").value;

  if (dueDate < invoiceDate) {
    showToast("Due date cannot be earlier than invoice date.");
    $("dueDate").focus();
    return false;
  }

  if (lineItems.length === 0) {
    showToast("Please add at least one line item.");
    return false;
  }

  for (const item of lineItems) {
    if (!item.description.trim()) {
      showToast("Every line item needs a description.");
      return false;
    }

    if (
      !Number.isFinite(Number(item.quantity)) ||
      item.quantity <= 0 ||
      !Number.isFinite(Number(item.price)) ||
      item.price < 0
    ) {
      showToast("Check your item quantities and prices.");
      return false;
    }
  }

  const taxRate = Number($("taxRate").value);

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    showToast("Tax must be between 0 and 100 percent.");
    return false;
  }

  return true;
}

/* =====================================================
   COLLECT FORM DATA
===================================================== */

function collectInvoiceData() {
  const taxRate = Number($("taxRate").value) || 0;
  const calculations = getCalculations(lineItems, taxRate);

  return {
    invoiceNumber: $("invoiceNumber").value.trim(),
    status: $("invoiceStatus").value,

    invoiceDate: $("invoiceDate").value,
    dueDate: $("dueDate").value,

    clientName: $("clientName").value.trim(),
    clientEmail: $("clientEmail").value.trim(),
    clientAddress: $("clientAddress").value.trim(),

    currency: $("currency").value,

    items: lineItems.map(item => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      price: Number(item.price),
      amount: Number(item.quantity) * Number(item.price)
    })),

    taxRate,
    subtotal: calculations.subtotal,
    tax: calculations.tax,
    total: calculations.total,

    notes: $("invoiceNotes").value.trim()
  };
}

/* =====================================================
   SAVE OR UPDATE INVOICE
===================================================== */

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!validateInvoice()) return;

  const editingId = $("editingId").value;
  const data = collectInvoiceData();

  if (editingId) {
    const index = invoices.findIndex(invoice => invoice.id === editingId);

    if (index === -1) {
      showToast("Invoice could not be found.");
      return;
    }

    invoices[index] = {
      ...invoices[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    showToast("Invoice updated successfully.");
  } else {
    invoices.unshift({
      id: createId(),
      ...data,
      createdAt: new Date().toISOString()
    });

    showToast("Invoice saved successfully.");
  }

  if (!saveInvoices()) return;

  renderInvoices();
  updateDashboard();
  resetForm();

  $("invoices").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

/* =====================================================
   EDIT INVOICE
===================================================== */

function editInvoice(id) {
  const invoice = invoices.find(item => item.id === id);

  if (!invoice) return;

  $("editingId").value = invoice.id;

  $("invoiceNumber").value = invoice.invoiceNumber;
  $("invoiceStatus").value = invoice.status;

  $("invoiceDate").value = invoice.invoiceDate;
  $("dueDate").value = invoice.dueDate;

  $("clientName").value = invoice.clientName;
  $("clientEmail").value = invoice.clientEmail || "";
  $("clientAddress").value = invoice.clientAddress || "";

  $("currency").value = invoice.currency || "KES";

  $("taxRate").value = invoice.taxRate || 0;
  $("invoiceNotes").value = invoice.notes || "";

  lineItems = invoice.items.map(item => ({
    id: createId(),
    description: item.description,
    quantity: Number(item.quantity),
    price: Number(item.price)
  }));

  if (lineItems.length === 0) {
    lineItems.push(createLineItem());
  }

  $("formHeading").textContent = "Edit invoice";
  $("saveInvoiceBtn").textContent = "Update invoice";

  renderLineItems();
  calculateTotals();

  $("create").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  showToast("Invoice loaded for editing.");
}

/* =====================================================
   DELETE INVOICE
===================================================== */

function deleteInvoice(id) {
  const invoice = invoices.find(item => item.id === id);

  if (!invoice) return;

  const confirmed = confirm(
    `Delete invoice ${invoice.invoiceNumber} for ${invoice.clientName}?`
  );

  if (!confirmed) return;

  invoices = invoices.filter(item => item.id !== id);

  if (!saveInvoices()) return;

  renderInvoices();
  updateDashboard();

  showToast("Invoice deleted.");
}

/* =====================================================
   UPDATE INVOICE STATUS
===================================================== */

function updateInvoiceStatus(id, status) {
  if (!["Draft", "Sent", "Paid"].includes(status)) return;

  const invoice = invoices.find(item => item.id === id);

  if (!invoice) return;

  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();

  if (!saveInvoices()) return;

  renderInvoices();
  updateDashboard();

  showToast(`Invoice marked as ${status}.`);
}

/* =====================================================
   INVOICE SEARCH, FILTER AND SORT
===================================================== */

function getFilteredInvoices() {
  const query = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const sort = $("sortFilter").value;

  let result = invoices.filter(invoice => {
    const matchesSearch = [
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.clientEmail,
      invoice.clientAddress
    ].some(value => String(value || "").toLowerCase().includes(query));

    const matchesStatus =
      status === "all" || invoice.status === status;

    return matchesSearch && matchesStatus;
  });

  result.sort((a, b) => {
    if (sort === "oldest") {
      return a.invoiceDate.localeCompare(b.invoiceDate);
    }

    if (sort === "highest") {
      return b.total - a.total;
    }

    if (sort === "lowest") {
      return a.total - b.total;
    }

    return b.invoiceDate.localeCompare(a.invoiceDate);
  });

  return result;
}

$("searchInput").addEventListener("input", renderInvoices);
$("statusFilter").addEventListener("change", renderInvoices);
$("sortFilter").addEventListener("change", renderInvoices);

$("clearFiltersBtn").addEventListener("click", () => {
  $("searchInput").value = "";
  $("statusFilter").value = "all";
  $("sortFilter").value = "newest";

  renderInvoices();
});

/* =====================================================
   RENDER INVOICE TABLE
===================================================== */

function renderInvoices() {
  const list = $("invoiceList");
  const visibleInvoices = getFilteredInvoices();

  list.replaceChildren();

  $("sidebarInvoiceCount").textContent = invoices.length;
  $("invoiceCountLabel").textContent =
    `Showing ${visibleInvoices.length} of ${invoices.length} invoices`;

  $("emptyState").classList.toggle(
    "visible",
    visibleInvoices.length === 0
  );

  visibleInvoices.forEach(invoice => {
    const row = document.createElement("tr");

    const statusClass = invoice.status.toLowerCase();

    row.innerHTML = `
      <td class="invoice-number">
        ${escapeHTML(invoice.invoiceNumber)}
      </td>

      <td class="invoice-client">
        ${escapeHTML(invoice.clientName)}
      </td>

      <td>${formatDate(invoice.invoiceDate)}</td>

      <td>${formatDate(invoice.dueDate)}</td>

      <td class="invoice-amount">
        ${formatCurrency(invoice.total, invoice.currency)}
      </td>

      <td>
        <span class="status-badge ${statusClass}">
          ${escapeHTML(invoice.status)}
        </span>
      </td>

      <td>
        <div class="table-actions">
          <button
            class="table-action"
            type="button"
            data-action="preview"
            data-id="${escapeHTML(invoice.id)}"
            title="Preview invoice"
            aria-label="Preview invoice"
          >↗</button>

          <button
            class="table-action"
            type="button"
            data-action="edit"
            data-id="${escapeHTML(invoice.id)}"
            title="Edit invoice"
            aria-label="Edit invoice"
          >✎</button>

          <button
            class="table-action delete"
            type="button"
            data-action="delete"
            data-id="${escapeHTML(invoice.id)}"
            title="Delete invoice"
            aria-label="Delete invoice"
          >×</button>
        </div>
      </td>
    `;

    list.append(row);
  });
}

/* =====================================================
   INVOICE TABLE ACTIONS
===================================================== */

$("invoiceList").addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "preview") {
    previewInvoice(id);
  }

  if (action === "edit") {
    editInvoice(id);
  }

  if (action === "delete") {
    deleteInvoice(id);
  }
});

/* =====================================================
   FINANCIAL DASHBOARD
===================================================== */

/*
  Invoices can use different currencies.
  Never add different currencies together.
  Display each currency separately in the dashboard.
*/

function aggregateByCurrency(selectedInvoices) {
  const totals = {};

  selectedInvoices.forEach(invoice => {
    const currency = invoice.currency || "KES";

    totals[currency] = (totals[currency] || 0) +
      Number(invoice.total || 0);
  });

  return totals;
}

function formatCurrencyGroups(totals) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return formatCurrency(0, $("currency").value);
  }

  return entries.map(([currency, amount]) => {
    return formatCurrency(amount, currency);
  }).join(" · ");
}

function updateDashboard() {
  const totalInvoiced = aggregateByCurrency(invoices);

  const paidInvoices = invoices.filter(
    invoice => invoice.status === "Paid"
  );

  const outstandingInvoices = invoices.filter(
    invoice => invoice.status !== "Paid"
  );

  const totalPaid = aggregateByCurrency(paidInvoices);
  const totalOutstanding = aggregateByCurrency(outstandingInvoices);

  $("totalInvoiced").textContent =
    formatCurrencyGroups(totalInvoiced);

  $("totalPaid").textContent =
    formatCurrencyGroups(totalPaid);

  $("totalOutstanding").textContent =
    formatCurrencyGroups(totalOutstanding);

  $("totalInvoices").textContent = invoices.length;
  $("sidebarInvoiceCount").textContent = invoices.length;
}

/* =====================================================
   INVOICE PREVIEW
===================================================== */

function previewInvoice(id) {
  const invoice = invoices.find(item => item.id === id);

  if (!invoice) return;

  activePreviewId = id;

  const currency = invoice.currency || "KES";

  const itemRows = invoice.items.map(item => {
    return `
      <tr>
        <td>${escapeHTML(item.description)}</td>
        <td>${Number(item.quantity).toLocaleString("en")}</td>
        <td>${formatCurrency(item.price, currency)}</td>
        <td>${formatCurrency(item.quantity * item.price, currency)}</td>
      </tr>
    `;
  }).join("");

  const printArea = $("printArea");

  printArea.innerHTML = `
    <article class="print-invoice">

      <header class="print-invoice-header">
        <div>
          <div class="print-brand">InvoiceFlow</div>
          <p class="print-invoice-number">
            Professional billing document
          </p>
        </div>

        <div>
          <h2>INVOICE</h2>
          <p class="print-invoice-number">
            ${escapeHTML(invoice.invoiceNumber)}
          </p>
          <span class="print-status">
            ${escapeHTML(invoice.status.toUpperCase())}
          </span>
        </div>
      </header>

      <section class="print-details">
        <div>
          <h3>BILLED TO</h3>
          <strong>${escapeHTML(invoice.clientName)}</strong>
          <p>${escapeHTML(invoice.clientEmail || "")}</p>
          <p>${escapeHTML(invoice.clientAddress || "")}</p>
        </div>

        <div>
          <h3>INVOICE DETAILS</h3>
          <p>Invoice date: <strong>${formatDate(invoice.invoiceDate)}</strong></p>
          <p>Due date: <strong>${formatDate(invoice.dueDate)}</strong></p>
          <p>Currency: <strong>${escapeHTML(currency)}</strong></p>
        </div>
      </section>

      <table class="print-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <section class="print-totals">
        <div class="print-total-row">
          <span>Subtotal</span>
          <strong>${formatCurrency(invoice.subtotal, currency)}</strong>
        </div>

        <div class="print-total-row">
          <span>Tax (${Number(invoice.taxRate).toFixed(2)}%)</span>
          <strong>${formatCurrency(invoice.tax, currency)}</strong>
        </div>

        <div class="print-total-row print-grand-total">
          <span>Total due</span>
          <strong>${formatCurrency(invoice.total, currency)}</strong>
        </div>
      </section>

      ${invoice.notes ? `
        <section class="print-notes">
          <h3>NOTES & PAYMENT INSTRUCTIONS</h3>
          <p>${escapeHTML(invoice.notes)}</p>
        </section>
      ` : ""}

      <div class="print-thankyou">
        Thank you for your business.
      </div>

    </article>
  `;

  $("previewModal").classList.add("open");
  $("previewModal").setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

/* =====================================================
   CLOSE PREVIEW
===================================================== */

function closePreview() {
  $("previewModal").classList.remove("open");
  $("previewModal").setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";
  activePreviewId = null;
}

$("closePreviewBtn").addEventListener("click", closePreview);

$("previewModal").addEventListener("click", event => {
  if (event.target === $("previewModal")) {
    closePreview();
  }
});

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    $("previewModal").classList.contains("open")
  ) {
    closePreview();
  }
});

/* =====================================================
   PRINT / SAVE PDF
===================================================== */

$("printInvoiceBtn").addEventListener("click", () => {
  if (!activePreviewId) return;

  window.print();
});

/* =====================================================
   NAVIGATION
===================================================== */

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    const view = link.dataset.view;

    const target = {
      dashboard: $("dashboard"),
      invoices: $("invoices"),
      create: $("create")
    }[view];

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

/* =====================================================
   NEW INVOICE BUTTON
===================================================== */

$("newInvoiceBtn").addEventListener("click", () => {
  resetForm();

  $("create").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  $("clientName").focus();
});

/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

function initializeApp() {
  $("currentYear").textContent = new Date().getFullYear();

  resetForm();
  renderInvoices();
  updateDashboard();
}

initializeApp();
