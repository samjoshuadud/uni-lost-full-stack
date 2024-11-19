"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ImageIcon, Trash, Loader2, X, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { ProcessStatus, ProcessMessages } from '@/lib/constants'

export default function ItemDetailSection({ 
  item, 
  onClose, 
  onDelete, 
  open,
  isAdmin = false,
  userId = null,
  onUnapprove
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [showUnapproveDialog, setShowUnapproveDialog] = useState(false);

  if (!item) return null;

  const canDelete = () => {
    console.log('Checking delete permission:', {
      isAdmin,
      userId,
      reporterId: item.reporterId,
      item
    });
    
    return isAdmin || userId === item.reporterId;
  };

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(item.id);
      onClose(); // Close modal after successful deletion
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Helper function to check if additionalDescriptions has valid content
  const hasValidAdditionalDescriptions = () => {
    return item.additionalDescriptions && 
           Array.isArray(item.additionalDescriptions) && 
           item.additionalDescriptions.length > 0 &&
           item.additionalDescriptions.some(desc => desc.title || desc.description);
  };

  const handleUnapprove = async () => {
    try {
      setIsUnapproving(true);
      setShowUnapproveDialog(false);
      onClose();

      // First get all processes to find the correct processId
      const processResponse = await fetch('http://localhost:5067/api/Item/pending/all');
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

      // Execute both API calls concurrently
      await Promise.all([
        // Update item approval status
        fetch(`http://localhost:5067/api/Item/${item.id}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: false })
        }),

        // Update process status
        fetch(`http://localhost:5067/api/Item/process/${processId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: ProcessStatus.PENDING_APPROVAL,
            message: ProcessMessages.WAITING_APPROVAL
          })
        })
      ]);

    } catch (error) {
      console.error('Error unapproving item:', error);
    } finally {
      setIsUnapproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-x-4">
          <DialogTitle>Item Details</DialogTitle>
          {canDelete() && (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUnapproveDialog(true)}
                  disabled={isUnapproving || isDeleting}
                >
                  {isUnapproving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unapproving...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Unapprove
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Item
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{item.name}</h2>

          <Card className="overflow-hidden">
            {/* Image Section */}
            <div className="w-full h-[300px] relative bg-muted">
              {item.imageUrl ? (
                <div className="w-full h-full relative">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground"
                  >
                    <Package className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">{item.category || 'Item'} Image</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">{item.category || 'Item'} Image</p>
                </div>
              )}
            </div>

            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{item.name}</h2>
                  <p className="text-muted-foreground mt-1">
                    Reported on {item.dateReported ? format(new Date(item.dateReported), 'PPP') : 'Not specified'}
                  </p>
                </div>
                <Badge 
                  variant={item.status === "lost" ? "destructive" : "success"}
                  className="text-sm px-3 py-1"
                >
                  {item.status?.toUpperCase()}
                </Badge>
              </div>

              <Separator className="my-6" />

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
                  <p className="text-lg">{item.location || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                  <p className="text-lg">{item.category || 'Not specified'}</p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{item.description || 'No description provided'}</p>
                </div>
              </div>

              {/* Additional Descriptions - Only show if there are valid items */}
              {hasValidAdditionalDescriptions() && (
                <>
                  <Separator className="my-6" />
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Additional Details</h3>
                    <div className="space-y-4">
                      {item.additionalDescriptions
                        .filter(desc => desc.title || desc.description)
                        .map((desc, index) => (
                          <div key={index} className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-medium text-base mb-2">{desc.title}</h4>
                            <p className="text-sm text-muted-foreground">{desc.description}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClick}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
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
                onClick={handleUnapprove}
                className="bg-primary hover:bg-primary/90"
                disabled={isUnapproving}
              >
                {isUnapproving ? "Unapproving..." : "Unapprove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
} 
