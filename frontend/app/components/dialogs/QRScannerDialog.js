import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode'
import { useAuth } from "@/lib/AuthContext"
import { API_BASE_URL } from '@/lib/api-config'
import { toast } from "react-hot-toast"

export function QRScannerDialog({
  open,
  onOpenChange,
  onScanComplete
}) {
  const { userData } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const scannerRef = useRef(null);
  const scannerInitializedRef = useRef(false);

  useEffect(() => {
    // Only initialize if dialog is open and scanner hasn't been initialized
    if (open && !scannerInitializedRef.current) {
      const initializeScanner = async () => {
        try {
          // Clear any existing scanner
          if (scannerRef.current) {
            await scannerRef.current.clear();
            scannerRef.current = null;
          }

          const element = document.getElementById('qr-reader');
          if (!element) return;

          // Clear existing content
          element.innerHTML = '';

          // Create new scanner instance
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            {
              fps: 10,
              qrbox: 250,
              rememberLastUsedCamera: true,
              aspectRatio: 1.0
            },
            false // Don't start scanning immediately
          );

          await scannerRef.current.render(
            async (decodedText) => {
              try {
                console.log('Scanned QR code data:', decodedText);
                const parsedData = JSON.parse(decodedText);
                console.log('Parsed data:', parsedData);

                if (!parsedData || !parsedData.p || parsedData.t !== 'surrender') {
                  throw new Error('Invalid QR code format');
                }

                // Update the process with the scan
                const processResponse = await fetch(`${API_BASE_URL}/api/Item/process/scan`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify({
                    processId: parsedData.p,
                    type: 'found_item_surrender'
                  })
                });

                if (!processResponse.ok) {
                  const errorData = await processResponse.json();
                  // Check if it's already in pending_retrieval status
                  if (errorData.message?.includes('pending_retrieval')) {
                    toast.success('QR code already scanned. Process is pending retrieval.');
                    onOpenChange(false);
                    if (onScanComplete) {
                      onScanComplete({ status: 'pending_retrieval' });
                    }
                    return;
                  }
                  console.error('Process scan error:', errorData);
                  throw new Error(errorData.message || 'Failed to update process');
                }

                const processData = await processResponse.json();
                if (!processData.success) {
                  // Check if it's already in pending_retrieval status
                  if (processData.message?.includes('pending_retrieval')) {
                    toast.success('QR code already scanned. Process is pending retrieval.');
                    onOpenChange(false);
                    if (onScanComplete) {
                      onScanComplete({ status: 'pending_retrieval' });
                    }
                    return;
                  }
                  throw new Error(processData.message || 'Failed to update process');
                }

                toast.success('QR code scanned successfully. Process updated.');
                onOpenChange(false);
                if (onScanComplete) {
                  onScanComplete(processData.data);
                }

                // Stop scanning after successful scan
                if (scannerRef.current) {
                  await scannerRef.current.clear();
                  const element = document.getElementById('qr-reader');
                  if (element) {
                    element.innerHTML = '';
                  }
                  scannerRef.current = null;
                  scannerInitializedRef.current = false;
                }
              } catch (error) {
                console.error('Error processing QR code:', error);
                toast.error(error.message || 'Failed to process QR code. Please try again.');
                
                // Clear the scanner to allow another attempt
                if (scannerRef.current) {
                  await scannerRef.current.clear();
                  scannerRef.current = null;
                  scannerInitializedRef.current = false;
                  // Reinitialize the scanner
                  initializeScanner();
                }
              }
            },
            (error) => {
              if (error?.message && !error.message.includes("NotFoundException")) {
                console.log('QR scan error:', error);
              }
            }
          );

          scannerInitializedRef.current = true;
        } catch (err) {
          console.error("Failed to start scanner:", err);
          toast.error('Failed to start camera. Please try again.');
        }
      };

      initializeScanner();
    }

    // Cleanup function
    return () => {
      if (!open && scannerRef.current) {
        scannerRef.current.clear();
        const element = document.getElementById('qr-reader');
        if (element) {
          element.innerHTML = '';
        }
        scannerRef.current = null;
        scannerInitializedRef.current = false;
      }
    };
  }, [open, onOpenChange, onScanComplete, userData?.id]);

  const processQRFile = async (file) => {
    try {
      // Create a temporary div for the scanner
      const tempDiv = document.createElement('div');
      tempDiv.id = 'qr-reader-temp';
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      const html5QrCode = new Html5Qrcode("qr-reader-temp");

      try {
        const decodedText = await html5QrCode.scanFileV2(file);
        console.log('Scanned QR code data:', decodedText.decodedText);
        const parsedData = JSON.parse(decodedText.decodedText);
        console.log('Parsed data:', parsedData);

        if (!parsedData || !parsedData.p || parsedData.t !== 'surrender') {
          throw new Error('Invalid QR code format');
        }

        // Update the process with the scan
        const processResponse = await fetch(`${API_BASE_URL}/api/Item/process/scan`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            processId: parsedData.p,
            type: 'found_item_surrender'
          })
        });

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          // Check if it's already in pending_retrieval status
          if (errorData.message?.includes('pending_retrieval')) {
            toast.success('QR code already scanned. Process is pending retrieval.');
            onOpenChange(false);
            if (onScanComplete) {
              onScanComplete({ status: 'pending_retrieval' });
            }
            return;
          }
          console.error('Process scan error:', errorData);
          throw new Error(errorData.message || 'Failed to update process');
        }

        const processData = await processResponse.json();
        if (!processData.success) {
          // Check if it's already in pending_retrieval status
          if (processData.message?.includes('pending_retrieval')) {
            toast.success('QR code already scanned. Process is pending retrieval.');
            onOpenChange(false);
            if (onScanComplete) {
              onScanComplete({ status: 'pending_retrieval' });
            }
            return;
          }
          throw new Error(processData.message || 'Failed to update process');
        }

        toast.success('QR code scanned successfully. Process updated.');
        onOpenChange(false);
        if (onScanComplete) {
          onScanComplete(processData.data);
        }

        // Stop scanning after successful scan
        if (scannerRef.current) {
          await scannerRef.current.clear();
          const element = document.getElementById('qr-reader');
          if (element) {
            element.innerHTML = '';
          }
          scannerRef.current = null;
          scannerInitializedRef.current = false;
        }
      } finally {
        // Clean up
        if (html5QrCode) {
          await html5QrCode.clear();
        }
        if (tempDiv && tempDiv.parentNode) {
          tempDiv.parentNode.removeChild(tempDiv);
        }
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error(error.message || 'Could not read QR code from this image');
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen && scannerRef.current) {
          scannerRef.current.clear();
          const element = document.getElementById('qr-reader');
          if (element) {
            element.innerHTML = '';
          }
          scannerRef.current = null;
          scannerInitializedRef.current = false;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Scanning Tips */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">Scanning Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Hold the QR code steady</li>
              <li>Ensure good lighting</li>
              <li>Keep the QR code within the frame</li>
              <li>Try different distances</li>
            </ul>
          </div>

          {/* QR Scanner */}
          <div className="qr-container">
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <style jsx>{`
              .qr-container {
                position: relative;
              }
              :global(#qr-reader) {
                border: none !important;
                background: #f8f9fa;
                border-radius: 8px;
                overflow: hidden;
              }
              :global(#qr-reader button) {
                background: #0052cc !important;
                color: white !important;
                border: none !important;
                padding: 6px 12px !important;
                margin: 0 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                position: absolute !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                bottom: 0 !important;
                width: 100% !important;
              }
              :global(#qr-reader select) {
                padding: 6px !important;
                border-radius: 6px !important;
                border-color: #e2e8f0 !important;
                margin-bottom: 16px !important;
              }
            `}</style>
          </div>

          {/* File Upload Option with Drag & Drop */}
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground mb-2">Or upload a QR code image</p>
            <div
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDragging ? "border-[#0052cc] bg-[#0052cc]/5" : "border-gray-200"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  await processQRFile(file);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    processQRFile(file);
                  }
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-[#0052cc]" />
                <div>
                  <p className="text-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 