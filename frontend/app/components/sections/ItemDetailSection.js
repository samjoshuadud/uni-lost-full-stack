"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ImageIcon, Trash, Loader2, X, Package, XCircle } from "lucide-react"
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
      setIsUnapproving(true); // Start loading state
      
      // Close dialog immediately to improve perceived performance
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
        </DialogHeader>
        {item && (
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              {isAdmin && (
                <>
                  {/* Only show unapprove button if item is approved */}
                  {item.approved && (
                    <Button
                      variant="outline"
                      onClick={handleUnapprove}
                      disabled={isUnapproving}
                    >
                      {isUnapproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Unapproving...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Unapprove
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleDeleteClick}
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
                        Delete
                      </>
                    )}
                  </Button>
                </>
              )}
              {(!isAdmin && userId === item.reporterId) && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
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
                      Delete
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 
