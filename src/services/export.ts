// Export service – CSV, Excel, JSON, PDF
import type { Transaction } from '../types';
import { getCategories, getAccounts } from './db';
import { format } from 'date-fns';
import { getAuth } from 'firebase/auth';
import { LOGO_BASE64 } from './logoBase64';

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

  // Draw logo image if base64 is loaded, else draw vector wordmark fallback
  if (LOGO_BASE64) {
    doc.addImage(LOGO_BASE64, 'JPEG', 14, 7, 12, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(8, 26, 69); // Dark Navy #081A45
    doc.text('FINOVA', 28, 16.5);
  } else {
    drawWordmark(doc, 14, 8, 8);
  }

  // Tagline below logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TRACK MONEY · BUILD BETTER HABITS', 14, 23.5);

  // Retrieve user name
  let userName = 'User';
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      userName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User';
    }
  } catch (err) {
    console.warn('Failed to retrieve user name from auth:', err);
  }

  // Right-aligned report metadata at x=196mm
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(8, 26, 69); // Dark Navy Brand Color
  doc.text(`STATEMENT FOR: ${userName.toUpperCase()}`, 196, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy hh:mm a')}`, 196, 15.5, { align: 'right' });
  doc.text(`Record Count: ${transactions.length} entries`, 196, 19.5, { align: 'right' });
  doc.text(`Scope: ${filters?.range || 'All Scope'} | Category: ${filters?.category || 'All'} | Account: ${filters?.account || 'All'}`, 196, 23.5, { align: 'right' });

  // Dual-color premium dividing accent line at y=27mm
  doc.setLineWidth(0.6);
  // Left half (blue)
  doc.setDrawColor(37, 99, 235);
  doc.line(14, 27, 105, 27);
  // Right half (green)
  doc.setDrawColor(0, 208, 132);
  doc.line(105, 27, 196, 27);

  // Summary Metrics Section
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Cashflow summary cards (drawn as rounded rects) at y=33
  // Income Card
  doc.setFillColor(240, 253, 244); // light green
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, 33, 56, 18, 3, 3, 'FD');
  doc.setTextColor(22, 163, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL INCOME', 18, 38);
  doc.setFontSize(11);
  doc.text(`Rs. ${income.toLocaleString('en-IN')}`, 18, 46);

  // Expense Card
  doc.setFillColor(254, 242, 242); // light red
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(77, 33, 56, 18, 3, 3, 'FD');
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL EXPENSE', 81, 38);
  doc.setFontSize(11);
  doc.text(`Rs. ${expense.toLocaleString('en-IN')}`, 81, 46);

  // Net Savings Card
  doc.setFillColor(239, 246, 255); // light blue
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(140, 33, 56, 18, 3, 3, 'FD');
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`SAVINGS (RATE: ${savingsRate}%)`, 144, 38);
  doc.setFontSize(11);
  doc.text(`Rs. ${savings.toLocaleString('en-IN')}`, 144, 46);

  // Transactions Table (startY=57, note column removed to prevent overflow)
  autoTable(doc, {
    startY: 57,
    head: [['Date', 'Type', 'Category', 'Account', 'Amount']],
    body: transactions.map(t => [
      format(new Date(t.date), 'dd MMM yyyy'),
      t.type.toUpperCase(),
      getCatName(t.category),
      getAccName(t.account),
      `${t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString('en-IN')}`,
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

// Draw premium wordmark vector logo programmatically in PDF
function drawWordmark(doc: any, x0: number, y0: number, height: number) {
  const s = height / 56;
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.setLineWidth(12 * s);
  
  // Letters F, I, N, V, A in #081A45
  doc.setDrawColor(8, 26, 69);
  
  // F
  doc.line(x0 + 0*s, y0 + 0*s, x0 + 0*s, y0 + 56*s); // stem
  doc.line(x0 + 0*s, y0 + 0*s, x0 + 36*s, y0 + 0*s); // top bar
  doc.line(x0 + 0*s, y0 + 28*s, x0 + 26*s, y0 + 28*s); // mid bar
  
  // I
  doc.line(x0 + 51*s, y0 + 0*s, x0 + 51*s, y0 + 56*s);
  
  // N
  doc.line(x0 + 66*s, y0 + 56*s, x0 + 66*s, y0 + 0*s);
  doc.line(x0 + 66*s, y0 + 0*s, x0 + 106*s, y0 + 56*s);
  doc.line(x0 + 106*s, y0 + 56*s, x0 + 106*s, y0 + 0*s);
  
  // V
  doc.line(x0 + 190*s, y0 + 0*s, x0 + 210*s, y0 + 56*s);
  doc.line(x0 + 210*s, y0 + 56*s, x0 + 230*s, y0 + 0*s);
  
  // A
  doc.line(x0 + 244*s, y0 + 56*s, x0 + 264*s, y0 + 0*s);
  doc.line(x0 + 264*s, y0 + 0*s, x0 + 284*s, y0 + 56*s);
  doc.line(x0 + 252*s, y0 + 36*s, x0 + 276*s, y0 + 36*s); // crossbar
  
  // O (circle)
  doc.setDrawColor(0, 208, 132); // #00D084 Teal-Green
  doc.circle(x0 + 148*s, y0 + 28*s, 28*s, 'S');

  // Reset doc graphics properties
  doc.setLineWidth(1.0);
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
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
