import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProcessStatus, ItemStatus } from './constants';

// Helper function to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper to get status display name
const getStatusDisplay = (status) => {
  const statusMap = {
    [ProcessStatus.PENDING_APPROVAL]: "Pending Approval",
    [ProcessStatus.VERIFICATION_NEEDED]: "Verification Needed",
    [ProcessStatus.IN_VERIFICATION]: "In Verification",
    [ProcessStatus.PENDING_VERIFICATION]: "Pending Verification",
    [ProcessStatus.VERIFICATION_FAILED]: "Verification Failed",
    [ProcessStatus.VERIFIED]: "Verified",
    [ProcessStatus.PENDING_RETRIEVAL]: "Ready for Pickup",
    [ProcessStatus.HANDED_OVER]: "Retrieved",
    [ProcessStatus.CLAIM_REQUEST]: "Claim Requested",
    [ProcessStatus.NO_SHOW]: "No Show",
    [ItemStatus.LOST]: "Lost",
    [ItemStatus.FOUND]: "Found"
  };
  return statusMap[status] || status;
};

export const exportToPDF = (items, dateRange) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(16);
  doc.text('Lost and Found Items Report', 14, 15);
  
  // Add date range if provided
  if (dateRange) {
    doc.setFontSize(12);
    doc.text(`Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, 14, 25);
  }

  // Prepare data for statistics section
  const stats = items.reduce((acc, process) => {
    const status = process.status || process.item?.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Add statistics section
  doc.setFontSize(14);
  doc.text('Statistics', 14, 35);
  
  let yPos = 45;
  Object.entries(stats).forEach(([status, count]) => {
    doc.setFontSize(12);
    doc.text(`${getStatusDisplay(status)}: ${count}`, 20, yPos);
    yPos += 7;
  });

  // Add items table
  const tableData = items.map(process => {
    const item = process.item || process.Item;
    return [
      item.name || item.Name,
      item.category || item.Category,
      formatDate(item.dateReported || item.DateReported),
      getStatusDisplay(process.status),
      item.location || item.Location
    ];
  });

  doc.autoTable({
    startY: yPos + 10,
    head: [['Item Name', 'Category', 'Date Reported', 'Status', 'Location']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 82, 204] }
  });

  // Save the PDF
  doc.save('lost-and-found-report.pdf');
};

export const exportToExcel = (items, dateRange) => {
  // Prepare data for Excel
  const data = items.map(process => {
    const item = process.item || process.Item;
    return {
      'Item Name': item.name || item.Name,
      'Category': item.category || item.Category,
      'Date Reported': formatDate(item.dateReported || item.DateReported),
      'Status': getStatusDisplay(process.status),
      'Location': item.location || item.Location,
      'Description': item.description || item.Description,
      'Reporter ID': item.reporterId || item.ReporterId,
      'Approved': item.approved ? 'Yes' : 'No'
    };
  });

  // Create statistics sheet data
  const stats = items.reduce((acc, process) => {
    const status = process.status || process.item?.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statsData = Object.entries(stats).map(([status, count]) => ({
    'Status': getStatusDisplay(status),
    'Count': count
  }));

  // Create workbook and add sheets
  const wb = XLSX.utils.book_new();
  
  // Add main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Items');

  // Add statistics sheet
  const statsWs = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');

  // Save the file
  XLSX.writeFile(wb, 'lost-and-found-report.xlsx');
}; 