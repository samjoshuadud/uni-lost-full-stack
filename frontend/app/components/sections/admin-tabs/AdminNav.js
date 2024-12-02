import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"
import { useState } from "react"
import { QRScannerDialog } from "@/components/dialogs/QRScannerDialog"

export function AdminNav() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          onClick={() => setShowScanner(true)}
          className="bg-white"
        >
          <QrCode className="h-4 w-4 mr-2" />
          Scan Found Item
        </Button>
      </div>

      <QRScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
      />
    </>
  );
} 