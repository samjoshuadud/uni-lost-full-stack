"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Trash, Package, Loader2, ExternalLink } from "lucide-react"
import { useEffect } from "react"

export default function FoundItemsTab({ 
  items = [], 
  isLoading,
  onDelete,
  onViewDetails,
  onRefresh
}) {


  const handleApprove = async (itemId) => {
    try {
      // Update item's Approved status
      const itemResponse = await fetch(`http://localhost:5067/api/item/${itemId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: true })
      });

      if (!itemResponse.ok) throw new Error('Failed to approve item');

      // Update pending process status
      const processResponse = await fetch(`http://localhost:5067/api/item/process/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!processResponse.ok) throw new Error('Failed to update process status');

      // Fetch updated data immediately
      const updatedResponse = await fetch('http://localhost:5067/api/Item/pending/all');
      if (!updatedResponse.ok) throw new Error('Failed to fetch updated items');
      
      // Call the refresh function with the new data
      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      console.error('Error approving item:', error);
    }
  };

  // Function to count pending approval items
  const getPendingApprovalCount = () => {
    return items.filter(item => 
      !item.Approved && item.Status === "found"
    ).length;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Found Items Overview
      </h3>

      {/* Status Summary Card */}
      <Card className="bg-background hover:bg-muted/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              {isLoading ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : (
                <p className="text-2xl font-bold">{getPendingApprovalCount()}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading found items...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="h-[600px] overflow-y-auto pr-4">
            <div className="grid gap-4">
              {items.filter(item => !item.Approved && item.Status === "found").length > 0 ? (
                items
                  .filter(item => !item.Approved && item.Status === "found")
                  .map((item) => (
                    <Card key={item.Id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* Image Section */}
                          <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {item.ImageUrl ? (
                              <img 
                                src={item.ImageUrl} 
                                alt={item.Name} 
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
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-lg">{item.Name}</h3>
                                  {!item.Approved && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      For Approval
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Found by Student ID: {item.StudentId || 'N/A'}
                                </p>
                              </div>
                              <Badge variant="outline">{item.Category}</Badge>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-sm"><strong>Location:</strong> {item.Location}</p>
                              <p className="text-sm"><strong>Description:</strong> {item.Description}</p>
                              {item.AdditionalDescriptions?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm text-muted-foreground">
                                    {item.AdditionalDescriptions.length} additional details
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
                              onClick={() => handleApprove(item.Id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve & Post
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="w-full"
                              onClick={() => onDelete(item.Id)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="font-medium">No new found items to review</p>
                    <p className="text-sm">When students report found items, they will appear here for approval</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
