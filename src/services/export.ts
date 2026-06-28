// Export service – CSV, Excel, JSON, PDF
import type { Transaction } from '../types';
import { getCategories, getAccounts } from './db';
import { format } from 'date-fns';

function getCatName(id: string) {
  return getCategories().find(c => c.id === id)?.name || id;
}
function getAccName(id: string) {
  return getAccounts().find(a => a.id === id)?.name || id;
}

// ─── JSON ──────────────────────────────────────────────────────────────────
export function exportJSON(transactions: Transaction[]): void {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `finova-transactions-${today()}.json`);
}

// ─── CSV ───────────────────────────────────────────────────────────────────
export function exportCSV(transactions: Transaction[]): void {
  const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Account', 'Amount', 'Note'];
  const rows = transactions.map(t => [
    format(new Date(t.date), 'dd/MM/yyyy hh:mm a'),
    t.type,
    getCatName(t.category),
    t.subcategory || '',
    getAccName(t.account),
    t.amount.toFixed(2),
    t.note || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `finova-transactions-${today()}.csv`);
}

// ─── Excel ─────────────────────────────────────────────────────────────────
export async function exportExcel(transactions: Transaction[]): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const data = transactions.map(t => ({
    Date: format(new Date(t.date), 'dd/MM/yyyy hh:mm a'),
    Type: t.type,
    Category: getCatName(t.category),
    Subcategory: t.subcategory || '',
    Account: getAccName(t.account),
    Amount: t.amount,
    Note: t.note || '',
  }));
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Transactions');
  writeFile(wb, `finova-transactions-${today()}.xlsx`);
}

// ─── PDF ───────────────────────────────────────────────────────────────────
export async function exportPDF(
  transactions: Transaction[],
  filters?: { range: string; category: string; account: string }
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Premium Header Banner
  doc.setFillColor(8, 26, 69); // #081A45 Dark Navy Brand Color
  doc.rect(0, 0, 210, 32, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FINOVA', 14, 14);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Personal Finance Manager', 14, 21);
  doc.text('Track Money. Build Better Habits.', 14, 26);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy hh:mm a')}`, 145, 14);
  doc.text(`Record Count: ${transactions.length}`, 145, 21);
  doc.text('Status: Official Statement', 145, 26);

  // Summary Metrics Section
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Render Filter details if passed
  doc.setTextColor(8, 26, 69);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Filters & Scope:', 14, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Date Range: ${filters?.range || 'All Transactions'}`, 14, 46);
  doc.text(`Category: ${filters?.category || 'All'}`, 14, 51);
  doc.text(`Account: ${filters?.account || 'All'}`, 14, 56);

  // Cashflow summary cards (drawn as boxes)
  // Income Card
  doc.setFillColor(240, 253, 244); // light green
  doc.setDrawColor(187, 247, 208);
  doc.rect(14, 62, 56, 18, 'FD');
  doc.setTextColor(22, 163, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL INCOME', 18, 67);
  doc.setFontSize(11);
  doc.text(`₹${income.toLocaleString('en-IN')}`, 18, 75);

  // Expense Card
  doc.setFillColor(254, 242, 242); // light red
  doc.setDrawColor(254, 202, 202);
  doc.rect(77, 62, 56, 18, 'FD');
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL EXPENSE', 81, 67);
  doc.setFontSize(11);
  doc.text(`₹${expense.toLocaleString('en-IN')}`, 81, 75);

  // Net Savings Card
  doc.setFillColor(239, 246, 255); // light blue
  doc.setDrawColor(191, 219, 254);
  doc.rect(140, 62, 56, 18, 'FD');
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`SAVINGS (RATE: ${savingsRate}%)`, 144, 67);
  doc.setFontSize(11);
  doc.text(`₹${savings.toLocaleString('en-IN')}`, 144, 75);

  // Table header
  autoTable(doc, {
    startY: 86,
    head: [['Date', 'Type', 'Category', 'Account', 'Amount', 'Note']],
    body: transactions.map(t => [
      format(new Date(t.date), 'dd MMM yyyy'),
      t.type.toUpperCase(),
      getCatName(t.category),
      getAccName(t.account),
      `${t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString('en-IN')}`,
      t.note || '',
    ]),
    headStyles: { fillColor: [8, 26, 69], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      // Color-code the amount column
      if (data.column.index === 4 && data.cell.section === 'body') {
        const text = data.cell.text[0];
        if (text.startsWith('+')) {
          doc.setTextColor(22, 163, 74); // green
        } else if (text.startsWith('-')) {
          doc.setTextColor(220, 38, 38); // red
        }
      }
    }
  });

  doc.save(`finova-statement-${today()}.pdf`);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
