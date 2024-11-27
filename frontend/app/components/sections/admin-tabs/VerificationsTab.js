"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Trash, ExternalLink, Loader2, Activity, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { ProcessStatus } from "@/lib/constants"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { toast } from "react-hot-toast"
import { API_BASE_URL } from "@/lib/api-config"
export default function VerificationsTab({ items = [], onDelete, handleViewDetails, isCountsLoading }) {
  const [activeSubTab, setActiveSubTab] = useState("in_progress");
  const [cancelingProcessId, setCancelingProcessId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});

  useEffect(() => {
    const fetchQuestionsForProcess = async (processId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/questions`);
        if (!response.ok) {
          console.error('Failed to fetch questions for process:', processId);
          return;
        }
        const data = await response.json();
        
        if (data && data.success && data.data && data.data.$values) {
          setQuestionsMap(prev => ({
            ...prev,
            [processId]: data.data.$values.map(q => ({
              question: q.question,
              answer: q.answer,
              id: q.id
            }))
          }));
        }
      } catch (error) {
        console.error(`Error fetching questions for process ${processId}:`, error);
      }
    };

    const processesToFetch = items.filter(p => 
      p.status === ProcessStatus.IN_VERIFICATION || 
      p.status === ProcessStatus.AWAITING_REVIEW
    );
    
    processesToFetch.forEach(process => {
      if (!questionsMap[process.id]) {
        fetchQuestionsForProcess(process.id);
      }
    });
  }, [items]);

  const formatItemForDetails = (process) => {
    const additionalDescs = process.item?.additionalDescriptions?.$values || 
                          process.item?.AdditionalDescriptions?.$values || [];
                        
    return {
      id: process.item?.id || process.item?.Id,
      name: process.item?.name || process.item?.Name,
      description: process.item?.description || process.item?.Description,
      location: process.item?.location || process.item?.Location,
      category: process.item?.category || process.item?.Category,
      status: process.item?.status || process.item?.Status,
      imageUrl: process.item?.imageUrl || process.item?.ImageUrl,
      dateReported: process.item?.dateReported || process.item?.DateReported,
      reporterId: process.item?.reporterId || process.item?.ReporterId,
      studentId: process.item?.studentId || process.item?.StudentId,
      additionalDescriptions: Array.isArray(additionalDescs) ? additionalDescs : [],
      approved: process.item?.approved || process.item?.Approved
    };
  };

  const handleViewDetailsClick = (process) => {
    if (!process) return;
    handleViewDetails(formatItemForDetails(process));
  };

  const handleCancelVerification = async (processId) => {
    try {
      setCancelingProcessId(processId);
      
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel verification');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Verification cancelled successfully",
          variant: "success",
        });
        // Optionally refresh the data or update UI
      }
    } catch (error) {
      console.error('Error canceling verification:', error);
      toast({
        title: "Error",
        description: "Failed to cancel verification",
        variant: "destructive",
      });
    } finally {
      setCancelingProcessId(null);
      setShowCancelDialog(false);
      setSelectedProcessId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Verifications
      </h3>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted p-1 rounded-lg mb-6">
          <TabsTrigger 
            value="in_progress"
            className="data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            In Progress
          </TabsTrigger>
          <TabsTrigger 
            value="awaiting_review"
            className="data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            Under Review
          </TabsTrigger>
          <TabsTrigger 
            value="failed"
            className="data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            Failed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress">
          <div className="space-y-4">
            {items.filter(process => process.status === "in_verification").length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No verifications in progress</p>
                </CardContent>
              </Card>
            ) : (
              items
                .filter(process => process.status === "in_verification")
                .map((process) => (
                  <Card 
                    key={process.id}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {process.item?.imageUrl ? (
                            <img
                              src={process.item.imageUrl}
                              alt={process.item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-lg">
                                {process.item?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Student ID: {process.item?.studentId}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              In Verification
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Category:</strong> {process.item?.category}
                            </p>
                            <p className="text-sm">
                              <strong>Location:</strong> {process.item?.location}
                            </p>
                            <div className="mt-4 space-y-2">
                              <p className="text-sm font-medium text-blue-600">Verification Questions:</p>
                              {questionsMap[process.id]?.map((q, index) => (
                                <div key={index} className="bg-blue-50 p-3 rounded-lg">
                                  <p className="text-sm text-blue-800">
                                    {index + 1}. {q.question}
                                  </p>
                                </div>
                              ))}
                              {!questionsMap[process.id] && (
                                <p className="text-sm text-gray-500 italic">Loading questions...</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleViewDetailsClick(process)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
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
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="awaiting_review">
          <div className="space-y-4">
            {items.filter(process => process.status === ProcessStatus.AWAITING_REVIEW).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No verifications awaiting review</p>
                </CardContent>
              </Card>
            ) : (
              items
                .filter(process => process.status === ProcessStatus.AWAITING_REVIEW)
                .map((process) => (
                  <Card key={process.id} className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {process.item?.imageUrl ? (
                            <img
                              src={process.item.imageUrl}
                              alt={process.item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-lg">
                                {process.item?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Student ID: {process.item?.studentId}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                              Under Review
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-indigo-600">Verification Questions & Answers:</p>
                            {questionsMap[process.id] ? (
                              questionsMap[process.id].map((qa, index) => (
                                <div key={qa.id} className="bg-indigo-50 p-4 rounded-lg space-y-2">
                                  <p className="text-sm text-indigo-800">
                                    <span className="font-medium">Q{index + 1}:</span> {qa.question}
                                  </p>
                                  {qa.answer && (
                                    <p className="text-sm text-indigo-600 pl-4">
                                      <span className="font-medium">Answer:</span> {qa.answer}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 italic">Loading questions and answers...</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleViewDetailsClick(process)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
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
                          
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              className="flex-1 border-green-500 hover:bg-green-50 text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Correct
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Wrong
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="failed">
          <div className="space-y-4">
            {items.filter(process => process.status === "verification_failed").length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No failed verifications</p>
                </CardContent>
              </Card>
            ) : (
              items
                .filter(process => process.status === "verification_failed")
                .map((process) => (
                  <Card key={process.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {process.item?.imageUrl ? (
                            <img
                              src={process.item.imageUrl}
                              alt={process.item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-lg">
                                {process.item?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Student ID: {process.item?.studentId}
                              </p>
                            </div>
                            <Badge variant="destructive">
                              Failed Verification
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Category:</strong> {process.item?.category}
                            </p>
                            <p className="text-sm">
                              <strong>Location:</strong> {process.item?.location}
                            </p>
                            <p className="text-sm text-red-600">
                              Failed verification after {process.verificationAttempts} attempts
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleViewDetailsClick(process)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => onDelete(process.item.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete Item
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this verification process? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelingProcessId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCancelVerification(selectedProcessId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelingProcessId !== null}
            >
              {cancelingProcessId ? "Canceling..." : "Yes, Cancel Verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
