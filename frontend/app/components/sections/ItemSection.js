"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ExternalLink, Trash, Loader2 } from "lucide-react"
import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function ItemSection({ 
  items = [], 
  title, 
  isAdmin, 
  handleViewDetails,
  userId = null,  // Add this prop
  onDelete      // Add this prop
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Function to check if user can delete
  const canDelete = (item) => {
    return isAdmin || userId === item.reporterId;
  };

  const handleDeleteClick = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeletingItemId(itemToDelete.id);
      await onDelete(itemToDelete.id);
    } finally {
      setDeletingItemId(null);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Filter items that are approved and have the correct status
  const filteredItems = items.filter(item => 
    item.approved === true && 
    item.status?.toLowerCase() === title?.toLowerCase().replace(" items", "")
  );

  if (!filteredItems.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No {title.toLowerCase()} found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card 
            key={item.id} 
            id={`item-${item.id}`}
            className="overflow-hidden hover:shadow-lg transition-all"
          >
            <CardContent className="p-4">
              {/* Image Section */}
              <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-muted">
                {item.imageUrl ? (
                  <div className="w-full h-full relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground"
                    >
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs">{item.category || 'Item'} Image</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">{item.category || 'Item'} Image</p>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.location}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.dateReported).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(item)}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </Button>
                    {canDelete(item) && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setItemToDelete(item);
                          setShowDeleteDialog(true);
                        }}
                        disabled={deletingItemId === item.id}
                        className="gap-2"
                      >
                        {deletingItemId === item.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash className="h-4 w-4" />
                            Delete
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