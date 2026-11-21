InvoiceFlow is a responsive invoice management application built with HTML, CSS, and vanilla JavaScript.

It helps freelancers, independent contractors, and small businesses create professional invoices, calculate taxes, track payments, and manage client billing records from one dashboard.

## Features

### Invoice Management
- Create and save invoices.
- Edit existing invoices.
- Delete invoices.
- Generate unique invoice numbers.
- Store client names, emails, and addresses.
- Set invoice dates and payment due dates.

### Line Item Management
- Add multiple services or products.
- Set item descriptions.
- Enter quantities and unit prices.
- Automatically calculate line item amounts.
- Remove individual line items.

### Financial Calculations
- Automatically calculate subtotals.
- Configure tax percentages.
- Calculate tax amounts.
- Calculate final invoice totals.
- Support multiple currencies.

### Payment Tracking
- Draft invoice status.
- Sent invoice status.
- Paid invoice status.
- Dashboard financial summaries.
- Outstanding invoice tracking.

### Search and Filtering
- Search by invoice number.
- Search by client name.
- Filter by invoice status.
- Sort by date and invoice amount.

### PDF and Printing
- Preview invoices before printing.
- Generate clean invoice documents.
- Print invoices.
- Save invoices as PDF through the browser's print dialog.

### Data Persistence
- Automatically save invoice records using browser localStorage.
- Preserve invoice records after refreshing the page.

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Responsive interface and print styling |
| JavaScript ES6+ | Application functionality |
| localStorage | Browser-based data persistence |
| Intl API | Currency and date formatting |
| Window Print API | Invoice printing and PDF export |

## Project Structure

```text
invoiceflow-client-invoice-tracker/
│
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Regalson001/invoiceflow-client-invoice-tracker.git
```

### 2. Navigate into the project

```bash
cd invoiceflow-client-invoice-tracker
```

### 3. Open the project in VS Code

```bash
code .
```

### 4. Launch the application

Open `index.html` directly in your browser or use the VS Code Live Server extension.

No backend, database server, or package installation is required.

## How to Use

1. Open the InvoiceFlow dashboard.
2. Click **Create invoice**.
3. Enter the invoice number, status, invoice date, and due date.
4. Enter the client's details.
5. Add services or products as line items.
6. Enter quantities and unit prices.
7. Set the applicable tax percentage.
8. Review the automatically calculated totals.
9. Click **Save invoice**.
10. Find your invoice in the invoice management table.
11. Preview, edit, or delete invoices.
12. Use **Print / Save PDF** to generate a printable invoice.

## Currency Support

The application supports:

- KES — Kenyan Shilling
- USD — US Dollar
- EUR — Euro
- GBP — British Pound
- UGX — Ugandan Shilling
- TZS — Tanzanian Shilling

Financial dashboard totals are grouped by currency to avoid combining different currencies without conversion.

## Data Storage

InvoiceFlow uses browser localStorage.

Invoice records are saved in the browser on the device where the application is used.

**Important:** Clearing browser storage may permanently remove saved invoices. This version does not include cloud synchronization, automatic backups, or multi-user access.

## Future Improvements

- Client management and reusable client profiles.
- Expense recording and categorization.
- Monthly revenue and expense analytics.
- Invoice PDF downloads without the print dialog.
- JSON backup and restore.
- Payment gateway integration.
- Automated payment reminders.
- Email invoice delivery.
- Backend API and database integration.
- Authentication and multi-user business accounts.

## Author

**Stephen Oyugi**

GitHub: [@Regalson001](https://github.com/Regalson001)

## License

MIT License
