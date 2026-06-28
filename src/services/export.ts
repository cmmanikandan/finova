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
    format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
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
    Date: format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
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
export async function exportPDF(transactions: Transaction[]): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FINOVA', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Track Money. Build Better Habits.', 14, 20);
  doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy')}`, 150, 12);
  doc.text(`${transactions.length} transactions`, 150, 20);

  doc.setTextColor(0, 0, 0);

  // Summary
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Income: ₹${income.toLocaleString()}`, 14, 38);
  doc.text(`Total Expense: ₹${expense.toLocaleString()}`, 80, 38);
  doc.text(`Net Savings: ₹${(income - expense).toLocaleString()}`, 150, 38);

  // Table
  autoTable(doc, {
    startY: 44,
    head: [['Date', 'Type', 'Category', 'Account', 'Amount', 'Note']],
    body: transactions.map(t => [
      format(new Date(t.date), 'dd/MM/yy'),
      t.type.toUpperCase(),
      getCatName(t.category),
      getAccName(t.account),
      `₹${t.amount.toLocaleString()}`,
      t.note || '',
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 4: { halign: 'right' } },
  });

  doc.save(`finova-transactions-${today()}.pdf`);
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
