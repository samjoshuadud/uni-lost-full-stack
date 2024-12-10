"use client"

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, CheckCircle, XCircle, Loader2, CalendarIcon, MapPinIcon, AlertCircle } from "lucide-react"
import { API_BASE_URL } from '@/lib/api-config';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getProcessId = (process) => {
  return process.Id || process.id;
};

export default function PendingRetrievalTab({ 
  items = [], 
  onHandOver,
  onNoShow,
  isCountsLoading
}) {
  const [handingOverItems, setHandingOverItems] = useState(new Set());
  const [noShowItems, setNoShowItems] = useState(new Set());
  const [undoingItems, setUndoingItems] = useState(new Set());
  const [error, setError] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  const pendingRetrievalItems = items.filter(process => process.status === "pending_retrieval");

  const handleHandOver = async (process) => {
    const processId = getProcessId(process);
    try {
      setHandingOverItems(prev => new Set(prev).add(processId));
      setError(null);

      console.log("Handling handover for process:", processId);

      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/hand-over`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to update item status');
      }

      if (onHandOver) {
        await onHandOver(process.item?.id || process.Item?.Id);
      }

    } catch (err) {
      console.error('Error handling hand over:', err);
      setError('Failed to process hand over. Please try again.');
    } finally {
      setHandingOverItems(prev => {
        const next = new Set(prev);
        next.delete(processId);
        return next;
      });
    }
  };

  const handleNoShow = async (process) => {
    const processId = getProcessId(process);
    try {
      setNoShowItems(prev => new Set(prev).add(processId));
      setError(null);

      console.log("Handling no-show for process:", processId);

      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/no-show`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to update item status');
      }

      if (onNoShow) {
        await onNoShow(process.item?.id || process.Item?.Id);
      }

    } catch (err) {
      console.error('Error handling no show:', err);
      setError('Failed to process no show. Please try again.');
    } finally {
      setNoShowItems(prev => {
        const next = new Set(prev);
        next.delete(processId);
        return next;
      });
    }
  };

  const handleUndoRetrieval = async (process) => {
    const processId = getProcessId(process);
    try {
      setUndoingItems(prev => new Set(prev).add(processId));
      setError(null);

      console.log("Undoing retrieval for process:", processId);

      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/undo-retrieval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to undo retrieval status');
      }

      if (onHandOver) {
        await onHandOver(process.item?.id || process.Item?.Id);
      }

    } catch (err) {
      console.error('Error undoing retrieval:', err);
      setError('Failed to undo retrieval. Please try again.');
    } finally {
      setUndoingItems(prev => {
        const next = new Set(prev);
        next.delete(processId);
        return next;
      });
    }
  };

  const handleItemClick = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsDialog(true);
  };

  if (isCountsLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Items Ready for Retrieval
        </h3>
        <p className="text-gray-600 mt-2">
          Manage items that are ready to be picked up. Process item handovers to students 
          who have successfully verified their ownership, or mark items as no-show if unclaimed.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6">
        <div className="space-y-4">
          {pendingRetrievalItems.map((process) => (
            <Card 
              key={process.id} 
              className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleItemClick(process.item)}
            >
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {process.item?.imageUrl ? (
                      <img 
                        src={process.item.imageUrl} 
                        alt={process.item.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{process.item?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Student ID: {process.item?.studentId || 'N/A'}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Ready for Retrieval
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm"><strong>Location:</strong> {process.item?.location}</p>
                      <p className="text-sm"><strong>Category:</strong> {process.item?.category}</p>
                      <p className="text-sm"><strong>Description:</strong> {process.item?.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-start min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      onClick={() => handleHandOver(process)}
                      disabled={handingOverItems.has(getProcessId(process)) || undoingItems.has(getProcessId(process))}
                    >
                      {handingOverItems.has(getProcessId(process)) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {handingOverItems.has(getProcessId(process)) ? 'Processing...' : 'Handed Over'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      onClick={() => handleNoShow(process)}
                      disabled={noShowItems.has(getProcessId(process)) || undoingItems.has(getProcessId(process))}
                    >
                      {noShowItems.has(getProcessId(process)) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {noShowItems.has(getProcessId(process)) ? 'Processing...' : 'No Show'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border-blue-200 hover:bg-blue-50 text-blue-600"
                      onClick={() => handleUndoRetrieval(process)}
                      disabled={undoingItems.has(getProcessId(process))}
                    >
                      {undoingItems.has(getProcessId(process)) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      {undoingItems.has(getProcessId(process)) ? 'Undoing...' : 'Undo'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pendingRetrievalItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium">No items pending retrieval</p>
                <p className="text-sm">Items that are ready for retrieval will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 border-b bg-[#f8f9fa]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-semibold text-[#0052cc]">Item Details</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedItemForDetails?.dateReported ? 
                      format(new Date(selectedItemForDetails.dateReported), 'MMMM do, yyyy') 
                      : 'Date not available'
                    }
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 capitalize px-3 py-1.5">
                  Ready for Pickup
                </Badge>
              </div>
            </DialogHeader>
          </div>

          {selectedItemForDetails && (
            <>
              {/* Content Section */}
              <div className="p-6 space-y-6">
                {/* Image and Details Grid */}
                <div className="grid md:grid-cols-[240px,1fr] gap-6">
                  {/* Image Section */}
                  <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    {selectedItemForDetails.imageUrl ? (
                      <img
                        src={selectedItemForDetails.imageUrl}
                        alt={selectedItemForDetails.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-12 w-12 mb-2" />
                        <p className="text-sm">No Image</p>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Item Name</h4>
                        <p className="font-medium">{selectedItemForDetails.name}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <p className="font-medium capitalize">Ready for Pickup</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Category</h4>
                        <p className="font-medium">{selectedItemForDetails.category}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Location</h4>
                        <p className="font-medium flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          {selectedItemForDetails.location}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="text-gray-700">{selectedItemForDetails.description}</p>
                    </div>

                    {/* Additional Details if any */}
                    {selectedItemForDetails.additionalDescriptions?.$values?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                        <div className="space-y-2">
                          {selectedItemForDetails.additionalDescriptions.$values.map((desc, index) => (
                            <p key={index} className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                              {desc}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="px-6 py-4 border-t bg-[#f8f9fa] flex justify-end gap-3">
                <Button
                  variant="default"
                  onClick={() => {
                    onHandOver(selectedItemForDetails.id);
                    setShowDetailsDialog(false);
                  }}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Hand Over Item
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onNoShow(selectedItemForDetails.id);
                    setShowDetailsDialog(false);
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Mark as No Show
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
