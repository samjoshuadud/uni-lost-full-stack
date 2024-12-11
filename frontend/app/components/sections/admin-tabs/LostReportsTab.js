"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  CheckCircle,
  Package,
  Trash,
  ExternalLink,
  Loader2,
  Inbox,
  AlertCircle,
  CalendarIcon,
  MapPinIcon,
  Search,
  X,
  ArrowUpDown
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessStatus, ProcessMessages } from '@/lib/constants';
import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api-config"
import { generateVerificationQuestions, rankItemSimilarity } from "@/lib/gemini";
import { toast } from "react-hot-toast";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const LostReportsTab = memo(function LostReportsTab({
  items = [],
  isCountsLoading,
  handleDelete,
  onApprove,
  handleViewDetails,
  onUpdateCounts
}) {
  const [approvingItems, setApprovingItems] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [selectedItemForVerification, setSelectedItemForVerification] = useState(null);
  const [verificationQuestions, setVerificationQuestions] = useState([{ question: '' }]);
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [foundItems, setFoundItems] = useState([]);
  const [isLoadingFoundItems, setIsLoadingFoundItems] = useState(false);
  const [showFoundItemsDialog, setShowFoundItemsDialog] = useState(false);
  const [selectedFoundItem, setSelectedFoundItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null
  });
  const [customDate, setCustomDate] = useState(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [calendarMode, setCalendarMode] = useState('single');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isRankingItems, setIsRankingItems] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [isMatchingItem, setIsMatchingItem] = useState(false);

  const mainCategories = [
    "books", 
    "electronics", 
    "personal items", 
    "documents", 
    "bags",
    "others"
  ];

  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (date) => {
    if (!date) return 'Date not available';
    try {
      return format(new Date(date), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleApproveClick = async (itemId) => {
    try {
      setApprovingItems(prev => new Set(prev).add(itemId));
      await onApprove(itemId);
    } finally {
      setApprovingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDeleteClick = async (itemId) => {
    try {
      setDeletingItems(prev => new Set(prev).add(itemId));
      await handleDelete(itemId);
    } finally {
      setDeletingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleItemInPossession = async (process) => {
    setSelectedItemForVerification({
      processId: process.id,
      item: process.item
    });
    setShowFoundItemsDialog(true);

    if (foundItems.length === 0) {
      await fetchFoundItems();
    }

    try {
      setIsRankingItems(true);
      const rankedItems = await rankItemSimilarity(process.item, foundItems);
      setFoundItems(rankedItems);
    } catch (error) {
      console.error('Error ranking items:', error);
      toast.error('Failed to rank items by similarity');
    } finally {
      setIsRankingItems(false);
    }
  };

  const handleAddQuestion = () => {
    setVerificationQuestions([...verificationQuestions, { question: '' }]);
  };

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...verificationQuestions];
    newQuestions[index].question = value;
    setVerificationQuestions(newQuestions);
  };

  const handleSubmitVerificationQuestions = async () => {
    const questions = verificationQuestions
      .map(q => q.question.trim())
      .filter(q => q.length > 0);

    if (questions.length === 0) return;

    try {
      setIsSubmittingQuestions(true);
      
      const response = await fetch(
        `${API_BASE_URL}/api/Item/process/${selectedItemForVerification.processId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: ProcessStatus.IN_VERIFICATION,
            message: JSON.stringify(questions)
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update process status");

      // Reset dialog state
      setShowVerificationDialog(false);
      setSelectedItemForVerification(null);
      setVerificationQuestions([{ question: '' }]);

      // Update counts if needed
      if (typeof onUpdateCounts === 'function') {
        onUpdateCounts();
      }

    } catch (error) {
      console.error("Error updating process status:", error);
    } finally {
      setIsSubmittingQuestions(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedItemForVerification?.item) return;

    try {
      setIsGeneratingQuestions(true);
      const item = selectedItemForVerification.item;

      const generatedQuestions = await generateVerificationQuestions({
        name: item.name,
        category: item.category,
        description: item.description,
        location: item.location,
        imageUrl: item.imageUrl
      });

      // Convert generated questions to the format expected by the dialog
      const formattedQuestions = generatedQuestions.map(question => ({
        question,
        id: Math.random().toString(36).substr(2, 9) // temporary ID for new questions
      }));

      setVerificationQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again or add them manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsDialog(true);
  };

  const fetchFoundItems = async () => {
    try {
      setIsLoadingFoundItems(true);
      const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
      if (!response.ok) throw new Error('Failed to fetch found items');
      const data = await response.json();
      
      // Filter only approved found items
      const foundItems = data.$values.filter(process => 
        process.item?.status?.toLowerCase() === 'found' && 
        process.item?.approved === true
      );
      
      setFoundItems(foundItems);
    } catch (error) {
      console.error('Error fetching found items:', error);
      toast.error('Failed to load found items');
    } finally {
      setIsLoadingFoundItems(false);
    }
  };

  useEffect(() => {
    fetchFoundItems();
  }, []);

  const handleMatchItem = async (foundItem) => {
    if (!foundItem || isMatchingItem) return;
    
    try {
      setIsMatchingItem(true);
      
      console.log('Matching items:', {
        lostProcessId: selectedItemForVerification.processId,
        foundProcessId: foundItem.id
      });

      const response = await fetch(
        `${API_BASE_URL}/api/Item/process/match`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lostProcessId: selectedItemForVerification.processId,
            foundProcessId: foundItem.id
          }),
        }
      );

      const responseData = await response.clone().json();
      console.log('Match response:', responseData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to match items");
      }

      toast.success('Successfully matched items');
      setShowFoundItemsDialog(false);
      setSelectedFoundItem(null);
      
      if (typeof onUpdateCounts === 'function') {
        onUpdateCounts();
      }
    } catch (error) {
      console.error("Error matching items:", error);
      toast.error(error.message || 'Failed to match items');
    } finally {
      setIsMatchingItem(false);
      setShowFoundItemsDialog(false);
    }
  };

  const isWithinDateRange = (date, range) => {
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

  const sortedAndFilteredFoundItems = useMemo(() => {
    const filtered = foundItems.filter(item => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = (
        item.item?.name?.toLowerCase().includes(searchStr) ||
        item.item?.category?.toLowerCase().includes(searchStr) ||
        item.item?.description?.toLowerCase().includes(searchStr) ||
        item.item?.location?.toLowerCase().includes(searchStr) ||
        item.item?.studentId?.toLowerCase().includes(searchStr)
      );

      const matchesDate = isWithinDateRange(item.item?.dateReported, dateFilter);
      const matchesCategory = categoryFilter === 'all' || 
        item.item?.category?.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesDate && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      // First prioritize similarity score if sorting option is 'newest' (default)
      if (sortOption === 'newest') {
        // If both items have similarity scores, sort by score
        if (a.similarityScore && b.similarityScore) {
          return b.similarityScore - a.similarityScore;
        }
        // If only one has a similarity score, prioritize it
        if (a.similarityScore) return -1;
        if (b.similarityScore) return 1;
        // If neither has a similarity score, fall back to date
        return new Date(b.item?.dateReported) - new Date(a.item?.dateReported);
      }

      // Other sorting options remain unchanged
      switch (sortOption) {
        case 'oldest':
          return new Date(a.item?.dateReported) - new Date(b.item?.dateReported);
        case 'a-z':
          return (a.item?.name || '').localeCompare(b.item?.name || '');
        case 'z-a':
          return (b.item?.name || '').localeCompare(a.item?.name || '');
        default:
          return 0;
      }
    });
  }, [foundItems, searchQuery, sortOption, dateFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Lost Items Management
        </h3>
        <p className="text-gray-600 mt-2">
          Process lost item reports and manage student claims. Review item details, 
          approve posts to make them visible, or find a matching item for a found item.
        </p>

        {/* Status Cards */}
        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <Card className="bg-white hover:bg-gray-50/50 transition-colors border border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {isCountsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      items.filter(process => 
                        process.status === ProcessStatus.PENDING_APPROVAL && 
                        process.item?.status?.toLowerCase() === "lost" && 
                        !process.item?.approved
                      ).length
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lost Items List */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              New Lost Item Reports
            </h4>
          </div>

          <div className="relative">
            <div className="h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50 pr-4">
              <div className="space-y-4 pt-1">
                {isCountsLoading ? (
                  // Enhanced skeleton loading state
                  <>
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="overflow-hidden border border-gray-100 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            <Skeleton className="w-32 h-32 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                  </div>
                                  <Skeleton className="h-6 w-24" />
                                </div>
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-3/4" />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <Skeleton className="h-9 w-full" />
                              <Skeleton className="h-9 w-full" />
                              <Skeleton className="h-9 w-full" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : !items || items.filter(process => 
                    process.status === ProcessStatus.PENDING_APPROVAL && 
                    process.item?.status?.toLowerCase() === "lost" && 
                    !process.item?.approved
                  ).length === 0 ? (
                  // Enhanced empty state
                  <Card className="border border-dashed bg-gray-50/50">
                    <CardContent className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Inbox className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-xl text-gray-900">No Lost Item Reports</h3>
                        <p className="text-gray-500 text-sm max-w-sm">
                          There are currently no lost item reports waiting for approval. New reports will appear here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Enhanced item cards
                  items
                    .filter(process => 
                      process.status === ProcessStatus.PENDING_APPROVAL && 
                      !process.item?.approved && 
                      process.item?.status?.toLowerCase() === "lost"
                    )
                    .map((process) => (
                      <Card 
                        key={process.id} 
                        className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => handleItemClick(process.item)}
                      >
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Image Section - Enhanced */}
                            <div className="w-32 h-32 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                              {process.item?.imageUrl ? (
                                <div className="w-full h-full relative group">
                                  <img
                                    src={process.item.imageUrl}
                                    alt={process.item.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                  <Package className="h-8 w-8 mb-2" />
                                  <p className="text-xs text-center px-2">
                                    No Image
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg truncate">
                                      {process.item?.name}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className="bg-yellow-100 text-yellow-800"
                                    >
                                      For Approval
                                    </Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span className="font-medium">
                                        {process.item?.studentId?.startsWith('ADMIN') ? 'Reported by:' : 'Student ID:'}
                                      </span>
                                      <span>{process.item?.studentId || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="ml-2 flex-shrink-0"
                                >
                                  {process.item?.category}
                                </Badge>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-sm">
                                  <strong>Location:</strong> {process.item?.location}
                                </p>
                                <p className="text-sm">
                                  <strong>Description:</strong> {process.item?.description}
                                </p>
                                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      +{process.item.additionalDescriptions.$values.length}{" "}
                                      additional details
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Section - Stop event propagation */}
                            <div className="flex flex-col gap-2 justify-start min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all duration-200"
                                onClick={() => handleItemClick(process.item)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2 text-slate-500" />
                                View Details
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-sm transition-all duration-200"
                                onClick={() => handleApproveClick(process.item?.id)}
                                disabled={approvingItems.has(process.item?.id)}
                              >
                                {approvingItems.has(process.item?.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Post
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-gradient-to-r from-[#1E293B] to-[#334155] hover:from-[#334155] hover:to-[#1E293B] text-white shadow-sm transition-all duration-200"
                                onClick={() => handleItemInPossession(process)}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Match with Found Item
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 transition-all duration-200"
                                onClick={() => handleDeleteClick(process.item?.id)}
                                disabled={deletingItems.has(process.item?.id)}
                              >
                                {deletingItems.has(process.item?.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete Report
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent h-12 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-700">
              Item Match Found for {selectedItemForVerification?.item?.name}
            </DialogTitle>
            <DialogDescription className="pt-2.5 text-gray-600 leading-relaxed">
              This will notify the reporter that a matching item has been found in our storage. They will be instructed to visit the OHSO (Occupational Health Services Office) in the basement of the Admin Building to claim their item.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowVerificationDialog(false);
                setSelectedItemForVerification(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              onClick={async () => {
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/api/Item/process/${selectedItemForVerification?.processId}/status`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: ProcessStatus.PENDING_RETRIEVAL,
                        message: "Item is ready for pickup at OHSO"
                      }),
                    }
                  );

                  if (!response.ok) {
                    throw new Error("Failed to update process status");
                  }

                  // Close dialog and reset state
                  setShowVerificationDialog(false);
                  setSelectedItemForVerification(null);

                  // Update counts if needed
                  if (typeof onUpdateCounts === 'function') {
                    onUpdateCounts();
                  }
                } catch (error) {
                  console.error("Error updating process status:", error);
                  // You might want to show an error toast here
                }
              }}
            >
              Notify Reporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 border-b bg-[#f8f9fa]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-semibold text-[#0052cc]">Item Details</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedItemForDetails?.dateReported ? 
                      format(new Date(selectedItemForDetails.dateReported), 'MMMM do, yyyy') 
                      : 'Date not available'
                    }
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 capitalize px-3 py-1.5">
                  {selectedItemForDetails?.status || 'Lost'}
                </Badge>
              </div>
            </DialogHeader>
          </div>

          {selectedItemForDetails && (
            <>
              {/* Content Section */}
              <div className="p-6 space-y-6">
                {/* Image and Details Grid */}
                <div className="grid md:grid-cols-[240px,1fr] gap-6">
                  {/* Image Section */}
                  <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    {selectedItemForDetails.imageUrl ? (
                      <img
                        src={selectedItemForDetails.imageUrl}
                        alt={selectedItemForDetails.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Package className="h-12 w-12 mb-2" />
                        <p className="text-sm">No Image</p>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Item Name</h4>
                        <p className="font-medium">{selectedItemForDetails.name}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <p className="font-medium capitalize">{selectedItemForDetails.status || 'lost'}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Category</h4>
                        <p className="font-medium">{selectedItemForDetails.category}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Location</h4>
                        <p className="font-medium flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          {selectedItemForDetails.location}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="text-gray-700">{selectedItemForDetails.description}</p>
                    </div>

                    {/* Additional Details if any */}
                    {selectedItemForDetails?.additionalDescriptions?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                        <div className="space-y-2">
                          {selectedItemForDetails.additionalDescriptions.map((desc, index) => (
                            <p key={index} className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                              <strong>{desc.title}:</strong> {desc.description}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="px-6 py-4 border-t bg-[#f8f9fa] flex justify-end gap-3">
                <Button
                  variant="default"
                  onClick={() => handleApproveClick(selectedItemForDetails.id)}
                  disabled={approvingItems.has(selectedItemForDetails.id)}
                  className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-sm transition-all duration-200"
                >
                  {approvingItems.has(selectedItemForDetails.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Post
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    handleItemInPossession({ item: selectedItemForDetails });
                    setShowDetailsDialog(false);
                  }}
                  className="bg-gradient-to-r from-[#1E293B] to-[#334155] hover:from-[#334155] hover:to-[#1E293B] text-white shadow-sm transition-all duration-200"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Match with Found Item
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteClick(selectedItemForDetails.id);
                    setShowDetailsDialog(false);
                  }}
                  disabled={deletingItems.has(selectedItemForDetails.id)}
                >
                  {deletingItems.has(selectedItemForDetails.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showFoundItemsDialog} onOpenChange={setShowFoundItemsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-700 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Matching Found Item
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Please select the found item that matches with the lost item report.
            </DialogDescription>
            <div className="mt-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="font-medium text-blue-800">Lost Item Details:</h4>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-blue-700">
                  <div>
                    <span className="font-medium">Category:</span>{" "}
                    {selectedItemForVerification?.item?.category || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>{" "}
                    {selectedItemForVerification?.item?.location || "N/A"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span>{" "}
                    {selectedItemForVerification?.item?.description || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Add Search Bar */}
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search by name, category, location, or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <SelectValue placeholder="All Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectSeparator />
                  {mainCategories.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category.toLowerCase()}
                      className="capitalize"
                    >
                      {capitalizeFirstLetter(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter === 'all' ? (
                      "All Time"
                    ) : dateFilter === 'custom' ? (
                      dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                        ) : (
                          `From ${format(dateRange.from, 'MMM d')}`
                        )
                      ) : (
                        "Select dates"
                      )
                    ) : (
                      {
                        'today': 'Today',
                        'yesterday': 'Yesterday',
                        'last7days': 'Last 7 days',
                        'last30days': 'Last 30 days',
                        'thisMonth': 'This month',
                      }[dateFilter]
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-4">
                      {/* Quick Filters */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={dateFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('all');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          All Time
                        </Button>
                        <Button
                          variant={dateFilter === 'today' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('today');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          Today
                        </Button>
                        <Button
                          variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('yesterday');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          Yesterday
                        </Button>
                        <Button
                          variant={dateFilter === 'last7days' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('last7days');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant={dateFilter === 'last30days' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('last30days');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant={dateFilter === 'thisMonth' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start text-left font-normal h-9"
                          onClick={() => {
                            setDateFilter('thisMonth');
                            setDateRange({ from: null, to: null });
                          }}
                        >
                          This month
                        </Button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border" />

                      {/* Calendar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Custom Range</span>
                          {dateRange.from && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                setDateRange({ from: null, to: null });
                                setDateFilter('all');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="rounded-md border">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange.from}
                            selected={{
                              from: dateRange.from,
                              to: dateRange.to,
                            }}
                            onSelect={(range) => {
                              setDateRange(range || { from: null, to: null });
                              if (range?.from) {
                                setDateFilter('custom');
                              } else {
                                setDateFilter('all');
                              }
                            }}
                            numberOfMonths={1}
                            className="rounded-md"
                            disabled={(date) => date > new Date()}
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Sort Dropdown */}
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue placeholder="Sort by..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Best Match</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="a-z">Name (A to Z)</SelectItem>
                  <SelectItem value="z-a">Name (Z to A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count with Filters Info */}
            {sortedAndFilteredFoundItems.length > 0 && (
              <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                <span>
                  Showing {sortedAndFilteredFoundItems.length} {sortedAndFilteredFoundItems.length === 1 ? 'item' : 'items'}
                  {searchQuery && ' matching your search'}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">
                  Sorted by: {
                    sortOption === 'newest' ? 'Best Match' :
                    sortOption === 'oldest' ? 'Oldest First' :
                    sortOption === 'a-z' ? 'Name (A to Z)' :
                    'Name (Z to A)'
                  }
                </span>
                {categoryFilter !== 'all' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">
                      Category: {capitalizeFirstLetter(categoryFilter)}
                    </span>
                  </>
                )}
                {dateFilter !== 'all' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">
                      Date range: {
                        dateFilter === 'today' ? 'Today' :
                        dateFilter === '7days' ? 'Last 7 Days' :
                        dateFilter === '30days' ? 'Last 30 Days' :
                        dateFilter === 'this-month' ? 'This Month' :
                        dateFilter === 'custom-date' ? 
                          (customDate ? formatDate(customDate) : 'Custom Date') :
                        dateFilter === 'custom-month' ?
                          (selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'Select Month') :
                        'All Time'
                      }
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {isLoadingFoundItems || isRankingItems ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2 text-sm text-gray-500">
                  {isLoadingFoundItems ? 'Loading found items...' : 'Ranking items by similarity...'}
                </p>
              </div>
            </div>
          ) : sortedAndFilteredFoundItems.length === 0 ? (
            <div className="text-center p-8">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <p className="mt-4 text-gray-600 font-medium">
                {searchQuery 
                  ? 'No items match your search'
                  : 'No Found Items Available'
                }
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'There are currently no approved found items in the system.'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {sortedAndFilteredFoundItems.map((foundItem, index) => (
                  <div
                    key={foundItem.id}
                    className={`relative rounded-lg border transition-all duration-200 
                      ${selectedFoundItem?.id === foundItem.id 
                        ? 'border-blue-500 bg-blue-50/50 shadow-md transform scale-[1.01] z-10' 
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50/50'
                      } ${processingItems.has(foundItem.id) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Add similarity score badge */}
                    <div className="absolute -top-2 -left-2 flex items-center gap-1.5">
                      {/* Match Rank Badge */}
                     
                      {/* Similarity Score Badge */}
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        foundItem.similarityScore >= 80 ? "bg-green-100 text-green-800" :
                        foundItem.similarityScore >= 60 ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {foundItem.similarityScore}% Match
                      </div>
                    </div>

                    {selectedFoundItem?.id === foundItem.id && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-lg z-20">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div 
                      className="p-4 relative"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (processingItems.has(foundItem.id)) return;
                        
                        setProcessingItems(prev => new Set([...prev, foundItem.id]));
                        setSelectedFoundItem(foundItem);
                        
                        // Add a small delay to show loading state
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        setProcessingItems(prev => {
                          const next = new Set(prev);
                          next.delete(foundItem.id);
                          return next;
                        });
                      }}
                    >
                      {processingItems.has(foundItem.id) && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm text-blue-600 font-medium">Processing...</span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-6">
                        {/* Image Section */}
                        <div className={`w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border transition-colors duration-200
                          ${selectedFoundItem?.id === foundItem.id 
                            ? 'border-blue-200 shadow-sm' 
                            : 'border-gray-200'
                          }`}
                        >
                          {foundItem.item?.imageUrl ? (
                            <img
                              src={foundItem.item.imageUrl}
                              alt={foundItem.item.name}
                              className={`w-full h-full object-cover transition-transform duration-200
                                ${selectedFoundItem?.id === foundItem.id 
                                  ? 'scale-105' 
                                  : 'scale-100'
                                }`}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <Package className={`h-8 w-8 transition-colors duration-200
                                ${selectedFoundItem?.id === foundItem.id 
                                  ? 'text-blue-400' 
                                  : 'text-gray-400'
                                }`}
                              />
                              <span className={`text-xs mt-1 transition-colors duration-200
                                ${selectedFoundItem?.id === foundItem.id 
                                  ? 'text-blue-400' 
                                  : 'text-gray-400'
                                }`}
                              >
                                No Image
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details Section */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className={`font-semibold text-lg transition-colors duration-200
                                ${selectedFoundItem?.id === foundItem.id 
                                  ? 'text-blue-700' 
                                  : 'text-gray-900'
                                }`}
                              >
                                {foundItem.item?.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-sm text-gray-600">
                                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                                  {formatDate(foundItem.item?.dateReported)}
                                </div>
                                {foundItem.similarityScore > 0 && (
                                  <div className="text-sm">
                                    <span className={cn(
                                      "font-medium",
                                      foundItem.similarityScore >= 80 ? "text-green-600" :
                                      foundItem.similarityScore >= 60 ? "text-yellow-600" :
                                      "text-gray-600"
                                    )}>
                                      {foundItem.similarityScore}% Similarity
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`transition-colors duration-200
                                ${selectedFoundItem?.id === foundItem.id 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                                }`}
                            >
                              Found Item
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Category:</span>{" "}
                              <span className="text-gray-600">{capitalizeFirstLetter(foundItem.item?.category)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Location:</span>{" "}
                              <span className="text-gray-600">{foundItem.item?.location}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Student ID:</span>{" "}
                              <span className="text-gray-600">{foundItem.item?.studentId || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Status:</span>{" "}
                              <span className="text-gray-600 capitalize">{foundItem.item?.status}</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <span className="font-medium text-gray-700 text-sm">Description:</span>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {foundItem.item?.description}
                            </p>
                          </div>

                          {foundItem.item?.additionalDescriptions?.$values?.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">
                                +{foundItem.item.additionalDescriptions.$values.length} additional details
                              </span>
                            </div>
                          )}
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
              onClick={() => {
                setShowFoundItemsDialog(false);
                setSelectedFoundItem(null);
              }}
              disabled={isMatchingItem}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleMatchItem(selectedFoundItem)}
              disabled={!selectedFoundItem || isMatchingItem}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {isMatchingItem ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                'Confirm Match'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default LostReportsTab;
