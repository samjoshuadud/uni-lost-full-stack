"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"
import { CalendarDays, MapPin, Tag } from "lucide-react"

export default function HistorySection({ items, onItemClick }) {
  const { userData, isAdmin } = useAuth();

  // Filter items based on user role and involvement
  const filteredItems = items.filter(item => {
    if (isAdmin) return item.status === "handed_over";
    return (item.status === "handed_over" && 
           (item.reportedBy === userData?.uid || item.claimedBy === userData?.uid));
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "handed_over":
        return <Badge variant="default">Retrieved</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>{item.category}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>Retrieved on {item.retrievedDate || item.date}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => onItemClick(item)}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No history found
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 