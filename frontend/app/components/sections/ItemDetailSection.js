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
    return item.additionalDescriptions && 
           Array.isArray(item.additionalDescriptions) && 
           item.additionalDescriptions.length > 0 &&
           item.additionalDescriptions.some(desc => desc.title || desc.description);
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
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <div className="bg-[#0052cc] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">{item.name}</DialogTitle>
            <div className="flex items-center justify-between mt-2">
              <span className="text-white/90 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(item.dateReported), 'PPP')}
              </span>
              <Badge 
                variant="outline"
                className={`${
                  item.status?.toLowerCase() === "lost" 
                    ? "bg-yellow-400 text-blue-900" 
                    : "bg-white text-blue-900"
                } capitalize px-3 py-1`}
              >
                {item.status}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #0052cc;
            border-radius: 4px;
            opacity: 0.8;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #003d99;
          }

          /* For Firefox */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #0052cc #f1f1f1;
          }
        `}</style>

        <ScrollArea 
          className="max-h-[calc(90vh-180px)] p-6 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#0052cc transparent'
          }}
        >
          <div className="space-y-6">
            {/* Image Section */}
            <Card className="border border-gray-200">
              <div className="aspect-video w-full relative bg-gray-100">
                {item.imageUrl ? (
                  <div className="w-full h-full relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
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
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <Package className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">{item.category || 'Item'} Image</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </p>
                <p className="text-gray-700">{item.location || 'Not specified'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Category
                </p>
                <p className="text-gray-700">{item.category || 'Not specified'}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{item.description || 'No description provided'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Descriptions */}
            {hasValidAdditionalDescriptions() && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Additional Details</h3>
                  <div className="space-y-4">
                    {item.additionalDescriptions
                      .filter(desc => desc.title || desc.description)
                      .map((desc, index) => (
                        <Card key={index} className="border border-gray-200">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-[#0052cc] mb-2">{desc.title}</h4>
                            <p className="text-sm text-gray-600">{desc.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="p-4 sticky bottom-0">
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
