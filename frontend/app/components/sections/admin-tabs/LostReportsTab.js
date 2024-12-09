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
  MapPinIcon
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
import { generateVerificationQuestions } from "@/lib/gemini";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

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

  const handleItemInPossession = (process) => {
    setSelectedItemForVerification({
      processId: process.id,
      item: process.item
    });
    setShowVerificationDialog(true);
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

  return (
    <div className="space-y-6">
      <div className="min-h-[600px]">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Lost Items Management
        </h3>
        <p className="text-gray-600 mt-2">
          Process lost item reports and manage student claims. Review item details, 
          approve posts to make them visible, or handle verification processes.
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
                                Set Verification Questions
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
            <DialogTitle>Set Verification Questions</DialogTitle>
            <DialogDescription>
              Enter questions that will help verify the ownership of{" "}
              <span className="font-medium">
                {selectedItemForVerification?.item?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateQuestions}
                disabled={isGeneratingQuestions}
                className="mb-4"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Generate Automatically
                  </>
                )}
              </Button>
            </div>

            {verificationQuestions.map((q, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Question {index + 1}
                  </label>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQuestions = verificationQuestions.filter((_, i) => i !== index);
                        setVerificationQuestions(newQuestions);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Enter a verification question..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddQuestion}
              className="w-full"
            >
              Add Another Question
            </Button>
            <p className="text-sm text-muted-foreground">
              Add specific questions that only the true owner would know.
              You can generate questions automatically or add/edit them manually.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVerificationDialog(false);
                setSelectedItemForVerification(null);
                setVerificationQuestions([{ question: '' }]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVerificationQuestions}
              disabled={isSubmittingQuestions || !verificationQuestions.some(q => q.question.trim())}
            >
              {isSubmittingQuestions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Questions"
              )}
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
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
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
                    {selectedItemForDetails.additionalDescriptions?.$values?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                        <div className="space-y-2">
                          {selectedItemForDetails.additionalDescriptions.$values.map((desc, index) => (
                            <p key={index} className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                              {desc}
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
                  Set Verification Questions
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
    </div>
  );
});

export default LostReportsTab;
