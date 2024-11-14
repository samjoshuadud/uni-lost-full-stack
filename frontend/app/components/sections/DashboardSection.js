"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants';

export default function DashboardSection({ onSeeMore }) {
  const { userData, isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:5067/api/Item/pending/all');
        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await response.json();
        
        // Filter for approved items only and transform the data
        const approvedItems = data
          .filter(item => item.Item.Approved === true)
          .map(item => ({
            id: item.Item.Id,
            name: item.Item.Name,
            description: item.Item.Description,
            location: item.Item.Location,
            status: item.Item.Status,
            imageUrl: item.Item.ImageUrl,
            dateReported: item.Item.DateReported,
            additionalDescriptions: item.Item.AdditionalDescriptions,
            approved: item.Item.Approved
          }));
        
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

  if (isLoading) return (
    <div className="col-span-full text-center p-8 text-muted-foreground">
      Loading...
    </div>
  );

  if (error) return (
    <div className="col-span-full text-center p-8 text-muted-foreground">
      {error}
    </div>
  );

  if (!items?.length) return (
    <div className="col-span-full text-center p-8 text-muted-foreground">
      No approved items found
    </div>
  );

  const getStatusBadge = (status) => {
    return (
      <Badge variant={ItemStatusVariants[status] || 'default'}>
        {ItemStatusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            {/* Image Section */}
            <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-muted">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image Available
                </div>
              )}
            </div>
            
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.location}</p>
              </div>
              {getStatusBadge(item.status)}
            </div>
            <p className="text-sm mb-4 line-clamp-2">{item.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {new Date(item.dateReported).toLocaleDateString()}
              </span>
              <Button variant="outline" onClick={() => onSeeMore(item)}>
                See More
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 
