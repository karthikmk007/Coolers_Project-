"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface ScanViewfinderProps {
  onClose: () => void;
}

interface ScanResult {
  id:    string;
  name:  string;
  brand: string;
  price: number | null;
  thumbnail_url: string | null;
}

export function ScanViewfinder({ onClose }: ScanViewfinderProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const router    = useRouter();
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const readerRef = useRef<unknown>(null);

  const handleDecode = useCallback(
    async (text: string) => {
      if (scanning) return;
      setScanning(true);

      try {
        const sb = createClient();
        const { data } = await sb
          .from("products")
          .select("id, name, brand, price, thumbnail_url")
          .eq("lcbo_id", text)
          .maybeSingle();

        if (data) {
          setResult(data as ScanResult);
        } else {
          setNotFound(true);
          setTimeout(() => { setNotFound(false); setScanning(false); }, 2000);
        }
      } catch {
        setScanning(false);
      }
    },
    [scanning]
  );

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Lazy-load @zxing/browser
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        reader.decodeFromVideoElement(videoRef.current!, (res, err) => {
          if (res) handleDecode(res.getText());
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Camera error";
        setError(
          msg.includes("Permission")
            ? "Camera permission denied. Please allow camera access."
            : "Could not start camera. Try manual search."
        );
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleDecode]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        muted
        playsInline
        autoPlay
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-12 right-5 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Error */}
      {error && (
        <div className="absolute top-20 inset-x-6 bg-red-500/90 text-white text-sm text-center py-3 px-4 rounded-2xl z-10">
          {error}
        </div>
      )}

      {/* Viewfinder box */}
      <div className="relative w-64 h-64 z-10">
        {/* Corner brackets */}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <motion.div
            key={corner}
            className={cn(
              "absolute w-8 h-8 border-cracked-orange",
              corner === "tl" && "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
              corner === "tr" && "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
              corner === "bl" && "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
              corner === "br" && "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"
            )}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Scan line */}
        {!scanning && !result && (
          <motion.div
            className="absolute inset-x-2 h-px bg-cracked-orange shadow-lg shadow-orange-500/50"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
          />
        )}

        {/* Not found flash */}
        <AnimatePresence>
          {notFound && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-500/30 rounded-xl flex items-center justify-center"
            >
              <span className="text-white text-sm font-bold">Not in catalogue</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instruction */}
      <p className="mt-8 text-white/70 text-sm text-center z-10 font-[family-name:var(--font-dm-sans)]">
        Point at any can label
      </p>

      {/* Manual search */}
      <button
        onClick={() => { onClose(); router.push("/shop"); }}
        className="mt-4 flex items-center gap-2 text-cracked-orange text-sm font-semibold z-10"
      >
        <Search className="w-4 h-4" />
        Search manually
      </button>

      {/* Result sheet */}
      <AnimatePresence>
        {result && (
          <ScanResultSheet
            result={result}
            onDismiss={() => { setResult(null); setScanning(false); }}
            onView={() => { onClose(); router.push(`/product/${result.id}`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────
function ScanResultSheet({
  result,
  onDismiss,
  onView,
}: {
  result:    ScanResult;
  onDismiss: () => void;
  onView:    () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 z-20"
    >
      <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-5" />

      <div className="flex gap-4 items-center">
        {result.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail_url}
            alt={result.name}
            className="w-16 h-16 object-contain rounded-xl bg-neutral-50"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-cracked-muted font-[family-name:var(--font-dm-sans)]">{result.brand}</p>
          <p className="font-semibold text-cracked-dark text-base leading-tight font-[family-name:var(--font-dm-sans)]">
            {result.name}
          </p>
          {result.price && (
            <p className="text-cracked-orange font-bold font-[family-name:var(--font-jetbrains)] mt-1">
              ${result.price.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onDismiss}
          className="flex-1 py-3 border border-neutral-200 rounded-2xl text-sm font-semibold text-cracked-muted"
        >
          Scan again
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onView}
          className="flex-1 py-3 bg-cracked-orange text-white rounded-2xl text-sm font-bold uppercase tracking-widest"
        >
          View Product →
        </motion.button>
      </div>
    </motion.div>
  );
}
