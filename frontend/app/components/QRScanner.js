"use client"

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function QRScanner({ onScanSuccess, onScanError }) {
  const scannerRef = useRef(null)

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false // verbose flag
      );

      scannerRef.current.render(
        (decodedText) => {
          scannerRef.current.clear();
          onScanSuccess(decodedText);
        },
        (error) => {
          console.warn(`Code scan error = ${error}`);
          onScanError(error);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div>
      <div id="qr-reader" className="w-full max-w-[500px] mx-auto" />
    </div>
  );
} 