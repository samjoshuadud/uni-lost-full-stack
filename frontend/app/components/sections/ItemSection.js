"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ExternalLink, Trash, Loader2, X } from "lucide-react"
import { useState, useEffect } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ProcessStatus, ProcessMessages } from '@/lib/constants'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

export default function ItemSection({ 
  items = [], 
  title, 
  isAdmin, 
  handleViewDetails,
  userId = null,  // Add this prop
  onDelete,      // Add this prop
  onUnapprove  // Add this prop
}) {
  // Add state to manage items locally
  const [localItems, setLocalItems] = useState(items);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showUnapproveDialog, setShowUnapproveDialog] = useState(false);
  const [unapproveItemId, setUnapproveItemId] = useState(null);
  const [isUnapproving, setIsUnapproving] = useState(false);

  // Update localItems when items prop changes
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Function to check if user can delete
  const canDelete = (item) => {
    return isAdmin || userId === item.reporterId;
  };

  const handleDeleteClick = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeletingItemId(itemToDelete.id);
      await onDelete(itemToDelete.id);
      // Update local state after successful deletion
      setLocalItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
    } finally {
      setDeletingItemId(null);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Add handler for unapprove
  const handleUnapprove = async (itemId) => {
    try {
      setIsUnapproving(true);
      setShowUnapproveDialog(false);

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

      // Update local state immediately
      setLocalItems(prevItems => prevItems.filter(item => item.id !== itemId));

    } catch (error) {
      console.error('Error unapproving item:', error);
    } finally {
      setIsUnapproving(false);
      setUnapproveItemId(null);
    }
  };

  // Filter items that are approved and have the correct status
  const filteredItems = localItems.filter(item => 
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
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                    <Badge 
                      variant={item.status?.toLowerCase() === "lost" ? "destructive" : "success"}
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => {
                                setUnapproveItemId(item.id);
                                setShowUnapproveDialog(true);
                              }}
                              disabled={deletingItemId === item.id || isUnapproving}
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Unapprove
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToDelete(item);
                              setShowDeleteDialog(true);
                            }}
                            disabled={deletingItemId === item.id || isUnapproving}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            {deletingItemId === item.id || isUnapproving ? (
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
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <AlertDialog open={showUnapproveDialog} onOpenChange={setShowUnapproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unapprove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unapprove this item? It will be moved back to pending approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnapproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUnapprove(unapproveItemId)}
              className="bg-primary hover:bg-primary/90"
              disabled={isUnapproving}
            >
              {isUnapproving ? "Unapproving..." : "Unapprove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 