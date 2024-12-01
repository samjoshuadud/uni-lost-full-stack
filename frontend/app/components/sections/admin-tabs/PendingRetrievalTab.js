"use client"

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { API_BASE_URL } from '@/lib/api-config';

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
  const [error, setError] = useState(null);

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
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Items Ready for Retrieval
      </h3>

      <div className="space-y-4">
        {pendingRetrievalItems.map((process) => (
          <Card key={process.id} className="overflow-hidden">
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

                <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleHandOver(process)}
                    disabled={handingOverItems.has(getProcessId(process))}
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
                    className="w-full"
                    onClick={() => handleNoShow(process)}
                    disabled={noShowItems.has(getProcessId(process))}
                  >
                    {noShowItems.has(getProcessId(process)) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {noShowItems.has(getProcessId(process)) ? 'Processing...' : 'No Show'}
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
  )
}
