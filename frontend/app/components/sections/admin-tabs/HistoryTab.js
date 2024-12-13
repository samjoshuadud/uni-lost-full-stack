"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Filter, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessStatus, ProcessMessages } from "@/lib/constants";
import { API_BASE_URL } from '@/lib/api-config';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const getMonthYear = (date) => {
  return format(new Date(date), 'MMMM yyyy');
};

const groupItemsByMonth = (items) => {
  return items.reduce((groups, item) => {
    const monthYear = getMonthYear(item.updatedAt);
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(item);
    return groups;
  }, {});
};

export default function HistoryTab({ handleViewDetails }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, handed_over, no_show
  const [searchTerm, setSearchTerm] = useState("");
  const [markingHandedOverItems, setMarkingHandedOverItems] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Fetch history items (both handed over and no-show)
  useEffect(() => {
    const fetchHistoryItems = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch history");
        const data = await response.json();
        
        // Filter only handed over and no-show items
        const historyItems = data.$values?.filter(process => 
          process.status === ProcessStatus.HANDED_OVER || 
          process.status === ProcessStatus.NO_SHOW
        ) || [];
        
        setItems([...historyItems]);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryItems();
  }, []);

  // Filter and search functionality
  const filteredItems = items.filter(item => {
    const matchesFilter = 
      filter === "all" || 
      item.status === filter;
    
    const matchesSearch = 
      item.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item?.studentId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = 
      selectedMonth === "all" || 
      getMonthYear(item.updatedAt) === selectedMonth;

    return matchesFilter && matchesSearch && matchesMonth;
  });

  const groupedItems = groupItemsByMonth(filteredItems);
  const availableMonths = [...new Set(items.map(item => getMonthYear(item.updatedAt)))].sort().reverse();

  const getStatusBadge = (status) => {
    switch (status) {
      case ProcessStatus.HANDED_OVER:
        return <Badge className="bg-green-100 text-green-800">Handed Over</Badge>;
      case ProcessStatus.NO_SHOW:
        return <Badge className="bg-red-100 text-red-800">No Show</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAsHandedOver = async (process) => {
    const processId = process.id;
    try {
      setMarkingHandedOverItems(prev => new Set(prev).add(processId));

      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/hand-over`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark as handed over');
      }

      // Update the item status locally
      setItems(prevItems => prevItems.map(item => 
        item.id === processId ? { ...item, status: ProcessStatus.HANDED_OVER } : item
      ));

      toast.success('Item successfully marked as handed over');

    } catch (err) {
      console.error('Error marking as handed over:', err);
      toast.error(err.message || 'Failed to mark as handed over. Please try again.');
    } finally {
      setMarkingHandedOverItems(prev => {
        const next = new Set(prev);
        next.delete(processId);
        return next;
      });
    }
  };

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Get current page items
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, selectedMonth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Item History</h2>
          <p className="text-sm text-gray-600">History of handed over and no-show items</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name or student ID"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={ProcessStatus.HANDED_OVER}>Handed Over</SelectItem>
            <SelectItem value={ProcessStatus.NO_SHOW}>No Show</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={filteredItems.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToExcel(filteredItems)}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF(filteredItems)}>
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* History Table */}
      <div className="border rounded-lg">
        {selectedMonth !== "all" && (
          <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700">
            {selectedMonth} ({filteredItems.length} items)
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Item Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentItems.map((process) => (
              <tr key={process.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{process.item?.name}</td>
                <td className="px-4 py-3 text-sm">{process.item?.studentId}</td>
                <td className="px-4 py-3 text-sm">{formatDate(process.updatedAt)}</td>
                <td className="px-4 py-3">
                  {getStatusBadge(process.status)}
                </td>
                <td className="px-4 py-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewDetails(process.item)}
                  >
                    View Details
                  </Button>
                  {process.status === ProcessStatus.NO_SHOW && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-500 text-white hover:bg-green-600 border-0"
                      onClick={() => handleMarkAsHandedOver(process)}
                      disabled={markingHandedOverItems.has(process.id)}
                    >
                      {markingHandedOverItems.has(process.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        'Mark as Handed Over'
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm">No history items found</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} items
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
