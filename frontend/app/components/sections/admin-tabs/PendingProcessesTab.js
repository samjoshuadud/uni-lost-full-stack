"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Package } from "lucide-react"
import { ProcessStatus } from '@/lib/constants';

export default function PendingProcessesTab({ 
  pendingProcesses = [], 
  onViewDetails 
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

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        All Pending Processes
      </h3>

      <div className="space-y-4">
        {pendingProcesses.map((process) => {
          // Handle both camelCase and PascalCase properties
          const id = process.id || process.Id;
          const item = process.item || process.Item;
          const status = process.status || process.Status;
          const message = process.message || process.Message;

          return (
            <Card key={id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Image Section */}
                  <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item?.imageUrl || item?.ImageUrl ? (
                      <img 
                        src={item.imageUrl || item.ImageUrl} 
                        alt={item.name || item.Name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
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
                      <p className="text-sm"><strong>Process Status:</strong> {status}</p>
                      <p className="text-sm"><strong>Message:</strong> {message}</p>
                      {item && (
                        <>
                          <p className="text-sm"><strong>Location:</strong> {item.location || item.Location}</p>
                          <p className="text-sm"><strong>Category:</strong> {item.category || item.Category}</p>
                        </>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
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