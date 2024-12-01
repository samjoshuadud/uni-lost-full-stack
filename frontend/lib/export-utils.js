import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ProcessStatus } from './constants';

// Helper function to create Excel file
const exportToExcel = (data, filename) => {
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet format
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save file
  saveAs(blob, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (items, title = 'Report', filename = 'export') => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

  // Prepare data for table
  const tableData = items.map(process => [
    process.item?.name || '',
    process.item?.studentId || '',
    process.status === ProcessStatus.HANDED_OVER ? 'Handed Over' : 'No Show',
    new Date(process.updatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  ]);

  // Add table
  doc.autoTable({
    startY: 30,
    head: [['Item Name', 'Student ID', 'Status', 'Date']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 82, 204], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });

  // Save PDF
  const fileName = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Helper function to format date consistently across exports
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Update existing export functions to use Excel
export const exportHistoryItems = {
  toExcel: (items) => {
    const data = items.map(process => ({
      'Item Name': process.item?.name || '',
      'Student ID': process.item?.studentId || '',
      'Category': process.item?.category || '',
      'Location': process.item?.location || '',
      'Status': process.status === ProcessStatus.HANDED_OVER ? 'Handed Over' : 'No Show',
      'Date': new Date(process.updatedAt).toLocaleDateString(),
      'Description': process.item?.description || ''
    }));
    exportToExcel(data, 'item-history');
  },
  toPdf: (items) => exportToPDF(items, 'Item History Report', 'item-history')
};

export const exportLostItems = {
  toExcel: (items) => {
    const data = items.map(process => ({
      'Item Name': process.item?.name || '',
      'Student ID': process.item?.studentId || '',
      'Category': process.item?.category || '',
      'Location': process.item?.location || '',
      'Status': process.status,
      'Date': new Date(process.updatedAt).toLocaleDateString(),
      'Description': process.item?.description || ''
    }));
    exportToExcel(data, 'lost-items');
  },
  toPdf: (items) => exportToPDF(items, 'Lost Items Report', 'lost-items')
};

export const exportFoundItems = {
  toExcel: (items) => {
    const data = items.map(process => ({
      'Item Name': process.item?.name || '',
      'Student ID': process.item?.studentId || '',
      'Category': process.item?.category || '',
      'Location': process.item?.location || '',
      'Status': process.status,
      'Date': new Date(process.updatedAt).toLocaleDateString(),
      'Description': process.item?.description || ''
    }));
    exportToExcel(data, 'found-items');
  },
  toPdf: (items) => exportToPDF(items, 'Found Items Report', 'found-items')
};

export const exportStatistics = {
  toExcel: (stats) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Overview Sheet
    const overviewData = [{
      'Total Reports': stats.totalReports,
      'Found Items': stats.foundItems,
      'Active Cases': stats.activeCases,
      'Retrieved Items': stats.retrievedItems,
      'Weekly Change': `+${stats.weeklyChange}`
    }];
    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    // Category Distribution Sheet
    const categoryData = Object.entries(stats.categoryDistribution).map(([category, percentage]) => ({
      'Category': category,
      'Percentage': `${percentage}%`
    }));
    const wsCategories = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, wsCategories, "Categories");

    // Monthly Statistics Sheet
    const monthlyData = stats.chartData.labels.map((month, index) => ({
      'Month': month,
      'Lost Items': stats.chartData.datasets[0].data[index],
      'Found Items': stats.chartData.datasets[1].data[index],
      'Retrieved Items': stats.chartData.datasets[2].data[index]
    }));
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Stats");

    // Recent Activity Sheet
    const activityData = stats.recentActivity.map(activity => ({
      'Type': activity.type === 'retrieved' ? 'Item Retrieved' : 'New Report',
      'Item Name': activity.itemName,
      'Student ID': activity.studentId,
      'Time': new Date(activity.timestamp).toLocaleString()
    }));
    const wsActivity = XLSX.utils.json_to_sheet(activityData);
    XLSX.utils.book_append_sheet(wb, wsActivity, "Recent Activity");

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `statistics-${new Date().toISOString().split('T')[0]}.xlsx`);
  },
  toPdf: (stats, chartRef) => {
    const doc = new jsPDF();
    let yPos = 15;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 82, 204); // Blue title
    doc.text('Lost and Found Statistics Report', 15, yPos);
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, yPos);
    yPos += 15;

    // Overview Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Overview', 15, yPos);
    yPos += 10;

    // Overview Table
    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Reports', stats.totalReports.toString()],
        ['Found Items', stats.foundItems.toString()],
        ['Active Cases', stats.activeCases.toString()],
        ['Retrieved Items', stats.retrievedItems.toString()],
        ['Weekly Change', `+${stats.weeklyChange}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 204] }
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Category Distribution
    doc.setFontSize(14);
    doc.text('Category Distribution', 15, yPos);
    yPos += 10;

    doc.autoTable({
      startY: yPos,
      head: [['Category', 'Percentage']],
      body: Object.entries(stats.categoryDistribution).map(([category, percentage]) => [
        category,
        `${percentage}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 204] }
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Monthly Statistics Chart
    if (chartRef?.current) {
      doc.setFontSize(14);
      doc.text('Monthly Statistics', 15, yPos);
      yPos += 10;

      // Convert chart to image and add to PDF
      const canvas = chartRef.current.canvas;
      const chartImage = canvas.toDataURL('image/png');
      doc.addImage(chartImage, 'PNG', 15, yPos, 180, 100);
      yPos += 110;
    }

    // Recent Activity
    doc.addPage();
    yPos = 15;
    doc.setFontSize(14);
    doc.text('Recent Activity', 15, yPos);
    yPos += 10;

    doc.autoTable({
      startY: yPos,
      head: [['Type', 'Item Name', 'Student ID', 'Time']],
      body: stats.recentActivity.map(activity => [
        activity.type === 'retrieved' ? 'Item Retrieved' : 'New Report',
        activity.itemName,
        activity.studentId,
        new Date(activity.timestamp).toLocaleString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 204] }
    });

    // Save PDF
    const fileName = `statistics-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}; 