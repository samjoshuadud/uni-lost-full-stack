"use client"

import { useState, useRef, useEffect } from "react"
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/AuthContext"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ItemStatus, ProcessStatus, ProcessMessages } from "@/lib/constants"
import { Plus, X, Upload, Bell, AlertTriangle, Download, Clock, Eye } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config";
import { Label } from "@/components/ui/label"

export default function ReportSection({ 
  onSubmit, 
  adminMode = false, 
  initialData = null, 
  isScannedData = false,
  activeSection = null
}) {
  const { user, makeAuthenticatedRequest, userData } = useAuth();
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [location, setLocation] = useState(initialData?.location || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [studentId, setStudentId] = useState(userData?.studentId || "")
  const [additionalDescriptions, setAdditionalDescriptions] = useState(
    Array.isArray(initialData?.additionalDescriptions) 
      ? initialData.additionalDescriptions 
      : initialData?.additionalDescriptions?.$values 
        ? initialData.additionalDescriptions.$values
        : []
  )
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null)
  const [itemStatus, setItemStatus] = useState(adminMode ? ItemStatus.FOUND : "")
  const [showQRCode, setShowQRCode] = useState(false);
  const qrCodeRef = useRef(null);
  const [scannedData, setScannedData] = useState(null);
  const [additionalDescriptionTitle, setAdditionalDescriptionTitle] = useState("")
  const [additionalDescriptionText, setAdditionalDescriptionText] = useState("")
  const [isAddingDescription, setIsAddingDescription] = useState(false)
  const [showEmptyDescriptionError, setShowEmptyDescriptionError] = useState(false)
  const [originalItem, setOriginalItem] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setLocation(initialData.location || "");
      setCategory(initialData.category || "");
      setStudentId(userData?.studentId || "");
      setAdditionalDescriptions(
        Array.isArray(initialData.additionalDescriptions)
          ? initialData.additionalDescriptions
          : initialData.additionalDescriptions?.$values
            ? initialData.additionalDescriptions.$values
            : []
      );
      setImagePreview(initialData.imageUrl || null);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchOriginalItem = async () => {
      if (isScannedData && initialData?.id) {
        try {
          // Fetch the original item details using the scanned ID
          const response = await makeAuthenticatedRequest(`/api/Item/${initialData.id}`);
          if (response) {
            setOriginalItem(response);
            // Set the studentId from the original reporter
            setStudentId(response.studentId || "");
          }
        } catch (error) {
          console.error("Error fetching original item:", error);
        }
      } else {
        // If not from QR scan, use current user's studentId
        setStudentId(userData?.studentId || "");
      }
    };

    fetchOriginalItem();
  }, [isScannedData, initialData, userData]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File is too large. Please select an image under 5MB');
        return;
      }

      setSelectedImage(file);

      // Create URL for preview
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      // Clean up the URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleAddDescription = () => {
    // Check if either field is empty when Add button is clicked
    if (!additionalDescriptionTitle.trim() || !additionalDescriptionText.trim()) {
      setShowEmptyDescriptionError(true)
      return
    }

    setAdditionalDescriptions([
      ...additionalDescriptions,
      {
        title: additionalDescriptionTitle,
        description: additionalDescriptionText
      }
    ])
    // Reset fields and error state
    setAdditionalDescriptionTitle("")
    setAdditionalDescriptionText("")
    setIsAddingDescription(false)
    setShowEmptyDescriptionError(false)
  }

  const removeDescription = (index) => {
    const newDescriptions = [...additionalDescriptions]
    newDescriptions.splice(index, 1)
    setAdditionalDescriptions(newDescriptions)
  }

  const updateDescription = (index, field, value) => {
    const newDescriptions = [...additionalDescriptions]
    newDescriptions[index][field] = value
    setAdditionalDescriptions(newDescriptions)
  }

  const handlePreview = () => {
    // Show the confirmation dialog with the current form data
    setShowConfirmDialog(true);
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    handlePreview();
  };

  const generateQRData = (processId) => {
    console.log('Generating QR data for process ID:', processId);
    if (!processId) {
      console.error('No process ID provided for QR generation');
      return '';
    }

    // Encode the process ID and timestamp
    const qrData = {
      id: processId, // This will now be the process ID
      t: new Date().getTime()
    };

    const qrString = JSON.stringify(qrData);
    console.log('Generated QR data:', qrString);
    return qrString;
  };

  const downloadQRCode = async () => {
    if (qrCodeRef.current) {
      try {
        const dataUrl = await toPng(qrCodeRef.current);
        const link = document.createElement('a');
        link.download = `found-item-qr-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error downloading QR code:', err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      if (isScannedData && initialData) {
        // Create FormData for item update
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('location', location);
        formData.append('category', category);
        formData.append('studentId', studentId);
        
        if (selectedImage) {
          formData.append('image', selectedImage);
        }

        if (additionalDescriptions.length > 0) {
          formData.append('additionalDescriptions', JSON.stringify(additionalDescriptions));
        }

        // First update item details
        const itemUpdateResponse = await fetch(`${API_BASE_URL}/api/Item/update/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.email}`,
            'FirebaseUID': user.uid,
          },
          body: formData
        });

        if (!itemUpdateResponse.ok) {
          throw new Error('Failed to update item details');
        }

        // Then update process status
        const processUpdateResponse = await fetch(`${API_BASE_URL}/api/Item/process/${initialData.processId}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.email}`,
            'FirebaseUID': user.uid,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Status: ProcessStatus.PENDING_APPROVAL,
            Message: ProcessMessages.WAITING_APPROVAL
          })
        });

        if (!processUpdateResponse.ok) {
          throw new Error('Failed to update process status');
        }

        if (onSubmit) {
          onSubmit();
        }
        return;
      }

      // Original code for new item submission
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('location', location);
      formData.append('category', category || 'Books');
      formData.append('status', itemStatus);
      formData.append('reporterId', user.uid);
      formData.append('studentId', studentId);
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      if (additionalDescriptions.length > 0) {
        formData.append('additionalDescriptions', JSON.stringify(additionalDescriptions));
      }

      if (itemStatus === ItemStatus.FOUND && !adminMode) {
        formData.append('processStatus', ProcessStatus.AWAITING_SURRENDER);
        formData.append('message', ProcessMessages.SURRENDER_REQUIRED);
      } else {
        formData.append('processStatus', ProcessStatus.PENDING_APPROVAL);
        formData.append('message', ProcessMessages.WAITING_APPROVAL);
      }

      console.log('Submitting form data...');
      const response = await fetch(`${API_BASE_URL}/api/Item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'FirebaseUID': user.uid,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));

      // Show QR code only for non-admin found item reports
      if (itemStatus === ItemStatus.FOUND && !adminMode) {
        // Get the itemId from the response
        const itemId = data.itemId; // Use itemId from response

        console.log('Found Item ID:', itemId);

        if (!itemId) {
          console.error('Response structure:', data);
          throw new Error('Could not find item ID in response');
        }

        // Store the data for QR generation
        setScannedData({
          id: itemId, // Use itemId here
          processId: data.processId,
          ...data
        });

        console.log('Setting scanned data with ID:', itemId);
        setShowQRCode(true);
        return;
      }
      
      if (onSubmit) {
        onSubmit(data);
      }

    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderImageSection = () => (
    <div>
      <label className="text-sm font-medium text-gray-600 mb-1.5 block">
        {isScannedData ? "Item Image" : "Upload Image"}
      </label>
      <div className="mt-1">
        <Input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 bg-white"
        >
          {imagePreview ? (
            <div className="w-full h-full relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-full w-full object-contain"
              />
              {isScannedData && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('image-upload').click();
                  }}
                >
                  Change Image
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">Click to upload image</span>
              <span className="mt-1 text-xs text-gray-400">JPG, PNG, GIF up to 5MB</span>
            </div>
          )}
        </label>
      </div>
    </div>
  );

  const isFormValid = () => {
    // For lost reports tab, we know it's always a lost item
    if (activeSection === "reports") {
      return name && description && location && category && studentId;
    }
    
    // For other cases, check itemStatus as well
    return name && description && location && category && studentId && 
      (activeSection === "found" || itemStatus);
  };

  return (
    <div className="bg-[#f8f9fa] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0052cc]">Report Item Section</h1>
        </div>

        {/* Main Form */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handlePreSubmit} className="space-y-6">
              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Report Type
                    </label>
                    {adminMode ? (
                      <Input
                        value="Found Item"
                        disabled
                        className="bg-gray-50"
                      />
                    ) : isScannedData ? (
                      <Input
                        value="Found Item"
                        disabled
                        className="bg-gray-50"
                      />
                    ) : activeSection === "reports" ? (
                      <Input
                        value="Lost Item"
                        disabled
                        className="bg-gray-50"
                      />
                    ) : (
                      <Select value={itemStatus} onValueChange={setItemStatus} required>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Report Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ItemStatus.LOST}>Lost Item</SelectItem>
                          <SelectItem value={ItemStatus.FOUND}>Found Item</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      name="studentId"
                      value={studentId}
                      readOnly
                      disabled
                      className="bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Item Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Item Name"
                      className="bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Category
                    </label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Books">Books</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Personal Items">Personal Items</SelectItem>
                        <SelectItem value="Documents">Documents</SelectItem>
                        <SelectItem value="Bags">Bags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Last Seen Location
                    </label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter Location"
                      className="bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the Item"
                      className="min-h-[120px] bg-white"
                      required
                    />
                  </div>

                  {/* Image Upload */}
                  {renderImageSection()}

                  {/* Additional Descriptions */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Additional Descriptions</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingDescription(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Description
                      </Button>
                    </div>

                    {isAddingDescription && (
                      <Card className="border border-gray-200">
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={additionalDescriptionTitle}
                              onChange={(e) => {
                                setAdditionalDescriptionTitle(e.target.value)
                                setShowEmptyDescriptionError(false)
                              }}
                              className={showEmptyDescriptionError && !additionalDescriptionTitle.trim() ? 
                                "border-red-500" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={additionalDescriptionText}
                              onChange={(e) => {
                                setAdditionalDescriptionText(e.target.value)
                                setShowEmptyDescriptionError(false)
                              }}
                              className={showEmptyDescriptionError && !additionalDescriptionText.trim() ? 
                                "border-red-500" : ""}
                            />
                          </div>
                          {showEmptyDescriptionError && (
                            <p className="text-sm text-red-500">
                              Please fill in both title and description before adding
                            </p>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddingDescription(false)
                                setAdditionalDescriptionTitle("")
                                setAdditionalDescriptionText("")
                                setShowEmptyDescriptionError(false)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddDescription}
                            >
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-3">
                      {additionalDescriptions.map((desc, index) => (
                        <div key={index} className="relative bg-white p-3 rounded-lg border">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeDescription(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="space-y-2">
                            <Input
                              value={desc.title}
                              onChange={(e) => updateDescription(index, 'title', e.target.value)}
                              placeholder="Title"
                              className="bg-white"
                            />
                            <Textarea
                              value={desc.description}
                              onChange={(e) => updateDescription(index, 'description', e.target.value)}
                              placeholder="Description"
                              className="bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!isFormValid() || isSubmitting || (adminMode && !itemStatus)}
                  className="w-full sm:w-auto"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Report
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Summary Dialog */}
      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
            <DialogHeader className="px-6 py-4 border-b bg-[#f8f9fa] flex-shrink-0">
              <DialogTitle className="text-xl font-semibold text-[#0052cc]">Report Summary</DialogTitle>
              <p className="text-sm text-gray-600">Please review your report details before submitting.</p>
            </DialogHeader>

            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-grow">
              {/* Status-specific notices */}
              {itemStatus === ItemStatus.FOUND ? (
                <div className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50/50">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Important Notice</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-yellow-700 leading-relaxed">
                      Please surrender the found item to the University's Lost and Found after submitting this report.
                      <span className="block mt-1 font-medium">
                        Items not surrendered within 3 days will be automatically removed from the system.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#0052cc]/20 bg-gradient-to-r from-[#0052cc]/5 to-[#0052cc]/10">
                  <div className="px-4 py-3 border-b border-[#0052cc]/20 bg-[#0052cc]/5">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-[#0052cc]" />
                      <span className="font-medium text-[#0052cc]">Admin Review Process</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Our admin will verify if the item is in possession before posting it to the system.
                      You will be notified once your report has been processed.
                    </p>
                  </div>
                </div>
              )}

              {/* Report Details Card */}
              <div className="rounded-lg border bg-white shadow-sm">
                {imagePreview && (
                  <div className="border-b">
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Item preview" 
                        className="absolute inset-0 w-full h-full object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="space-y-3">
                    <DetailItem label="Report Type" value={itemStatus === ItemStatus.LOST ? "Lost Item" : "Found Item"} />
                    <DetailItem label="Student ID" value={studentId} />
                    <DetailItem label="Item Name" value={name} />
                  </div>
                  <div className="space-y-3">
                    <DetailItem label="Category" value={category} />
                    <DetailItem label="Location" value={location} />
                  </div>
                </div>

                {description && (
                  <div className="border-t p-4">
                    <DetailItem label="Description" value={description} fullWidth />
                  </div>
                )}

                {additionalDescriptions.length > 0 && (
                  <div className="border-t p-4">
                    <h4 className="font-medium text-gray-700 mb-3">Additional Details</h4>
                    <div className="space-y-2">
                      {additionalDescriptions.map((desc, index) => (
                        <div key={index} className="bg-gray-50 rounded p-3">
                          <DetailItem label={desc.title} value={desc.description} fullWidth />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
                className="border-gray-300"
              >
                Edit Report
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#0052cc] hover:bg-[#0052cc]/90"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Dialog */}
      <Dialog 
        open={showQRCode} 
        onOpenChange={(open) => {
          if (!open) {
            setShowQRCode(false);
            setScannedData(null);
            // Clear form after closing QR code dialog
            setName('');
            setDescription('');
            setLocation('');
            setCategory('');
            setStudentId('');
            setItemStatus('');
            setAdditionalDescriptions([]);
            setSelectedImage(null);
            setImagePreview(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-[#f8f9fa] flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-[#0052cc]">
              Found Item Report - QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-6 overflow-y-auto flex-grow">
            {/* Timer Warning */}
            <div className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
              <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50/50">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Time Sensitive</span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-yellow-700 leading-relaxed">
                  This report will be automatically deleted if the item is not surrendered within 3 days.
                </p>
              </div>
            </div>

            {/* QR Code Display */}
            {scannedData && scannedData.processId && (
              <div className="flex flex-col items-center space-y-4">
                <div 
                  ref={qrCodeRef}
                  className="p-6 bg-white rounded-lg border shadow-sm"
                >
                  <QRCodeSVG
                    value={generateQRData(scannedData.processId)}
                    size={240}
                    level="M"
                    includeMargin={true}
                    className="mx-auto"
                  />
                </div>
                <Button 
                  onClick={downloadQRCode} 
                  className="w-full bg-[#0052cc] hover:bg-[#0052cc]/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            {/* Instructions Card */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h4 className="font-medium text-gray-700 mb-3">Next Steps</h4>
              <ol className="space-y-2">
                {[
                  "Download or save this QR code",
                  "Surrender the found item to the University's Lost and Found",
                  "Show this QR code to the admin"
                ].map((step, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0052cc]/10 text-sm font-medium text-[#0052cc]">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-600 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowQRCode(false)}
              className="border-gray-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

// Add this helper component at the bottom of your file
const DetailItem = ({ label, value, fullWidth = false }) => (
  <div className={fullWidth ? 'col-span-2' : ''}>
    <dt className="text-sm font-medium text-gray-600">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
); 
