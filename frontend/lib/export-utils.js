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

export const exportStatistics = {
  toPdf: (data, chartRef) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      // Title and date
      doc.setFontSize(14);
      doc.text('Lost and Found Statistics Report', 14, yPos);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos + 8);
      yPos += 20;

      // Overview Section
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Overview', 14, yPos);
      yPos += 5;

      // Update the header color and table styles
      const headerColor = [0, 32, 153]; // Darker blue color
      const tableDefaults = {
        theme: 'grid',
        headStyles: {
          fillColor: headerColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineHeight: 1.1
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left' }
        },
        margin: { left: 14, right: 14 },
        tableWidth: pageWidth - 28
      };

      // Update the Overview table
      doc.autoTable({
        ...tableDefaults,
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Reports', data.totalReports],
          ['Found Items', data.foundItems],
          ['Active Cases', data.activeCases],
          ['Retrieved Items', data.retrievedItems],
          ['No Show', data.noShowItems],
          ['Weekly Change', `+${data.weeklyChange}`],
        ],
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 12; // Reduced spacing between tables

      // Category Distribution
      doc.setFontSize(12);
      doc.text('Category Distribution', 14, yPos);
      yPos += 5;

      const categoryData = Object.entries(data.categoryDistribution)
        .map(([category, percentage]) => [
          category,
          `${percentage}%`
        ])
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1]));

      doc.autoTable({
        ...tableDefaults,
        startY: yPos,
        head: [['Category', 'Percentage']],
        body: categoryData,
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        }
      });

      // Add new page for Monthly Statistics and Recent Activity
      doc.addPage();
      yPos = 20;

      // Monthly Statistics
      if (chartRef?.current) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Monthly Statistics', 14, yPos);
        yPos += 10;

        const canvas = chartRef.current.canvas;
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions while maintaining aspect ratio
        const canvasAspectRatio = canvas.width / canvas.height;
        const maxWidth = pageWidth - 28; // Full width minus margins
        const maxHeight = 120; // Maximum height we want to allow
        
        let chartWidth = maxWidth;
        let chartHeight = chartWidth / canvasAspectRatio;
        
        // If height is too large, scale down based on height
        if (chartHeight > maxHeight) {
          chartHeight = maxHeight;
          chartWidth = chartHeight * canvasAspectRatio;
        }
        
        // Center the chart horizontally
        const xPos = (pageWidth - chartWidth) / 2;
        
        // Add the image
        doc.addImage(imgData, 'PNG', xPos, yPos, chartWidth, chartHeight);
        yPos += chartHeight + 20; // Add spacing after chart
      }

      // Recent Activity
      if (data.recentActivity?.length) {
        doc.setFontSize(12);
        doc.text('Recent Activity', 14, yPos);
        yPos += 5;

        const activityData = data.recentActivity.map(activity => [
          activity.type,
          activity.itemName,
          activity.studentId,
          new Date(activity.timestamp).toLocaleString()
        ]);

        doc.autoTable({
          ...tableDefaults,
          startY: yPos,
          head: [['Type', 'Item Name', 'Student ID', 'Time']],
          body: activityData,
          columnStyles: {
            0: { cellWidth: 25 }, // Reduced column widths
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto' }
          }
        });
      }

      doc.save('lost-and-found-statistics.pdf');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  },

  toExcel: (data) => {
    try {
      const wb = XLSX.utils.book_new();
      
      // First sheet - Overview & Categories
      const firstPageData = [
        ['Lost and Found Statistics Report'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [''],
        ['Overview'],
        ['Metric', 'Value'],
        ['Total Reports', data.totalReports],
        ['Found Items', data.foundItems],
        ['Active Cases', data.activeCases],
        ['Retrieved Items', data.retrievedItems],
        ['No Show', data.noShowItems],
        ['Weekly Change', `+${data.weeklyChange}`],
        [''],
        ['Category Distribution'],
        ['Category', 'Percentage'],
        ...Object.entries(data.categoryDistribution)
          .sort(([, a], [, b]) => b - a)
          .map(([category, percentage]) => [
            category,
            `${percentage}%`
          ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(firstPageData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25, alignment: { horizontal: 'left' } },
        { wch: 15, alignment: { horizontal: 'left' } }
      ];

      // Add cell styles for alignment
      for (let i = 0; i < firstPageData.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 1 }); // Column B (second column)
        if (!ws[cellRef]) continue;
        
        ws[cellRef].z = '@'; // Text format to prevent auto-formatting
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.alignment = { horizontal: 'left' };
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Overview & Categories');

      // Monthly Statistics sheet
      const monthlyData = [
        ['Monthly Statistics'],
        [''], // Empty row
        ['Month', 'Lost Items', 'Found Items', 'Retrieved Items', 'No Show'],
        ...data.chartData.labels.map((label, index) => [
          label,
          data.chartData.datasets[0].data[index],
          data.chartData.datasets[1].data[index],
          data.chartData.datasets[2].data[index],
          data.chartData.datasets[3].data[index],
        ])
      ];

      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
      
      // Set column widths for monthly statistics
      monthlyWs['!cols'] = [
        { wch: 20, alignment: { horizontal: 'left' } },
        { wch: 15, alignment: { horizontal: 'left' } },
        { wch: 15, alignment: { horizontal: 'left' } },
        { wch: 15, alignment: { horizontal: 'left' } },
        { wch: 15, alignment: { horizontal: 'left' } }
      ];

      XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Statistics');

      // Recent Activity sheet
      if (data.recentActivity?.length) {
        const activityData = [
          ['Recent Activity'],
          [''], // Empty row
          ['Type', 'Item Name', 'Student ID', 'Time'],
          ...data.recentActivity.map(activity => [
            activity.type,
            activity.itemName,
            activity.studentId,
            new Date(activity.timestamp).toLocaleString()
          ])
        ];

        const activityWs = XLSX.utils.aoa_to_sheet(activityData);
        
        // Set column widths for activity
        activityWs['!cols'] = [
          { wch: 15, alignment: { horizontal: 'left' } },
          { wch: 30, alignment: { horizontal: 'left' } },
          { wch: 20, alignment: { horizontal: 'left' } },
          { wch: 25, alignment: { horizontal: 'left' } }
        ];

        XLSX.utils.book_append_sheet(wb, activityWs, 'Recent Activity');
      }

      XLSX.writeFile(wb, 'lost-and-found-statistics.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }
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
    startY: 35,
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

  // Create workbook and add sheets
  const wb = XLSX.utils.book_new();
  
  // Add main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Items');

  // Save the file
  XLSX.writeFile(wb, 'lost-and-found-report.xlsx');
}; 