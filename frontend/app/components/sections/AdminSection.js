"use client";

import { useState, useEffect } from "react";
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

  const fetchInitialData = async () => {
    if (!isAdmin) return;
    
    try {
      setIsCountsLoading(true);
      const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch all pending processes");
      const data = await response.json();
      const processArray = data.$values || [];
      setPendingProcesses(processArray);
      setAllItems(processArray);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsCountsLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      setDeletingItems((prev) => new Set(prev).add(itemId));
      await onDelete(itemId);
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

      // First find the process
      const process = pendingProcesses.find(p => 
        p.ItemId === itemId || 
        p.itemId === itemId || 
        p.Item?.Id === itemId || 
        p.item?.id === itemId
      );

      if (!process) {
        console.error('No process found for itemId:', itemId);
        console.log('Available processes:', pendingProcesses);
        throw new Error("Process not found");
      }

      console.log('Found process:', process);

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
        console.error('Failed to approve item:', await itemResponse.text());
        throw new Error("Failed to approve item");
      }

      // Then update process status using process ID
      const processResponse = await fetch(
        `http://localhost:5067/api/Item/process/${process.Id}/status`,  // Use process.Id here
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: "approved",
            message: "The item has been approved!"
          }),
        }
      );

      if (!processResponse.ok) {
        console.error('Failed to update process:', await processResponse.text());
        throw new Error("Failed to update process status");
      }

      // Update local state
      setAllItems((prevItems) =>
        prevItems.map((item) =>
          item.Id === itemId ? { ...item, Approved: true } : item
        ),
      );

      setPendingProcesses((prevProcesses) =>
        prevProcesses.map((p) =>
          p.Id === process.Id
            ? {
                ...p,
                Status: "approved",
                Message: "The item has been approved!",
                Item: { ...p.Item, Approved: true },
              }
            : p
        ),
      );

      // Refresh data
      await fetchInitialData();

    } catch (error) {
      console.error("Error approving item:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchInitialData();
      const interval = setInterval(fetchInitialData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

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
          <div className="text-center space-y-2">
            <h3 className="font-bold text-2xl text-primary">Admin Dashboard</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Manage and monitor all lost and found items in the system
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="border-t-4 border-t-primary">
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

            <TabsContent value="statistics">
              <StatisticsSection />
            </TabsContent>

            <TabsContent value="reports">
              <LostReportsTab
                items={allItems}
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
                items={pendingProcesses?.$values || pendingProcesses || []}
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
                onNoShow={(itemId) => {
                  setNoShowItemId(itemId);
                  setShowNoShowDialog(true);
                }}
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
            <AlertDialogAction
              onClick={() => {
                setShowSuccessDialog(false);
                setActiveTab("retrieval");
              }}
            >
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
            <AlertDialogAction
              onClick={() => {
                setShowFailDialog(false);
                setActiveTab("lost");
              }}
            >
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
              onClick={() => {
                onUpdateItemStatus(noShowItemId, "reset_verification");
                setActiveTab("lost");
                setShowNoShowDialog(false);
                setNoShowItemId(null);
              }}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New Admin</DialogTitle>
            <DialogDescription>
              Enter the UMAK email address of the user you want to assign as
              admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Enter UMAK email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleAssignAdmin}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
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
    </div>
  );
}
