"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  CheckCircle,
  Package,
  Trash,
  ExternalLink,
  Loader2,
  QrCode,
  Plus,
  Camera,
  Upload,
  Inbox
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import ReportSection from "../ReportSection"
import { useState, useEffect, memo, useRef, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ProcessStatus } from '@/lib/constants';
import { useAuth } from "@/lib/AuthContext"
import { API_BASE_URL } from "@/lib/api-config"
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
const FoundItemsTab = memo(function FoundItemsTab({
  items = [],
  isCountsLoading,
  onDelete,
  onViewDetails,
  onApprove,
  onUpdateCounts
}) {
  const { user } = useAuth();
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [pendingFoundApprovalCount, setPendingFoundApprovalCount] = useState(0);
  const [allItems, setAllItems] = useState(items);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showScannedDataModal, setShowScannedDataModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const scannerRef = useRef(null);
  const scannerModalMounted = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    console.log('Raw items received:', items);
    console.log('All items state:', allItems);
  }, [items, allItems]);

  useEffect(() => {
    console.log('Items received in FoundItemsTab:', items);
    if (items && items.$values) {
      setAllItems(items.$values);
    } else if (Array.isArray(items)) {
      setAllItems(items);
    }
  }, [items]);
  
  useEffect(() => {
    const updateCount = () => {
      const count = allItems.filter(process => {
        console.log('Checking process for count:', process);
        return process.status === ProcessStatus.PENDING_APPROVAL && 
               process.item?.status?.toLowerCase() === "found" && 
               !process.item?.approved;
      }).length;
      
      console.log('Found items count:', count);
      setPendingFoundApprovalCount(count);
    };

    updateCount();
  }, [allItems]);

  const handleApprove = async (itemId) => {
    try {
      setApprovingItems((prev) => new Set(prev).add(itemId));
      await onApprove(itemId);
      // Update count after successful approval
      setAllItems(prevItems => {
        const newItems = prevItems.map(item => 
          item.item?.id === itemId 
            ? { ...item, item: { ...item.item, approved: true } }
            : item
        );
        // Update count after state update
        const newCount = newItems.filter(process => 
          process.status === "pending_approval" && 
          process.item?.status?.toLowerCase() === "found" && 
          !process.item?.approved
        ).length;
        setPendingFoundApprovalCount(newCount);
        return newItems;
      });
    } finally {
      setApprovingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDeleteClick = async (itemId) => {
    try {
      setDeletingItems(prev => new Set(prev).add(itemId));
      await onDelete(itemId);
      // Update local state after successful deletion
      setAllItems(prevItems => {
        const newItems = prevItems.filter(item => item.item?.id !== itemId);
        // Update count after state update
        const newCount = newItems.filter(process => 
          process.status === "pending_approval" && 
          process.item?.status?.toLowerCase() === "found" && 
          !process.item?.approved
        ).length;
        setPendingFoundApprovalCount(newCount);
        return newItems;
      });
    } finally {
      setDeletingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const processQRFile = async (file) => {
    const tempDiv = document.createElement('div');
    tempDiv.id = 'qr-reader-temp';
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    try {
      // Wait for the element to be in the DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html5QrCode = new Html5Qrcode("qr-reader-temp");
      
      try {
        const scanResult = await html5QrCode.scanFileV2(file, {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        
        if (scanResult && scanResult.decodedText) {
          try {
            const parsedData = JSON.parse(scanResult.decodedText);
            if (parsedData && parsedData.id) {
              // Update to use process ID endpoint
              const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
              if (!response.ok) {
                throw new Error('Failed to fetch process data');
              }
              const processesData = await response.json();
              
              // Find the specific process using the ID from QR code
              const processData = processesData.$values.find(p => p.id === parsedData.id);
              
              if (!processData) {
                throw new Error('Process not found');
              }
              
              // Set the scanned data with process and item details
              setScannedData({
                id: processData.item?.id,
                name: processData.item?.name,
                description: processData.item?.description,
                location: processData.item?.location,
                category: processData.item?.category,
                studentId: processData.item?.studentId,
                imageUrl: processData.item?.imageUrl,
                additionalDescriptions: processData.item?.additionalDescriptions,
                processId: processData.id // Store the process ID as well
              });
              
              setShowScannerModal(false);
              setShowScannedDataModal(true);
            }
          } catch (error) {
            console.error('Error parsing QR data:', error);
            alert('Invalid QR code format');
          }
        }
      } finally {
        await html5QrCode.clear();
      }
    } catch (error) {
      console.error('Error processing QR file:', error);
      alert('Could not read QR code from this image');
    } finally {
      // Always remove the temp element
      if (tempDiv && tempDiv.parentNode) {
        tempDiv.parentNode.removeChild(tempDiv);
      }
    }
  };

  const handleReportSubmit = async (data) => {
    try {
      setShowReportDialog(false);
      if (typeof onUpdateCounts === 'function') {
        onUpdateCounts();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  useEffect(() => {
    let scanner = null;
    let initializationTimeout = null;

    const initializeScanner = async () => {
      if (showScannerModal) {
        try {
          initializationTimeout = setTimeout(() => {
            const element = document.getElementById('qr-reader');
            if (!element) {
              console.error('QR reader element not found');
              return;
            }

            scanner = new Html5QrcodeScanner(
              "qr-reader",
              { 
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                rememberLastUsedCamera: true,
                supportedScanTypes: [0],
                formatsToSupport: [ "QR_CODE" ],
                videoConstraints: {
                  facingMode: { ideal: "environment" },
                  width: { min: 320, ideal: 1280, max: 1920 },
                  height: { min: 240, ideal: 720, max: 1080 }
                },
                experimentalFeatures: {
                  useBarCodeDetectorIfSupported: false
                },
                verbose: false
              }
            );

            scanner.render(
              async (decodedText) => {
                try {
                  const parsedData = JSON.parse(decodedText);
                  if (parsedData && parsedData.id) {
                    // Update to use the correct endpoint for pending processes
                    const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
                    if (!response.ok) {
                      throw new Error('Failed to fetch process data');
                    }
                    const processesData = await response.json();
                    
                    // Find the specific process using the ID from QR code
                    const processData = processesData.$values.find(p => p.id === parsedData.id);
                    
                    if (!processData) {
                      throw new Error('Process not found');
                    }
                    
                    // Set the scanned data with process and item details
                    setScannedData({
                      id: processData.item?.id,
                      name: processData.item?.name,
                      description: processData.item?.description,
                      location: processData.item?.location,
                      category: processData.item?.category,
                      studentId: processData.item?.studentId,
                      imageUrl: processData.item?.imageUrl,
                      additionalDescriptions: processData.item?.additionalDescriptions,
                      processId: processData.id // Store the process ID as well
                    });
                    
                    setShowScannerModal(false);
                    setShowScannedDataModal(true);
                  }
                } catch (error) {
                  console.error('Error processing QR data:', error);
                }
              },
              (error) => {
                if (error?.message && !error.message.includes("NotFoundException")) {
                  console.log('QR scan error:', error);
                }
              }
            );
          }, 100);
        } catch (err) {
          console.error("Failed to start scanner:", err);
        }
      }
    };

    initializeScanner();

    return () => {
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      if (scanner) {
        try {
          scanner.clear();
          const element = document.getElementById('qr-reader');
          if (element) {
            element.innerHTML = '';
          }
        } catch (error) {
          console.error('Error clearing scanner:', error);
        }
      }
    };
  }, [showScannerModal]);

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Found Items Overview
        </h3>

        {/* Status Cards with New Buttons */}
        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <Card className="bg-background hover:bg-muted/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold">
                    {items.filter(process => 
                      process.status === ProcessStatus.PENDING_APPROVAL && 
                      process.item?.status?.toLowerCase() === "found" && 
                      !process.item?.approved
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Scanner Card */}
          <Card 
            className="bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
            onClick={() => setShowScannerModal(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0052cc]/10 rounded-full">
                    <QrCode className="h-6 w-6 text-[#0052cc] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Scan QR Code
                    </p>
                    <p className="text-sm text-muted-foreground/80 mt-1">
                      Click to scan item QR code
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Report Card */}
          <Card 
            className="bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
            onClick={() => setShowReportDialog(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0052cc]/10 rounded-full">
                    <Plus className="h-6 w-6 text-[#0052cc] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Report Found Item
                    </p>
                    <p className="text-sm text-muted-foreground/80 mt-1">
                      Click to report a found item
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Found Items List */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              New Found Items
            </h4>
          </div>

          <div className="relative">
            <div className="h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50 pr-4">
              <div className="space-y-4 pt-1">
                {isCountsLoading ? (
                  // Skeleton loading state
                  <>
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="overflow-hidden border border-gray-100 shadow-sm">
                        {/* ... skeleton content ... */}
                      </Card>
                    ))}
                  </>
                ) : !items || items.filter(process => 
                    process.status === ProcessStatus.PENDING_APPROVAL && 
                    process.item?.status?.toLowerCase() === "found" && 
                    !process.item?.approved
                  ).length === 0 ? (
                  // Empty state
                  <Card className="border border-dashed bg-gray-50/50">
                    <CardContent className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Inbox className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-xl text-gray-900">No Found Items</h3>
                        <p className="text-gray-500 text-sm max-w-sm">
                          There are currently no found items waiting for approval. New items will appear here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Items list
                  items
                    .filter(process => 
                      process.status === ProcessStatus.PENDING_APPROVAL && 
                      !process.item?.approved && 
                      process.item?.status?.toLowerCase() === "found"
                    )
                    .map((process) => (
                      <Card 
                        key={process.id || process.Id} 
                        className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => onViewDetails(process.item)}
                      >
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Image Section */}
                            <div className="w-32 h-32 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                              {(process.item?.imageUrl || process.item?.ImageUrl) ? (
                                <div className="w-full h-full relative group">
                                  <img
                                    src={process.item.imageUrl || process.item.ImageUrl}
                                    alt={process.item.name || process.item.Name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                  <Package className="h-8 w-8 mb-2" />
                                  <p className="text-xs text-center px-2">No Image</p>
                                </div>
                              )}
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg truncate">
                                      {process.item?.name || process.item?.Name}
                                    </h3>
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      For Approval
                                    </Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span className="font-medium">
                                        {process.item?.studentId?.startsWith('ADMIN') ? 'Reported by:' : 'Student ID:'}
                                      </span>
                                      <span>{process.item?.studentId || process.item?.StudentId || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="ml-2 flex-shrink-0">
                                  {process.item?.category || process.item?.Category}
                                </Badge>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-sm">
                                  <strong>Location:</strong> {process.item?.location || process.item?.Location}
                                </p>
                                <p className="text-sm">
                                  <strong>Description:</strong> {process.item?.description || process.item?.Description}
                                </p>
                                {(process.item?.additionalDescriptions?.$values?.length > 0 || 
                                  process.item?.AdditionalDescriptions?.$values?.length > 0) && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      +{(process.item?.additionalDescriptions?.$values || 
                                         process.item?.AdditionalDescriptions?.$values || []).length} additional details
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Section - Stop event propagation */}
                            <div className="flex flex-col gap-2 justify-start min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => onViewDetails(process.item)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => handleApprove(process.item?.id || process.item?.Id)}
                                disabled={approvingItems.has(process.item?.id || process.item?.Id)}
                              >
                                {approvingItems.has(process.item?.id || process.item?.Id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Post
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => handleDeleteClick(process.item?.id || process.item?.Id)}
                                disabled={deletingItems.has(process.item?.id || process.item?.Id)}
                              >
                                {deletingItems.has(process.item?.id || process.item?.Id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent h-12 pointer-events-none" />
          </div>
        </div>

        {/* Report Modal */}
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Found Item</DialogTitle>
            </DialogHeader>
            <ReportSection 
              onSubmit={() => setShowReportModal(false)}
              adminMode={true}
              activeSection="found"
            />
          </DialogContent>
        </Dialog>

        {/* Scanner Modal */}
        <Dialog 
          open={showScannerModal} 
          onOpenChange={(open) => {
            setShowScannerModal(open);
            if (!open) {
              const element = document.getElementById('qr-reader');
              if (element) {
                element.innerHTML = '';
              }
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Scanning Tips */}
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <p className="font-medium mb-2">Scanning Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Hold the QR code steady</li>
                  <li>Ensure good lighting</li>
                  <li>Keep the QR code within the frame</li>
                  <li>Try different distances</li>
                </ul>
              </div>

              {/* QR Scanner */}
              <div className="qr-container">
                <div id="qr-reader" style={{ width: '100%' }}></div>
                <style jsx>{`
                  .qr-container {
                    position: relative;
                  }
                  :global(#qr-reader) {
                    border: none !important;
                    background: #f8f9fa;
                    border-radius: 8px;
                    overflow: hidden;
                  }
                  :global(#qr-reader button) {
                    background: #0052cc !important;
                    color: white !important;
                    border: none !important;
                    padding: 6px 12px !important;
                    margin: 0 !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    position: absolute !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    bottom: 0 !important;
                    width: 100% !important;
                  }
                  :global(#qr-reader select) {
                    padding: 6px !important;
                    border-radius: 6px !important;
                    border-color: #e2e8f0 !important;
                    margin-bottom: 16px !important;
                  }
                `}</style>
              </div>

              {/* File Upload Option with Drag & Drop */}
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground mb-2">Or upload a QR code image</p>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    isDragging ? "border-[#0052cc] bg-[#0052cc]/5" : "border-gray-200"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      await processQRFile(file);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processQRFile(file);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-[#0052cc]" />
                    <div>
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scanned Data Modal */}
        <Dialog open={showScannedDataModal} onOpenChange={setShowScannedDataModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scanned Item Details</DialogTitle>
            </DialogHeader>
            {scannedData && (
              <ReportSection 
                onSubmit={() => setShowScannedDataModal(false)}
                adminMode={true}
                initialData={scannedData} // Pass scanned data as initial values
                isScannedData={true} // Add flag to indicate this is from QR scan
                activeSection="found"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Found Item</DialogTitle>
            </DialogHeader>
            <ReportSection 
              onSubmit={handleReportSubmit}
              adminMode={true}
              activeSection="found"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

export default FoundItemsTab;
