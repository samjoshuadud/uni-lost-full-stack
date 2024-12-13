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
import { ItemStatus, ProcessStatus, ProcessMessages, ItemCategories } from "@/lib/constants"
import { Plus, X, Upload, Bell, AlertTriangle, Download, Clock, Eye } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config";
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'

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
  const [studentId, setStudentId] = useState(userData?.studentId || "Not Available")
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
  const [otherCategory, setOtherCategory] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setLocation(initialData.location || "");
      setCategory(initialData.category || "");
      setStudentId(userData?.studentId || "Not Available");
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
          const response = await makeAuthenticatedRequest(`/api/Item/${initialData.id}`);
          if (response) {
            setOriginalItem(response);
            setStudentId(userData?.studentId || "Not Available");
          }
        } catch (error) {
          console.error("Error fetching original item:", error);
        }
      } else {
        setStudentId(userData?.studentId || "Not Available");
      }
    };

    fetchOriginalItem();
  }, [isScannedData, initialData, userData]);

  useEffect(() => {
    if (userData?.studentId) {
      setStudentId(userData.studentId);
    } else {
      setStudentId("Not Available");
    }
  }, [userData]);

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
    if (!processId) {
      console.warn('No process ID provided for QR generation');
      return '';
    }

    const qrData = {
      id: processId,
      timestamp: new Date().getTime()
    };

    console.log('Generated QR data:', qrData);
    return JSON.stringify(qrData);
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
    setIsSubmitting(true);
    try {
      // Handle QR code scan submission differently
      if (isScannedData && initialData?.processId) {
        // First update the item details
        const formData = new FormData();
        formData.append("Name", name);
        formData.append("Description", description);
        formData.append("Location", location);
        formData.append("Category", category);
        formData.append("StudentId", studentId);
        formData.append("ReporterId", user.uid);
        
        // Add additional descriptions as a JSON array
        if (additionalDescriptions && additionalDescriptions.length > 0) {
          const additionalDescriptionsJson = JSON.stringify(additionalDescriptions.map(desc => ({
            Title: desc.title,
            Description: desc.description
          })));
          formData.append("AdditionalDescriptions", additionalDescriptionsJson);
        } else {
          formData.append("AdditionalDescriptions", JSON.stringify([]));
        }

        // Add image if selected
        if (selectedImage) {
          formData.append("Image", selectedImage);
        }

        // Update item details
        const itemUpdateResponse = await makeAuthenticatedRequest(`/api/Item/update/${initialData.id}`, {
          method: "PUT",
          body: formData,
        });

        if (!itemUpdateResponse) {
          throw new Error("Failed to update item details");
        }

        // Then update the process status
        const processUpdateResponse = await makeAuthenticatedRequest(`/api/Item/process/${initialData.processId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Status: ProcessStatus.PENDING_APPROVAL,
            Message: ProcessMessages.WAITING_APPROVAL,
            UserId: user.uid
          }),
        });

        if (!processUpdateResponse) {
          throw new Error("Failed to update process status");
        }

        setShowConfirmDialog(false);
        if (onSubmit) {
          onSubmit({ ...itemUpdateResponse, processId: initialData.processId });
        }
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("Name", name);
      formData.append("Description", description);
      formData.append("Location", location);
      formData.append("Category", category === "Others" ? `Others - ${otherCategory}` : category);
      formData.append("StudentId", userData?.studentId || "");
      formData.append("ReporterId", user.uid);
      
      // Set the status and process status based on who's reporting
      if (activeSection === "reports") {
        formData.append("Status", ItemStatus.LOST);
        formData.append("ProcessStatus", ProcessStatus.PENDING_APPROVAL);
        formData.append("ProcessMessage", ProcessMessages.WAITING_APPROVAL);
      } else if (adminMode) {
        formData.append("Status", ItemStatus.FOUND);
        formData.append("ProcessStatus", ProcessStatus.PENDING_APPROVAL);
        formData.append("ProcessMessage", ProcessMessages.WAITING_APPROVAL);
      } else if (itemStatus === ItemStatus.FOUND) {
        formData.append("Status", ItemStatus.FOUND);
        formData.append("ProcessStatus", ProcessStatus.AWAITING_SURRENDER);
        formData.append("ProcessMessage", ProcessMessages.SURRENDER_REQUIRED);
      } else {
        formData.append("Status", itemStatus || ItemStatus.LOST);
        formData.append("ProcessStatus", ProcessStatus.PENDING_APPROVAL);
        formData.append("ProcessMessage", ProcessMessages.WAITING_APPROVAL);
      }

      // Add additional descriptions as a JSON array
      if (additionalDescriptions && additionalDescriptions.length > 0) {
        const additionalDescriptionsJson = JSON.stringify(additionalDescriptions.map(desc => ({
          Title: desc.title,
          Description: desc.description,
          ItemId: null  // This will be set by the backend
        })));
        formData.append("AdditionalDescriptions", additionalDescriptionsJson);
      } else {
        formData.append("AdditionalDescriptions", JSON.stringify([]));
      }

      // Add image if selected
      if (selectedImage) {
        formData.append("Image", selectedImage);
      }

      const response = await makeAuthenticatedRequest("/api/Item", {
        method: "POST",
        body: formData,
      });

      if (!response) {
        throw new Error("Failed to submit report");
      }

      // Dispatch custom event for new item
      const newItemEvent = new CustomEvent('newItemReported', {
        detail: {
          item: response,
          type: itemStatus === ItemStatus.FOUND ? 'found' : 'lost',
          processId: response.id || response.Id
        }
      });
      window.dispatchEvent(newItemEvent);
      
      // Show QR code only for non-admin found item reports
      if (!adminMode && itemStatus === ItemStatus.FOUND) {
        const processId = response.id || response.Id || response.processId;
        if (!processId) {
          throw new Error("No process ID in response");
        }

        setScannedData({
          ...response,
          processId: processId
        });
        setShowConfirmDialog(false);
        setShowQRCode(true);
      } else {
        // For all other cases, just close the dialog
        setShowConfirmDialog(false);
        if (onSubmit) {
          onSubmit(response);
        }
      }

      // Reset form except for studentId
      setName('');
      setDescription('');
      setLocation('');
      setCategory('');
      setItemStatus('');
      setAdditionalDescriptions([]);
      setSelectedImage(null);
      setImagePreview(null);
      // Don't reset studentId since it should stay constant
      // setStudentId('');  // Remove this line

    } catch (error) {
      console.error("Error submitting report:", error);
      if (error.response) {
        console.error("Error response:", await error.response.json());
      }
      throw error;
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0052cc] to-[#0747a6]">
          Report Item
        </h1>
        <p className="text-gray-600">
          Please provide detailed information about the item
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-shadow duration-300">
        <CardContent className="p-8">
          <form onSubmit={handlePreSubmit} className="space-y-8">
            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Report Type Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Report Type
                  </label>
                  {adminMode || isScannedData || activeSection === "reports" ? (
                    <div className="relative">
                      <Input
                        value={
                          adminMode || isScannedData 
                            ? "Found Item" 
                            : activeSection === "reports" 
                              ? "Lost Item" 
                              : ""
                        }
                        disabled
                        className="bg-gray-50 border-gray-200 text-gray-600 font-medium"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Badge variant="outline" className={
                          adminMode || isScannedData || activeSection !== "reports"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }>
                          {adminMode || isScannedData || activeSection !== "reports" ? "Found" : "Lost"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={itemStatus} 
                      onValueChange={setItemStatus} 
                      required
                    >
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue placeholder="Select Report Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ItemStatus.LOST}>Lost Item</SelectItem>
                        <SelectItem value={ItemStatus.FOUND}>Found Item</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Enhanced Student ID field */}
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-gray-700">
                    {adminMode || userData?.isAdmin ? 'Reported By:' : 'Student ID'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="studentId"
                      name="studentId"
                      value={studentId}
                      readOnly
                      disabled
                      className="bg-gray-50 border-gray-200 text-gray-600 font-medium pl-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Enhanced Item Name field */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Item Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Item Name"
                    className="bg-white border-gray-200"
                    required
                  />
                </div>

                {/* Enhanced Category field */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Category</Label>
                  <Select
                    value={category}
                    onValueChange={setCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ItemCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {category === "Others" && (
                    <div className="mt-2">
                      <Input
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                        placeholder="Please specify category"
                        className="bg-white border-gray-200"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Enhanced Location field */}
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    {itemStatus === ItemStatus.FOUND || adminMode 
                      ? "Where Item Was Found"
                      : "Last Known Location"}
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={
                      itemStatus === ItemStatus.FOUND || adminMode
                        ? "Enter where you found the item"
                        : "Enter last place you remember having the item"
                    }
                    className="bg-white border-gray-200"
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
                    placeholder={
                      itemStatus === ItemStatus.FOUND || adminMode
                        ? "Describe the item in detail (color, brand, size, any distinctive features)"
                        : "Describe your item in detail (color, brand, size, identifying marks or features)"
                    }
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
                    <Card className="border border-gray-200 shadow-[0_4px_12px_rgb(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgb(0,0,0,0.08)] transition-shadow duration-300">
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
                      <div key={index} className="relative bg-white p-3 rounded-lg border border-gray-200 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgb(0,0,0,0.06)] transition-shadow duration-300">
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
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={handlePreview}
                disabled={!isFormValid() || isSubmitting}
                className={`w-full sm:w-auto transition-all duration-200 ${
                  isFormValid() && !isSubmitting
                    ? "bg-[#0052cc] hover:bg-[#0747a6]"
                    : "bg-gray-200 cursor-not-allowed"
                }`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Dialog */}
      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[85vh] flex flex-col rounded-2xl sm:rounded-lg">
            <DialogHeader className="px-6 py-4 border-b bg-[#f8f9fa] flex-shrink-0 rounded-t-2xl sm:rounded-t-lg">
              <DialogTitle className="text-xl font-semibold text-[#0052cc]">Report Summary</DialogTitle>
              <p className="text-sm text-gray-600">Please review your report details before submitting.</p>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6 overflow-y-auto flex-grow">
              {/* Status-specific notices */}
              {itemStatus === ItemStatus.FOUND ? (
                <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50/50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Important Notice</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded-b-xl">
                    <p className="text-sm text-yellow-700 leading-relaxed">
                      Please surrender the found item to the University's Lost and Found after submitting this report.
                      <span className="block mt-1 font-medium">
                        Items not surrendered within 3 days will be automatically removed from the system.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#0052cc]/20 bg-gradient-to-r from-[#0052cc]/5 to-[#0052cc]/10">
                  <div className="px-4 py-3 border-b border-[#0052cc]/20 bg-[#0052cc]/5 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-[#0052cc]" />
                      <span className="font-medium text-[#0052cc]">Admin Review Process</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded-b-xl">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Our admin will verify if the item is in possession before posting it to the system.
                      You will be notified once your report has been processed.
                    </p>
                  </div>
                </div>
              )}

              {/* Report Details Card */}
              <div className="rounded-xl border bg-white shadow-[0_4px_16px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.12)] transition-shadow duration-300">
                {imagePreview && (
                  <div className="border-b">
                    <div className="aspect-video relative overflow-hidden rounded-t-xl">
                      <img 
                        src={imagePreview} 
                        alt="Item preview" 
                        className="absolute inset-0 w-full h-full object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                  <div className="space-y-3">
                    <DetailItem label="Report Type" value={itemStatus === ItemStatus.LOST ? "Lost Item" : "Found Item"} />
                    <DetailItem label={adminMode ? "Reported By" : "Student ID"} value={studentId} />
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
                        <div key={index} className="bg-gray-50 rounded-xl p-3">
                          <DetailItem label={desc.title} value={desc.description} fullWidth />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex-shrink-0 rounded-b-2xl sm:rounded-b-lg">
              <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  className="border-gray-300 w-full sm:w-auto rounded-xl sm:rounded-md"
                >
                  Edit Report
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#0052cc] hover:bg-[#0052cc]/90 w-full sm:w-auto rounded-xl sm:rounded-md"
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
              </div>
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
            // Clear form except for studentId
            setName('');
            setDescription('');
            setLocation('');
            setCategory('');
            setItemStatus('');
            setAdditionalDescriptions([]);
            setSelectedImage(null);
            setImagePreview(null);
            // Don't reset studentId here
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Item QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            {/* Add the reminder section here */}
            <div className="w-full p-3 bg-[#FFF7E6] border-l-4 border-[#FFB020] rounded">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-[#FFB020] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#B27B16] mb-1 text-sm">Important Reminder</h4>
                  <p className="text-[#B27B16] text-xs leading-relaxed">
                    Please surrender this found item to the University of Makati Lost and Found office and present this QR code. Failure to surrender the item within 3 days will result in the automatic cancellation of your report. This helps us maintain the integrity of our lost and found system.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={qrCodeRef}
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <QRCodeSVG 
                value={generateQRData(scannedData?.processId)} 
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <Button onClick={downloadQRCode} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
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
