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
import { exportHistoryItems } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function HistoryTab({ handleViewDetails }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, handed_over, no_show
  const [searchTerm, setSearchTerm] = useState("");

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
        
        setItems(historyItems);
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

    return matchesFilter && matchesSearch;
  });

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
      <div className="flex gap-4 items-center">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={filteredItems.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportHistoryItems.toExcel(filteredItems)}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportHistoryItems.toPdf(filteredItems)}>
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* History Table */}
      <div className="border rounded-lg">
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
            {filteredItems.map((process) => (
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
            Showing {filteredItems.length} items
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}