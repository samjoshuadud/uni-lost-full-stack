"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, CheckCircle, XCircle } from "lucide-react"

export default function PendingRetrievalTab({ 
  items = [], 
  onHandOver,
  onNoShow
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Items Ready for Retrieval
      </h3>

      <div className="space-y-4">
        {items.filter(item => item.Status === "pending_retrieval").map((item) => (
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
                      <h3 className="font-bold text-lg">{item.Name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Student ID: {item.StudentId || 'N/A'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Ready for Retrieval
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm"><strong>Location:</strong> {item.Location}</p>
                    <p className="text-sm"><strong>Category:</strong> {item.Category}</p>
                    <p className="text-sm"><strong>Description:</strong> {item.Description}</p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full"
                    onClick={() => onHandOver(item.Id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Handed Over
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="w-full"
                    onClick={() => onNoShow(item.Id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    No Show
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {items.filter(item => item.Status === "pending_retrieval").length === 0 && (
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
