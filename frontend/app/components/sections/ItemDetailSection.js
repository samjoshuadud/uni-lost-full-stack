"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ImageIcon, Trash, Loader2, X, Package, XCircle, MapPin, Calendar, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { ProcessStatus, ProcessMessages } from '@/lib/constants'
import { ScrollArea } from "@/components/ui/scroll-area"
import { API_BASE_URL } from '@/lib/api-config'

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
    return isAdmin || userId === item.reporterId;
  };

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(item.id);
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const hasValidAdditionalDescriptions = () => {
    const descriptions = Array.isArray(item.additionalDescriptions) 
      ? item.additionalDescriptions 
      : item.additionalDescriptions?.$values;

    return descriptions?.length > 0 && 
           descriptions.some(desc => desc.title?.trim() || desc.description?.trim());
  };

  const handleUnapprove = async () => {
    try {
      setIsUnapproving(true);
      onClose();

      const processResponse = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      const processData = await processResponse.json();
      const process = processData.$values?.find(p => {
        const processItemId = p.itemId || p.ItemId;
        return processItemId === item.id;
      });

      if (!process) {
        console.error('No process found for item:', item.id);
        return;
      }

      const processId = process.id || process.Id;

      await Promise.all([
        fetch(`${API_BASE_URL}/api/Item/${item.id}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: false })
        }),
        fetch(`${API_BASE_URL}/api/Item/process/${processId}/status`, {
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
      <DialogContent className="max-w-[600px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-[#f8f9fa] flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-[#0052cc]">Item Details</DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {format(new Date(item.dateReported), 'PPP')}
            </span>
            <Badge 
              variant="outline"
              className={`${
                item.status?.toLowerCase() === "lost" 
                  ? "bg-yellow-400 text-blue-900 border-yellow-500" 
                  : "bg-green-500 text-white border-green-600"
              } capitalize px-3 py-1`}
            >
              {item.status}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow overflow-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Report Details Card */}
            <div className="rounded-lg border bg-white shadow-sm">
              {/* Image Section */}
              {item.imageUrl && (
                <div className="border-b">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="absolute inset-0 w-full h-full object-contain bg-gray-50"
                      style={{
                        objectFit: 'contain',
                        backgroundColor: 'rgb(243 244 246)',
                        mixBlendMode: 'multiply'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full absolute top-0 left-0 bg-gray-100 flex-col items-center justify-center text-gray-500">
                      <Package className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">{item.category || 'Item'} Image</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 ">
                <div className="space-y-3">
                  <DetailItem label="Item Name" value={item.name} item={item} />
                  <DetailItem label="Category" value={item.category} item={item} />
                </div>
                <div className="space-y-3">
                  <DetailItem label="Status" value={item.status} item={item} />
                  <DetailItem 
                    label="Location" 
                    value={
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {item.location}
                      </span>
                    } 
                    item={item}
                  />
                </div>
              </div>

              {/* Description Section */}
              {item.description && (
                <div className="border-t p-4">
                  <DetailItem 
                    label="Description" 
                    value={item.description} 
                    fullWidth 
                    item={item}
                  />
                </div>
              )}

              {/* Additional Descriptions */}
              {hasValidAdditionalDescriptions() && (
                <div className="border-t p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Additional Details</h4>
                  <div className="space-y-2">
                    {(Array.isArray(item.additionalDescriptions) 
                      ? item.additionalDescriptions 
                      : item.additionalDescriptions.$values)
                      .filter(desc => desc.title?.trim() || desc.description?.trim())
                      .map((desc, index) => (
                        <div key={index} className="bg-gray-50 rounded p-3">
                          <DetailItem 
                            label={desc.title || "Additional Detail"} 
                            value={desc.description || "No description provided"} 
                            fullWidth 
                            item={item}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-2">
            {isAdmin && (
              <>
                {item.approved && (
                  <Button
                    variant="outline"
                    onClick={handleUnapprove}
                    disabled={isUnapproving}
                    className="border-gray-200 text-gray-600 hover:text-gray-700"
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
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
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
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
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
      </DialogContent>
    </Dialog>
  );
}

const DetailItem = ({ label, value, fullWidth = false, item }) => {
  const renderValue = () => {
    if (label === "Category" && value === "Others" && item?.specification) {
      return `Others - ${item.specification}`;
    }
    return value;
  };

  return (
    <div className={`${fullWidth ? 'col-span-2' : ''} space-y-1.5`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-base">{renderValue()}</p>
    </div>
  );
}; 
