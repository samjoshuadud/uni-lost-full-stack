"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants, ItemCategories } from '@/lib/constants'
import { Package, ExternalLink, Trash, Loader2, X, CheckCircle, MapPin, Calendar, ArrowUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ProcessStatus, ProcessMessages } from '@/lib/constants'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { API_BASE_URL } from '@/lib/api-config'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter } from "lucide-react"
import { toast } from "react-hot-toast"
import AuthRequiredDialog from "../dialogs/AuthRequiredDialog"
import ClaimVerificationDialog from "../dialogs/ClaimVerificationDialog"
import { itemApi } from "@/lib/api-client"
import { motion, AnimatePresence } from "framer-motion";
import ClaimInstructionsDialog from "../dialogs/ClaimInstructionsDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const staggerDelay = (index) => ({
  animationDelay: `${index * 0.1}s`
});

const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 0.5
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const loadingVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

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

export default function DashboardSection({ 
  items = [], 
  handleViewDetails,
  isAdmin = false,
  userId = null,
  onDelete,
  onUnapprove,
  searchQuery = "",
  searchCategory = "all",
  dateFilter = null
}) {
  const { userData, user } = useAuth();
  const [localItems, setLocalItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedClaimItem, setSelectedClaimItem] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);

  // Move the highlight effect here, before other useEffects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const highlightId = urlParams.get('highlight');
      const shouldDelay = urlParams.get('delay') === 'true';

      if (highlightId) {
        const delay = shouldDelay ? 8000 : 100;

        setTimeout(() => {
          const findAndHighlightItem = () => {
            const itemElement = document.getElementById(highlightId);
            if (itemElement) {
              itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              itemElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
              itemElement.style.boxShadow = '0 0 0 3px rgb(0, 82, 204), 0 8px 20px -4px rgba(0, 82, 204, 0.3)';
              itemElement.style.transform = 'scale(1.02)';
              itemElement.style.zIndex = '50';
              
              const pulseAnimation = itemElement.animate([
                { boxShadow: '0 0 0 3px rgba(0, 82, 204, 0.8), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' },
                { boxShadow: '0 0 0 6px rgba(0, 82, 204, 0.2), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' },
                { boxShadow: '0 0 0 3px rgba(0, 82, 204, 0.8), 0 8px 20px -4px rgba(0, 82, 204, 0.3)' }
              ], {
                duration: 1500,
                iterations: 2
              });
              
              setTimeout(() => {
                itemElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                itemElement.style.boxShadow = '';
                itemElement.style.transform = '';
                itemElement.style.zIndex = '';
              }, 3000);
            } else {
              setTimeout(findAndHighlightItem, 100);
            }
          };

          findAndHighlightItem();
        }, delay);
      }
    }
  }, []);  // Empty dependency array

  // Separate useEffect for fetching processes
  useEffect(() => {
    const fetchProcesses = async () => {
        try {
            const data = await itemApi.getAllPending(); 
            
            setProcesses(data.$values || []);
        } catch (error) {
            console.error('Error fetching processes:', error);
        }
    };

    if (items.length > 0) {
        fetchProcesses();
    }
  }, [items]); // Only re-fetch when items change

  // Separate useEffect for filtering items
  useEffect(() => {
    setIsLoading(true);
    
    const filteredItems = items.filter(item => {
      // Category filter - Consolidate "others" categories
      const itemCategory = item.category?.toLowerCase() || '';
      const searchCat = searchCategory.toLowerCase();
      const matchesCategory = 
        searchCategory === "all" || 
        (searchCat === "others" 
          ? itemCategory.startsWith("others") 
          : itemCategory === searchCat);

      // Date filter
      const matchesDate = isDateInRange(item.dateReported, dateFilter);

      // Search terms
      if (searchQuery.trim()) {
        const searchTerms = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchTerms) ||
          item.location?.toLowerCase().includes(searchTerms) ||
          item.description?.toLowerCase().includes(searchTerms) ||
          itemCategory.includes(searchTerms);

        return matchesCategory && matchesSearch && matchesDate;
      }

      return matchesCategory && matchesDate;
    }).map(item => {
      const itemCategory = item.category?.toLowerCase() || '';
      const isOthers = itemCategory.startsWith('others');
      
      // Extract specification from others category
      let othersSpec = '';
      if (isOthers && itemCategory.includes('-')) {
        othersSpec = item.category.split('-')[1].trim();
      }

      return {
        ...item,
        // Normalize the category display and keep specification
        category: isOthers ? "Others" : item.category,
        othersSpecification: othersSpec,
        process: processes.find(p => p.itemId === item.id)
      };
    });
    
    setLocalItems(filteredItems);
    setIsLoading(false);
  }, [items, searchQuery, searchCategory, processes, dateFilter]);

  // Add loading skeleton UI
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="bg-white rounded-lg overflow-hidden shadow-[0_15px_20px_rgba(0,0,0,0.1)] border border-gray-200/80 animate-pulse"
            style={staggerDelay(i)}
          >
            {/* Header Skeleton */}
            <div className="p-4 bg-gradient-to-r from-[#0F3A99]/10 to-[#0873E0]/10">
              <div className="h-6 w-3/4 bg-[#0F3A99]/10 rounded-full mb-2"></div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-[#0F3A99]/10"></div>
                <div className="h-4 w-1/2 bg-[#0F3A99]/10 rounded-full"></div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-4">
              {/* Image Placeholder */}
              <div className="w-full h-48 mb-4 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-shimmer"></div>
              </div>

              {/* Details Skeleton */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-gray-200"></div>
                  <div className="h-6 w-24 rounded-full bg-gray-200"></div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-24 rounded bg-gray-200"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-[120px] rounded-md bg-[#0F3A99]/10"></div>
                    <div className="h-9 w-9 rounded-md bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Function to check if user can delete
  const canDelete = (item) => {
    return isAdmin || userId === item.reporterId;
  };

  const handleDeleteClick = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeletingItemId(itemToDelete.id);
      await onDelete(itemToDelete.id);
      setLocalItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
    } finally {
      setDeletingItemId(null);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Add local handler for unapprove
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

      // Update local state immediately
      setLocalItems(prevItems => prevItems.filter(item => item.id !== itemId));

    } catch (error) {
      console.error('Error unapproving item:', error);
    }
  };

  const handleClaimClick = (item) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    setShowInstructionsDialog(true);
  };

  const handleClaimSubmit = async (answers, additionalInfo) => {
    try {
      if (!user || !user.uid) {
        toast.error("You must be logged in to claim an item");
        return;
      }

      const claimData = {
        itemId: selectedClaimItem.id,
        questions: answers,
        additionalInfo: additionalInfo,
        requestorUserId: user.uid
      };
      
      console.log('Submitting claim data:', claimData);
      
      const response = await itemApi.submitClaim(claimData);

      if (response.success) {
        // Update local state to reflect the new claim status
        setLocalItems(prevItems => 
          prevItems.map(item => 
            item.id === selectedClaimItem.id 
              ? {
                  ...item,
                  process: {
                    ...item.process,
                    status: ProcessStatus.CLAIM_REQUEST
                  }
                }
              : item
          )
        );

        toast.success("Your claim has been submitted for review");
        setShowClaimDialog(false);
        setSelectedClaimItem(null);
      } else {
        toast.error(response.message || "Failed to submit claim");
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error("Failed to submit claim. Please try again.");
    }
  };

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Only show "No approved items" if we're not loading and there are no items
  if (!isLoading && !localItems.length) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No Available Items to Claim</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Check back later for items that you can claim
          </p>
        </CardContent>
      </Card>
    );
  }

  const isButtonDisabled = (process) => {
    return (
        process.item.reporterId === user?.uid || // Current user is reporter
        process.status === "claim_request" ||    // Already has a claim request
        process.status === "in_verification" ||  // Already in verification
        process.status === "verified" ||         // Already verified
        process.status === "handed_over"         // Already handed over
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="loading"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                variants={loadingVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <Card className="bg-white overflow-hidden shadow-sm border border-gray-200 h-full">
                  {/* ... skeleton content ... */}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : !localItems.length ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 200,
                damping: 20
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              transition: {
                duration: 0.2
              }
            }}
          >
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No Available Items to Claim</p>
                <p className="text-sm text-muted-foreground/80 mt-2">
                  Check back later for items that you can claim
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {localItems.map((item, index) => (
                <motion.div
                  key={`${item.id}-${searchCategory}-${searchQuery}`}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  layoutId={item.id}
                  className="h-full"
                  style={{
                    transformOrigin: "center center",
                    position: "relative"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { 
                      duration: 0.2,
                      ease: "easeOut"
                    }
                  }}
                >
                  <Card 
                    id={`item-${item.id}`}
                    className={`bg-white overflow-hidden shadow-[0_15px_20px_rgba(0,0,0,0.25)] 
                      hover:shadow-xl transition-all duration-300 border border-gray-200/80 
                      relative group h-full transform-gpu ${
                        (isAdmin || (!isAdmin && item.status?.toLowerCase() === "lost")) ? 
                        'cursor-pointer' : ''
                      }`}
                    onClick={() => {
                      if (isAdmin || (!isAdmin && item.status?.toLowerCase() === "lost")) {
                        handleViewDetails(item);
                      }
                    }}
                  >
                    {/* Status Badge - Moved outside header for better visibility */}
                    <Badge 
                      variant="outline"
                      className={`absolute top-3 right-3 z-10 ${
                        item.status?.toLowerCase() === "lost" 
                          ? "bg-yellow-400 text-blue-900 border-yellow-500" 
                          : "bg-green-500 text-white border-green-600"
                      } capitalize font-medium shadow-sm`}
                    >
                      {item.status}
                    </Badge>

                    {/* Card Header */}
                    <div className="p-4" style={{ background: "linear-gradient(to right, #0F3A99 50%, #0A60C8 83%, #0873E0 100%)", }}>
                      <div className="mb-2">
                        <h3 className="font-semibold text-lg text-white truncate">{item.name}</h3>
                      </div>
                      <p className="text-sm text-white/90 truncate flex items-center">
                        <MapPin className="h-4 w-4 mr-1 opacity-70" />
                        {item.location}
                      </p>
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-4">
                      {/* Image Section */}
                      <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-100 shadow-inner relative group-hover:shadow-md transition-all duration-300">
                        {isAdmin ? (
                          // Admin sees all images
                          item.imageUrl ? (
                            <div className="w-full h-full relative">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover transition-all duration-500 ease-in-out group-hover:scale-[1.01]"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden w-full h-full absolute top-0 left-0 bg-gray-100 flex-col items-center justify-center text-gray-500">
                                <Package className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-xs">{item.category || 'Item'} Image</p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                              <Package className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-xs">{item.category || 'Item'} Image</p>
                            </div>
                          )
                        ) : (
                          // Non-admin: Show image only for lost items
                          item.status?.toLowerCase() === "lost" ? (
                            item.imageUrl ? (
                              <div className="w-full h-full relative">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-all duration-500 ease-in-out group-hover:scale-[1.01]"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden w-full h-full absolute top-0 left-0 bg-gray-100 flex-col items-center justify-center text-gray-500">
                                  <Package className="h-8 w-8 mb-2 opacity-50" />
                                  <p className="text-xs">{item.category || 'Item'} Image</p>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                                <Package className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-xs">{item.category || 'Item'} Image</p>
                              </div>
                            )
                          ) : (
                            // Found items show placeholder
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                              <div className="bg-gray-100/80 p-6 rounded-lg backdrop-blur-sm">
                                <Package className="h-12 w-12 mb-3 opacity-50" />
                                <p className="text-sm text-center px-4">
                                  Image is hidden for security. Contact admin to view full details.
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {/* Description and Actions */}
                      <div className="space-y-4">
                        {isAdmin ? (
                          <>
                            <p className="text-gray-600 text-sm line-clamp-2">
                              {item.description}
                            </p>
                            {item.additionalDescriptions?.$values?.length > 0 && (
                              <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                                +{item.additionalDescriptions.$values.length} additional details
                              </p>
                            )}
                          </>
                        ) : (
                          // Non-admin sees minimal info
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-gray-100/80">
                                {item.category === "Others" && item.othersSpecification 
                                  ? `Others - ${item.othersSpecification}`
                                  : item.category}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-4 w-4 mr-1 opacity-70" />
                            {new Date(item.dateReported).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            {isAdmin ? (
                              <>
                                {canDelete(item) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="border-gray-200 hover:bg-gray-50"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {item.status?.toLowerCase() === "found" && item.approved && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            try {
                                              // First get all processes to find the correct processId
                                              const processResponse = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
                                              const processData = await processResponse.json();
                                              
                                              // Find the process that matches our item
                                              const process = processData.$values?.find(p => {
                                                const processItemId = p.itemId || p.ItemId;
                                                return processItemId === item.id;
                                              });

                                              if (!process) {
                                                console.error('No process found for item:', item.id);
                                                return;
                                              }

                                              const processId = process.id || process.Id;

                                              // Call the hand-over endpoint
                                              const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/hand-over`, {
                                                method: 'PUT',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                }
                                              });

                                              if (!response.ok) {
                                                throw new Error('Failed to mark item as handed over');
                                              }

                                              // Update local state to remove the item
                                              setLocalItems(prevItems => prevItems.filter(i => i.id !== item.id));

                                            } catch (error) {
                                              console.error('Error marking item as handed over:', error);
                                              // You might want to show an error message to the user here
                                            }
                                          }}
                                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Handed Over
                                        </DropdownMenuItem>
                                      )}
                                      {isAdmin && (
                                        <DropdownMenuItem
                                          onClick={() => onUnapprove(item.id)}
                                          className="text-gray-600 hover:text-[#0052cc] hover:bg-blue-50"
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Unapprove
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setItemToDelete(item);
                                          setShowDeleteDialog(true);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        {deletingItemId === item.id ? (
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
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </>
                            ) : (
                              <>
                                {item.status?.toLowerCase() === "lost" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!user) {
                                        setShowAuthDialog(true);
                                        return;
                                      }
                                      setShowSurrenderDialog(true);
                                    }}
                                  >
                                    <Package className="h-4 w-4 mr-2" />
                                    I Found This
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                                    onClick={() => handleClaimClick(item)}
                                    disabled={
                                        userId === item.reporterId ||
                                        item.process?.status === "claim_request" ||
                                        item.process?.status === "in_verification" ||
                                        item.process?.status === "verified" ||
                                        item.process?.status === "handed_over"
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {userId === item.reporterId 
                                        ? "You reported this item" 
                                        : item.process?.status === "claim_request"
                                        ? "Claim request pending"
                                        : "This is mine"
                                    }
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItemId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingItemId !== null}
            >
              {deletingItemId !== null ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Auth Dialog */}
      <AuthRequiredDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />

      {/* Add ClaimInstructionsDialog */}
      <ClaimInstructionsDialog
        isOpen={showInstructionsDialog}
        onClose={() => setShowInstructionsDialog(false)}
      />

      {/* Surrender Instructions Dialog */}
      <Dialog open={showSurrenderDialog} onOpenChange={setShowSurrenderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Surrender Found Item
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Thank you for finding this item! Please follow these instructions to surrender it:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Surrender Location:</h4>
              <p className="text-blue-800">
                OHSO (Occupational Health & Safety Office)
                <br />
                Admin Building Basement
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Important Notes:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Please bring the found item to the OHSO office during office hours (8:00 AM - 5:00 PM, Monday to Friday)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>The staff will verify and document the surrendered item</span>
                </li>
              
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowSurrenderDialog(false)}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setShowSurrenderDialog(false);
                toast.success("Thank you for your help! Please surrender the item to OHSO office.");
              }}
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

