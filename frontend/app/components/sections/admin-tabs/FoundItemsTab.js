"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  CheckCircle,
  Package,
  Trash,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function FoundItemsTab({
  items = [],
  isCountsLoading,
  onDelete,
  onViewDetails,
  onApprove,
}) {
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [pendingFoundApprovalCount, setPendingFoundApprovalCount] = useState(0);
  const [allItems, setAllItems] = useState(items);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  useEffect(() => {
    const updateCount = () => {
      console.log('Current items:', items);
      
      const count = items.filter(process => {
        console.log('Checking process:', process);
        
        return process.status === "pending_approval" && 
               process.item?.status?.toLowerCase() === "found" && 
               !process.item?.approved;
      }).length;
      
      console.log('Found items count:', count);
      
      setPendingFoundApprovalCount(prevCount => {
        if (prevCount !== count) {
          return count;
        }
        return prevCount;
      });
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, [items]);

  const handleApprove = async (itemId) => {
    try {
      setApprovingItems((prev) => new Set(prev).add(itemId));
      await onApprove(itemId);
      // Update count after successful approval
      setAllItems(prevItems => {
        const newItems = prevItems.map(item => 
          item.item?.id === itemId 
            ? { ...item, item: { ...item.item, approved: true } }
            : item
        );
        // Update count after state update
        const newCount = newItems.filter(process => 
          process.status === "pending_approval" && 
          process.item?.status?.toLowerCase() === "found" && 
          !process.item?.approved
        ).length;
        setPendingFoundApprovalCount(newCount);
        return newItems;
      });
    } finally {
      setApprovingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDeleteClick = async (itemId) => {
    try {
      setDeletingItems(prev => new Set(prev).add(itemId));
      await onDelete(itemId);
      // Update local state after successful deletion
      setAllItems(prevItems => {
        const newItems = prevItems.filter(item => item.item?.id !== itemId);
        // Update count after state update
        const newCount = newItems.filter(process => 
          process.status === "pending_approval" && 
          process.item?.status?.toLowerCase() === "found" && 
          !process.item?.approved
        ).length;
        setPendingFoundApprovalCount(newCount);
        return newItems;
      });
    } finally {
      setDeletingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Found Items Overview
        </h3>

        {/* Status Cards */}
        {isCountsLoading ? (
          <div className="grid gap-4 md:grid-cols-1 mt-4">
            <Card className="bg-background hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 mt-4">
            <Card className="bg-background hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Pending Approval
                    </p>
                    <p className="text-2xl font-bold">
                      {pendingFoundApprovalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Found Items List */}
        <div className="space-y-4 mt-8">
          <h4 className="font-medium text-lg">New Found Items</h4>
          <div className="h-[600px] overflow-y-auto pr-4">
            <div className="grid gap-4">
              {isCountsLoading ? (
                // Skeleton loading state for items
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <Skeleton className="w-32 h-32 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <Skeleton className="h-6 w-48" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-24" />
                              </div>
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : allItems
                .filter(process => {
                  const item = process.item || process.Item;
                  const status = process.status || process.Status;
                  const itemStatus = item?.status || item?.Status;
                  
                  return status === "pending_approval" && 
                         itemStatus?.toLowerCase() === "found" && 
                         !(item?.approved || item?.Approved);
                })
                .length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="font-medium">No new found items to review</p>
                    <p className="text-sm">New found item reports will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                allItems
                  .filter(process => {
                    const item = process.item || process.Item;
                    const status = process.status || process.Status;
                    const itemStatus = item?.status || item?.Status;
                    
                    return status === "pending_approval" && 
                           itemStatus?.toLowerCase() === "found" && 
                           !(item?.approved || item?.Approved);
                  })
                  .map((process) => {
                    const item = process.item || process.Item;
                    
                    return (
                      <Card key={process.id || process.Id} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Image Section */}
                            <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              {(item?.imageUrl || item?.ImageUrl) ? (
                                <div className="w-full h-full relative">
                                  <img
                                    src={item.imageUrl || item.ImageUrl}
                                    alt={item.name || item.Name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div 
                                    className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground p-2"
                                  >
                                    <Package className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-xs text-center">
                                      {item?.category || item?.Category || 'Item'} Image
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                  <Package className="h-8 w-8 mb-2 opacity-50" />
                                  <p className="text-xs text-center">
                                    {item?.category || item?.Category || 'Item'} Image
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg truncate">
                                      {item?.name || item?.Name}
                                    </h3>
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      For Approval
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Found by Student ID: {item?.studentId || item?.StudentId || "N/A"}
                                  </p>
                                </div>
                                <Badge variant="outline" className="ml-2 flex-shrink-0">
                                  {item?.category || item?.Category}
                                </Badge>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-sm">
                                  <strong>Location:</strong> {item?.location || item?.Location}
                                </p>
                                <p className="text-sm">
                                  <strong>Description:</strong> {item?.description || item?.Description}
                                </p>
                                {(item?.additionalDescriptions?.$values?.length > 0 || item?.AdditionalDescriptions?.$values?.length > 0) && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      +{(item?.additionalDescriptions?.$values || item?.AdditionalDescriptions?.$values || []).length} additional details
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Section */}
                            <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => onViewDetails(item)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => handleApprove(item?.id || item?.Id)}
                                disabled={approvingItems.has(item?.id || item?.Id)}
                              >
                                {approvingItems.has(item?.id || item?.Id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Post
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => handleDeleteClick(item?.id || item?.Id)}
                                disabled={deletingItems.has(item?.id || item?.Id)}
                              >
                                {deletingItems.has(item?.id || item?.Id) ? (
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
