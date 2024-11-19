"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants'
import { Package, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardSection({ 
  handleViewDetails = (item) => {
    console.warn('handleViewDetails not provided for item:', item);
  }
}) {
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:5067/api/Item/pending/all');
        if (!response.ok) throw new Error('Failed to fetch items');
        
        const data = await response.json();
        
        // Filter for approved items with status "approved"
        const approvedItems = data.$values?.filter(process => 
          process.item?.approved === true && 
          process.status === "approved"
        ).map(process => ({
          id: process.item.id,
          name: process.item.name,
          category: process.item.category,
          location: process.item.location,
          status: process.item.status,
          imageUrl: process.item.imageUrl,
          dateReported: process.item.dateReported,
          reporterId: process.item.reporterId,
          additionalDescriptions: process.item.additionalDescriptions?.$values || []
        })) || [];

        setItems(approvedItems);
      } catch (error) {
        console.error('Error fetching items:', error);
        setError('Failed to fetch items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="w-full h-48 mb-4 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center mt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No approved items found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card 
          key={item.id} 
          id={`item-${item.id}`} 
          className="overflow-hidden hover:shadow-lg transition-all"
        >
          <CardContent className="p-4">
            {/* Image Section */}
            <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-muted">
              {item.imageUrl ? (
                <div className="w-full h-full relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
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
                    <p className="text-xs">{item.category || 'Item'} Image</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">{item.category || 'Item'} Image</p>
                </div>
              )}
            </div>
            
            {/* Content Section */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {item.location}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(item.dateReported).toLocaleDateString()}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(item)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 
