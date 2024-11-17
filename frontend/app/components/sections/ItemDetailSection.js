"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ImageIcon, Trash, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState } from "react"

export default function ItemDetailSection({ item, onBack, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(item.id);
      onBack(); // Go back after successful deletion
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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
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

      <Card className="overflow-hidden">
        {/* Image Section */}
        <div className="w-full h-[300px] relative border-b bg-muted">
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.name}
              className="object-contain w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-20 w-20 mb-4" />
              <p className="text-sm">No image available</p>
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
    </div>
  );
} 
