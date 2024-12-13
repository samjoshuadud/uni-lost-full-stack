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

// Update the calculateProcessDuration helper function
const calculateProcessDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if same day
  if (start.toDateString() === end.toDateString()) {
    return 'Same day';
  }

  const diffInMs = end - start;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  
  return diffInDays === 1 ? '1 day' : `${diffInDays} days`;
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
          ['Lost Items', data.additionalStats.lostItems],
          ['Active Cases', data.activeCases],
          ['Retrieved Items', data.retrievedItems],
          ['No Show', data.noShowItems],
          ['Pending Approval', data.additionalStats.pendingApproval],
          ['Pending Retrieval', data.additionalStats.pendingRetrieval],
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
      
      // Overview Sheet
      const overviewData = [
        ['Lost and Found Statistics Report'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [''],
        ['Overview'],
        ['Metric', 'Value'],
        ['Total Reports', data.totalReports || 0],
        ['Found Items', data.foundItems || 0],
        ['Lost Items', data.additionalStats?.lostItems || 0],
        ['Active Cases', data.activeCases || 0],
        ['Retrieved Items', data.retrievedItems || 0],
        ['No Show', data.noShowItems || 0],
        ['Pending Approval', data.additionalStats?.pendingApproval || 0],
        ['Pending Retrieval', data.additionalStats?.pendingRetrieval || 0],
        ['Weekly Change', `+${data.weeklyChange || 0}`]
      ];

      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

      // Monthly Statistics Sheet
      const monthlyData = [
        ['Monthly Statistics'],
        [''],
        ['Month', 'Lost Items', 'Found Items', 'Retrieved', 'No Show', 'Pending Approval', 'Pending Retrieval', 'Active Cases']
      ];

      // Safely add data rows for each month
      if (data.chartData?.labels) {
        data.chartData.labels.forEach((month, index) => {
          monthlyData.push([
            month,
            data.chartData.datasets[0]?.data[index] || 0, // Lost Items
            data.chartData.datasets[1]?.data[index] || 0, // Found Items
            data.chartData.datasets[2]?.data[index] || 0, // Retrieved
            data.chartData.datasets[3]?.data[index] || 0, // No Show
            data.chartData.datasets[4]?.data[index] || 0, // Pending Approval
            data.chartData.datasets[5]?.data[index] || 0, // Pending Retrieval
            data.chartData.datasets[6]?.data[index] || 0  // Active Cases
          ]);
        });
      }

      const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Statistics');

      // Category Distribution Sheet
      const categoryData = [
        ['Category Distribution'],
        [''],
        ['Category', 'Percentage']
      ];

      if (data.categoryDistribution) {
        Object.entries(data.categoryDistribution)
          .sort((a, b) => b[1] - a[1]) // Sort by percentage descending
          .forEach(([category, percentage]) => {
            categoryData.push([category, `${percentage}%`]);
          });
      }

      const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, wsCategory, 'Categories');

      // Recent Activity Sheet
      const activityData = [
        ['Recent Activity'],
        [''],
        ['Type', 'Item Name', 'Student ID', 'Item Status', 'Time']
      ];

      if (data.recentActivity) {
        data.recentActivity.forEach(activity => {
          activityData.push([
            activity.type || '',
            activity.itemName || '',
            activity.studentId || '',
            activity.itemStatus || '',
            activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ''
          ]);
        });
      }

      const wsActivity = XLSX.utils.aoa_to_sheet(activityData);
      XLSX.utils.book_append_sheet(wb, wsActivity, 'Recent Activity');

      // Set column widths for all sheets
      [wsOverview, wsMonthly, wsCategory, wsActivity].forEach(ws => {
        ws['!cols'] = [
          { wch: 20 }, // First column
          { wch: 15 }, // Second column
          { wch: 15 }, // Third column
          { wch: 15 }, // Fourth column
          { wch: 15 }, // Fifth column
          { wch: 15 }, // Sixth column
          { wch: 15 }, // Seventh column
          { wch: 15 }  // Eighth column
        ];
      });

      // Add some basic styling to headers
      const styleHeaders = (ws, range) => {
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][0] = { hidden: false, hpt: 24 }; // Set height for header row
        if (!ws['!cols']) ws['!cols'] = [];
        
        // Make headers bold
        for (let i = 0; i < range; i++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
          if (!ws[cellRef]) continue;
          if (!ws[cellRef].s) ws[cellRef].s = {};
          ws[cellRef].s.font = { bold: true };
        }
      };

      // Apply styles to all sheets
      styleHeaders(wsOverview, 2);
      styleHeaders(wsMonthly, 8);
      styleHeaders(wsCategory, 2);
      styleHeaders(wsActivity, 5);

      // Save the workbook
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

  // Add items table with completion date and process duration
  const tableData = items.map(process => {
    const item = process.item || process.Item;
    const processDuration = calculateProcessDuration(
      item.dateReported || item.DateReported,
      process.updatedAt
    );
    
    return [
      item.name || item.Name,
      item.category || item.Category,
      formatDate(item.dateReported || item.DateReported),
      getStatusDisplay(process.status),
      item.location || item.Location,
      formatDate(process.updatedAt), // Date Completed
      processDuration // Process Duration
    ];
  });

  doc.autoTable({
    startY: 35,
    head: [['Item Name', 'Category', 'Date Reported', 'Status', 'Location', 'Date Completed', 'Process Duration']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 82, 204] },
    columnStyles: {
      6: { cellWidth: 'auto' } // Ensure Process Duration column has enough width
    }
  });

  // Save the PDF
  doc.save('lost-and-found-report.pdf');
};

export const exportToExcel = (items, dateRange) => {
  // Prepare data for Excel
  const data = items.map(process => {
    const item = process.item || process.Item;
    const processDuration = calculateProcessDuration(
      item.dateReported || item.DateReported,
      process.updatedAt
    );
    
    return {
      'Item Name': item.name || item.Name,
      'Category': item.category || item.Category,
      'Date Reported': formatDate(item.dateReported || item.DateReported),
      'Status': getStatusDisplay(process.status),
      'Location': item.location || item.Location,
      'Description': item.description || item.Description,
      'Reporter ID': item.reporterId || item.ReporterId,
      'Approved': item.approved ? 'Yes' : 'No',
      'Date Completed': formatDate(process.updatedAt),
      'Process Duration': processDuration
    };
  });

  // Create workbook and add sheets
  const wb = XLSX.utils.book_new();
  
  // Add main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Item Name
    { wch: 15 }, // Category
    { wch: 15 }, // Date Reported
    { wch: 15 }, // Status
    { wch: 20 }, // Location
    { wch: 30 }, // Description
    { wch: 15 }, // Reporter ID
    { wch: 10 }, // Approved
    { wch: 15 }, // Date Completed
    { wch: 15 }  // Process Duration
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Items');

  // Save the file
  XLSX.writeFile(wb, 'lost-and-found-report.xlsx');
}; 