"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isWithinInterval, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Package, CalendarIcon, Loader2, Search, X } from "lucide-react";
import { rankItemSimilarity } from "@/lib/gemini";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/lib/api-config";

export default function MatchingItemsDialog({
  open,
  onOpenChange,
  items = [],
  selectedItem = null,
  onMatchItem,
  reportType = "lost", // can be "lost" or "found"
  isLoadingItems = false,
  fetchFoundItems
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedMatchItem, setSelectedMatchItem] = useState(null);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [isRankingItems, setIsRankingItems] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
  const [isLoadingFoundItems, setIsLoadingFoundItems] = useState(false);
  const [selectedItemForVerification, setSelectedItemForVerification] = useState(null);
  const [showFoundItemsDialog, setShowFoundItemsDialog] = useState(false);
  const [isMatchingItem, setIsMatchingItem] = useState(false);
  const [selectedFoundItem, setSelectedFoundItem] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      if (!open || !items.length) return;

      setIsLoadingFoundItems(true);
      try {
        // First fetch the found items
        if (fetchFoundItems) {
          await fetchFoundItems();
        }

        // Then rank them if we have a selected item
        if (selectedItem && mounted) {
          setIsRankingItems(true);
          const rankedItems = await Promise.all(
            items.map(async (item) => {
              const score = await rankItemSimilarity(selectedItem, item);
              return { ...item, similarityScore: score };
            })
          );

          if (mounted) {
            setFoundItems(rankedItems.sort((a, b) => b.similarityScore - a.similarityScore));
          }
        } else if (mounted) {
          setFoundItems(items);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        if (mounted) {
          setFoundItems(items);
        }
      } finally {
        if (mounted) {
          setIsLoadingFoundItems(false);
          setIsRankingItems(false);
        }
      }
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [open, items, selectedItem, fetchFoundItems]);

  const handleMatchItem = async (matchItem) => {
    if (!matchItem || !selectedItem) return;
    
    try {
      setProcessingItems(prev => new Set(prev).add(matchItem.id));
      await onMatchItem(matchItem);
      onOpenChange(false);
    } catch (error) {
      console.error('Error matching item:', error);
      toast.error('Failed to match items');
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(matchItem.id);
        return next;
      });
    }
  };



  const isWithinDateRange = (date, range) => {
    if (!date) return false;
    const itemDate = new Date(date);
    
    switch (range) {
      case 'today':
        const today = new Date();
        return itemDate.toDateString() === today.toDateString();
      
      case 'thisWeek':
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      
      case 'thisMonth':
        const thisMonth = new Date();
        return itemDate.getMonth() === thisMonth.getMonth() && 
               itemDate.getFullYear() === thisMonth.getFullYear();
      
      case 'lastMonth':
        const lastMonth = subMonths(new Date(), 1);
        return isWithinInterval(itemDate, {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        });
      
      case 'custom':
        if (!dateRange.from) return true;
        if (dateRange.from && !dateRange.to) {
          return itemDate >= dateRange.from;
        }
        return isWithinInterval(itemDate, {
          start: dateRange.from,
          end: dateRange.to || dateRange.from
        });
      
      default:
        return true;
    }
  };

  const isWithinDateRangeFound = (date, range) => {
    if (!date) return false;
    const itemDate = new Date(date);
    const today = new Date();
    
    switch (range) {
      case 'today':
        return itemDate.toDateString() === today.toDateString();
      case 'yesterday': {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return itemDate.toDateString() === yesterday.toDateString();
      }
      case 'last7days': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }
      case 'last30days': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return itemDate >= thirtyDaysAgo;
      }
      case 'thisMonth': {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return itemDate >= firstDayOfMonth;
      }
      case 'custom':
        if (!dateRange.from) return true;
        if (!dateRange.to) return itemDate >= dateRange.from;
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
      case 'all':
        return true;
      default:
        return true;
    }
  };

  const filterItem = useCallback((item) => {
    const searchStr = searchQuery.toLowerCase();
    const matchesSearch = (
      item.name?.toLowerCase().includes(searchStr) ||
      item.description?.toLowerCase().includes(searchStr) ||
      item.category?.toLowerCase().includes(searchStr) ||
      item.location?.toLowerCase().includes(searchStr)
    );
    
    const matchesDate = isWithinDateRange(item.createdAt, dateFilter);
    
    return matchesSearch && matchesDate;
  }, [searchQuery, dateFilter]);

  const sortItems = useCallback((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'nameAZ':
        return (a.name || '').localeCompare(b.name || '');
      case 'nameZA':
        return (b.name || '').localeCompare(a.name || '');
      default:
        return 0;
    }
  }, [sortOption]);

  const sortedAndFilteredItems = useMemo(() => {
    return foundItems
      .filter(filterItem)
      .sort(sortItems);
  }, [foundItems, filterItem, sortItems]);

  const handleSelectItem = useCallback((item) => {
    setSelectedFoundItem(item);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-700 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Matching {reportType === "lost" ? "Found" : "Lost"} Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search by name, description, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            </div>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter === 'all' ? (
                    'All Time'
                  ) : dateFilter === 'custom' && dateRange.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                    ) : (
                      format(dateRange.from, 'MMM d')
                    )
                  ) : (
                    {
                      'today': 'Today',
                      'thisWeek': 'This Week',
                      'thisMonth': 'This Month',
                      'lastMonth': 'Last Month',
                    }[dateFilter]
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    setDateRange(range || { from: null, to: null });
                    setDateFilter('custom');
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Sort Dropdown */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="nameAZ">Name (A-Z)</SelectItem>
                <SelectItem value="nameZA">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          {sortedAndFilteredItems.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {sortedAndFilteredItems.length} items
            </div>
          )}
        </div>

        {isLoadingItems || isRankingItems ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-sm text-gray-500">
                {isRankingItems ? 'Ranking items by similarity...' : 'Loading items...'}
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              {sortedAndFilteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`relative rounded-lg border transition-all duration-200 
                    ${selectedMatchItem?.id === item.id 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                    } p-4 cursor-pointer`
                  }
                  onClick={() => handleSelectItem(item)}
                >
                  <div className="flex gap-6">
                    {/* Image Section */}
                    <div className={`w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border transition-colors duration-200
                      ${selectedMatchItem?.id === item.id 
                        ? 'border-blue-200 shadow-sm' 
                        : 'border-gray-200'}`
                    }>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Details Section */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-lg transition-colors duration-200
                        ${selectedMatchItem?.id === item.id 
                          ? 'text-blue-700' 
                          : 'text-gray-900'}`
                      }>
                        {item.name || 'Unnamed Item'}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.description || 'No description available'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {item.location}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Reported on {format(new Date(item.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => handleMatchItem(selectedMatchItem)}
            disabled={!selectedMatchItem || processingItems.has(selectedMatchItem.id)}
          >
            {processingItems.has(selectedMatchItem?.id) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Matching...
              </>
            ) : (
              'Match Item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
