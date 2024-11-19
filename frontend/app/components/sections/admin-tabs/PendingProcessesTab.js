"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Package } from "lucide-react"
import { ProcessStatus } from '@/lib/constants';
import { Skeleton } from "@/components/ui/skeleton"

export default function PendingProcessesTab({ 
  pendingProcesses = [], 
  onViewDetails,
  isCountsLoading = false 
}) {
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case ProcessStatus.PENDING_APPROVAL:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case ProcessStatus.APPROVED:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Posted</Badge>;
      case ProcessStatus.IN_VERIFICATION:
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Needs Verification</Badge>;
      case ProcessStatus.VERIFIED:
        return <Badge variant="outline" className="bg-green-100 text-green-800">Verified</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatProcessStatus = (status) => {
    if (!status) return 'Unknown';
    
    // Helper function to capitalize first letter of each word
    const capitalize = (str) => {
      return str.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    switch (status.toLowerCase()) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'in_verification':
        return 'In Verification';
      case 'pending_verification':
        return 'Pending Verification';
      case 'verified':
        return 'Verified';
      case 'completed':
        return 'Completed';
      default:
        return capitalize(status);
    }
  };

  if (isCountsLoading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          All Pending Processes
        </h3>

        <div className="space-y-4">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        All Pending Processes
      </h3>

      <div className="space-y-4">
        {pendingProcesses.map((process) => {
          const id = process.id || process.Id;
          const item = process.item || process.Item;
          const status = process.status || process.Status;
          const message = process.message || process.Message;

          return (
            <Card key={id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item?.imageUrl || item?.ImageUrl ? (
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
                          className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground"
                        >
                          <Package className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-xs">{item.category || item.Category || 'Item'} Image</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs">{item.category || item.Category || 'Item'} Image</p>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{item?.name || item?.Name || 'Unknown Item'}</h3>
                        <p className="text-sm text-muted-foreground">
                          Student ID: {item?.studentId || item?.StudentId || 'N/A'}
                        </p>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Process Status:</strong> {formatProcessStatus(status)}
                      </p>
                      <p className="text-sm"><strong>Message:</strong> {message}</p>
                      {item && (
                        <>
                          <p className="text-sm"><strong>Location:</strong> {item.location || item.Location}</p>
                          <p className="text-sm"><strong>Category:</strong> {item.category || item.Category}</p>
                        </>
                      )}
                    </div>
                  </div>

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
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {pendingProcesses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No pending processes</p>
              <p className="text-sm">All processes will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 