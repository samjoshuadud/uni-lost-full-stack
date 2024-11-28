"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants'
import { Package, ExternalLink, Trash, Loader2, X, CheckCircle, MapPin, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ProcessStatus, ProcessMessages } from '@/lib/constants'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { API_BASE_URL } from '@/lib/api-config'
export default function DashboardSection({ 
  items = [], 
  handleViewDetails,
  isAdmin = false,
  userId = null,
  onDelete,
  onUnapprove,
  searchQuery = "",
  searchCategory = "all"
}) {
  const { userData } = useAuth();
  const [localItems, setLocalItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update useEffect to handle loading state better
  useEffect(() => {
    if (isInitialLoad) {
      setIsLoading(true);
      // Filter items based on search criteria
      const filteredItems = items.filter(item => {
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

      setLocalItems(filteredItems);
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Filter items based on search criteria
      const filteredItems = items.filter(item => {
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

      setLocalItems(filteredItems);
    }
  }, [items, searchQuery, searchCategory, isInitialLoad]);

  // Add loading skeleton UI
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="w-full h-48 mb-4">
                <Skeleton className="w-full h-full rounded-lg" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-[100px]" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <p className="font-medium text-muted-foreground">No approved items found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localItems.map((item) => (
        <Card 
          key={item.id} 
          id={`item-${item.id}`}
          className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200/80 relative group"
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
          <div className="bg-gradient-to-r from-[#0052cc] to-[#0065ff] p-4">
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
                // Admin sees the actual image
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
                // Non-admin sees a placeholder with message
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                  <div className="bg-gray-100/80 p-6 rounded-lg backdrop-blur-sm">
                    <Package className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm text-center px-4">
                      Image is hidden for security. Contact admin to view full details.
                    </p>
                  </div>
                </div>
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
                      <Button 
                        className="bg-[#0052cc] text-white hover:bg-[#0052cc]/90 shadow-sm"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                    >
                      {item.status?.toLowerCase() === "lost" ? (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          I Found This
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          This Is Mine
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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
    </div>
  );
} 
