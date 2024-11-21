"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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

import { ItemStatus, ProcessStatus, ProcessMessages } from "@/lib/constants";
import { authApi, itemApi } from '@/lib/api-client';

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

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Add state for user's pending processes
  const [userPendingProcesses, setUserPendingProcesses] = useState([]);

  // Add function to fetch user's pending processes
  const fetchUserPendingProcesses = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(`http://localhost:5067/api/Item/pending/all`);
      if (!response.ok) throw new Error("Failed to fetch pending processes");
      
      const data = await response.json();
      if (data && data.$values) {
        // Filter processes for the current user
        const userProcesses = data.$values.filter(process => 
          process.userId === user.uid || process.item?.reporterId === user.uid
        );
        setUserPendingProcesses(userProcesses);
      }
    } catch (error) {
      console.error('Error fetching user pending processes:', error);
    }
  };

  // Add useEffect to fetch user's pending processes
  useEffect(() => {
    if (user?.uid && activeSection === "pending_process") {
      fetchUserPendingProcesses();
      
      // Set up polling for updates
      const intervalId = setInterval(fetchUserPendingProcesses, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [user?.uid, activeSection]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5067/api/Item/pending/all');
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const data = await response.json();
        if (data && data.$values) {
          setItems(data.$values);
          if (typeof onUpdateCounts === 'function') {
            onUpdateCounts();
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    let timeoutId;
    if (activeSection === "lost" || activeSection === "found" || activeSection === "dashboard") {
      fetchData();
      timeoutId = setInterval(fetchData, 5000);
    }

    return () => {
      if (timeoutId) clearInterval(timeoutId);
    };
  }, [activeSection]); // Only depend on activeSection

  const filteredItems = useMemo(() => {
    if (!items) return [];

    // Get the array of items, handling both direct array and $values structure
    const itemsArray = Array.isArray(items) ? items : items.$values || [];

    return itemsArray.filter(process => {
      // Get the actual item data
      const item = process.item || process.Item;
      if (!item) return false;

      // Only show approved items in dashboard
      if (!item.approved) return false;

      // Category filter
      const matchesCategory = searchCategory === "all" || 
        item.category?.toLowerCase() === searchCategory.toLowerCase();

      // Search terms - only filter if there's a search query
      if (searchQuery.trim()) {
        const searchTerms = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchTerms) ||
          item.location?.toLowerCase().includes(searchTerms) ||
          item.description?.toLowerCase().includes(searchTerms) ||
          item.category?.toLowerCase().includes(searchTerms);

        return matchesCategory && matchesSearch;
      }

      // If no search query, just filter by category
      return matchesCategory;
    });
  }, [items, searchCategory, searchQuery]);

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

  const handleUnapprove = async (itemId) => {
    try {
      // First get all processes to find the correct processId
      const processResponse = await fetch('http://localhost:5067/api/Item/pending/all');
      const processData = await processResponse.json();
      
      // Find the process that matches our item
      const process = processData.$values?.find(p => {
        const processItemId = p.itemId || p.ItemId;
        return processItemId === itemId;
      });

      if (!process) {
        console.error('No process found for item:', itemId);
        return;
      }

      const processId = process.id || process.Id;
      console.log('Found process:', { process, processId });

      // Update item approval status
      await fetch(`http://localhost:5067/api/Item/${itemId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false })
      });

      // Update process status using the correct processId
      await fetch(`http://localhost:5067/api/Item/process/${processId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: ProcessStatus.PENDING_APPROVAL,
          message: ProcessMessages.WAITING_APPROVAL
        })
      });

      // Update items state to reflect the change immediately
      setItems(prevItems => {
        return prevItems.filter(item => {
          // For nested structure (like in filteredItems)
          if (item.Item) {
            return item.Item.Id !== itemId && item.Item.id !== itemId;
          }
          // For flat structure
          return item.id !== itemId && item.Id !== itemId;
        });
      });

      // Close detail dialog if it's open
      if (showDetailsDialog) {
        setShowDetailsDialog(false);
        setSelectedItem(null);
      }

    } catch (error) {
      console.error('Error unapproving item:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        const dashboardItems = items
          .filter(item => 
            (item.Item?.Approved === true || item.item?.approved === true) && 
            (item.status === "approved" || item.Status === "approved")
          )
          .map(item => ({
            id: item.Item?.Id || item.item?.id,
            name: item.Item?.Name || item.item?.name,
            description: item.Item?.Description || item.item?.description,
            category: item.Item?.Category || item.item?.category,
            location: item.Item?.Location || item.item?.location,
            status: item.Item?.Status || item.item?.status,
            imageUrl: item.Item?.ImageUrl || item.item?.imageUrl,
            dateReported: item.Item?.DateReported || item.item?.dateReported,
            reporterId: item.Item?.ReporterId || item.item?.reporterId,
            additionalDescriptions: 
              (item.Item?.AdditionalDescriptions?.$values || 
               item.item?.additionalDescriptions?.$values || 
               [])
          }));
        
        return <DashboardSection 
          items={dashboardItems}
          handleViewDetails={(item) => { 
            setSelectedItem(item);
            setShowDetailsDialog(true);
          }}
          isAdmin={isAdmin}
          userId={user?.uid}
          onDelete={handleDelete}
          searchQuery={searchQuery}
          searchCategory={searchCategory}
        />
      case "lost":
        const lostItems = items.filter(process => 
          process.item?.status?.toLowerCase() === "lost" && 
          process.item?.approved === true &&
          process.status === "approved"
        ).map(process => ({
          id: process.item.id,
          name: process.item.name,
          description: process.item.description,
          location: process.item.location,
          status: process.item.status,
          imageUrl: process.item.imageUrl,
          dateReported: process.item.dateReported,
          additionalDescriptions: process.item.additionalDescriptions?.$values || [],
          approved: process.item.approved,
          reporterId: process.item.reporterId
        }));
        return <ItemSection 
          items={lostItems}
          title="Lost Items" 
          isAdmin={isAdmin}
          handleViewDetails={(item) => { 
            setSelectedItem(item);
            setShowDetailsDialog(true);
          }}
          userId={user?.uid}
          onDelete={handleDelete}
          onUnapprove={handleUnapprove}
          searchQuery={searchQuery}
          
        />
      case "found":
        const foundItems = items.filter(process => 
          process.item?.status?.toLowerCase() === "found" && 
          process.item?.approved === true &&
          process.status === "approved"
        ).map(process => ({
          id: process.item.id,
          name: process.item.name,
          description: process.item.description,
          location: process.item.location,
          status: process.item.status,
          imageUrl: process.item.imageUrl,
          dateReported: process.item.dateReported,
          additionalDescriptions: process.item.additionalDescriptions?.$values || [],
          approved: process.item.approved,
          reporterId: process.item.reporterId
        }));
        return <ItemSection 
          items={foundItems}
          title="Found Items" 
          isAdmin={isAdmin}
          handleViewDetails={handleViewDetails}
          userId={user?.uid}
          onDelete={handleDelete}
          onUnapprove={handleUnapprove}
          searchQuery={searchQuery}
          searchCategory={searchCategory}
        />
      case "history":
        return <ItemSection 
          items={filteredItems.filter(item => item.Status === "handed_over")} 
          onSeeMore={setSelectedItem} 
          title="Handed Over Items" 
          // add search functionality here 
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
          pendingProcesses={userPendingProcesses}
          onViewDetails={handleViewDetails}
          handleDelete={handleDelete}
          onViewPost={handleViewPost}
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

      // Update all relevant states
      setItems(prevItems => prevItems.filter(item => 
        item.Item?.Id !== itemId && item.item?.id !== itemId
      ));
      
      setPendingProcesses(prevProcesses => 
        prevProcesses.filter(process => 
          process.Item?.Id !== itemId && process.item?.id !== itemId
        )
      );

      // Close any open dialogs
      setShowDetailsDialog(false);
      setSelectedItem(null);
      setIsSuccessDialogOpen(true);

      // Refresh data from server
      const newResponse = await makeAuthenticatedRequest('/api/Item/pending/all');
      if (newResponse && newResponse.$values) {
        const newData = newResponse.$values;
        
        // Update items state with new data
        setItems(newData);
        
        // Also update filtered items for dashboard
        const newFilteredItems = newData.filter(process => 
          process.item?.approved === true && 
          process.status === "approved"
        );
        
        // Force a re-render of components using this data
        setActiveSection(prev => prev);
      }

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

  const handleViewPost = useCallback((item) => {
    // Set the selected item and switch to dashboard section
    setSelectedItem(item);
    setActiveSection("dashboard");
    
    // Use requestAnimationFrame to wait for the next frame
    requestAnimationFrame(() => {
      // Find the item element
      const itemElement = document.getElementById(`item-${item.id}`);
      if (itemElement) {
        // First scroll to the item
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        itemElement.style.transition = 'all 0.3s ease-in-out';
        itemElement.style.boxShadow = '0 0 0 4px rgb(var(--primary))';
        itemElement.style.transform = 'scale(1.02)';
        
        // Remove highlight after animation
        setTimeout(() => {
          itemElement.style.boxShadow = '';
          itemElement.style.transform = '';
        }, 2000);
      }
    });
  }, []);

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
    setSelectedItem(item);
    setShowDetailsDialog(true);
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

  // // Loading state
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="flex flex-col items-center gap-4">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  //         <p className="text-muted-foreground">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
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

      {/* Header */}
      <header className="bg-[#0052cc] shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">UniLostAndFound</h1>
          <nav className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <Button 
                  variant="ghost"
                  className="text-white hover:text-yellow-400 transition-colors"
                  onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                >
                  Admin Dashboard
                </Button>
                <Button 
                  variant="ghost"
                  className="text-white hover:text-yellow-400 transition-colors"
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                >
                  View Items
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost"
                  className="text-white hover:text-yellow-400 transition-colors"
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                >
                  Home
                </Button>
                <Button 
                  variant="ghost"
                  className="text-white hover:text-yellow-400 transition-colors"
                  onClick={() => { 
                    if (requireAuth()) return;
                    setActiveSection("report"); 
                    setSelectedItem(null); 
                  }}
                >
                  Report Item
                </Button>
                {user && (
                  <>
                    <Button 
                      variant="ghost"
                      className="text-white hover:text-yellow-400 transition-colors relative"
                      onClick={() => { setActiveSection("pending_process"); setSelectedItem(null); }}
                    >
                      Pending Process
                      {pendingProcessCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-[#0052cc] rounded-full px-2 py-0.5 text-xs font-medium">
                          {pendingProcessCount}
                        </span>
                      )}
                    </Button>
                    <Button 
                      variant="ghost"
                      className="text-white hover:text-yellow-400 transition-colors"
                      onClick={() => { setActiveSection("profile"); setSelectedItem(null); }}
                    >
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

      <main className="container mx-auto px-4 py-8">
        {/* Admin Cards */}
        {user && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0052cc] mb-2">Pending Actions</h3>
                    <p className="text-gray-500">
                      {isProcessCountLoading ? (
                        <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                      ) : (
                        <>
                          <span className="font-medium text-[#0052cc]">{pendingProcessCount}</span> items need attention
                        </>
                      )}
                    </p>
                  </div>
                  <Button 
                    className="bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                    onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                  >
                    View Admin Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0052cc] mb-2">Item Database</h3>
                    <p className="text-gray-500">View and manage all items</p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      className="bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                      onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                    >
                      Lost Items
                    </Button>
                    <Button 
                      className="bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                      onClick={() => { setActiveSection("found"); setSelectedItem(null); }}
                    >
                      Found Items
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        {!isAdmin && user && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <div className="flex space-x-1">
                <Button
                  variant={activeSection === "dashboard" ? "default" : "ghost"}
                  className={`flex-1 ${
                    activeSection === "dashboard" 
                      ? "bg-[#0052cc] text-white hover:bg-[#0052cc]/90" 
                      : "text-gray-600 hover:text-[#0052cc]"
                  }`}
                  onClick={() => setActiveSection("dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  variant={activeSection === "lost" ? "default" : "ghost"}
                  className={`flex-1 ${
                    activeSection === "lost" 
                      ? "bg-[#0052cc] text-white hover:bg-[#0052cc]/90" 
                      : "text-gray-600 hover:text-[#0052cc]"
                  }`}
                  onClick={() => setActiveSection("lost")}
                >
                  Lost Items
                </Button>
                <Button
                  variant={activeSection === "found" ? "default" : "ghost"}
                  className={`flex-1 ${
                    activeSection === "found" 
                      ? "bg-[#0052cc] text-white hover:bg-[#0052cc]/90" 
                      : "text-gray-600 hover:text-[#0052cc]"
                  }`}
                  onClick={() => setActiveSection("found")}
                >
                  Found Items
                </Button>
                <Button
                  variant={activeSection === "history" ? "default" : "ghost"}
                  className={`flex-1 ${
                    activeSection === "history" 
                      ? "bg-[#0052cc] text-white hover:bg-[#0052cc]/90" 
                      : "text-gray-600 hover:text-[#0052cc]"
                  }`}
                  onClick={() => setActiveSection("history")}
                >
                  History
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Section */}
        {(activeSection === "dashboard" || activeSection === "lost" || activeSection === "found") && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-gray-200"
                />
              </div>
              <Select
                value={searchCategory}
                onValueChange={setSearchCategory}
              >
                <SelectTrigger className="w-[180px] bg-white border-gray-200">
                  <SelectValue placeholder="All Categories" />
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
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="relative">
          {renderSection()}
        </div>

        <style jsx>{styles}</style>

        <ItemDetailSection 
          item={selectedItem}
          open={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedItem(null);
          }}
          onDelete={handleDelete}
          isAdmin={isAdmin}
          userId={user?.uid}
          onUnapprove={handleUnapprove}
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
