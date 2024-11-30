"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ExternalLink, Trash, Loader2, X, MapPin, Calendar, MoreVertical, CheckCircle, ArrowUpDown, Filter } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ItemCategories } from '@/lib/constants'

export default function ItemSection({ 
  items = [], 
  title,
  isAdmin = false,
  handleViewDetails,
  userId = null,
  onDelete,
  onUnapprove,
  searchQuery = "",
  searchCategory = "all"
}) {
  const [localItems, setLocalItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  useEffect(() => {
    setIsLoading(true);
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
    setIsLoading(false);
  }, [items, searchQuery, searchCategory]);

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-white overflow-hidden shadow-sm border border-gray-200">
            <div className="bg-[#0052cc] p-4 animate-pulse">
              <div className="h-6 w-2/3 bg-white/20 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-white/20 rounded"></div>
            </div>
            <CardContent className="p-4">
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-gray-100 rounded"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-100 rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 bg-gray-100 rounded"></div>
                    <div className="h-8 w-8 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                              {item.status?.toLowerCase() === "found" && item.approved && (
                                <DropdownMenuItem
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
                        {/* For non-admin: Show View Details only for lost items */}
                        {item.status?.toLowerCase() === "lost" ? (
                          <div className="flex gap-2">
                            <Button 
                              className="bg-[#0052cc] text-white hover:bg-[#0052cc]/90 shadow-sm"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              I Found This
                            </Button>
                          </div>
                        ) : (
                          // For found items, only show claim button
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-gray-50 shadow-sm border-gray-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            This Is Mine
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
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
    </div>
  );
} 