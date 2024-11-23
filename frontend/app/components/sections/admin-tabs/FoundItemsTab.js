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
  Upload
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Html5QrcodeScanner } from "html5-qrcode"
import ReportSection from "../ReportSection"
import { useState, useEffect, memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ProcessStatus } from '@/lib/constants';

const FoundItemsTab = memo(function FoundItemsTab({
  items = [],
  isCountsLoading,
  onDelete,
  onViewDetails,
  onApprove,
}) {
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [pendingFoundApprovalCount, setPendingFoundApprovalCount] = useState(0);
  const [allItems, setAllItems] = useState(items);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerType, setScannerType] = useState(null); // 'camera' or 'upload'
  const [scannedData, setScannedData] = useState(null);
  const [showScannedDataModal, setShowScannedDataModal] = useState(false);

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

  const handleScan = (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      setScannedData(data);
      setShowScannerModal(false);
      setShowScannedDataModal(true);
    } catch (error) {
      console.error('Error parsing QR code data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Found Items Overview
        </h3>

        {/* Status Cards with New Buttons */}
        {isCountsLoading || !items?.length ? (
          <div className="grid gap-4 grid-cols-3 mt-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-3 mt-4">
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
                      {pendingFoundApprovalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setShowReportModal(true)}
              className="bg-white border border-gray-200 text-black h-auto p-6 shadow-sm hover:bg-[#0f172a] hover:text-white transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />
                <span>Report Found Item</span>
              </div>
            </Button>

            <Button 
              onClick={() => setShowScannerModal(true)}
              className="bg-white border border-gray-200 text-black h-auto p-6 shadow-sm hover:bg-[#0f172a] hover:text-white transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                <span>Scan QR Code</span>
              </div>
            </Button>
          </div>
        )}

        {/* Found Items List */}
        <div className="space-y-4 mt-8">
          <h4 className="font-medium text-lg">New Found Items</h4>
          <div className="h-[600px] overflow-y-auto pr-4">
            <div className="grid gap-4">
              {isCountsLoading || !items?.length ? (
                // Skeleton loading state for items
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <Skeleton className="w-32 h-32 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <Skeleton className="h-6 w-48" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-24" />
                              </div>
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : allItems
                .filter(process => {
                  console.log('Full process object:', process);
                  
                  // Check each condition separately and log the result
                  const isPendingApproval = process.status === "pending_approval";
                  const isFoundItem = process.item?.status?.toLowerCase() === "found";
                  const isNotApproved = !process.item?.approved;

                  console.log('Detailed filter conditions:', {
                    isPendingApproval,
                    isFoundItem,
                    isNotApproved,
                    processStatus: process.status,
                    itemStatus: process.item?.status,
                    itemApproved: process.item?.approved,
                    shouldInclude: isPendingApproval && isFoundItem && isNotApproved
                  });

                  return isPendingApproval && isFoundItem && isNotApproved;
                })
                .length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="font-medium">No new found items to review</p>
                    <p className="text-sm">New found item reports will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                // Items mapping
                allItems
                  .filter(process => 
                    process.status === "pending_approval" && 
                    !process.item?.approved && 
                    process.item?.status?.toLowerCase() === "found"
                  )
                  .map((process) => {
                    console.log('Rendering process:', process);
                    // ... item rendering code ...
                    return (
                      <Card key={process.id || process.Id} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Image Section */}
                            <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              {(process.item?.imageUrl || process.item?.ImageUrl) ? (
                                <div className="w-full h-full relative">
                                  <img
                                    src={process.item.imageUrl || process.item.ImageUrl}
                                    alt={process.item.name || process.item.Name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div 
                                    className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground p-2"
                                  >
                                    <Package className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-xs text-center">
                                      {process.item?.category || process.item?.Category || 'Item'} Image
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                  <Package className="h-8 w-8 mb-2 opacity-50" />
                                  <p className="text-xs text-center">
                                    {process.item?.category || process.item?.Category || 'Item'} Image
                                  </p>
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
                                  <p className="text-sm text-muted-foreground">
                                    Student ID: {process.item?.studentId || process.item?.StudentId || "N/A"}
                                  </p>
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
                                {(process.item?.additionalDescriptions?.$values?.length > 0 || process.item?.AdditionalDescriptions?.$values?.length > 0) && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      +{(process.item?.additionalDescriptions?.$values || process.item?.AdditionalDescriptions?.$values || []).length} additional details
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Section */}
                            <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => onViewDetails({
                                  ...process.item,
                                  additionalDescriptions: process.item?.additionalDescriptions?.$values || 
                                                        process.item?.AdditionalDescriptions?.$values || []
                                })}
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
                    );
                  })
              )}
            </div>
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
            />
          </DialogContent>
        </Dialog>

        {/* Scanner Selection Modal */}
        <Dialog open={showScannerModal} onOpenChange={setShowScannerModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setScannerType('camera')}
                className="flex flex-col items-center p-6"
              >
                <Camera className="h-8 w-8 mb-2" />
                Use Camera
              </Button>
              <Button
                onClick={() => setScannerType('upload')}
                className="flex flex-col items-center p-6"
              >
                <Upload className="h-8 w-8 mb-2" />
                Upload Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scanned Data Modal */}
        <Dialog open={showScannedDataModal} onOpenChange={setShowScannedDataModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scanned Item Details</DialogTitle>
            </DialogHeader>
            {/* We'll implement this part next */}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

export default FoundItemsTab;
