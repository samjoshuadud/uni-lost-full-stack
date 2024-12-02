"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash,
  UserPlus,
  CheckCircle,
  XCircle,
  ClipboardList,
  Package,
  Bell,
  Users,
  ExternalLink,
  Loader2,
  BarChart,
  PieChart,
  Activity,
  TrendingUp,
  AlertTriangle,
  History,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import StatisticsSection from "./admin-tabs/StatisticsSection";
import LostReportsTab from "./admin-tabs/LostReportsTab";
import FoundItemsTab from "./admin-tabs/FoundItemsTab";
import VerificationsTab from "./admin-tabs/VerificationsTab";
import PendingRetrievalTab from "./admin-tabs/PendingRetrievalTab";
import { itemApi } from "@/lib/api-client";
import { ProcessStatus, ProcessMessages } from '@/lib/constants';
import UserManagementTab from "./admin-tabs/UserManagementTab";
import { debounce } from "lodash";
import { API_BASE_URL } from '@/lib/api-config';
import HistoryTab from "./admin-tabs/HistoryTab";
import { QRScannerDialog } from "../dialogs/QRScannerDialog";
import { toast } from "react-hot-toast";

export default function AdminSection({
  items = [],
  surrenderedItems = [],
  notifications = [],
  onHandOver,
  onResolveNotification,
  onDelete,
  onUpdateItemStatus,
  handleViewDetails,
}) {
  const { user, isAdmin, makeAuthenticatedRequest } = useAuth();
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [activeTab, setActiveTab] = useState("reports");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailDialog, setShowFailDialog] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [noShowItemId, setNoShowItemId] = useState(null);
  const [showApproveFoundDialog, setShowApproveFoundDialog] = useState(false);
  const [selectedFoundItem, setSelectedFoundItem] = useState(null);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({
    title: "",
    message: "",
  });
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [isCountsLoading, setIsCountsLoading] = useState(true);
  const [allItems, setAllItems] = useState([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [pendingAttentionCount, setPendingAttentionCount] = useState(0);
  const [isAttentionCountLoading, setIsAttentionCountLoading] = useState(true);
  const [foundItems, setFoundItems] = useState([]);
  const [isFoundItemsLoading, setIsFoundItemsLoading] = useState(true);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [pendingLostApprovalCount, setPendingLostApprovalCount] = useState(0);
  const [pendingFoundApprovalCount, setPendingFoundApprovalCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [isLoadingVisible, setIsLoadingVisible] = useState(false);
  const [showApprovalSuccessDialog, setShowApprovalSuccessDialog] = useState(false);
  const [approvedItemName, setApprovedItemName] = useState("");
  const [inVerificationCount, setInVerificationCount] = useState(0);
  const [awaitingReviewCount, setAwaitingReviewCount] = useState(0);
  const [failedVerificationCount, setFailedVerificationCount] = useState(0);
  const [allProcessesCount, setAllProcessesCount] = useState(0);
  const [readyForPickupCount, setReadyForPickupCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Memoize the filtered data
  const memoizedPendingProcesses = useMemo(() => {
    if (!pendingProcesses) return [];
    return pendingProcesses.$values || pendingProcesses;
  }, [pendingProcesses]);

  // Memoize the fetch function
  const fetchInitialData = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setIsCountsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch all pending processes");
      const data = await response.json();
      
      if (data && data.$values) {
        const newData = data.$values;
        setPendingProcesses(newData);
        setAllItems(newData);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setPendingProcesses([]);
      setAllItems([]);
    } finally {
      setIsCountsLoading(false);
    }
  }, [isAdmin]);

  // Memoize the counts
  const getInVerificationCount = useCallback(() => {
    if (!memoizedPendingProcesses) return 0;
    return memoizedPendingProcesses.filter(process => 
      process.status === ProcessStatus.IN_VERIFICATION
    ).length;
  }, [memoizedPendingProcesses]);

  const getPendingRetrievalCount = useCallback(() => {
    if (!memoizedPendingProcesses) return 0;
    return memoizedPendingProcesses.filter(process => 
      process.status === ProcessStatus.VERIFIED && 
      !process.item?.approved
    ).length;
  }, [memoizedPendingProcesses]);

  // Remove interval and only fetch once when component mounts
  useEffect(() => {
    if (isAdmin) {
      let isMounted = true;
      let timeoutId;

      const fetchData = async () => {
        if (!isMounted) return;
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
          if (!response.ok) throw new Error("Failed to fetch all pending processes");
          const data = await response.json();
          
          if (data && data.$values && isMounted) {
            const newData = data.$values;
            
            // Update states only if they've changed
            setPendingProcesses(prevProcesses => {
              if (JSON.stringify(prevProcesses) !== JSON.stringify(newData)) {
                return newData;
              }
              return prevProcesses;
            });

            setAllItems(prevItems => {
              if (JSON.stringify(prevItems) !== JSON.stringify(newData)) {
                return newData;
              }
              return prevItems;
            });
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
        
        // Schedule next update only if component is still mounted
        if (isMounted) {
          timeoutId = setTimeout(fetchData, 5000);
        }
      };

      fetchData();

      return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isAdmin]);

  // Add data logging
  useEffect(() => {
    console.log('Loading state:', isCountsLoading);
    console.log('Pending processes:', pendingProcesses);
  }, [isCountsLoading, pendingProcesses]);

  const handleDelete = async (itemId) => {
    try {
      setDeletingItems((prev) => new Set(prev).add(itemId));
      await onDelete(itemId);
      // Fetch fresh data after deletion
      await fetchInitialData();
    } finally {
      setDeletingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const onApprove = async (itemId) => {
    try {
      console.log('Starting approval process for itemId:', itemId);
      console.log('Current pendingProcesses:', pendingProcesses);

      // First find the process - Fix the process finding logic
      const process = pendingProcesses.find(p => {
        // Log each process for debugging
        console.log('Checking process:', p);
        
        // Check all possible ID variations and normalize case
        const processItemId = (p.ItemId || p.itemId || p.Item?.Id || p.item?.id || '').toLowerCase();
        const targetItemId = (itemId || '').toLowerCase();
        
        return processItemId === targetItemId;
      });

      if (!process) {
        console.error('No process found for itemId:', itemId);
        console.log('Available processes:', pendingProcesses);
        throw new Error("Process not found");
      }

      // Get the correct process ID
      const processId = process.Id || process.id;
      
      if (!processId) {
        throw new Error("Process ID is undefined");
      }

      console.log('Found process:', process);
      console.log('Process ID:', processId);

      // First update item's approval status
      const itemResponse = await fetch(
        `${API_BASE_URL}/api/Item/${itemId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true }),
        }
      );

      if (!itemResponse.ok) {
        const errorText = await itemResponse.text();
        console.error('Failed to approve item:', errorText);
        throw new Error("Failed to approve item");
      }

      // Then update process status using process ID
      const processResponse = await fetch(
        `${API_BASE_URL}/api/Item/process/${processId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: ProcessStatus.APPROVED,
            message: ProcessMessages.ITEM_APPROVED
          }),
        }
      );

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        console.error('Failed to update process:', errorText);
        throw new Error("Failed to update process status");
      }

      // Update local state
      setAllItems((prevItems) =>
        prevItems.map((item) =>
          item.Id === itemId || item.id === itemId 
            ? { ...item, Approved: true, approved: true } 
            : item
        ),
      );

      setPendingProcesses((prevProcesses) =>
        prevProcesses.map((p) =>
          p.Id === processId || p.id === processId
            ? {
                ...p,
                Status: "approved",
                status: "approved",
                Message: "The item has been approved!",
                message: "The item has been approved!",
                Item: { ...p.Item, Approved: true, approved: true },
                item: { ...p.item, Approved: true, approved: true },
              }
            : p
        ),
      );

      // After successful approval and state updates
      const approvedItem = pendingProcesses.find(p => 
        (p.ItemId || p.itemId || p.Item?.Id || p.item?.id) === itemId
      );
      
      setApprovedItemName(approvedItem?.item?.name || approvedItem?.Item?.Name || "Item");
      setShowApprovalSuccessDialog(true);

      // Fetch fresh data after approval
      await fetchInitialData();

    } catch (error) {
      console.error("Error approving item:", error);
      throw error;
    }
  };

  const handleTabChange = async (value) => {
    setActiveTab(value);
    
    // Only fetch data for tabs that need it
    if (["reports", "found", "pending", "verifications", "retrieval"].includes(value)) {
      try {
        setIsLoadingVisible(true);
        setIsCountsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch pending processes");
        
        const data = await response.json();
        if (data && data.$values) {
          setPendingProcesses(data.$values);
          setAllItems(data.$values);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setFetchError(error.message);
      } finally {
        setIsLoadingVisible(false);
        setIsCountsLoading(false);
      }
    }
  };

  // Add this useEffect to monitor data changes
  useEffect(() => {
    console.log('Current pendingProcesses:', pendingProcesses);
    console.log('Current allItems:', allItems);
  }, [pendingProcesses, allItems]);

  const handleVerificationResult = (notificationId, isCorrect, itemId) => {
    setSelectedItem(itemId);
    if (isCorrect) {
      setShowSuccessDialog(true);
      onUpdateItemStatus(itemId, ProcessStatus.VERIFIED);
      onResolveNotification(notificationId);
    } else {
      setShowFailDialog(true);
      onUpdateItemStatus(itemId, ProcessStatus.PENDING_APPROVAL);
      onResolveNotification(notificationId);
    }
  };

  const handleNoShow = (itemId) => {
    setNoShowItemId(itemId);
    setShowNoShowDialog(true);
  };

  const handleAssignAdmin = async () => {
    if (!newAdminEmail) {
      setFeedbackMessage({
        title: "Error",
        message: "Please enter an email address"
      });
      setShowFeedbackDialog(true);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/auth/assign-admin`,
        {
          method: "POST",
          body: JSON.stringify({ email: newAdminEmail.trim() })
        }
      );

      if (response) {
        setFeedbackMessage({
          title: "Success",
          message: `${newAdminEmail} has been assigned as admin`
        });
      } else {
        setFeedbackMessage({
          title: "Error",
          message: "Failed to assign admin. Please try again."
        });
      }
    } catch (error) {
      console.error("Error assigning admin:", error);
      setFeedbackMessage({
        title: "Error",
        message: "Failed to assign admin. Please try again."
      });
    }

    setShowAdminDialog(false);
    setNewAdminEmail("");
    setShowFeedbackDialog(true);
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setActiveTab("retrieval");
  };

  const handleCloseFailDialog = () => {
    setShowFailDialog(false);
    setActiveTab("lost");
  };

  const handleNoShowConfirm = () => {
    if (noShowItemId) {
      onUpdateItemStatus(noShowItemId, "reset_verification");
      setActiveTab("lost");
      setShowNoShowDialog(false);
      setNoShowItemId(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial data fetch
    if (isAdmin) {
      handleTabChange(activeTab);
    }

    return () => {
      mounted = false;
    };
  }, [isAdmin]); // Only run on mount and when isAdmin changes

  const LoadingOverlay = () => (
    <div 
      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg transition-opacity duration-200"
      style={{ 
        opacity: 1,
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <div className="flex flex-col items-center gap-2 bg-background p-4 rounded-lg shadow-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading data...</p>
      </div>
    </div>
  );

  const styles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;

  // Update the calculateCounts function
  const calculateCounts = useCallback(() => {
    if (!items) return;
    
    const pendingLostCount = items.filter(process => 
      process.status === ProcessStatus.PENDING_APPROVAL && 
      process.item?.status?.toLowerCase() === "lost" && 
      !process.item?.approved
    ).length;

    const pendingFoundCount = items.filter(process => 
      process.status === ProcessStatus.PENDING_APPROVAL && 
      process.item?.status?.toLowerCase() === "found" && 
      !process.item?.approved
    ).length;

    const verificationCount = items.filter(process => 
      process.status === ProcessStatus.IN_VERIFICATION
    ).length;

    const awaitingCount = items.filter(process => 
      process.status === ProcessStatus.AWAITING_REVIEW
    ).length;

    const failedCount = items.filter(process => 
      process.status === ProcessStatus.VERIFICATION_FAILED
    ).length;

    const pickupCount = items.filter(process => 
      process.status === ProcessStatus.PENDING_RETRIEVAL
    ).length;

    // Add history count calculation
    const historyItemsCount = items.filter(process => 
      process.status === ProcessStatus.HANDED_OVER || 
      process.status === ProcessStatus.NO_SHOW
    ).length;

    const totalProcesses = items.length;

    setPendingLostApprovalCount(pendingLostCount);
    setPendingFoundApprovalCount(pendingFoundCount);
    setInVerificationCount(verificationCount);
    setAwaitingReviewCount(awaitingCount);
    setFailedVerificationCount(failedCount);
    setReadyForPickupCount(pickupCount);
    setAllProcessesCount(totalProcesses);
    setHistoryCount(historyItemsCount);
  }, [items]);

  // Add useEffect to update counts
  useEffect(() => {
    calculateCounts();
  }, [items, calculateCounts]);

  // Add debug logging
  useEffect(() => {
    console.log("Current ready for pickup count:", readyForPickupCount);
    console.log("Items with pending_retrieval status:", items?.filter(process => 
      process.status === "pending_retrieval"
    ));
  }, [readyForPickupCount, items]);

  const handleScanComplete = (data) => {
    toast.success("QR code scanned successfully");
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access this section.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Admin Dashboard Title */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0052cc]">Admin Dashboard</h2>
              <p className="text-gray-600 mt-1">Manage and monitor all the lost and found items in the system</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQRScanner(true)}
                className="flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAdminDialog(true)}
                className="flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                Manage Users
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border-0 shadow-sm bg-white relative drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full grid grid-cols-6 gap-2 bg-[#2E3F65] p-1 rounded-[10px] mb-6 h-12">
                {/* Overview Tab */}
                <TabsTrigger 
                  value="statistics"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <BarChart className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>

                {/* Lost Items Tab */}
                <TabsTrigger 
                  value="reports"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Lost Items</span>
                  {pendingLostApprovalCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-red-400 text-white">
                      {pendingLostApprovalCount}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* Found Items Tab */}
                <TabsTrigger 
                  value="found"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <Package className="h-4 w-4" />
                  <span>Found Items</span>
                  {pendingFoundApprovalCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-red-400 text-white">
                      {pendingFoundApprovalCount}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* Verifications Tab */}
                <TabsTrigger 
                  value="verifications"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <Activity className="h-4 w-4" />
                  <span>Verifications</span>
                  {(inVerificationCount + awaitingReviewCount + failedVerificationCount) > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-blue-400 text-white">
                      {inVerificationCount + awaitingReviewCount + failedVerificationCount}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* Retrieval Tab */}
                <TabsTrigger 
                  value="retrieval"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <PieChart className="h-4 w-4" />
                  <span>Ready for Pickup</span>
                  {readyForPickupCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-green-400 text-white">
                      {readyForPickupCount}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* History Tab */}
                <TabsTrigger 
                  value="history"
                  className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-[#2E3F65] hover:bg-white hover:text-[#0F3A99] flex items-center gap-2 text-white rounded-[5px] justify-center text-center transition-colors duration-200"
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                  {historyCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-gray-400 text-white">
                      {historyCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Loading Overlay */}
              {isLoadingVisible && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0052cc]" />
                    <p className="text-sm text-gray-600">Loading data...</p>
                  </div>
                </div>
              )}

              {/* Tab Contents */}
              <TabsContent value="statistics">
                <StatisticsSection />
              </TabsContent>

              <TabsContent value="reports">
                <LostReportsTab
                  items={pendingProcesses}
                  isCountsLoading={isCountsLoading}
                  getPendingRetrievalCount={getPendingRetrievalCount}
                  handleDelete={handleDelete}
                  onApprove={onApprove}
                  handleViewDetails={handleViewDetails}
                  onUpdateCounts={calculateCounts}
                />
              </TabsContent>

              <TabsContent value="found">
                <FoundItemsTab
                  items={pendingProcesses}
                  isCountsLoading={isCountsLoading}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  onApprove={onApprove}
                />
              </TabsContent>

              <TabsContent value="verifications">
                <VerificationsTab
                  items={pendingProcesses}
                  isCountsLoading={isCountsLoading}
                  onDelete={handleDelete}
                  handleViewDetails={handleViewDetails}
                />
              </TabsContent>

              <TabsContent value="retrieval">
                <PendingRetrievalTab
                  items={allItems}
                  onHandOver={onHandOver}
                  onNoShow={handleNoShow}
                  isCountsLoading={isCountsLoading}
                />
              </TabsContent>

              <TabsContent value="history">
                <HistoryTab 
                  handleViewDetails={handleViewDetails}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Admin Management Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-[80vw] h-[85vh] p-0 overflow-hidden bg-white">
          <DialogHeader className="px-6 py-4 border-b bg-[#f8f9fa] flex-shrink-0">
            <DialogTitle className="text-2xl font-semibold text-[#0052cc]">
              User Management
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Manage user roles and permissions for the Lost and Found system
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="p-4">
                  <UserManagementTab currentUserEmail={user?.email} />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-[#f8f9fa] flex-shrink-0">
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAdminDialog(false)}
                className="border-gray-200 hover:bg-gray-50"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QRScannerDialog
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}
