"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ExternalLink, Trash, Loader2, X, MapPin, Calendar, MoreVertical, CheckCircle, ArrowUpDown, Filter } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CATEGORIES } from '@/lib/constants'
import { API_BASE_URL } from "@/lib/api-config"
import { useAuth } from "@/lib/AuthContext"
import { QRCodeDialog } from "../dialogs/QRCodeDialog"
import AuthRequiredDialog from "../dialogs/AuthRequiredDialog"
import { toast } from "react-hot-toast"
import ClaimVerificationDialog from "../dialogs/ClaimVerificationDialog"
import { itemApi } from "@/lib/api-client"
import ClaimInstructionsDialog from "../dialogs/ClaimInstructionsDialog"

const staggerDelay = (index) => ({
  animationDelay: `${index * 0.1}s`
});

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

export default function ItemSection({ 
  items = [], 
  title,
  isAdmin = false,
  handleViewDetails,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [currentQRData, setCurrentQRData] = useState(null);
  const [generatingQRForItem, setGeneratingQRForItem] = useState(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedClaimItem, setSelectedClaimItem] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);

  useEffect(() => {
    const fetchProcesses = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
            const data = await response.json();
            setProcesses(data.$values || []);
        } catch (error) {
            console.error('Error fetching processes:', error);
        }
    };

    if (items.length > 0) {
        fetchProcesses();
    }
  }, [items]);

  useEffect(() => {
    setIsLoading(true);
    
    const filteredItems = items.filter(item => {
      // Category filter
      const matchesCategory = 
        searchCategory === "all" ? true :
        searchCategory === "others" ? 
          !CATEGORIES.includes(item.category?.toLowerCase()) :
          item.category?.toLowerCase() === searchCategory.toLowerCase();

      // Date filter
      const matchesDate = isDateInRange(item.dateReported, dateFilter);

      // Search terms
      if (searchQuery.trim()) {
        const searchTerms = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchTerms) ||
          item.location?.toLowerCase().includes(searchTerms) ||
          item.description?.toLowerCase().includes(searchTerms) ||
          item.category?.toLowerCase().includes(searchTerms);

        return matchesCategory && matchesSearch && matchesDate;
      }

      return matchesCategory && matchesDate;
    }).map(item => ({
      ...item,
      process: processes.find(p => p.itemId === item.id)
    }));
    
    setLocalItems(filteredItems);
    setIsLoading(false);
  }, [items, searchQuery, searchCategory, processes, dateFilter]);

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

  const canDelete = (item) => {
    return isAdmin || userId === item.reporterId;
  };

  const handleFoundThis = async (item) => {
    try {
      setGeneratingQRForItem(item.id);
      
      // Get the existing process for this item
      const processResponse = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      const processData = await processResponse.json();
      
      // Find the process that matches our item
      const process = processData.$values?.find(p => {
        const processItemId = p.itemId || p.ItemId;
        return processItemId === item.id;
      });

      if (!process) {
        throw new Error('No process found for this item');
      }

      const processId = process.id || process.Id;

      // Generate QR code data with the existing process ID
      const qrData = {
        p: processId,
        t: 'surrender'
      };

      setCurrentQRData(qrData);
      setShowQRDialog(true);
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(error.message || "Failed to generate QR code. Please try again.");
    } finally {
      setGeneratingQRForItem(null);
    }
  };

  const handleFoundThisClick = (item) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    handleFoundThis(item);
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
            requestorUserId: user.uid  // Using uid from Firebase auth
        };
        
        console.log('Submitting claim data:', claimData);  // Debug log
        
        const response = await itemApi.submitClaim(claimData);

        if (response.success) {
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

  const isButtonDisabled = (item) => {
    const process = processes.find(p => p.itemId === item.id);
    return (
        item.reporterId === user?.uid || // Current user is reporter
        process?.status === "claim_request" ||    // Already has a claim request
        process?.status === "in_verification" ||  // Already in verification
        process?.status === "verified" ||         // Already verified
        process?.status === "handed_over"         // Already handed over
    );
  };

  const getButtonText = (item) => {
    const process = processes.find(p => p.itemId === item.id);
    
    if (item.reporterId === user?.uid) {
        return "You reported this item";
    }
    if (process?.status === "claim_request") {
        return "Claim request pending";
    }
    if (process?.status === "in_verification") {
        return "In verification";
    }
    if (process?.status === "verified") {
        return "Already verified";
    }
    if (process?.status === "handed_over") {
        return "Item handed over";
    }
    return "This is mine";
  };

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

  if (!localItems.length) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No {title.toLowerCase()} found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {localItems.map((item, index) => (
          <Card 
            key={item.id}
            id={`item-${item.id}`}
            className={`bg-white overflow-hidden shadow-[0_15px_20px_rgba(0,0,0,0.25)] 
              hover:shadow-md transition-all duration-300 border border-gray-200/80 
              relative group animate-slideUp ${
                (isAdmin || (!isAdmin && item.status?.toLowerCase() === "lost")) ? 
                'cursor-pointer' : ''
              }`}
            onClick={() => {
              if (isAdmin || (!isAdmin && item.status?.toLowerCase() === "lost")) {
                handleViewDetails(item);
              }
            }}
            style={{
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both',
              opacity: 0
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

            {/* Updated animation wrapper with transform-gpu for smoother animations */}
            <div 
              className="animate-slideUp transform-gpu"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
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
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                          {item.category}
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
                                e.stopPropagation(); // Prevent card click when clicking this button
                                handleFoundThisClick(item);
                              }}
                              disabled={generatingQRForItem === item.id}
                            >
                              {generatingQRForItem === item.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating QR...
                                </>
                              ) : (
                                <>
                                  <Package className="h-4 w-4 mr-2" />
                                  I Found This
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                              onClick={() => handleClaimClick(item)}
                              disabled={isButtonDisabled(item)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {getButtonText(item)}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

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

      {/* QR Code Dialog */}
      {showQRDialog && currentQRData && (
        <QRCodeDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          qrData={currentQRData}
          title="Found Item QR Code"
          description="Please take a screenshot of this QR code and present it to the Lost & Found office when surrendering the item. The office will scan this code to verify the item."
          instructions={[
            "1. Take a screenshot or save this QR code",
            "2. Bring the found item to the Lost & Found office",
            "3. Present this QR code when surrendering the item",
            "4. Office staff will verify the item matches the description"
          ]}
        />
      )}

      {/* Auth Dialog */}
      <AuthRequiredDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />

      {/* Claim Instructions Dialog */}
      <ClaimInstructionsDialog
        isOpen={showInstructionsDialog}
        onClose={() => setShowInstructionsDialog(false)}
      />
    </div>
  );
} 