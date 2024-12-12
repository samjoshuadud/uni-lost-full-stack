"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Inbox,
  CalendarIcon,
  MapPinIcon,
  Search,
  ArrowUpDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import ReportSection from "../ReportSection";
import { useState, useEffect, memo, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessStatus } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { API_BASE_URL } from "@/lib/api-config";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { rankItemSimilarity } from "@/lib/gemini";

const FoundItemsTab = memo(function FoundItemsTab({
  items = [],
  isCountsLoading,
  onDelete,
  onViewDetails,
  onApprove,
  onUpdateCounts,
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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  const [lostItems, setLostItems] = useState([]);
  const [isLoadingLostItems, setIsLoadingLostItems] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedItemForMatching, setSelectedItemForMatching] = useState(null);
  const [isMatchingItem, setIsMatchingItem] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState("");
  const [matchCategoryFilter, setMatchCategoryFilter] = useState("all");
  const [matchDateFilter, setMatchDateFilter] = useState("all");
  const [matchSortOption, setMatchSortOption] = useState("bestMatch");
  const [selectedFoundItem, setSelectedFoundItem] = useState(null);

  useEffect(() => {
    console.log("Raw items received:", items);
    console.log("All items state:", allItems);
  }, [items, allItems]);

  useEffect(() => {
    console.log("Items received in FoundItemsTab:", items);
    if (items && items.$values) {
      setAllItems(items.$values);
    } else if (Array.isArray(items)) {
      setAllItems(items);
    }
  }, [items]);

  useEffect(() => {
    const updateCount = () => {
      const count = allItems.filter((process) => {
        console.log("Checking process for count:", process);
        return (
          process.status === ProcessStatus.PENDING_APPROVAL &&
          process.item?.status?.toLowerCase() === "found" &&
          !process.item?.approved
        );
      }).length;

      console.log("Found items count:", count);
      setPendingFoundApprovalCount(count);
    };

    updateCount();
  }, [allItems]);

  const fetchLostItems = async () => {
    try {
      setIsLoadingLostItems(true);
      const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch lost items");
      const data = await response.json();

      // Filter only lost items
      const lostItems = data.$values.filter(
        (process) =>
          process.item?.status?.toLowerCase() === "lost" &&
          process.item?.approved == true,
      );

      setLostItems(lostItems);
    } catch (error) {
      console.error("Error fetching lost items:", error);
      toast.error("Failed to load lost items");
    } finally {
      setIsLoadingLostItems(false);
    }
  };

  useEffect(() => {
    fetchLostItems();
  }, []);

  const handleMatchWithLostClick = async (foundProcess) => {
    if (!foundProcess?.item) {
      toast.error("Invalid found item data");
      return;
    }

    setSelectedItemForMatching(foundProcess);
    setShowMatchDialog(true);
    setIsLoadingLostItems(true);

    try {
      // Fetch all lost items
      const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch lost items");
      const data = await response.json();

      // Filter for lost items only
      let lostItems =
        data.$values?.filter(
          (process) =>
            process.item?.status?.toLowerCase() === "lost" &&
            process.status === ProcessStatus.APPROVED,
        ) || [];

      // Get similarity rankings
      const rankedItems = await rankItemSimilarity(
        foundProcess.item,
        lostItems,
      );
      setLostItems(rankedItems);
      setSelectedItemForMatching(foundProcess);
      setShowMatchDialog(true);
    } catch (error) {
      console.error("Error fetching lost items:", error);
      toast.error("Failed to fetch lost items");
    } finally {
      setIsLoadingLostItems(false);
    }
  };

  const handleApprove = async (itemId) => {
    try {
      setApprovingItems((prev) => new Set(prev).add(itemId));
      await onApprove(itemId);
      // Update count after successful approval
      setAllItems((prevItems) => {
        const newItems = prevItems.map((item) =>
          item.item?.id === itemId
            ? { ...item, item: { ...item.item, approved: true } }
            : item,
        );
        // Update count after state update
        const newCount = newItems.filter(
          (process) =>
            process.status === "pending_approval" &&
            process.item?.status?.toLowerCase() === "found" &&
            !process.item?.approved,
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
      setDeletingItems((prev) => new Set(prev).add(itemId));
      await onDelete(itemId);
      // Update local state after successful deletion
      setAllItems((prevItems) => {
        const newItems = prevItems.filter((item) => item.item?.id !== itemId);
        // Update count after state update
        const newCount = newItems.filter(
          (process) =>
            process.status === "pending_approval" &&
            process.item?.status?.toLowerCase() === "found" &&
            !process.item?.approved,
        ).length;
        setPendingFoundApprovalCount(newCount);
        return newItems;
      });
    } finally {
      setDeletingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const processQRFile = async (file) => {
    const tempDiv = document.createElement("div");
    tempDiv.id = "qr-reader-temp";
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);

    try {
      // Wait for the element to be in the DOM
      await new Promise((resolve) => setTimeout(resolve, 100));

      const html5QrCode = new Html5Qrcode("qr-reader-temp");

      try {
        const scanResult = await html5QrCode.scanFileV2(file, {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        if (scanResult && scanResult.decodedText) {
          try {
            const parsedData = JSON.parse(scanResult.decodedText);
            if (parsedData && parsedData.id) {
              // Update to use process ID endpoint
              const response = await fetch(
                `${API_BASE_URL}/api/Item/pending/all`,
              );
              if (!response.ok) {
                throw new Error("Failed to fetch process data");
              }
              const processesData = await response.json();

              // Find the specific process using the ID from QR code
              const processData = processesData.$values.find(
                (p) => p.id === parsedData.id,
              );

              if (!processData) {
                throw new Error("Process not found");
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
                additionalDescriptions:
                  processData.item?.additionalDescriptions,
                processId: processData.id, // Store the process ID as well
              });

              setShowScannerModal(false);
              setShowScannedDataModal(true);
            }
          } catch (error) {
            console.error("Error parsing QR data:", error);
            alert("Invalid QR code format");
          }
        }
      } finally {
        await html5QrCode.clear();
      }
    } catch (error) {
      console.error("Error processing QR file:", error);
      alert("Could not read QR code from this image");
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
      if (typeof onUpdateCounts === "function") {
        onUpdateCounts();
      }
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  };

  useEffect(() => {
    let scanner = null;
    let initializationTimeout = null;

    const initializeScanner = async () => {
      if (showScannerModal) {
        try {
          initializationTimeout = setTimeout(() => {
            const element = document.getElementById("qr-reader");
            if (!element) {
              console.error("QR reader element not found");
              return;
            }

            scanner = new Html5QrcodeScanner("qr-reader", {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              showTorchButtonIfSupported: true,
              rememberLastUsedCamera: true,
              supportedScanTypes: [0],
              formatsToSupport: ["QR_CODE"],
              videoConstraints: {
                facingMode: { ideal: "environment" },
                width: { min: 320, ideal: 1280, max: 1920 },
                height: { min: 240, ideal: 720, max: 1080 },
              },
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: false,
              },
              verbose: false,
            });

            scanner.render(
              async (decodedText) => {
                try {
                  const parsedData = JSON.parse(decodedText);
                  if (parsedData && parsedData.id) {
                    // Update to use the correct endpoint for pending processes
                    const response = await fetch(
                      `${API_BASE_URL}/api/Item/pending/all`,
                    );
                    if (!response.ok) {
                      throw new Error("Failed to fetch process data");
                    }
                    const processesData = await response.json();

                    // Find the specific process using the ID from QR code
                    const processData = processesData.$values.find(
                      (p) => p.id === parsedData.id,
                    );

                    if (!processData) {
                      throw new Error("Process not found");
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
                      additionalDescriptions:
                        processData.item?.additionalDescriptions,
                      processId: processData.id, // Store the process ID as well
                    });

                    setShowScannerModal(false);
                    setShowScannedDataModal(true);
                  }
                } catch (error) {
                  console.error("Error processing QR data:", error);
                }
              },
              (error) => {
                if (
                  error?.message &&
                  !error.message.includes("NotFoundException")
                ) {
                  console.log("QR scan error:", error);
                }
              },
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
          const element = document.getElementById("qr-reader");
          if (element) {
            element.innerHTML = "";
          }
        } catch (error) {
          console.error("Error clearing scanner:", error);
        }
      }
    };
  }, [showScannerModal]);

  const handleItemClick = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsDialog(true);
  };

const formatDatefns = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const relativeTime = formatDistanceToNow(date, { addSuffix: true });
    return relativeTime.charAt(0).toUpperCase() + relativeTime.slice(1);

};

  const filterAndSortItems = (items) => {
    if (!items) return [];

    // First apply search filter
    let filteredItems = items.filter((process) => {
      if (!process?.item) return false;

      const searchLower = matchSearchQuery.toLowerCase();
      return (
        !matchSearchQuery ||
        process.item.name?.toLowerCase().includes(searchLower) ||
        process.item.category?.toLowerCase().includes(searchLower) ||
        process.item.location?.toLowerCase().includes(searchLower) ||
        process.item.description?.toLowerCase().includes(searchLower)
      );
    });

    // Apply category filter
    if (matchCategoryFilter !== "all") {
      filteredItems = filteredItems.filter(
        (process) =>
          process.item?.category?.toLowerCase() ===
          matchCategoryFilter.toLowerCase(),
      );
    }

    // Apply date filter
    filteredItems = filteredItems.filter((process) => {
      if (!process.item?.dateReported) return false;
      const itemDate = new Date(process.item.dateReported);
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      switch (matchDateFilter) {
        case "today":
          return itemDate.toDateString() === today.toDateString();
        case "week":
          return itemDate >= weekAgo;
        case "month":
          return itemDate >= monthAgo;
        default:
          return true;
      }
    });

    // Apply sorting
    switch (matchSortOption) {
      case "newest":
        return filteredItems.sort(
          (a, b) =>
            new Date(b.item?.dateReported) - new Date(a.item?.dateReported),
        );
      case "oldest":
        return filteredItems.sort(
          (a, b) =>
            new Date(a.item?.dateReported) - new Date(b.item?.dateReported),
        );
      case "bestMatch":
      default:
        return filteredItems.sort(
          (a, b) => b.similarityScore - a.similarityScore,
        );
    }
  };

  // Add this helper function for smooth color transition
  const getMatchPercentageStyle = (percentage) => {
    const hue = Math.min(percentage * 1.2, 120); // 0 = red (0°), 60 = yellow (60°), 120 = green (120°)
    return {
      backgroundColor: `hsla(${hue}, 75%, 95%, 1)`,
      color: `hsla(${hue}, 75%, 35%, 1)`,
      borderColor: `hsla(${hue}, 75%, 85%, 1)`,
    };
  };

  const handleMatchItem = async (lostItem) => {
    if (!lostItem || isMatchingItem) return;

    try {
      setIsMatchingItem(true);

      console.log("Matching items:", {
        foundProcessId: selectedItemForMatching.id,
        lostProcessId: lostItem.id,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/Item/process/match-found`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            foundProcessId: selectedItemForMatching.id,
            lostProcessId: lostItem.id,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to match items");
      }

      toast.success("Successfully matched items");
      setShowMatchDialog(false);
      setSelectedFoundItem(null);

      if (typeof onUpdateCounts === "function") {
        onUpdateCounts();
      }
    } catch (error) {
      console.error("Error matching items:", error);
      toast.error(error.message || "Failed to match items");
    } finally {
      setIsMatchingItem(false);
      setShowMatchDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Found Items Management
        </h3>
        <p className="text-gray-600 mt-2">
          Process found item reports and manage surrendered items. Verify item
          details, approve posts to make them visible, or handle inappropriate
          submissions.
        </p>

        {/* Status Cards with New Buttons */}
        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <Card className="bg-gradient-to-br from-white via-[#F8FAFF] to-[#F0F7FF] hover:shadow-md transition-all duration-300 border-l-4 border border-[#0052cc]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#0052cc]/10 to-[#0747a6]/10 rounded-full">
                  <Package className="h-6 w-6 text-[#0052cc]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A8A]">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-[#0052cc]">
                    {
                      items.filter(
                        (process) =>
                          process.status === ProcessStatus.PENDING_APPROVAL &&
                          process.item?.status?.toLowerCase() === "found" &&
                          !process.item?.approved,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Scanner Card */}
          <Card
            className="bg-gradient-to-br from-white via-[#F8FAFF] to-[#F0F7FF] hover:shadow-md transition-all duration-300 border-l-4 border border-[#0052cc]/30 cursor-pointer group"
            onClick={() => setShowScannerModal(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#0052cc]/10 to-[#0747a6]/10 rounded-full group-hover:from-[#0052cc]/15 group-hover:to-[#0747a6]/15 transition-colors">
                  <QrCode className="h-6 w-6 text-[#0052cc] group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A8A]">
                    Scan QR Code
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Scan QR codes from surrendered items to update their status
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Report Card */}
          <Card
            className="bg-gradient-to-br from-white via-[#F8FAFF] to-[#F0F7FF] hover:shadow-md transition-all duration-300 border-l-4 border border-[#0052cc]/30 cursor-pointer group"
            onClick={() => setShowReportDialog(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#0052cc]/10 to-[#0747a6]/10 rounded-full group-hover:from-[#0052cc]/15 group-hover:to-[#0747a6]/15 transition-colors">
                  <Plus className="h-6 w-6 text-[#0052cc] group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A8A]">
                    Report Found Item
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Manually add a found item report on behalf of students or
                    staff
                  </p>
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
                      <Card
                        key={i}
                        className="overflow-hidden border border-gray-100 shadow-sm"
                      >
                        {/* ... skeleton content ... */}
                      </Card>
                    ))}
                  </>
                ) : !items ||
                  items.filter(
                    (process) =>
                      process.status === ProcessStatus.PENDING_APPROVAL &&
                      process.item?.status?.toLowerCase() === "found" &&
                      !process.item?.approved,
                  ).length === 0 ? (
                  // Empty state
                  <Card className="border border-dashed bg-gray-50/50">
                    <CardContent className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Inbox className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-xl text-gray-900">
                          No Found Items
                        </h3>
                        <p className="text-gray-500 text-sm max-w-sm">
                          There are currently no found items waiting for
                          approval. New items will appear here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Items list
                  items
                    .filter(
                      (process) =>
                        process.status === ProcessStatus.PENDING_APPROVAL &&
                        !process.item?.approved &&
                        process.item?.status?.toLowerCase() === "found",
                    )
                    .map((process) => (
                      <Card
                        key={process.id || process.Id}
                        className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative"
                        onClick={() => handleItemClick(process.item)}
                      >
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Enhanced Image Section */}
                            <div className="w-32 h-32 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 group-hover:border-blue-200 transition-all duration-300 relative">
                              {process.item?.imageUrl || process.item?.ImageUrl ? (
                                <div className="w-full h-full relative group">
                                  <img
                                    src={process.item.imageUrl || process.item.ImageUrl}
                                    alt={process.item.name || process.item.Name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "flex";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                  <Package className="h-8 w-8 text-gray-400 group-hover:text-blue-400 transition-colors duration-300" />
                                  <p className="text-xs text-center px-2 mt-2 text-gray-400 group-hover:text-blue-400 transition-colors duration-300">
                                    No Image
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Enhanced Info Section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                                      {process.item?.name || process.item?.Name}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className="bg-yellow-50 text-yellow-700 border-yellow-200 group-hover:bg-yellow-100 transition-colors duration-300"
                                    >
                                      For Approval
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                                      <span>{formatDatefns(process.updatedAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                                      <span>{process.item?.location || process.item?.Location}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="capitalize bg-blue-50 text-blue-700 border-blue-200 group-hover:bg-blue-100 transition-colors duration-300"
                                >
                                  {process.item?.category || process.item?.Category}
                                </Badge>
                              </div>

                              {/* Description and Details */}
                              <div className="space-y-3">
                                <p className="text-sm text-gray-600 line-clamp-2 group-hover:text-gray-900 transition-colors duration-300">
                                  {process.item?.description || process.item?.Description}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-gray-700">Student ID:</span>
                                    <span className="text-gray-600">
                                      {process.item?.studentId?.startsWith("ADMIN")
                                        ? "Admin Report"
                                        : process.item?.studentId || process.item?.StudentId || "N/A"}
                                    </span>
                                  </div>
                                  {(process.item?.additionalDescriptions?.$values?.length > 0 ||
                                    process.item?.AdditionalDescriptions?.$values?.length > 0) && (
                                    <span className="text-blue-600 text-xs font-medium">
                                      +
                                      {(
                                        process.item?.additionalDescriptions?.$values ||
                                        process.item?.AdditionalDescriptions?.$values ||
                                        []
                                      ).length}{" "}
                                      additional details
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Enhanced Actions Section */}
                            <div
                              className="flex flex-col gap-2 justify-start min-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all duration-300 hover:border-slate-300"
                                onClick={() => handleItemClick(process.item)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2 text-slate-500" />
                                View Details
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm transition-all duration-300"
                                onClick={() => handleApprove(process.item?.id)}
                                disabled={approvingItems.has(process.item?.id)}
                              >
                                {approvingItems.has(process.item?.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Post
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 transition-all duration-300"
                                onClick={() => handleDeleteClick(process.item?.id)}
                                disabled={deletingItems.has(process.item?.id)}
                              >
                                {deletingItems.has(process.item?.id) ? (
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
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-sm transition-all duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMatchWithLostClick(process);
                                }}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Match Item
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
              const element = document.getElementById("qr-reader");
              if (element) {
                element.innerHTML = "";
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
                <div id="qr-reader" style={{ width: "100%" }}></div>
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
                <p className="text-sm text-muted-foreground mb-2">
                  Or upload a QR code image
                </p>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    isDragging
                      ? "border-[#0052cc] bg-[#0052cc]/5"
                      : "border-gray-200"
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
                    if (file && file.type.startsWith("image/")) {
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
        <Dialog
          open={showScannedDataModal}
          onOpenChange={setShowScannedDataModal}
        >
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

        {/* Item Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            {/* Header Section */}
            <div className="px-6 py-4 border-b bg-[#f8f9fa]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-semibold text-[#0052cc]">
                      Item Details
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4" />
                      {selectedItemForDetails?.dateReported
                        ? format(
                            new Date(selectedItemForDetails.dateReported),
                            "MMMM do, yyyy",
                          )
                        : "Date not available"}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 capitalize px-3 py-1.5"
                  >
                    {selectedItemForDetails?.status || "Found"}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            {selectedItemForDetails && (
              <>
                {/* Content Section */}
                <div className="p-6 space-y-6">
                  {/* Image and Details Grid */}
                  <div className="grid md:grid-cols-[240px,1fr] gap-6">
                    {/* Image Section */}
                    <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      {selectedItemForDetails.imageUrl ? (
                        <img
                          src={selectedItemForDetails.imageUrl}
                          alt={selectedItemForDetails.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <Package className="h-12 w-12 mb-2" />
                          <p className="text-sm">No Image</p>
                        </div>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-gray-500">
                            Item Name
                          </h4>
                          <p className="font-medium">
                            {selectedItemForDetails.name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-gray-500">
                            Status
                          </h4>
                          <p className="font-medium capitalize">
                            {selectedItemForDetails.status || "found"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-gray-500">
                            Category
                          </h4>
                          <p className="font-medium">
                            {selectedItemForDetails.category}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-gray-500">
                            Location
                          </h4>
                          <p className="font-medium flex items-center gap-1.5">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            {selectedItemForDetails.location}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">
                          Description
                        </h4>
                        <p className="text-gray-700">
                          {selectedItemForDetails.description}
                        </p>
                      </div>

                      {/* Additional Details if any */}
                      {selectedItemForDetails?.additionalDescriptions?.$values?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-500">
                            Additional Details
                          </h4>
                          <div className="space-y-2">
                            {selectedItemForDetails.additionalDescriptions.$values.map(
                              (desc, index) => (
                                <div
                                  key={index}
                                  className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200"
                                >
                                  <p>
                                    <span className="font-medium">{desc.title}:</span>{" "}
                                    {desc.description}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Section */}
                <div className="px-6 py-4 border-t bg-[#f8f9fa] flex justify-end gap-3">
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedItemForDetails.id)}
                    disabled={approvingItems.has(selectedItemForDetails.id)}
                    className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-sm transition-all duration-200"
                  >
                    {approvingItems.has(selectedItemForDetails.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Post
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedItemForMatching(selectedItemForDetails);
                      setShowMatchDialog(true);
                    }}
                    className="bg-gradient-to-r from-[#1E293B] to-[#334155] text-white shadow-sm transition-all duration-200"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Match with Lost Item
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeleteClick(selectedItemForDetails.id);
                      setShowDetailsDialog(false);
                    }}
                    disabled={deletingItems.has(selectedItemForDetails.id)}
                  >
                    {deletingItems.has(selectedItemForDetails.id) ? (
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
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Match Dialog */}
        <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <DialogTitle className="text-xl font-semibold text-blue-700">
                    Select Matching Lost Item
                  </DialogTitle>
                  <DialogDescription>
                    Please select the lost item that matches with the found item
                    report.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Found Item Details Box */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4 w-full">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Found Item Details:
              </h3>
              <div className="space-y-2">
                <div className="flex gap-x-12">
                  <div>
                    <span className="text-sm text-blue-700">Name:</span>{" "}
                    <span className="text-sm text-blue-600">
                      {selectedItemForMatching?.item?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-blue-700">Category:</span>{" "}
                    <span className="text-sm text-blue-600">
                      {selectedItemForMatching?.item?.category || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-blue-700">Location:</span>{" "}
                    <span className="text-sm text-blue-600">
                      {selectedItemForMatching?.item?.location || "N/A"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-blue-700">Description:</span>{" "}
                  <span className="text-sm text-blue-600">
                    {selectedItemForMatching?.item?.description ||
                      "No description available"}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-blue-700">Date Found:</span>{" "}
                  <span className="text-sm text-blue-600">
                    {selectedItemForMatching?.item?.dateReported
                      ? format(
                          new Date(selectedItemForMatching.item.dateReported),
                          "MMM d, yyyy",
                        )
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 mb-4 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, category, location"
                  className="pl-9 border-gray-200"
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                />
              </div>

              <Select
                value={matchCategoryFilter}
                onValueChange={setMatchCategoryFilter}
              >
                <SelectTrigger className="w-[160px] border-gray-200">
                  <Package className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(
                    new Set(lostItems.map((process) => process.item?.category)),
                  )
                    .filter(Boolean)
                    .sort()
                    .map((category) => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={matchDateFilter}
                onValueChange={setMatchDateFilter}
              >
                <SelectTrigger className="w-[160px] border-gray-200">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={matchSortOption}
                onValueChange={setMatchSortOption}
              >
                <SelectTrigger className="w-[160px] border-gray-200">
                  <ArrowUpDown className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Best Match" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bestMatch">Best Match</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 mb-4 w-full">
              Showing {filterAndSortItems(lostItems).length} items | Sorted by:{" "}
              {matchSortOption === "bestMatch"
                ? "Best Match"
                : matchSortOption === "newest"
                  ? "Newest First"
                  : "Oldest First"}
            </div>

            {/* Items List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 px-4">
                {filterAndSortItems(lostItems).map((process) => (
                  <div
                    key={process.id}
                    onClick={() => setSelectedFoundItem(process)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all relative mt-6 w-full",
                      selectedFoundItem?.id === process.id
                        ? "border-blue-500 bg-blue-50/50 shadow-lg"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                    )}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      transform:
                        selectedFoundItem?.id === process.id
                          ? "scale(1.01)"
                          : "scale(1)",
                    }}
                  >
                    {/* Match Percentage Badge - Top Left, overlapping */}
                    <div
                      className="absolute -top-2.5 left-0 px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
                      style={getMatchPercentageStyle(process.similarityScore)}
                    >
                      {process.similarityScore}% Match
                    </div>

                    {/* Status Badge - Top Right */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 px-2 py-0.5 text-xs font-medium"
                      >
                        Lost
                      </Badge>
                    </div>

                    <div className="flex gap-4 mt-4">
                      {/* Image Section */}
                      <div
                        className={cn(
                          "w-24 h-24 bg-gray-50 rounded-lg border flex-shrink-0 flex items-center justify-center",
                          selectedFoundItem?.id === process.id
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200",
                        )}
                      >
                        {process.item?.imageUrl ? (
                          <img
                            src={process.item.imageUrl}
                            alt={process.item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Package
                              className={cn(
                                "h-8 w-8",
                                selectedFoundItem?.id === process.id
                                  ? "text-blue-400"
                                  : "text-gray-400",
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs mt-1",
                                selectedFoundItem?.id === process.id
                                  ? "text-blue-400"
                                  : "text-gray-400",
                              )}
                            >
                              No Image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        {/* Title and Date */}
                        <div className="mb-2">
                          <h4
                            className={cn(
                              "font-semibold text-lg",
                              selectedFoundItem?.id === process.id &&
                                "text-blue-700",
                            )}
                          >
                            {process.item.name}
                          </h4>
                          <div
                            className={cn(
                              "flex items-center text-sm",
                              selectedFoundItem?.id === process.id
                                ? "text-blue-500"
                                : "text-gray-500",
                            )}
                          >
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            {format(
                              new Date(process.item.dateReported),
                              "MMM d, yyyy",
                            )}
                          </div>
                        </div>

                        {/* Add the check icon when selected */}
                        {selectedFoundItem?.id === process.id && (
                          <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1 shadow-lg animate-in fade-in zoom-in duration-200">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}

                        {/* Info Grid - Two rows with two columns each */}
                        <div className="grid grid-cols-[1fr,1.2fr] gap-y-2">
                          <div className="text-sm">
                            <span className="text-gray-600">Category:</span>{" "}
                            <span className="text-gray-900">
                              {process.item.category}
                            </span>
                          </div>
                          <div className="text-sm pl-12">
                            <span className="text-gray-600">Location:</span>{" "}
                            <span className="text-gray-900">
                              {process.item.location}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Student ID:</span>{" "}
                            <span className="text-gray-900">
                              {process.item.studentId}
                            </span>
                          </div>
                          <div className="text-sm pl-12">
                            <span className="text-gray-600">Status:</span>{" "}
                            <span className="text-gray-900 capitalize">
                              Lost
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Description:</span>
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">
                            {process.item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMatchDialog(false);
                  setSelectedFoundItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleMatchItem(selectedFoundItem)}
                disabled={!selectedFoundItem || isMatchingItem}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isMatchingItem ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Matching...
                  </>
                ) : (
                  "Confirm Match"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

export default FoundItemsTab;
