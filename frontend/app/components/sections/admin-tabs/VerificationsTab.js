"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Package, RotateCcw, Eye, Loader2, ClipboardList, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function VerificationsTab({ 
  items = [],
  isCountsLoading,
  onVerificationResult,
  handleViewDetails
}) {
  const [cancelingProcessId, setCancelingProcessId] = useState(null);
  const [localItems, setLocalItems] = useState([]);
  const [verificationQuestions, setVerificationQuestions] = useState({});
  const [expandedProcessId, setExpandedProcessId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState(null);

  useEffect(() => {
    const fetchQuestions = async (processId) => {
      try {
        const response = await fetch(`http://localhost:5067/api/Item/process/${processId}/questions`);
        if (!response.ok) throw new Error('Failed to fetch questions');
        const data = await response.json();
        return data.questions.$values || data.questions;
      } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
      }
    };

    const loadAllQuestions = async () => {
      const itemsToProcess = localItems.length > 0 ? localItems : items;
      const processArray = Array.isArray(itemsToProcess) ? itemsToProcess : itemsToProcess.$values || [];
      
      const verificationProcesses = processArray.filter(process => 
        process.status === "in_verification" && 
        process.item?.status?.toLowerCase() === "lost"
      );

      const questionsMap = {};
      for (const process of verificationProcesses) {
        questionsMap[process.id] = await fetchQuestions(process.id);
      }
      setVerificationQuestions(questionsMap);
    };

    loadAllQuestions();
  }, [items, localItems]);

  const { verificationItems, verificationCount } = useMemo(() => {
    const itemsToFilter = localItems.length > 0 ? localItems : items;
    if (!itemsToFilter) return { verificationItems: [], verificationCount: 0 };

    const processArray = Array.isArray(itemsToFilter) ? itemsToFilter : itemsToFilter.$values || [];

    const filteredItems = processArray
      .filter(process => 
        process.status === "in_verification" && 
        process.item?.status?.toLowerCase() === "lost"
      )
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return {
      verificationItems: filteredItems,
      verificationCount: filteredItems.length
    };
  }, [items, localItems]);

  const handleCancelVerification = async () => {
    if (!selectedProcessId) return;

    try {
      setCancelingProcessId(selectedProcessId);

      setLocalItems(prevItems => 
        prevItems.length > 0 
          ? prevItems.filter(item => item.id !== selectedProcessId)
          : items.filter(item => item.id !== selectedProcessId)
      );
      
      const response = await fetch(
        `http://localhost:5067/api/Item/process/${selectedProcessId}/cancel`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel verification");
      }

    } catch (error) {
      console.error("Error canceling verification:", error);
      setLocalItems([]);
    } finally {
      setCancelingProcessId(null);
      setShowCancelDialog(false);
      setSelectedProcessId(null);
    }
  };

  const toggleQuestions = (processId) => {
    setExpandedProcessId(expandedProcessId === processId ? null : processId);
  };

  if (isCountsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-6 animate-pulse">
                <div className="w-32 h-32 bg-muted rounded-lg" />
                <div className="flex-1 space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        Verification Requests Overview
      </h3>

      <div className="grid gap-4 md:grid-cols-1 mt-4">
        <Card className="bg-background hover:bg-muted/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Items In Verification
                </p>
                <p className="text-2xl font-bold">
                  {verificationCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {verificationItems.map((process) => (
          <Card 
            key={process.id}
            className="border-l-4 border-l-blue-500"
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {process.item?.imageUrl ? (
                    <div className="w-full h-full relative">
                      <img
                        src={process.item.imageUrl}
                        alt={process.item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="hidden w-full h-full absolute top-0 left-0 bg-muted flex-col items-center justify-center text-muted-foreground p-2"
                      >
                        <Package className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs text-center">
                          {process.item?.category || 'Item'} Image
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs text-center">
                        {process.item?.category || 'Item'} Image
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-lg">
                        {process.item?.name || 'Unknown Item'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {process.item?.category} • {process.item?.location}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      In Verification
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full justify-between mb-2"
                    onClick={() => toggleQuestions(process.id)}
                  >
                    <span className="font-medium text-sm">
                      Verification Questions
                    </span>
                    {expandedProcessId === process.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {expandedProcessId === process.id && (
                    <div className="space-y-4 mt-4 bg-muted/30 p-4 rounded-lg">
                      {verificationQuestions[process.id]?.map((question, index) => (
                        <div 
                          key={`${process.id}-question-${index}`} 
                          className="bg-background p-4 rounded-lg shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-primary min-w-[24px]">
                              {index + 1}.
                            </span>
                            <p className="text-sm">{question}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleViewDetails(process.item)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedProcessId(process.id);
                      setShowCancelDialog(true);
                    }}
                    disabled={cancelingProcessId === process.id}
                  >
                    {cancelingProcessId === process.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Cancel Verification
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {verificationItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No verification requests</p>
              <p className="text-sm">New verification requests will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this verification request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              No, Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancelVerification}>
              Yes, Cancel It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
