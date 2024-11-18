"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  CheckCircle,
  Package,
  Trash,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessStatus } from '@/lib/constants';
import { memo } from 'react';

const LostReportsTab = memo(function LostReportsTab({
  items = [],
  isCountsLoading,
  getInVerificationCount,
  getPendingRetrievalCount,
  handleDelete,
  onApprove,
  handleViewDetails,
}) {
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [pendingLostApprovalCount, setPendingLostApprovalCount] = useState(0);
  const [allItems, setAllItems] = useState(items);
  const [pendingProcesses, setPendingProcesses] = useState([]);

  useEffect(() => {
    console.log('LostReportsTab received items:', items);
  }, [items]);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  useEffect(() => {
    const updateCount = () => {
      const count = items.filter(process => 
        process.status === ProcessStatus.PENDING_APPROVAL && 
        process.item?.status?.toLowerCase() === "lost" && 
        !process.item?.approved
      ).length;
      
      setPendingLostApprovalCount(prevCount => {
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
          process.status === ProcessStatus.PENDING_APPROVAL && 
          process.item?.status?.toLowerCase() === "lost" && 
          !process.item?.approved
        ).length;
        setPendingLostApprovalCount(newCount);
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
      await handleDelete(itemId);
      // Update local state after successful deletion
      setAllItems(prevItems => {
        const newItems = prevItems.filter(item => item.item?.id !== itemId);
        // Update count after state update
        const newCount = newItems.filter(process => 
          process.status === ProcessStatus.PENDING_APPROVAL && 
          process.item?.status?.toLowerCase() === "lost" && 
          !process.item?.approved
        ).length;
        setPendingLostApprovalCount(newCount);
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
          Lost Item Reports Overview
        </h3>

        {/* Status Cards */}
        {isCountsLoading || !items?.length ? (
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-background hover:bg-muted/50 transition-colors">
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
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 mt-4">
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
                      {pendingLostApprovalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      In Verification
                    </p>
                    <p className="text-2xl font-bold">
                      {getInVerificationCount()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Pending Retrieval
                    </p>
                    <p className="text-2xl font-bold">
                      {getPendingRetrievalCount()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lost Items List */}
        <div className="space-y-4 mt-8">
          <h4 className="font-medium text-lg">New Lost Item Reports</h4>
          <div className="h-[600px] overflow-y-auto pr-4">
            <div className="grid gap-4">
              {isCountsLoading || !items?.length ? (
                // Skeleton loading state for items
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* Image Skeleton */}
                          <Skeleton className="w-32 h-32 rounded-lg flex-shrink-0" />

                          {/* Content Skeleton */}
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

                          {/* Actions Skeleton */}
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Skeleton className="h-9 w-full" />
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
                .filter(process => 
                  process.status === ProcessStatus.PENDING_APPROVAL && 
                  process.item?.status?.toLowerCase() === "lost" && 
                  !process.item?.approved
                )
                .length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="font-medium">No new reports to review</p>
                    <p className="text-sm">
                      New lost item reports will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                allItems
                  .filter(process => 
                    process.status === ProcessStatus.PENDING_APPROVAL && 
                    process.item?.status?.toLowerCase() === "lost" && 
                    !process.item?.approved
                  )
                  .map((process) => (
                    <Card key={process.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* Image Section */}
                          <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {process.item?.imageUrl ? (
                              <div className="w-full h-full relative">
                                <img
                                  src={process.item.imageUrl}
                                  alt={process.item.name}
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
                                    {process.item?.category || 'Item'} Image
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                <Package className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-xs text-center">
                                  {process.item?.category || 'Item'} Image
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
                                    {process.item?.name}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-100 text-yellow-800"
                                  >
                                    For Approval
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Student ID: {process.item?.studentId || "N/A"}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="ml-2 flex-shrink-0"
                              >
                                {process.item?.category}
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-sm">
                                <strong>Location:</strong> {process.item?.location}
                              </p>
                              <p className="text-sm">
                                <strong>Description:</strong> {process.item?.description}
                              </p>
                              {process.item?.additionalDescriptions?.$values?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm text-muted-foreground">
                                    +{process.item.additionalDescriptions.$values.length}{" "}
                                    additional details
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
                              onClick={() => handleViewDetails(process.item)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              onClick={() => handleApprove(process.item?.id)}
                              disabled={approvingItems.has(process.item?.id)}
                            >
                              {approvingItems.has(process.item?.id) ? (
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
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={() => onItemInPossession(process.item?.id)}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Item in Possession
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDeleteClick(process.item?.id)}
                              disabled={deletingItems.has(process.item?.id)}
                            >
                              {deletingItems.has(process.item?.id) ? (
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
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LostReportsTab;
