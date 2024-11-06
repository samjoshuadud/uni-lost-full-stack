"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Trash, UserPlus, CheckCircle, XCircle, ClipboardList, Package, Bell, Users, ExternalLink, Loader2, BarChart, PieChart, Activity, TrendingUp } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import StatisticsSection from "./admin-tabs/StatisticsSection"
import LostReportsTab from "./admin-tabs/LostReportsTab"
import FoundItemsTab from "./admin-tabs/FoundItemsTab"
import VerificationsTab from "./admin-tabs/VerificationsTab"
import PendingProcessesTab from "./admin-tabs/PendingProcessesTab"
import PendingRetrievalTab from "./admin-tabs/PendingRetrievalTab"

export default function AdminSection({ 
  items = [], 
  surrenderedItems = [], 
  notifications = [], 
  onApprove, 
  onHandOver, 
  onResolveNotification, 
  onDelete,
  onUpdateItemStatus,
  isLoading
}) {
  const { user, isAdmin, makeAuthenticatedRequest } = useAuth();
  const [verificationQuestions, setVerificationQuestions] = useState("")
  const [selectedItem, setSelectedItem] = useState(null)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [activeTab, setActiveTab] = useState("statistics")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showFailDialog, setShowFailDialog] = useState(false)
  const [showNoShowDialog, setShowNoShowDialog] = useState(false)
  const [noShowItemId, setNoShowItemId] = useState(null)
  const [showApproveFoundDialog, setShowApproveFoundDialog] = useState(false)
  const [selectedFoundItem, setSelectedFoundItem] = useState(null)
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState({ title: "", message: "" })
  const [pendingProcesses, setPendingProcesses] = useState([])
  const [isCountsLoading, setIsCountsLoading] = useState(true)
  const [allItems, setAllItems] = useState([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [pendingAttentionCount, setPendingAttentionCount] = useState(0);
  const [isAttentionCountLoading, setIsAttentionCountLoading] = useState(true);
  const [foundItems, setFoundItems] = useState([]);
  const [isFoundItemsLoading, setIsFoundItemsLoading] = useState(true);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  useEffect(() => {
    const fetchPendingProcesses = async () => {
      try {
        const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch all pending processes");
        const data = await response.json();
        
        setPendingProcesses(data);
        
        const items = data
          .filter(process => process.Item)
          .map(process => ({
            ...process.Item,
            processId: process.Id,
            processStatus: process.Status
          }));
        
        setAllItems(items);
        setIsCountsLoading(false);
        setIsItemsLoading(false);
      } catch (error) {
        setIsCountsLoading(false);
        setIsItemsLoading(false);
      }
    };

    fetchPendingProcesses();
  }, []);

  // Add console logs to debug the data
  useEffect(() => {
    console.log("Pending Processes:", pendingProcesses);
    console.log("Items:", items);
  }, [pendingProcesses, items]);

  // Only allow access if user is admin
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this section.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    )
  }

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
        'http://localhost:5067/api/auth/assign-admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
      console.error('Error assigning admin:', error);
      setFeedbackMessage({
        title: "Error",
        message: "Failed to assign admin. Please try again."
      });
    }

    setShowAdminDialog(false);
    setNewAdminEmail("");
    setShowFeedbackDialog(true);
  };

  const getPendingApprovalCount = () => {
    const count = pendingProcesses.filter(process => 
      process.Status === "pending_approval" && 
      process.Item?.Status === "lost"
    ).length;
    
    console.log("Pending approval processes count:", count);
    return count;
  };

  const getPendingFoundApprovalCount = () => {
    return items.filter(item => 
      !item.approved && item.status === "found" && 
      !notifications.some(n => n.type === 'verification' && n.item?.id === item.id)
    ).length;
  };

  const getInVerificationCount = () => {
    return notifications.filter(n => n.type === 'verification' && n.item).length;
  };

  const getPendingRetrievalCount = () => {
    return items.filter(item => item.status === "pending_retrieval").length;
  };

  const handleVerificationResult = (notificationId, isCorrect, itemId) => {
    setSelectedItem(itemId);
    if (isCorrect) {
      setShowSuccessDialog(true);
      onApprove(notificationId, true);
      onUpdateItemStatus(itemId, "pending_retrieval");
      onResolveNotification(notificationId);
    } else {
      setShowFailDialog(true);
      onApprove(notificationId, false);
      onUpdateItemStatus(itemId, "posted");
      onResolveNotification(notificationId);
    }
  };

  const handleRetrievalStatus = (itemId, status) => {
    if (status === "retrieved") {
      onUpdateItemStatus(itemId, "handed_over");
      setShowSuccessDialog(true);
    } else if (status === "no_show") {
      setNoShowItemId(itemId);
      setShowNoShowDialog(true);
    }
  };

  useEffect(() => {
    // Force the tab to "reports" when component mounts
    setActiveTab("reports");
  }, []); // Empty dependency array means this runs once on mount

  const renderCount = (count) => {
    if (isCountsLoading) {
      return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
    }
    return <h3 className="text-2xl font-bold">{count}</h3>;
  };

  useEffect(() => {
    const fetchPendingAttentionCount = async () => {
      try {
        const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch pending processes");
        const data = await response.json();
        const count = data.filter(process => 
          process.Status === "pending_approval" && 
          process.Item?.Status === "lost"
        ).length;
        setPendingAttentionCount(count);
      } catch (error) {
        console.error("Error fetching attention count:", error);
      } finally {
        setIsAttentionCountLoading(false);
      }
    };

    fetchPendingAttentionCount();
  }, []);

  useEffect(() => {
    const fetchFoundItems = async () => {
      if (activeTab !== "found") return;
      
      try {
        setIsFoundItemsLoading(true);
        const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch found items");
        const data = await response.json();
        const foundItems = data.filter(process => process.Item?.Status === "found");
        setFoundItems(foundItems);
      } catch (error) {
        console.error("Error fetching found items:", error);
      } finally {
        setIsFoundItemsLoading(false);
      }
    };

    fetchFoundItems();
  }, [activeTab]);

  const handleViewDetails = (item) => {
    setSelectedItemDetails(item);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-8">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="statistics" className="w-full">
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
                getPendingApprovalCount={getPendingApprovalCount}
                getInVerificationCount={getInVerificationCount}
                getPendingRetrievalCount={getPendingRetrievalCount}
                onViewDetails={handleViewDetails}
                onApprove={onApprove}
                onDelete={onDelete}
                onItemInPossession={onUpdateItemStatus}
              />
            </TabsContent>

            <TabsContent value="found">
              <FoundItemsTab 
                items={allItems}
                isLoading={isItemsLoading}
                onApproveAndPost={onApprove}
                onDelete={onDelete}
                onViewDetails={handleViewDetails}
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
              The owner has correctly verified their ownership. They can now proceed to retrieve their item at the Student Center.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowSuccessDialog(false);
              setActiveTab("retrieval");
            }}>
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
              The verification answers were incorrect. The item will remain posted and the user can try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowFailDialog(false);
              setActiveTab("lost");
            }}>
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
              Are you sure you want to mark this as no show? This will reset the verification process and the item will remain posted.
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

      {/* Approve Found Item Dialog */}
      <AlertDialog open={showApproveFoundDialog} onOpenChange={setShowApproveFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Found Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and post this found item? This will make it visible to all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowApproveFoundDialog(false);
              setSelectedFoundItem(null);
            }}>
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
              Enter the UMAK email address of the user you want to assign as admin.
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
      <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
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
                    <p><strong>Name:</strong> {selectedItemDetails.Name}</p>
                    <p><strong>Category:</strong> {selectedItemDetails.Category}</p>
                    <p><strong>Location:</strong> {selectedItemDetails.Location}</p>
                    <p><strong>Student ID:</strong> {selectedItemDetails.StudentId || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p className="mt-2 text-sm">{selectedItemDetails.Description}</p>
                </div>
              </div>

              {/* Additional Descriptions */}
              {selectedItemDetails.AdditionalDescriptions?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Additional Details</h4>
                  <div className="space-y-2">
                    {selectedItemDetails.AdditionalDescriptions.map((desc, index) => (
                      <div key={index} className="bg-muted p-3 rounded">
                        <p className="font-medium">{desc.Title}</p>
                        <p className="text-sm">{desc.Description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 