"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Search, User, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LoginButton from "./components/login-button"
import { useAuth } from "@/lib/AuthContext"
import AuthRequiredDialog from "./components/dialogs/AuthRequiredDialog"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// Import sections
import DashboardSection from "./components/sections/DashboardSection"
import ItemSection from "./components/sections/ItemSection"
import ReportSection from "./components/sections/ReportSection"
import AdminSection from "./components/sections/AdminSection"
import ProfileSection from "./components/sections/ProfileSection"
import PendingProcessSection from "./components/sections/PendingProcessSection"
import ItemDetailSection from "./components/sections/ItemDetailSection"

// Import dialogs
import ReportConfirmDialog from "./components/dialogs/ReportConfirmDialog"
import VerificationDialog from "./components/dialogs/VerificationDialog"
import VerificationSuccessDialog from "./components/dialogs/VerificationSuccessDialog"
import VerificationFailDialog from "./components/dialogs/VerificationFailDialog"

import { ItemStatus } from "@/lib/constants";
import { authApi, itemApi } from '@/lib/api-client';

export default function UniLostAndFound() {
  const { user, isAdmin, loading: authLoading, makeAuthenticatedRequest } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchCategory, setSearchCategory] = useState("all")
  const [items, setItems] = useState([])
  const [adminNotifications, setAdminNotifications] = useState([])
  const [surrenderedItems, setSurrenderedItems] = useState([])
  const [userNotifications, setUserNotifications] = useState([])
  const [pendingProcesses, setPendingProcesses] = useState([])
  const [showReportConfirmDialog, setShowReportConfirmDialog] = useState(false)
  const [pendingReport, setPendingReport] = useState(null)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationAnswers, setVerificationAnswers] = useState([])
  const [currentNotification, setCurrentNotification] = useState(null)
  const [showVerificationSuccessDialog, setShowVerificationSuccessDialog] = useState(false)
  const [showVerificationFailDialog, setShowVerificationFailDialog] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [pendingProcessCount, setPendingProcessCount] = useState(0);
  const [isProcessCountLoading, setIsProcessCountLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        if (user && !authLoading) {
          console.log('Attempting to fetch items for user:', user.email);
          const response = await makeAuthenticatedRequest('/api/Item/pending/all');
          if (response) {
            // Ensure response is an array
            const itemsArray = Array.isArray(response) ? response : [response];
            setItems(itemsArray.filter(item => item?.Item)); // Filter out any null or undefined items
          } else {
            setItems([]);
          }
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        setItems([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [user, authLoading, makeAuthenticatedRequest]);

  const filteredItems = items.filter(item => {
    // Check if item exists and has Item property
    if (!item || !item.Item) return false;
    
    // Get the actual item data
    const itemData = item.Item;
    
    const approved = itemData.Approved;
    const matchesCategory = searchCategory === "all" || itemData.Category === searchCategory;
    const searchTerms = searchQuery.toLowerCase();
    const matchesSearch = 
      itemData.Name?.toLowerCase().includes(searchTerms) ||
      itemData.Location?.toLowerCase().includes(searchTerms) ||
      itemData.Description?.toLowerCase().includes(searchTerms);

    return approved && matchesCategory && matchesSearch;
  });

  const handleReportSubmit = async (data) => {
    try {
      console.log('Report submitted:', data);
      // Refresh items list
      const response = await makeAuthenticatedRequest('/api/Item/pending/all');
      if (response) {
        const itemsArray = Array.isArray(response) ? response : [response];
        setItems(itemsArray.filter(item => item?.Item));
      }
      // Switch to pending process view
      setActiveSection('pending_process');
    } catch (error) {
      console.error('Error handling report submission:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection items={filteredItems} onSeeMore={setSelectedItem} />
      case "lost":
        const lostItems = items.filter(item => 
          item?.Item?.Status?.toLowerCase() === "lost"
        ).map(item => ({
          id: item.Item.Id,
          name: item.Item.Name,
          description: item.Item.Description,
          location: item.Item.Location,
          status: item.Item.Status,
          imageUrl: item.Item.ImageUrl,
          dateReported: item.Item.DateReported,
          additionalDescriptions: item.Item.AdditionalDescriptions,
          approved: item.Item.Approved
        }));
        return <ItemSection 
          items={lostItems}
          onSeeMore={setSelectedItem} 
          title="Lost Items" 
          isAdmin={isAdmin} 
        />
      case "found":
        const foundItems = items.filter(item => 
          item?.Item?.Status?.toLowerCase() === "found"
        ).map(item => ({
          id: item.Item.Id,
          name: item.Item.Name,
          description: item.Item.Description,
          location: item.Item.Location,
          status: item.Item.Status,
          imageUrl: item.Item.ImageUrl,
          dateReported: item.Item.DateReported,
          additionalDescriptions: item.Item.AdditionalDescriptions,
          approved: item.Item.Approved
        }));
        return <ItemSection 
          items={foundItems}
          onSeeMore={setSelectedItem} 
          title="Found Items" 
          isAdmin={isAdmin} 
        />
      case "history":
        return <ItemSection 
          items={filteredItems.filter(item => item.Status === "handed_over")} 
          onSeeMore={setSelectedItem} 
          title="Handed Over Items" 
        />
      case "report":
        return <ReportSection onSubmit={handleReportSubmit} />
      case "admin":
        return <AdminSection 
          items={items.filter(item => !item.approved)}
          surrenderedItems={surrenderedItems}
          notifications={adminNotifications}
          onHandOver={handleHandOverItem}
          onResolveNotification={handleResolveNotification}
          onDelete={handleDelete}
          onAssignAdmin={handleAssignAdmin}
          onUpdateItemStatus={handleUpdateItemStatus}
          handleViewDetails={handleViewDetails}
        />
      case "profile":
        return <ProfileSection user={user} />
      case "pending_process":
        return <PendingProcessSection 
          pendingProcesses={pendingProcesses} 
          onCancelRequest={handleCancelRequest}
          onVerify={handleVerification}
          onViewPost={handleViewPost}
          onViewDetails={handleViewDetails}
        />
      default:
        return <DashboardSection items={filteredItems} onSeeMore={setSelectedItem} />
    }
  }

  const handleConfirmReport = () => {
    if (pendingReport.status === "lost") {
      const processItem = {
        id: Date.now(),
        item: { 
          ...pendingReport, 
          id: items.length + 1, 
          date: new Date().toISOString().split('T')[0], 
          approved: false 
        },
        status: "pending_approval"
      };
      setPendingProcesses([...pendingProcesses, processItem]);
      setItems([...items, processItem.item]);
    } else {
      setSurrenderedItems([
        ...surrenderedItems, 
        { ...pendingReport, id: surrenderedItems.length + 1, date: new Date().toISOString().split('T')[0] }
      ]);
    }
    setShowReportConfirmDialog(false);
    setActiveSection("pending_process");
    setPendingReport(null);
  }

  const handleApproveItem = async (id, status, itemData = null) => {
    try {
        const token = await user.getIdToken(true);
        await itemApi.approveItem(token, id, {
            status,
            approved: true,
            ...itemData
        });

        // Update local state after successful API call
        setItems(items.map(item => 
            item.id === id ? { ...item, approved: true, status } : item
        ));
    } catch (error) {
        setError('Failed to approve item');
        console.error('Error approving item:', error);
    }
  };

  const handleHandOverItem = async (id, claimantId) => {
    try {
        const token = await user.getIdToken(true);
        await itemApi.updateProcessStatus(token, id, "handed_over");
        
        setItems(items.map(item => 
            item.id === id ? { ...item, status: "handed_over", claimedBy: claimantId } : item
        ));
    } catch (error) {
        console.error('Error handling item handover:', error);
        setError('Failed to hand over item');
    }
  };

  const handleClaim = (item, studentId, verificationAnswers) => {
    if (requireAuth()) return;
    setAdminNotifications([...adminNotifications, { 
      id: Date.now(), 
      type: 'claim', 
      item, 
      studentId, 
      verificationAnswers 
    }]);
  }

  const handleFound = (item, studentId) => {
    if (requireAuth()) return;
    setSurrenderedItems([
      ...surrenderedItems, 
      { 
        ...item, 
        id: surrenderedItems.length + 1, 
        foundBy: studentId, 
        date: new Date().toISOString().split('T')[0] 
      }
    ]);
  }

  const handleResolveNotification = (notificationId) => {
    setAdminNotifications(adminNotifications.filter(notification => notification.id !== notificationId))
  }


  const handleDelete = async (itemId) => {
    try {
      const token = await user.getIdToken(true);

      // First try to find the pending process
      const response = await makeAuthenticatedRequest(`/api/Item/pending/user/${user.uid}`);
      const processes = response?.$values || [];
      const process = processes.find(p => p.Item?.Id === itemId);

      // If there's a pending process, delete it first
      if (process) {
        await itemApi.deletePendingProcess(token, process.Id);
      }

      // Then delete the item
      await itemApi.deleteItem(token, itemId);

      // Update local state
      setItems(prevItems => prevItems.filter(item => item.Id !== itemId));
      setPendingProcesses(prevProcesses => 
        prevProcesses.filter(process => process.Item?.Id !== itemId)
      );

      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error('Error deleting item:', error);
      setIsErrorDialogOpen(true);
    }
  };

  const generateVerificationQuestions = (item) => {
    const questions = [
      `What is the color of the ${item.name}?`,
      `Can you describe any unique features of the ${item.name}?`,
      `Where exactly did you lose/find the ${item.name}?`,
    ]
    return questions
  }

  const handleVerification = (process) => {
    // Set the current notification for verification
    setCurrentNotification({
      id: Date.now(),
      type: 'verification',
      item: process.item,
      verificationQuestions: process.item.verificationQuestions,
      answers: []
    });
    
    // Show the verification dialog
    setShowVerificationDialog(true);
  };

  const handleSubmitVerification = async () => {
    if (!currentNotification) return;

    try {
        const token = await user.getIdToken(true);
        const currentProcess = pendingProcesses.find(p => p.item.id === currentNotification.item.id);
        const currentItem = items.find(i => i.id === currentNotification.item.id);
        
        if (!currentProcess || !currentItem) return;

        // Send verification answers
        await itemApi.updateProcessStatus(token, currentItem.id, "pending_verification");
        
        // Update local state
        setPendingProcesses(pendingProcesses.map(process =>
            process.item.id === currentItem.id ? {
                ...process,
                status: "pending_verification",
                answers: verificationAnswers
            } : process
        ));
        
        setShowVerificationDialog(false);
        setCurrentNotification(null);
        setVerificationAnswers([]);
    } catch (error) {
        console.error('Error submitting verification:', error);
        setError('Failed to submit verification');
    }
  };

  const handleCancelRequest = async (processId) => {
    try {
        const token = await user.getIdToken(true);
        const process = pendingProcesses.find(p => p.id === processId);
        
        if (process) {
            await itemApi.deletePendingProcess(token, processId);
            setPendingProcesses(pendingProcesses.filter(p => p.id !== processId));
            setItems(items.filter(item => item.id !== process.item.id));
        }
    } catch (error) {
        console.error('Error canceling request:', error);
        setError('Failed to cancel request');
    }
  };

  const handleVerificationSuccess = async (processId) => {
    try {
        const token = await user.getIdToken(true);
        await itemApi.updateProcessStatus(token, processId, "verified");
        
        setPendingProcesses(pendingProcesses.map(process =>
            process.id === processId ? { ...process, status: "verified" } : process
        ));
        
        setShowVerificationSuccessDialog(true);
    } catch (error) {
        console.error('Error updating verification status:', error);
        setError('Failed to update verification status');
    }
  };

  const handleAdminVerificationResponse = async (notificationId, isCorrect) => {
    try {
        const notification = adminNotifications.find(n => n.id === notificationId);
        if (!notification) return;

        const token = await user.getIdToken(true);
        
        if (isCorrect) {
            await itemApi.updateProcessStatus(token, notification.itemId, "verified");
            
            // Update item status to verified
            setItems(items.map(item => 
                item.id === notification.itemId ? { ...item, status: "verified" } : item
            ));
            
            // Update pending process status
            setPendingProcesses(pendingProcesses.map(process =>
                process.item.id === notification.itemId ? { ...process, status: "verified" } : process
            ));
        }
        
        // Remove the admin notification
        setAdminNotifications(adminNotifications.filter(n => n.id !== notificationId));
    } catch (error) {
        console.error('Error handling verification response:', error);
        setError('Failed to process verification response');
    }
  };

  const handleAssignAdmin = async (email) => {
    try {
        const token = await user.getIdToken(true);
        await authApi.assignAdmin(token, email);
        setIsSuccessDialogOpen(true);
    } catch (error) {
        console.error('Error assigning admin:', error);
        setIsErrorDialogOpen(true);
    }
  };

  const handleViewPost = (item) => {
    setSelectedItem(item);
    setActiveSection("dashboard");
  };

  const handleUpdateItemStatus = async (itemId, status, verificationQuestions = null) => {
    try {
        const token = await user.getIdToken(true);

        if (status === "reset_verification") {
            // Reset item to original posted state
            await itemApi.updateProcessStatus(token, itemId, "lost");
            setItems(items.map(item => 
                item.id === itemId ? { 
                    ...item, 
                    status: "lost",
                    approved: true,
                    verificationQuestions: undefined
                } : item
            ));

            setPendingProcesses(prevProcesses => 
                prevProcesses.filter(process => process.item.id !== itemId)
            );

            setAdminNotifications(prevNotifications => 
                prevNotifications.filter(n => n.item?.id !== itemId)
            );

            return;
        }

        // Update item status
        await itemApi.updateProcessStatus(token, itemId, status);

        // Update local state
        setItems(items.map(item => 
            item.id === itemId ? { 
                ...item, 
                status: status,
                verificationQuestions: verificationQuestions === null ? undefined : verificationQuestions
            } : item
        ));

        // Update pending processes
        setPendingProcesses(pendingProcesses.map(process =>
            process.item.id === itemId ? { 
                ...process, 
                status: status === "handed_over" ? "completed" : 
                       status === "pending_retrieval" ? "verified" : 
                       status === "in_possession" ? "verification_needed" : 
                       "pending_approval",
                message: status === "handed_over" ? "Item has been successfully retrieved!" :
                        status === "pending_retrieval" ? "Verified! Please proceed to the student center (Room 101) to retrieve your item." :
                        status === "in_possession" ? "Please answer the verification questions." :
                        "Your report is pending approval from admin.",
                item: {
                    ...process.item,
                    status: status,
                    verificationQuestions: verificationQuestions === null ? undefined : verificationQuestions
                }
            } : process
        ));

        if (status === "handed_over") {
            setTimeout(() => {
                setPendingProcesses(prevProcesses => 
                    prevProcesses.filter(process => process.item.id !== itemId)
                );
            }, 5000);
        }
    } catch (error) {
        console.error('Error updating item status:', error);
        setError('Failed to update item status');
    }
  };

  const handleViewDetails = (item) => {
    if (!item) {
      console.log('Item is null or undefined');
      return;
    }
    
    console.log('Raw item received:', item);
    
    // Check if the item is from pending process (has Item property)
    const sourceItem = item.Item || item;
    console.log('Source item after checking .Item:', sourceItem);
    
    // Log each property we're trying to access with correct casing
    console.log('Property check:', {
      id: sourceItem.id || sourceItem.$id,
      name: sourceItem.name,
      description: sourceItem.description,
      category: sourceItem.category,
      status: sourceItem.status,
      location: sourceItem.location,
      imageUrl: sourceItem.imageUrl,
      dateReported: sourceItem.dateReported,
      studentId: sourceItem.studentId,
      additionalDescriptions: sourceItem.additionalDescriptions,
      approved: sourceItem.approved
    });

    // Convert the Item property to match the expected format using correct casing
    const formattedItem = {
      id: sourceItem.id || sourceItem.$id,
      name: sourceItem.name,
      description: sourceItem.description,
      category: sourceItem.category,
      status: sourceItem.status,
      location: sourceItem.location,
      imageUrl: sourceItem.imageUrl,
      dateReported: sourceItem.dateReported,
      studentId: sourceItem.studentId,
      additionalDescriptions: sourceItem.additionalDescriptions?.$values || sourceItem.additionalDescriptions || [],
      approved: sourceItem.approved
    };

    console.log('Final formatted item:', formattedItem);
    setSelectedItem(formattedItem);
  };

  // Helper function to check if action requires auth
  const requireAuth = (action) => {
    if (!user) {
      setShowAuthDialog(true);
      return true;
    }
    return false;
  };

  // Add useEffect to handle auth state changes
  useEffect(() => {
    if (!user) {
      // Reset UI state when user logs out
      setActiveSection("dashboard");
      setSelectedItem(null);
      setPendingProcesses([]);
      setShowAuthDialog(false);
      setShowVerificationDialog(false);
      setShowReportConfirmDialog(false);
      setCurrentNotification(null);
      setPendingReport(null);
    }
  }, [user]);

  // Add useEffect to fetch pending processes for the current user
  useEffect(() => {
    const fetchPendingProcesses = async () => {
      if (!user?.uid) return;

      try {
        const token = await user.getIdToken(true);
        const data = await itemApi.getUserPending(token, user.uid);
        setPendingProcesses(Array.isArray(data) ? data : [data].filter(Boolean));
      } catch (error) {
        console.error('Error fetching pending processes:', error);
      }
    };

    if (user) {
      fetchPendingProcesses();
      const interval = setInterval(fetchPendingProcesses, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const fetchPendingProcessCount = async () => {
      if (!user || authLoading) return;
      
      try {
        const response = await makeAuthenticatedRequest(`/api/Item/pending/all`);
        
        if (response && response.$values) {
          // Set items first
          setItems(response.$values);
          setIsLoading(false); // Set loading to false after items are set

          // Calculate count
          const newCount = isAdmin
            ? response.$values.filter(process => 
                !process.item?.approved
              ).length
            : response.$values.filter(process => 
                process.userId === user.uid
              ).length;

          setPendingProcessCount(prevCount => {
            if (prevCount !== newCount) {
              return newCount;
            }
            return prevCount;
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setPendingProcessCount(0);
        setIsLoading(false); // Make sure to set loading to false even on error
      } finally {
        setIsProcessCountLoading(false);
      }
    };

    // Set initial loading state
    if (user && !authLoading) {
      setIsLoading(true);
      setIsProcessCountLoading(true);
      fetchPendingProcessCount();
      const interval = setInterval(fetchPendingProcessCount, 5000);
      return () => clearInterval(interval);
    } else {
      setPendingProcessCount(0);
      setIsLoading(false);
      setIsProcessCountLoading(false);
    }
  }, [user, authLoading, isAdmin, makeAuthenticatedRequest]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Deleted Successfully!</DialogTitle>
            <DialogDescription>The item has been successfully cancelled/deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsSuccessDialogOpen(false)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Not Deleted - Error</DialogTitle>
            <DialogDescription>There was an issue with deleting the item. Please try again later.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsErrorDialogOpen(false)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">UniLostAndFound</h1>
          <nav className="flex gap-4">
            {isAdmin ? (
              // Admin Navigation
              <>
                <Button 
                  variant={activeSection === "admin" ? "default" : "ghost"}
                  onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                >
                  Admin Dashboard
                </Button>
                <Button 
                  variant={activeSection === "dashboard" ? "default" : "ghost"}
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                >
                  View Items
                </Button>
              </>
            ) : (
              // Regular User Navigation
              <>
                <Button variant="ghost" onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}>
                  Home
                </Button>
                <Button variant="ghost" onClick={() => { 
                  if (requireAuth()) return;
                  setActiveSection("report"); 
                  setSelectedItem(null); 
                }}>
                  Report Item
                </Button>
                {user && (
                  <>
                    <Button 
                      variant={activeSection === "pending_process" ? "default" : "ghost"}
                      onClick={() => { setActiveSection("pending_process"); setSelectedItem(null); }}
                    >
                      Pending Process
                      {pendingProcessCount > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                          {pendingProcessCount}
                        </span>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => { setActiveSection("profile"); setSelectedItem(null); }}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </>
                )}
              </>
            )}
            <LoginButton />
          </nav>
        </div>
      </header>

      <main className="container mx-auto mt-8">
        {user && (
          <>
            {isAdmin ? (
              // Admin Section Buttons
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Pending Actions</h3>
                      <p className="text-muted-foreground">
                        {isProcessCountLoading ? (
                          <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                        ) : (
                          <>
                            <span className="font-medium">{pendingProcessCount}</span> items need attention
                          </>
                        )}
                      </p>
                    </div>
                    <Button 
                      variant={activeSection === "admin" ? "default" : "secondary"}
                      onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                    >
                      View Admin Dashboard
                    </Button>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Item Database</h3>
                      <p className="text-muted-foreground">
                        View and manage all items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={activeSection === "lost" ? "default" : "secondary"}
                        onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                      >
                        Lost Items
                      </Button>
                      <Button 
                        variant={activeSection === "found" ? "default" : "secondary"}
                        onClick={() => { setActiveSection("found"); setSelectedItem(null); }}
                      >
                        Found Items
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              // Regular User Section Buttons
              <div className="grid grid-cols-4 gap-4 mb-8">
                <Button 
                  variant={activeSection === "dashboard" ? "default" : "outline"}
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Dashboard
                </Button>
                <Button 
                  variant={activeSection === "lost" ? "default" : "outline"}
                  onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Lost Items
                </Button>
                <Button 
                  variant={activeSection === "found" ? "default" : "outline"}
                  onClick={() => { setActiveSection("found"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Found Items
                </Button>
                <Button 
                  variant={activeSection === "history" ? "default" : "outline"}
                  onClick={() => { setActiveSection("history"); setSelectedItem(null); }}
                  className="w-full"
                >
                  History
                </Button>
              </div>
            )}
          </>
        )}

        {/* Search Bar - Show only when viewing items */}
        {(activeSection === "dashboard" || activeSection === "lost" || activeSection === "found") && (
          <div className="flex gap-4 mb-8">
            <Input 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow"
            />
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Personal Items">Personal Items</SelectItem>
                <SelectItem value="Documents">Documents</SelectItem>
                <SelectItem value="Bags">Bags</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        )}

        {/* Main Content */}
        {renderSection()}

        <ItemDetailSection 
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
        />

        <AuthRequiredDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
        />
      </main>

      <ReportConfirmDialog 
        open={showReportConfirmDialog}
        onOpenChange={setShowReportConfirmDialog}
        onConfirm={handleConfirmReport}
      />

      <VerificationDialog 
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        onSubmit={handleSubmitVerification}
        onCancel={() => setShowVerificationDialog(false)}
        questions={currentNotification?.verificationQuestions || []}
        answers={verificationAnswers}
        onAnswerChange={(index, value) => {
          const newAnswers = [...verificationAnswers];
          newAnswers[index] = value;
          setVerificationAnswers(newAnswers);
        }}
      />

      <VerificationSuccessDialog 
        open={showVerificationSuccessDialog}
        onOpenChange={setShowVerificationSuccessDialog}
      />

      <VerificationFailDialog 
        open={showVerificationFailDialog}
        onOpenChange={setShowVerificationFailDialog}
        onTryAgain={() => {
          setShowVerificationFailDialog(false);
          setShowVerificationDialog(true);
        }}
      />
    </div>
  )
}
