"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Eye, CheckCircle, Clock, Loader2 } from "lucide-react"
import { ProcessStatus } from '@/lib/constants'

export default function PendingProcessesTab({ 
  pendingProcesses = [], 
  onViewDetails,
  isCountsLoading
}) {
  // Group processes by status
  const groupedProcesses = pendingProcesses.reduce((acc, process) => {
    const status = process.status || process.Status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(process);
    return acc;
  }, {});

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
    <div className="space-y-8">
      {/* Pending Approval Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Approval
        </h3>
        {groupedProcesses[ProcessStatus.PENDING_APPROVAL]?.length > 0 ? (
          <div className="grid gap-4">
            {groupedProcesses[ProcessStatus.PENDING_APPROVAL].map((process) => (
              <Card key={process.id} className="border-l-4 border-l-yellow-500">
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
                            {process.item?.name || 'Unknown Item'}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {process.item?.category} • {process.item?.location}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          For Approval
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {process.message || 'Waiting for admin approval'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const formattedItem = {
                            id: process.item?.id || process.item?.Id,
                            name: process.item?.name || process.item?.Name,
                            description: process.item?.description || process.item?.Description,
                            location: process.item?.location || process.item?.Location,
                            category: process.item?.category || process.item?.Category,
                            status: process.item?.status || process.item?.Status,
                            imageUrl: process.item?.imageUrl || process.item?.ImageUrl,
                            dateReported: process.item?.dateReported || process.item?.DateReported,
                            reporterId: process.item?.reporterId || process.item?.ReporterId,
                            additionalDescriptions: process.item?.additionalDescriptions?.$values || 
                                                  process.item?.AdditionalDescriptions?.$values || [],
                            approved: process.item?.approved || process.item?.Approved
                          };
                          onViewDetails(formattedItem);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No items pending approval</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* In Verification Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-500" />
          In Verification
        </h3>
        {groupedProcesses[ProcessStatus.IN_VERIFICATION]?.length > 0 ? (
          <div className="grid gap-4">
            {groupedProcesses[ProcessStatus.IN_VERIFICATION].map((process) => (
              <Card key={process.id} className="border-l-4 border-l-blue-500">
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
                            {process.item?.name || 'Unknown Item'}
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
                          {process.item?.category} • {process.item?.location}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {process.item?.description}
                        </p>
                        {process.item?.additionalDescriptions?.$values?.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            +{process.item.additionalDescriptions.$values.length} additional details
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const formattedItem = {
                            id: process.item?.id || process.item?.Id,
                            name: process.item?.name || process.item?.Name,
                            description: process.item?.description || process.item?.Description,
                            location: process.item?.location || process.item?.Location,
                            category: process.item?.category || process.item?.Category,
                            status: process.item?.status || process.item?.Status,
                            imageUrl: process.item?.imageUrl || process.item?.ImageUrl,
                            dateReported: process.item?.dateReported || process.item?.DateReported,
                            reporterId: process.item?.reporterId || process.item?.ReporterId,
                            additionalDescriptions: process.item?.additionalDescriptions?.$values || 
                                                  process.item?.AdditionalDescriptions?.$values || [],
                            approved: process.item?.approved || process.item?.Approved
                          };
                          onViewDetails(formattedItem);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No items in verification</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approved Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Approved
        </h3>
        {groupedProcesses["approved"]?.length > 0 ? (
          <div className="grid gap-4">
            {groupedProcesses["approved"].map((process) => (
              <Card key={process.id} className="border-l-4 border-l-green-500">
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
                            {process.item?.name || 'Unknown Item'}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Student ID: {process.item?.studentId}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Approved
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          {process.item?.category} • {process.item?.location}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {process.item?.description}
                        </p>
                        {process.item?.additionalDescriptions?.$values?.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            +{process.item.additionalDescriptions.$values.length} additional details
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const formattedItem = {
                            id: process.item?.id || process.item?.Id,
                            name: process.item?.name || process.item?.Name,
                            description: process.item?.description || process.item?.Description,
                            location: process.item?.location || process.item?.Location,
                            category: process.item?.category || process.item?.Category,
                            status: process.item?.status || process.item?.Status,
                            imageUrl: process.item?.imageUrl || process.item?.ImageUrl,
                            dateReported: process.item?.dateReported || process.item?.DateReported,
                            reporterId: process.item?.reporterId || process.item?.ReporterId,
                            additionalDescriptions: process.item?.additionalDescriptions?.$values || 
                                                  process.item?.AdditionalDescriptions?.$values || [],
                            approved: process.item?.approved || process.item?.Approved
                          };
                          onViewDetails(formattedItem);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No approved items</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ... other status sections ... */}
    </div>
  );
} 