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
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import StatisticsSection from "./admin-tabs/StatisticsSection";
import LostReportsTab from "./admin-tabs/LostReportsTab";
import FoundItemsTab from "./admin-tabs/FoundItemsTab";
import VerificationsTab from "./admin-tabs/VerificationsTab";
import PendingProcessesTab from "./admin-tabs/PendingProcessesTab";
import PendingRetrievalTab from "./admin-tabs/PendingRetrievalTab";
import { itemApi } from "@/lib/api-client";
import { ProcessStatus, ProcessMessages } from '@/lib/constants';
import UserManagementTab from "./admin-tabs/UserManagementTab";
import { debounce } from "lodash";

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
      const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch all pending processes");
      const data = await response.json();
      
      if (data && data.$values) {
        const newData = data.$values;
        setPendingProcesses(prevProcesses => {
          // Deep comparison of arrays
          if (JSON.stringify(prevProcesses) !== JSON.stringify(newData)) {
            return newData;
          }
          return prevProcesses;
        });
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setPendingProcesses([]);
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
      setIsCountsLoading(true);
      fetchInitialData().finally(() => {
        setIsCountsLoading(false);
      });
    } else {
      setPendingProcesses([]);
      setIsCountsLoading(false);
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
        `http://localhost:5067/api/Item/${itemId}/approve`,
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
        `http://localhost:5067/api/Item/process/${processId}/status`,
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

  const handleTabChange = async (value, retryCount = 0) => {
    setActiveTab(value);
    
    if (value === "reports" || value === "found") {
      try {
        setIsCountsLoading(true);
        setIsLoadingVisible(true);
        setFetchError(null);
        
        const startTime = Date.now();
        const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
        
        if (!response.ok) throw new Error("Failed to fetch pending processes");
        
        const data = await response.json();
        if (data && data.$values) {
          setPendingProcesses(data.$values);
        }

        // Ensure minimum loading duration of 500ms
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
          await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        setFetchError(error.message);
        
        if (retryCount < 3) {
          setTimeout(() => {
            handleTabChange(value, retryCount + 1);
          }, 1000 * (retryCount + 1));
        }
      } finally {
        setIsCountsLoading(false);
        setIsLoadingVisible(false);
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
        "http://localhost:5067/api/auth/assign-admin",
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
    <div className="space-y-8 min-h-[800px]">
      {/* Admin Dashboard Overview Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-none">
        <CardContent className="p-8">
          <div className="flex justify-between items-center">
            <div className="text-left space-y-2">
              <h3 className="font-bold text-2xl text-primary">Admin Dashboard</h3>
              <p className="text-muted-foreground max-w-lg">
                Manage and monitor all lost and found items in the system
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowAdminDialog(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="border-t-4 border-t-primary relative">
        <CardContent className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            defaultValue="statistics"
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-6 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="reports">Lost Reports</TabsTrigger>
              <TabsTrigger value="found">Found Items</TabsTrigger>
              <TabsTrigger value="verifications">Verifications</TabsTrigger>
              <TabsTrigger value="pending">Processes</TabsTrigger>
              <TabsTrigger value="retrieval">Pending Retrieval</TabsTrigger>
            </TabsList>

            {isLoadingVisible && <LoadingOverlay />}

            <TabsContent value="statistics">
              <StatisticsSection />
            </TabsContent>

            <TabsContent value="reports">
              <LostReportsTab
                items={pendingProcesses}
                isCountsLoading={isCountsLoading}
                setPendingLostApprovalCount={setPendingLostApprovalCount}
                getInVerificationCount={getInVerificationCount}
                getPendingRetrievalCount={getPendingRetrievalCount}
                handleDelete={handleDelete}
                onApprove={onApprove}
                handleViewDetails={handleViewDetails}
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
                notifications={notifications}
                onVerificationResult={handleVerificationResult}
              />
            </TabsContent>

            <TabsContent value="pending">
              <PendingProcessesTab
                pendingProcesses={pendingProcesses}
                onViewDetails={handleViewDetails}
              />
            </TabsContent>

            <TabsContent value="retrieval">
              <PendingRetrievalTab
                items={allItems}
                onHandOver={onHandOver}
                onNoShow={handleNoShow}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Successful!</AlertDialogTitle>
            <AlertDialogDescription>
              The owner has correctly verified their ownership. They can now
              proceed to retrieve their item at the Student Center.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseSuccessDialog}>
              View in Retrievals
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fail Dialog */}
      <AlertDialog open={showFailDialog} onOpenChange={setShowFailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Failed</AlertDialogTitle>
            <AlertDialogDescription>
              The verification answers were incorrect. The item will remain
              posted and the user can try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseFailDialog}>
              Return to Lost Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Show Dialog */}
      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm No Show</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this as no show? This will reset the
              verification process and the item will remain posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNoShowDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNoShowConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm No Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Found Item Dialog Not Working Yet */}
      <AlertDialog
        open={showApproveFoundDialog}
        onOpenChange={setShowApproveFoundDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Found Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and post this found item? This
              will make it visible to all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowApproveFoundDialog(false);
                setSelectedFoundItem(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFoundItem) {
                  // Add the found item to the main items list
                  onApprove(selectedFoundItem.id, "found", selectedFoundItem);
                  // Remove from surrendered items
                  onDelete(selectedFoundItem.id);
                }
                setShowApproveFoundDialog(false);
                setSelectedFoundItem(null);
              }}
            >
              Approve and Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Management Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Management</DialogTitle>
          </DialogHeader>
          <UserManagementTab />
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <AlertDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{feedbackMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {feedbackMessage.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowFeedbackDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItemDetails && (
            <div className="space-y-4">
              {/* Image */}
              {selectedItemDetails.ImageUrl && (
                <div className="w-full h-64 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedItemDetails.ImageUrl}
                    alt={selectedItemDetails.Name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Basic Information</h4>
                  <div className="space-y-2 mt-2">
                    <p>
                      <strong>Name:</strong> {selectedItemDetails.Name}
                    </p>
                    <p>
                      <strong>Category:</strong> {selectedItemDetails.Category}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedItemDetails.Location}
                    </p>
                    <p>
                      <strong>Student ID:</strong>{" "}
                      {selectedItemDetails.StudentId || "N/A"}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p className="mt-2 text-sm">
                    {selectedItemDetails.Description}
                  </p>
                </div>
              </div>

              {/* Additional Descriptions */}
              {selectedItemDetails.AdditionalDescriptions?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Additional Details</h4>
                  <div className="space-y-2">
                    {selectedItemDetails.AdditionalDescriptions.map(
                      (desc, index) => (
                        <div key={index} className="bg-muted p-3 rounded">
                          <p className="font-medium">{desc.Title}</p>
                          <p className="text-sm">{desc.Description}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Success Dialog */}
      <AlertDialog 
        open={showApprovalSuccessDialog} 
        onOpenChange={setShowApprovalSuccessDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              Post Approved Successfully
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">{approvedItemName}</span> has been approved 
                  and is now visible on the dashboard.
                </div>
                <div className="text-sm text-muted-foreground">
                  Users can now see this post and initiate the verification process if needed.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowApprovalSuccessDialog(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Okay, Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{styles}</style>
    </div>
  );
}
