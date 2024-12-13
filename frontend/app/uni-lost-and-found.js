"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Search, User, Loader2, LogOut, X } from "lucide-react"
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
import AboutUs from "./components/sections/About-us"

// Import dialogs
import ReportConfirmDialog from "./components/dialogs/ReportConfirmDialog"
import VerificationDialog from "./components/dialogs/VerificationDialog"
import VerificationSuccessDialog from "./components/dialogs/VerificationSuccessDialog"
import VerificationFailDialog from "./components/dialogs/VerificationFailDialog"

import { ItemStatus, ProcessStatus, ProcessMessages } from "@/lib/constants";
import { authApi, itemApi } from '@/lib/api-client';
import { API_BASE_URL } from '@/lib/api-config';
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { addDays } from "date-fns" 
import { Toaster, toast } from 'sonner'

const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .bg-pattern {
    background-image: url('/images/bg.jpeg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    background-repeat: no-repeat;
  }

  .bg-overlay {
    background: rgba(248, 249, 250, 0.80);  /* Adjust the last value (0.95) for transparency */
  }

  @keyframes tabFadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tab-content-enter {
    animation: tabFadeIn 0.3s ease forwards;
  }

  .active-tab-indicator {
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: #FCD34D;
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  .grid-container {
    will-change: transform, opacity;
    transform-origin: center top;
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
  const { user, isAdmin, loading: authLoading, makeAuthenticatedRequest, logout } = useAuth();
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

  const renderSection = () => {
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
          dateFilter={dateFilter || { from: null, to: null }}
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
          dateFilter={dateFilter || { from: null, to: null }}
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
          dateFilter={dateFilter || { from: null, to: null }}
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
      case "about":
        return <AboutUs />;
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
                // Set items first
                setItems(data.$values);
                setIsLoading(false);

                // Calculate count based on:
                // 1. User's regular processes (where UserId matches)
                // 2. User's claim processes (where RequestorUserId matches)
                // 3. Exclude awaiting_surrender status
                const newCount = data.$values.filter(process => 
                      process.status !== ProcessStatus.AWAITING_SURRENDER && (
                        process.userId === user.uid || 
                        (process.requestorUserId === user.uid && process.status === ProcessStatus.CLAIM_REQUEST)
                    )
                ).length;

                // Calculate total pending count (all statuses except AWAITING_SURRENDER and APPROVED)
                const newTotalCount = data.$values.filter(process => 
                    process.status !== ProcessStatus.AWAITING_SURRENDER && 
                    process.status !== ProcessStatus.APPROVED &&
                    process.status !== ProcessStatus.HANDED_OVER &&
                    process.status !== ProcessStatus.NO_SHOW
                ).length;

                setPendingProcessCount(prevCount => {
                    if (prevCount !== newCount) {
                        return newCount;
                    }
                    return prevCount;
                });

                setTotalPendingCount(newTotalCount);
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
  }, [user, authLoading]);

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

  // Update the date filter state to handle ranges
  const [dateFilter, setDateFilter] = useState({ from: null, to: null });

  // Add this helper function
  const isDateInRange = (date, range) => {
    if (!range.from && !range.to) return true;
    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);

    if (range.from && range.to) {
      const from = new Date(range.from);
      const to = new Date(range.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      return itemDate >= from && itemDate <= to;
    }

    if (range.from) {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      return itemDate >= from;
    }

    if (range.to) {
      const to = new Date(range.to);
      to.setHours(0, 0, 0, 0);
      return itemDate <= to;
    }

    return true;
  };

  // Update the date filter UI in the filters section
  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
    {/* Categories Dropdown */}
    <div className="flex-1 sm:flex-none bg-white rounded-full shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-[#0F3A99]">
      <Select value={searchCategory} onValueChange={setSearchCategory}>
        <SelectTrigger className="w-full sm:w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="Books">Books</SelectItem>
          <SelectItem value="Electronics">Electronics</SelectItem>
          <SelectItem value="Personal Items">Personal Items</SelectItem>
          <SelectItem value="Documents">Documents</SelectItem>
          <SelectItem value="Bags">Bags</SelectItem>
          <SelectItem value="others">Others</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Date Filter */}
    <div className="flex-1 sm:flex-none flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full sm:w-[280px] justify-start text-left font-normal bg-white 
              rounded-full h-12 border-[#0F3A99] shadow-[0_20px_15px_rgba(0,0,0,0.2)]
              ${(!dateFilter?.from && !dateFilter?.to) ? "text-muted-foreground" : ""}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {dateFilter?.from ? (
                dateFilter?.to ? (
                  <>
                    {format(dateFilter.from, "MMM d")} - {format(dateFilter.to, "MMM d, yyyy")}
                  </>
                ) : (
                  format(dateFilter.from, "MMM d, yyyy")
                )
              ) : (
                "Pick a date range"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateFilter?.from}
            selected={{
              from: dateFilter?.from || null,
              to: dateFilter?.to || null,
            }}
            onSelect={setDateFilter}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {(dateFilter?.from || dateFilter?.to) && (
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12 border border-[#0F3A99] ml-2"
          onClick={() => setDateFilter({ from: null, to: null })}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>

    {/* Sort Dropdown */}
    <div className="flex-1 sm:flex-none bg-white rounded-full shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-[#0F3A99]">
      <Select value={sortOrder} onValueChange={setSortOrder}>
        <SelectTrigger className="w-full sm:w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
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

  useEffect(() => {
    const handleNewItem = (event) => {
      if (!isAdmin) return;
      
      const { item, type, processId } = event.detail;
      
      toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-[400px] bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black/5 overflow-hidden`}>
          <div className={`w-1.5 ${type === 'found' ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <div className="flex items-start p-4 gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              type === 'found' ? 'bg-green-100 text-green-500' : 'bg-yellow-100 text-yellow-500'
            }`}>
              {type === 'found' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-gray-900">
                    New {type} Item Report
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 font-medium">
                    {item.name || item.Name}
                  </p>
                </div>
                <span className={`ml-3 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {type.toUpperCase()}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center rounded px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {item.category || item.Category}
                </span>
                <span>•</span>
                <span>{item.location || item.Location}</span>
              </div>
            </div>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right'
      });
    };

    window.addEventListener('newItemReported', handleNewItem);
    return () => window.removeEventListener('newItemReported', handleNewItem);
  }, [isAdmin]);

  // Add this at the component level, before the useEffects
  const lastKnownCountRef = useRef(0);
  const lastCheckedTimeRef = useRef(0);

  // Then modify the polling effect
  useEffect(() => {
    if (!isAdmin) return;
    
    const checkNewPendingItems = async () => {
      try {
        const now = Date.now();
        // Prevent checking too frequently
        if (now - lastCheckedTimeRef.current < 5000) return;
        lastCheckedTimeRef.current = now;

        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        const data = await response.json();
        
        if (!data?.$values) return;
        
        const pendingItems = data.$values.filter(process => 
          process.status === ProcessStatus.PENDING_APPROVAL
        );
        
        const currentCount = pendingItems.length;
        
        if (lastKnownCountRef.current > 0 && currentCount > lastKnownCountRef.current) {
          const newCount = currentCount - lastKnownCountRef.current;
          
          toast.custom((t) => (
            <div className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-[400px] bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black/5 overflow-hidden`}>
              <div className={`w-1.5 bg-blue-500`} />
              <div className="flex items-start p-4 gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-medium text-gray-900">
                        Pending Items Update
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {newCount} new item{newCount > 1 ? 's' : ''} pending approval
                      </p>
                    </div>
                    <span className="ml-3 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      NEEDS ATTENTION
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ), {
            duration: 5000,
            position: 'top-right'
          });
        }
        
        lastKnownCountRef.current = currentCount;
        
      } catch (error) {
        console.error('Error checking for new pending items:', error);
      }
    };

    // Initial check
    checkNewPendingItems();

    // Set up interval
    const interval = setInterval(checkNewPendingItems, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isAdmin]);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-pattern"></div>
      <div className="fixed inset-0 bg-overlay"></div>
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
        <header className="bg-gradient-to-r from-[#023265] to-[#004C99] shadow-md border-b border-[#004C99]/50">
          <div className="container mx-auto px-4 py-4">
            {/* Main Header Content */}
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Logo and Title Section */}
              <div className="flex items-center gap-4">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                >
                  <Image 
                    src="/logo/logo.png" 
                    alt="UMAK Logo" 
                    width={48} 
                    height={48} 
                    className="rounded-full bg-white/95 p-1.5 shadow-md group-hover:shadow-lg transition-all duration-300
                      transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-yellow-400 tracking-tight">
                    Lost & Found
                  </h1>
                  <span className="text-sm text-yellow-400/80">
                    University of Makati
                  </span>
                </div>
              </div>

              {/* Navigation Section */}
              <nav className="flex flex-wrap items-center justify-center gap-3 lg:ml-auto">
                <div className="flex flex-wrap justify-center gap-2">
                  {isAdmin ? (
                    <Button 
                      variant="ghost"
                      className={`
                        text-white transition-all duration-200 px-4 py-2 h-auto
                        hover:bg-white/10 hover:text-yellow-400
                        relative after:absolute after:bottom-0 after:left-0 after:right-0 
                        after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                        after:transition-transform after:duration-300
                        ${activeSection === "dashboard" ? 
                          "after:scale-x-100 font-semibold" : 
                          "after:scale-x-0"
                        }
                      `}
                      onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                    >
                      View Items
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="ghost"
                        className={`
                          text-white transition-all duration-200 px-4 py-2 h-auto
                          hover:bg-white/10 hover:text-yellow-400
                          relative after:absolute after:bottom-0 after:left-0 after:right-0 
                          after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                          after:transition-transform after:duration-300
                          ${activeSection === "dashboard" ? 
                            "after:scale-x-100 font-semibold" : 
                            "after:scale-x-0"
                          }
                        `}
                        onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                      >
                        Home
                      </Button>
                      <Button 
                        variant="ghost"
                        className={`
                          text-white transition-all duration-200 px-4 py-2 h-auto
                          hover:bg-white/10 hover:text-yellow-400
                          relative after:absolute after:bottom-0 after:left-0 after:right-0 
                          after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                          after:transition-transform after:duration-300
                          ${activeSection === "report" ? 
                            "after:scale-x-100 font-semibold" : 
                            "after:scale-x-0"
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
                            className={`
                              text-white transition-all duration-200 px-4 py-2 h-auto
                              hover:bg-white/10 hover:text-yellow-400
                              relative after:absolute after:bottom-0 after:left-0 after:right-0 
                              after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                              after:transition-transform after:duration-300
                              ${activeSection === "pending_process" ? 
                                "after:scale-x-100 font-semibold" : 
                                "after:scale-x-0"
                              }
                            `}
                            onClick={() => { setActiveSection("pending_process"); setSelectedItem(null); }}
                          >
                            <span className="relative">
                              Pending Process
                              {pendingProcessCount > 0 && (
                                <span className="absolute -top-3 -right-3 bg-yellow-400 text-[#0052cc] 
                                  rounded-full px-2 py-0.5 text-xs font-medium min-w-[20px] text-center">
                                  {pendingProcessCount}
                                </span>
                              )}
                            </span>
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="ghost"
                        className={`
                          text-white transition-all duration-200 px-4 py-2 h-auto
                          hover:bg-white/10 hover:text-yellow-400
                          relative after:absolute after:bottom-0 after:left-0 after:right-0 
                          after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                          after:transition-transform after:duration-300
                          ${activeSection === "about" ? 
                            "after:scale-x-100 font-semibold" : 
                            "after:scale-x-0"
                          }
                        `}
                        onClick={() => { setActiveSection("about"); setSelectedItem(null); }}
                      >
                        About Us
                      </Button>
                    </>
                  )}
                </div>
                
                {/* User Profile & Login Section */}
                <div className="ml-2 flex items-center">
                  {user ? (
                    <div className="flex items-center gap-2">
                      {/* Only show profile button for non-admin users */}
                      {!isAdmin && (
                        <motion.button
                          onClick={() => { setActiveSection("profile"); setSelectedItem(null); }}
                          className={`
                            text-white transition-all duration-200 px-4 py-2 h-auto
                            hover:bg-white/10 hover:text-yellow-400
                            relative after:absolute after:bottom-0 after:left-0 after:right-0 
                            after:h-0.5 after:bg-yellow-400 after:scale-x-0 hover:after:scale-x-100
                            after:transition-transform after:duration-300
                            ${activeSection === "profile" ? 
                              "after:scale-x-100 font-semibold bg-white/10" : 
                              "after:scale-x-0"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                                <User className="h-4 w-4 text-yellow-400" />
                              </div>
                              {/* Online indicator */}
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#023265]"></div>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium leading-none">My Profile</span>
                              <span className="text-xs text-yellow-400/70 leading-none mt-1">
                                {user.email?.split('@')[0]?.substring(0, 15)}
                                {user.email?.split('@')[0]?.length > 15 ? '...' : ''}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      )}

                      {/* Logout Button */}
                      <Button
                        variant="ghost"
                        onClick={logout}
                        className="
                          relative group
                          ml-2 px-4 py-2 h-auto
                          text-white/90 
                          hover:text-red-400
                          hover:bg-white/10
                          transition-all duration-300
                          flex items-center gap-2.5
                          rounded-full
                          border border-transparent
                          hover:border-red-400/20
                          hover:shadow-[0_0_15px_rgba(248,113,113,0.1)]
                          active:scale-95
                        "
                      >
                        <div className="p-1.5 rounded-full bg-white/10 
                          group-hover:bg-red-400/10 transition-colors duration-300"
                        >
                          <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <span className="text-sm font-medium">Logout</span>
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="
                        bg-yellow-400/20 hover:bg-yellow-400/30
                        text-yellow-400 hover:text-yellow-400
                        transition-colors duration-200
                        px-4 py-2 h-auto
                        rounded-full
                        border border-yellow-400/30
                      "
                      onClick={() => setShowAuthDialog(true)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-4 md:py-8">
          {/* Admin Cards */}
          {user && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
              <Card className="bg-white shadow-sm border border-gray-200 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
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

              <Card className="bg-white shadow-sm border border-gray-200 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
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
            !["profile", "report", "pending_process", "about"].includes(activeSection) && (
            <div className="mb-6">
              <motion.div 
                className="bg-[#2E3F65] rounded-[40px] shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-blue-900 p-2 max-w-[950px] mx-auto"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1">
                  {[
                    { id: "dashboard", label: "Home" },
                    { id: "lost", label: "Lost Items" },
                    { id: "found", label: "Found Items" }
                  ].map((tab) => (
                    <motion.div
                      key={tab.id}
                      className="relative flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={activeSection === tab.id ? "secondary" : "ghost"}
                        className={`
                          w-full relative transition-all duration-300 rounded-[50px] 
                          text-sm py-2.5 h-auto font-bold
                          ${activeSection === tab.id 
                            ? "bg-yellow-400 text-[#003d99] hover:bg-yellow-500" 
                            : "text-white hover:text-[#004C99] hover:bg-white/10"
                          }
                        `}
                        onClick={() => {
                          setActiveSection(tab.id);
                        }}
                      >
                        {tab.label}
                        {activeSection === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-yellow-400 rounded-[50px] -z-10"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 35
                            }}
                          />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Search Section */}
          {(activeSection === "dashboard" || activeSection === "lost" || activeSection === "found") && (
            <div className="flex flex-col md:flex-row gap-4 mb-4 pb-6 md:pb-10 mt-6 md:mt-10">
              {/* Search Input */}
              <div className="flex-1 bg-white rounded-full shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-[#0F3A99]">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search lost and found items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-0 focus:ring-0 rounded-full h-12 w-full"
                  />
                </div>
              </div>

              {/* Filters Container */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Categories Dropdown */}
                <div className="flex-1 sm:flex-none bg-white rounded-full shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-[#0F3A99]">
                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger className="w-full sm:w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Personal Items">Personal Items</SelectItem>
                      <SelectItem value="Documents">Documents</SelectItem>
                      <SelectItem value="Bags">Bags</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div className="flex-1 sm:flex-none flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full sm:w-[280px] justify-start text-left font-normal bg-white 
                          rounded-full h-12 border-[#0F3A99] shadow-[0_20px_15px_rgba(0,0,0,0.2)]
                          ${(!dateFilter?.from && !dateFilter?.to) ? "text-muted-foreground" : ""}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {dateFilter?.from ? (
                            dateFilter?.to ? (
                              <>
                                {format(dateFilter.from, "MMM d")} - {format(dateFilter.to, "MMM d, yyyy")}
                              </>
                            ) : (
                              format(dateFilter.from, "MMM d, yyyy")
                            )
                          ) : (
                            "Pick a date range"
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateFilter?.from}
                        selected={{
                          from: dateFilter?.from || null,
                          to: dateFilter?.to || null,
                        }}
                        onSelect={setDateFilter}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateFilter?.from || dateFilter?.to) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-12 w-12 border border-[#0F3A99] ml-2"
                      onClick={() => setDateFilter({ from: null, to: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex-1 sm:flex-none bg-white rounded-full shadow-[0_20px_15px_rgba(0,0,0,0.2)] border border-[#0F3A99]">
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full sm:w-[180px] border-0 focus:ring--1 rounded-full h-12 bg-transparent">
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
            </div>
          )}

          {/* Main Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeInOut"
                }}
                className="grid-container"
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
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
      <Toaster 
        position="top-right"
        expand={true}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'transparent',
            padding: 0,
            margin: 0,
            boxShadow: 'none',
          },
          className: 'transform-gpu',
        }}
      />
    </div>
  )
}
