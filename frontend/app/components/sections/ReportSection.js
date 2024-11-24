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
import { Plus, X, Upload, Bell, AlertTriangle, Download, Clock } from "lucide-react"

export default function ReportSection({ 
  onSubmit, 
  adminMode = false, 
  initialData = null, 
  isScannedData = false
}) {
  const { user, makeAuthenticatedRequest } = useAuth();
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [location, setLocation] = useState(initialData?.location || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [studentId, setStudentId] = useState(initialData?.studentId || "")
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

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setLocation(initialData.location || "");
      setCategory(initialData.category || "");
      setStudentId(initialData.studentId || "");
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

  const addDescription = () => {
    setAdditionalDescriptions([...additionalDescriptions, { title: '', description: '' }])
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

  const handlePreSubmit = (e) => {
    e.preventDefault();
    // Show confirmation dialog with summary
    setShowConfirmDialog(true);
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
      // If this is a scanned item, update the pending process instead of creating new
      if (isScannedData && initialData) {
        console.log('Updating process for scanned item:', initialData);
        
        // Get the process ID from the initialData
        const processId = initialData.processId;
        
        if (!processId) {
          console.error('Response structure:', initialData);
          throw new Error('Process ID not found in scanned data');
        }

        console.log('Request URL:', `http://localhost:5067/api/Item/process/${processId}/status`);
        console.log('Request body:', {
          Status: ProcessStatus.PENDING_APPROVAL,
          Message: ProcessMessages.WAITING_APPROVAL
        });

        // Use the correct endpoint
        const response = await fetch(`http://localhost:5067/api/Item/process/${processId}/status`, {
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          throw new Error(`Failed to update process status: ${errorText}`);
        }

        const data = await response.json();
        console.log('Update response:', data);

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
      const response = await fetch('http://localhost:5067/api/Item', {
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
                      // If in admin mode, show disabled input with "Found Item" value
                      <Input
                        value="Found Item"
                        disabled
                        className="bg-gray-50"
                      />
                    ) : (
                      // If not in admin mode, show the normal select
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

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                      Student ID
                    </label>
                    <Input
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Enter your Student ID"
                      className="bg-white"
                      required
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
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-sm font-medium text-gray-600">
                        Additional Descriptions
                      </label>
                      <Button type="button" variant="outline" onClick={addDescription} className="h-8">
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
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
                  type="submit" 
                  className="bg-[#0052cc] hover:bg-[#0052cc]/90 text-white px-8"
                  disabled={isSubmitting || !itemStatus}
                >
                  Preview Report
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Summary</DialogTitle>
            <div className="text-sm text-muted-foreground">
              <p>Please review your report details before submitting.</p>
              
              {itemStatus === ItemStatus.FOUND ? (
                // Show only the warning message for found items
                <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-yellow-200 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div className="flex flex-col">
                      <div className="font-semibold text-yellow-800 mb-1">Important Notice</div>
                      <p className="text-sm text-yellow-700">
                        Please surrender the found item to the Student Center after submitting this report. 
                        <span className="font-medium">
                          If the item is not surrendered within 3 days, this report will be disregarded.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Show admin review process only for lost items
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <div className="font-semibold text-primary mb-1">Admin Review Process</div>
                      <p className="text-sm text-muted-foreground">
                        Our admin will check if the item is in possession. If not, then this will be posted.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image preview */}
            {imagePreview && (
              <div className="w-full">
                <div className="font-medium mb-2"><strong>Image:</strong></div>
                <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={imagePreview} 
                    alt="Item preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
            
            {/* Report details */}
            <div className="space-y-2">
              <div><strong>Report Type:</strong> {itemStatus === ItemStatus.LOST ? "Lost Item" : "Found Item"}</div>
              <div><strong>Student ID:</strong> {studentId}</div>
              <div><strong>Item:</strong> {name}</div>
              <div><strong>Location:</strong> {location}</div>
              <div><strong>Category:</strong> {category}</div>
              {additionalDescriptions.length > 0 && (
                <div>
                  <div className="font-medium mt-2">Additional Descriptions:</div>
                  {additionalDescriptions.map((desc, index) => (
                    <div key={index}><strong>{desc.title}:</strong> {desc.description}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Edit Report
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Found Item Report - QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Warning Message */}
            <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-yellow-200 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Important:</span> This report will be automatically deleted if the item is not surrendered within 3 days.
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {scannedData && scannedData.processId && (
              <div className="flex flex-col items-center space-y-4">
                <div 
                  ref={qrCodeRef}
                  className="p-4 bg-white rounded-lg"
                >
                  <QRCodeSVG
                    value={generateQRData(scannedData.processId)}
                    size={200}
                    level="M"
                    includeMargin={true}
                    className="mx-auto"
                    style={{
                      backgroundColor: 'white',
                      padding: '16px'
                    }}
                  />
                </div>
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Please:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download or save this QR code</li>
                <li>Surrender the found item to the Student Center</li>
                <li>Show this QR code to the admin</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRCode(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 