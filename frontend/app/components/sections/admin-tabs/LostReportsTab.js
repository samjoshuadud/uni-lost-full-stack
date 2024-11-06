"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, CheckCircle, Package, Trash, ExternalLink, Loader2 } from "lucide-react"

export default function LostReportsTab({ 
  items = [], 
  isCountsLoading, 
  getPendingApprovalCount,
  getInVerificationCount,
  getPendingRetrievalCount,
  onViewDetails,
  onApprove,
  onDelete,
  onItemInPossession
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        Lost Item Reports Overview
      </h3>
      
      {/* Status Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-background hover:bg-muted/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                {isCountsLoading ? (
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

        <Card className="bg-background hover:bg-muted/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Verification</p>
                {isCountsLoading ? (
                  <div className="h-8 flex items-center">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold">{getInVerificationCount()}</p>
                )}
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
                <p className="text-sm font-medium text-muted-foreground">Pending Retrieval</p>
                {isCountsLoading ? (
                  <div className="h-8 flex items-center">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold">{getPendingRetrievalCount()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lost Items List */}
      <div className="space-y-4">
        <h4 className="font-medium text-lg">New Reports</h4>
        <div className="h-[600px] overflow-y-auto pr-4">
          <div className="grid gap-4">
            {items.filter(item => !item.Approved && item.Status === "lost").map((item) => (
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg truncate">{item.Name}</h3>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              For Approval
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Student ID: {item.StudentId || 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0">
                          {item.Category}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm"><strong>Location:</strong> {item.Location}</p>
                        <p className="text-sm"><strong>Description:</strong> {item.Description}</p>
                        {item.AdditionalDescriptions?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              +{item.AdditionalDescriptions.length} additional details
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
                        onClick={() => onApprove(item.Id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Post
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="w-full"
                        onClick={() => onItemInPossession(item.Id)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Item in Possession
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
            ))}

            {/* Empty State */}
            {items.filter(item => !item.Approved && item.Status === "lost").length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="font-medium">No new reports to review</p>
                  <p className="text-sm">New lost item reports will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
