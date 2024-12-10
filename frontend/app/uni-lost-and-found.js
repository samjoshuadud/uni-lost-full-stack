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
import { API_BASE_URL } from '@/lib/api-config';
import Image from "next/image"
import { exportToPDF, exportToExcel } from '@/lib/export-utils';
import { Skeleton } from "@/components/ui/skeleton"
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

// Add this helper function at the top level
const sortItems = (items, order) => {
  return [...items].sort((a, b) => {
    switch (order) {
      case "newest":
        return new Date(b.dateReported || b.DateReported) - new Date(a.dateReported || a.DateReported);
      case "oldest":
        return new Date(a.dateReported || a.DateReported) - new Date(b.dateReported || b.DateReported);
      case "a-z":
        return (a.name || a.Name || '').localeCompare(b.name || b.Name || '');
      case "z-a":
        return (b.name || b.Name || '').localeCompare(a.name || a.Name || '');
      default:
        return 0;
    }
  });
};

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
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  const [isProcessCountLoading, setIsProcessCountLoading] = useState(true);

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Add state for user's pending processes
  const [userPendingProcesses, setUserPendingProcesses] = useState([]);

  // Add state for claim processes
  const [claimProcesses, setClaimProcesses] = useState([]);

  // Add new state for claim status filter
  const [claimStatus, setClaimStatus] = useState("all");

  // Add useEffect for fetching claim processes
  useEffect(() => {
    const fetchClaimProcesses = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        const data = await response.json();
        const processes = data.$values || [];
        
        // Filter processes where requestorUserId matches current user
        const userClaims = processes.filter(p => 
          p.requestorUserId === user.uid && 
          p.status === "claim_request"
        );
        
        setClaimProcesses(userClaims);
      } catch (error) {
        console.error('Error fetching claim processes:', error);
      }
    };

    fetchClaimProcesses();
  }, [user]);

  // Add function to fetch user's pending processes
  const fetchUserPendingProcesses = async () => {
    if (!user) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        const data = await response.json();
        const processes = data.$values || [];
        
        // Filter processes:
        // 1. User's regular processes (where UserId matches)
        // 2. User's claim processes (where RequestorUserId matches)
        const userProcesses = processes.filter(p => 
            p.userId === user.uid || 
            (p.requestorUserId === user.uid && p.status === "claim_request")
        );
        
        setUserPendingProcesses(userProcesses);
    } catch (error) {
        console.error('Error fetching user pending processes:', error);
    }
  };

  // Add useEffect to fetch user's pending processes
  useEffect(() => {
    const fetchPendingProcesses = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
            const data = await response.json();
            const processes = data.$values || [];
            
            // Filter processes:
            // 1. User's regular processes (where UserId matches)
            // 2. User's claim processes (where RequestorUserId matches)
            const userProcesses = processes.filter(p => 
                p.userId === user.uid || 
                (p.requestorUserId === user.uid && p.status === "claim_request")
            );
            
            setUserPendingProcesses(userProcesses);
        } catch (error) {
            console.error('Error fetching user pending processes:', error);
        }
    };

    // Add event listener for manual refresh
    const handleRefresh = () => {
        fetchPendingProcesses();
    };

    if (user) {
        fetchPendingProcesses();
        window.addEventListener('refreshPendingProcesses', handleRefresh);
        const interval = setInterval(fetchPendingProcesses, 5000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshPendingProcesses', handleRefresh);
        };
    } else {
        setUserPendingProcesses([]);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
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

    const itemsArray = Array.isArray(items) ? items : items.$values || [];

    return itemsArray.filter(process => {
      // Get the actual item data
      const item = process.item || process.Item;
      if (!item) return false;

      // Only show approved items in dashboard
      if (!item.approved) return false;

      // Category filter - updated logic for "Others" category
      const itemCategory = (item.category || item.Category || '').toLowerCase().trim();
      const searchCat = searchCategory.toLowerCase().trim();
      
      // Define main categories in lowercase for comparison
      const mainCategories = [
        "books", 
        "electronics", 
        "personal items", 
        "documents", 
        "bags"
      ];

      // Check if category matches
      const matchesCategory = 
        searchCategory === "all" || 
        (searchCat === "others" 
          ? !mainCategories.includes(itemCategory) // Match if category is not in main categories
          : itemCategory === searchCat);

      // Claim status filter
      const matchesClaimStatus = claimStatus === "all" || 
        (claimStatus === "none" && !process.requestorUserId) ||
        (claimStatus === "pending" && process.requestorUserId);

      // Search terms
      if (searchQuery.trim()) {
        const searchTerms = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchTerms) ||
          item.location?.toLowerCase().includes(searchTerms) ||
          item.description?.toLowerCase().includes(searchTerms) ||
          item.category?.toLowerCase().includes(searchTerms);

        return matchesCategory && matchesSearch && matchesClaimStatus;
      }

      return matchesCategory && matchesClaimStatus;
    });
  }, [items, searchCategory, searchQuery, claimStatus]);

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
      const processResponse = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
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
      await fetch(`${API_BASE_URL}/api/Item/${itemId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false })
      });

      // Update process status using the correct processId
      await fetch(`${API_BASE_URL}/api/Item/process/${processId}/status`, {
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

  const renderSkeletonCards = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden bg-white shadow-md">
            {/* Card Header - Warmer and more subtle blue gradient background */}
            <div className="bg-gradient-to-r from-[#1A5BB5] to-[#3D7DD9] p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-white/20" /> {/* Title */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full bg-white/20" /> {/* Location icon */}
                    <Skeleton className="h-3 w-16 bg-white/20" /> {/* Location text */}
                  </div>
                </div>
                <Skeleton className="h-6 w-12 rounded-full bg-yellow-400/30" /> {/* Status badge */}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4">
              {/* Image placeholder */}
              <div className="mb-4 bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: "200px" }}>
                <Skeleton className="h-full w-full bg-[#E3EDFF]" />
              </div>

              {/* Item name */}
              <Skeleton className="h-5 w-3/4 mb-4 bg-[#E3EDFF]" />

              {/* Bottom section */}
              <div className="flex items-center justify-between mt-2">
                <Skeleton className="h-4 w-24 bg-[#E3EDFF]" /> {/* Date */}
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-md bg-[#E3EDFF]" /> {/* View Details button */}
                  <Skeleton className="h-9 w-9 rounded-md bg-[#E3EDFF]" /> {/* Report icon */}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const renderSection = () => {
    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="animate-pulse">
            {renderSkeletonCards()}
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "dashboard":
        const dashboardItems = items
          .filter(item => 
            (item.Item?.Approved === true || item.item?.approved === true)
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
               []),
            approved: item.Item?.Approved || item.item?.approved || false
          }));
        
        return <DashboardSection 
          items={sortItems(dashboardItems, sortOrder)}
          handleViewDetails={(item) => { 
            setSelectedItem(item);
            setShowDetailsDialog(true);
          }}
          isAdmin={isAdmin}
          userId={user?.uid}
          onDelete={handleDelete}
          onUnapprove={handleUnapprove}
          searchQuery={searchQuery}
          searchCategory={searchCategory}
          claimStatus={claimStatus}
        />
      case "lost":
        const lostItems = items
          .filter(process => 
            process.item?.status?.toLowerCase() === "lost" && 
            process.item?.approved === true
          )
          .map(process => ({
            id: process.item.id,
            name: process.item.name,
            description: process.item.description,
            category: process.item.category,
            location: process.item.location,
            status: process.item.status,
            imageUrl: process.item.imageUrl,
            dateReported: process.item.dateReported,
            additionalDescriptions: process.item.additionalDescriptions?.$values || [],
            approved: process.item.approved,
            reporterId: process.item.reporterId
          }));

        return <ItemSection 
          items={sortItems(lostItems, sortOrder)}
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
          searchCategory={searchCategory}
        />
      case "found":
        const foundItems = items
          .filter(process => 
            process.item?.status?.toLowerCase() === "found" && 
            process.item?.approved === true
          )
          .map(process => ({
            id: process.item.id,
            name: process.item.name,
            description: process.item.description,
            category: process.item.category,
            location: process.item.location,
            status: process.item.status,
            imageUrl: process.item.imageUrl,
            dateReported: process.item.dateReported,
            additionalDescriptions: process.item.additionalDescriptions?.$values || [],
            approved: process.item.approved,
            reporterId: process.item.reporterId
          }));

        return <ItemSection 
          items={sortItems(foundItems, sortOrder)}
          title="Found Items" 
          isAdmin={isAdmin}
          handleViewDetails={handleViewDetails}
          userId={user?.uid}
          onDelete={handleDelete}
          onUnapprove={handleUnapprove}
          searchQuery={searchQuery}
          searchCategory={searchCategory}
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
    
    // Reset category filter to "all" to ensure item is visible
    setSearchCategory("all");
    
    // Add a small delay to ensure items are loaded
    setTimeout(() => {
      const findAndHighlightItem = () => {
        const itemElement = document.getElementById(`item-${item.id}`);
        if (itemElement) {
          // First scroll to the item
          itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight effect with improved styling
          itemElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          itemElement.style.boxShadow = '0 0 0 3px rgb(0, 82, 204), 0 8px 20px -4px rgba(0, 82, 204, 0.3)';
          itemElement.style.transform = 'scale(1.02)';
          itemElement.style.zIndex = '50';
          
          // Add a pulsing animation
          const pulseAnimation = itemElement.animate([
            { boxShadow: '0 0 0 3px rgba(0, 82, 204, 0.8), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' },
            { boxShadow: '0 0 0 6px rgba(0, 82, 204, 0.2), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' },
            { boxShadow: '0 0 0 3px rgba(0, 82, 204, 0.8), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' }
          ], {
            duration: 1500,
            iterations: 2
          });
          
          // Remove highlight after animation
          setTimeout(() => {
            itemElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            itemElement.style.boxShadow = '';
            itemElement.style.transform = '';
            itemElement.style.zIndex = '';
          }, 3000);
        } else {
          // If element not found, try again after a short delay
          setTimeout(findAndHighlightItem, 100);
        }
      };

      findAndHighlightItem();
    }, 100); // Initial delay to allow for section change
  }, [setSearchCategory]); // Add setSearchCategory to dependencies

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
            const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
            const data = await response.json();
            
            if (data && data.$values) {
                setItems(data.$values);
                setIsLoading(false);

                // Calculate count for user's pending processes
                const newCount = data.$values.filter(process => 
                    process.status !== ProcessStatus.AWAITING_SURRENDER && (
                        process.userId === user.uid || 
                        (process.requestorUserId === user.uid && process.status === ProcessStatus.CLAIM_REQUEST)
                    )
                ).length;

                if (isAdmin) {
                    // Define excluded statuses at the start
                    const excludedStatuses = [
                        ProcessStatus.APPROVED,
                        ProcessStatus.AWAITING_SURRENDER,
                        ProcessStatus.HANDED_OVER,
                        ProcessStatus.NO_SHOW,
                        ProcessStatus.IN_VERIFICATION,
                        ProcessStatus.VERIFIED,
                        ProcessStatus.VERIFICATION_FAILED,
                        ProcessStatus.AWAITING_REVIEW
                    ];

                    // Count items that need admin attention in specific tabs
                    const adminCounts = data.$values.reduce((counts, process) => {
                        const status = process.status;
                        const item = process.item || process.Item;
                        
                        // Lost Items tab - items pending approval with status "lost"
                        if (status === ProcessStatus.PENDING_APPROVAL && 
                            item?.status?.toLowerCase() === "lost") {
                            counts.lostItems++;
                        }
                        
                        // Found Items tab - items pending approval with status "found"
                        if (status === ProcessStatus.PENDING_APPROVAL && 
                            item?.status?.toLowerCase() === "found") {
                            counts.foundItems++;
                        }
                        
                        // Ready for Pickup tab - items pending retrieval
                        if (status === ProcessStatus.PENDING_RETRIEVAL) {
                            counts.readyForPickup++;
                        }

                        // Count items that need attention
                        if (!excludedStatuses.includes(status)) {
                            counts.totalAttention++;
                        }

                        return counts;
                    }, {
                        lostItems: 0,
                        foundItems: 0,
                        readyForPickup: 0,
                        totalAttention: 0
                    });

                    console.log('Final counts:', adminCounts);
                    setTotalPendingCount(adminCounts.totalAttention);
                    
                    setPendingProcessCount(newCount);
                } else {
                    setPendingProcessCount(newCount);
                    setTotalPendingCount(newCount);
                }

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
            setTotalPendingCount(0);
            setIsLoading(false);
        } finally {
            setIsProcessCountLoading(false);
        }
    };

    if (user && !authLoading) {
        setIsLoading(true);
        setIsProcessCountLoading(true);
        fetchPendingProcessCount();
        const interval = setInterval(fetchPendingProcessCount, 5000);
        return () => clearInterval(interval);
    } else {
        setPendingProcessCount(0);
        setTotalPendingCount(0);
        setIsLoading(false);
        setIsProcessCountLoading(false);
    }
  }, [user, authLoading, isAdmin]);

  // Add sort state
  const [sortOrder, setSortOrder] = useState("newest");

  // Add this sort function
  const sortItems = (items, order) => {
    return [...items].sort((a, b) => {
      // Get the date values, handling both direct and nested item structures
      const getDate = (item) => {
        const date = item.dateReported || item.DateReported || 
                     item.item?.dateReported || item.item?.DateReported;
        return new Date(date || 0);
      };

      // Get the name values, handling both direct and nested item structures
      const getName = (item) => {
        return (item.name || item.Name || 
                item.item?.name || item.item?.Name || '').toLowerCase();
      };

      switch (order) {
        case "newest":
          return getDate(b) - getDate(a);
        case "oldest":
          return getDate(a) - getDate(b);
        case "a-z":
          return getName(a).localeCompare(getName(b));
        case "z-a":
          return getName(b).localeCompare(getName(a));
        default:
          return 0;
      }
    });
  };

  const handleExportPDF = () => {
    exportToPDF(items, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    });
  };

  const handleExportExcel = () => {
    exportToExcel(items, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    });
  };

  return (
    <div className="relative min-h-screen">
      {/* Fixed background that covers entire viewport */}
      <div 
        className="absolute inset-0 w-full h-full bg-[linear-gradient(130deg,#F8FAFF_0%,#EDF5FF_25%,#E6F0FF_50%,#E3EDFF_75%,#DCE8FF_100%)]"
        style={{ minHeight: '100%' }}
      />
      <div className="relative z-10">
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
        <header style={{ background: "linear-gradient(to right, #023265 40%, #004C99 100%)", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", borderBottom: "1px solid #004C99", }}>
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo/logo.png" 
                alt="UMAK Logo" 
                width={40} 
                height={40} 
                className="rounded-full bg-white p-1 shadow-sm hover:shadow-md transition-shadow duration-300"
              />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-yellow-400 tracking-tight">
                  Lost & Found
                </h1>
                <span className="text-xs text-yellow-400/80">
                  University of Makati
                </span>
              </div>
            </div>
            <nav className="flex items-center gap-3">
              {isAdmin ? (
                <>
                  <Button 
                    variant="ghost"
                    className={`text-white transition-colors relative
                      ${activeSection === "dashboard" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-40 " : 
                        "hover:text-[#004C99] hover:font-bold"
                      }
                    `}
                    onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                  >
                    View Items
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    className={`text-white transition-colors relative
                      ${activeSection === "dashboard" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400 font-bold" : 
                        "hover:text-[#004C99] hover:font-bold"
                      }
                    `}
                    onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                  >
                    Home
                  </Button>
                  <Button 
                    variant="ghost"
                    className={`text-white transition-colors relative
                      ${activeSection === "report" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400 font-bold" : 
                        "hover:text-[#004C99] hover:font-bold"
                      }
                    `}
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
                        className={`text-white transition-colors relative
                          ${activeSection === "pending_process" ? 
                            "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400 font-bold" : 
                            "hover:text-[#004C99] hover:font-bold"
                          }
                        `}
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
                        className={`text-white transition-colors relative
                          ${activeSection === "profile" ? 
                            "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400 font-bold" : 
                            "hover:text-[#004C99] hover:font-bold"
                          }
                        `}
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
              <Card className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm shadow-sm border border-[#4B9FFF]/30 drop-shadow-[0_4px_4px_rgba(75,159,255,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-[#0052cc] mb-2">Pending Actions</h3>
                      <p className="text-gray-500">
                        {isProcessCountLoading ? (
                          <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                        ) : (
                          <>
                            <span className="font-medium text-[#0052cc]">{totalPendingCount}</span> items need attention
                          </>
                        )}
                      </p>
                    </div>
                    <Button 
                      className={`transition-colors relative
                        ${activeSection === "admin" ? 
                          "bg-[#0052cc] text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400" : 
                          "bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                        }
                      `}
                      onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                    >
                      View Admin Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm shadow-sm border border-[#4B9FFF]/30 drop-shadow-[0_4px_4px_rgba(75,159,255,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-[#0052cc] mb-2">Item Database</h3>
                      <p className="text-gray-500">View and manage all items</p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        className={`transition-colors relative
                          ${activeSection === "lost" ? 
                            "bg-[#0052cc] text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400" : 
                            "bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                          }
                        `}
                        onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                      >
                        Lost Items
                      </Button>
                      <Button 
                        className={`transition-colors relative
                          ${activeSection === "found" ? 
                            "bg-[#0052cc] text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400" : 
                            "bg-[#0052cc] text-white hover:bg-[#0052cc]/90"
                          }
                        `}
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
          {!isAdmin && user && 
            !["profile", "report", "pending_process"].includes(activeSection) && (
            <div className="mb-6">
              <div className="bg-[#2E3F65] rounded-[40px] shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-blue-900 p-2 max-w-[950px] mx-auto">
                <div className="flex space-x-1">
                  <Button
                    variant={activeSection === "dashboard" ? "secondary" : "ghost"}
                    className={`flex-1 relative transition-colors rounded-[50px] text-sm py-2.5 h-auto
                      ${activeSection === "dashboard" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0 after:bg-yellow-400 bg-yellow-400 text-[#003d99] hover:bg-yellow-500 font-bold" : 
                        "text-white hover:text-[#004C99] font-bold"
                      }
                    `}
                    onClick={() => setActiveSection("dashboard")}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant={activeSection === "lost" ? "secondary" : "ghost"}
                    className={`flex-1 relative transition-colors rounded-[50px] text-sm py-2.5 h-auto
                      ${activeSection === "lost" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0 after:bg-yellow-400 bg-yellow-400 text-[#003d99] hover:bg-yellow-500 font-bold" : 
                        "text-white hover:text-[#004C99] font-bold"
                      }
                    `}
                    onClick={() => setActiveSection("lost")}
                  >
                    Lost Items
                  </Button>
                  <Button
                    variant={activeSection === "found" ? "secondary" : "ghost"}
                    className={`flex-1 relative transition-colors rounded-[50px] text-sm py-2.5 h-auto
                      ${activeSection === "found" ? 
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0 after:bg-yellow-400 bg-yellow-400 text-[#003d99] hover:bg-yellow-500 font-bold" : 
                        "text-white hover:text-[#004C99] font-bold"
                      }
                    `}
                    onClick={() => setActiveSection("found")}
                  >
                    Found Items
                  </Button>
                  
                </div>
              </div>
            </div>
          )}

          {/* Search Section */}
          {(activeSection === "dashboard" || activeSection === "lost" || activeSection === "found") && (
            <div className="flex gap-4 mb-4 pb-10 mt-10">
              {/* Search Input */}
              <div className="flex-1 bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm rounded-full shadow-[0_20px_15px_rgba(75,159,255,0.1)] border border-[#4B9FFF]/30">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search lost and found items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-0 focus:ring-0 rounded-full h-12"
                  />
                </div>
              </div>

              {/* Categories Dropdown */}
              <div className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm rounded-full shadow-[0_20px_15px_rgba(75,159,255,0.1)] border border-[#4B9FFF]/30">
                <Select
                  value={searchCategory}
                  onValueChange={setSearchCategory}
                >
                  <SelectTrigger className="w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="personal items">Personal Items</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="bags">Bags</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Claim Status Dropdown - Only show for non-admin users */}
              {!isAdmin && (
                <div className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm rounded-full shadow-[0_20px_15px_rgba(75,159,255,0.1)] border border-[#4B9FFF]/30">
                  <Select
                    value={claimStatus}
                    onValueChange={setClaimStatus}
                  >
                    <SelectTrigger className="w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
                      <SelectValue placeholder="Claim Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="none">No Claims</SelectItem>
                      <SelectItem value="pending">Pending Claims</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort Dropdown */}
              <div className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F9FF] backdrop-blur-sm rounded-full shadow-[0_20px_15px_rgba(75,159,255,0.1)] border border-[#4B9FFF]/30">
                <Select
                  value={sortOrder}
                  onValueChange={setSortOrder}
                >
                  <SelectTrigger className="w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="a-z">A to Z</SelectItem>
                    <SelectItem value="z-a">Z to A</SelectItem>
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
    </div>
  )
}
