import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QRCode } from "react-qr-code"
import { Download, ClipboardCopy } from "lucide-react"
import { toast } from "react-hot-toast"

export function QRCodeDialog({
  open,
  onOpenChange,
  qrData,
  title,
  description,
  instructions
}) {
  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const padding = 100;
      canvas.width = size;
      canvas.height = size;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      
      const scale = (size - (padding * 2)) / img.width;
      
      ctx.save();
      ctx.translate(padding, padding);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      
      const pngFile = canvas.toDataURL("image/png", 1.0);
      const downloadLink = document.createElement("a");
      downloadLink.download = `found-item-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyData = () => {
    navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
    toast.success("QR data copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="p-6 bg-white rounded-lg">
            <QRCode
              id="qr-code"
              value={JSON.stringify(qrData)}
              size={250}
              level="H"
              style={{ width: '100%' }}
              bgColor="#FFFFFF"
              fgColor="#000000"
              viewBox="0 0 256 256"
            />
          </div>
          
          <div className="w-full space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {instructions.map((instruction, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {instruction}
                </p>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCopyData}
              >
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy Data
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 