"use client"

import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { useEffect, useRef, useState } from "react"
import { Camera, RefreshCw, XCircle, Image as ImageIcon, Upload } from "lucide-react"

interface ScannerProps {
    qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void
    qrCodeErrorCallback?: (errorMessage: string) => void
}

const ScannerPlugin = (props: ScannerProps) => {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameraReady, setCameraReady] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop()
                setIsScanning(false)
            } catch (err) {
                console.error("Error stopping scanner:", err)
            }
        }
    }

    const startScanner = async () => {
        setError(null)
        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader")
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                props.qrCodeSuccessCallback,
                props.qrCodeErrorCallback
            )
            setIsScanning(true)
            setCameraReady(true)
        } catch (err: any) {
            console.error("Error starting scanner:", err)
            setError("No se pudo acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.")
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const imageFile = e.target.files[0]
            setError(null)

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader")
            }

            try {
                // If scanning with camera, stop it first
                if (isScanning) await stopScanner()

                const decodedText = await scannerRef.current.scanFile(imageFile, true)
                props.qrCodeSuccessCallback(decodedText, { decodedText: decodedText })
            } catch (err) {
                console.error("Error scanning file:", err)
                setError("No se encontró ningún código QR en la imagen. Intenta con una foto más clara.")
            } finally {
                // Reset input to allow selecting the same file again
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        }
    }

    useEffect(() => {
        return () => {
            stopScanner()
        }
    }, [])

    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl transition-all duration-500">
            {/* Área del Escáner con altura responsiva */}
            <div id="reader" className="w-full min-h-[360px] md:min-h-[420px] bg-black overflow-hidden" />

            {/* Capa de UI sobre el vídeo */}
            {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-blue-600/20 p-4 md:p-5 rounded-full mb-3 md:mb-4 border-2 border-blue-500/50 animate-pulse">
                        <Camera className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1 text-center tracking-tight uppercase">REGISTRO DE ACCESO</h3>
                    <p className="text-slate-400 text-[10px] md:text-xs font-medium text-center mb-4 md:mb-6 max-w-[240px] md:max-w-[280px] opacity-70">
                        Escanea tu carnet o sube una foto de tu galería.
                    </p>

                    <div className="flex flex-col gap-2 md:gap-3 w-full max-w-[220px] md:max-w-[260px]">
                        <button
                            onClick={startScanner}
                            className="group flex items-center justify-center gap-2 md:gap-3 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg active:scale-95 transition-all"
                        >
                            <Camera size={20} className="group-hover:rotate-12 transition-transform" />
                            <span>Usar Cámara</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="group flex items-center justify-center gap-2 md:gap-3 bg-white/5 hover:bg-white/10 text-white px-5 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg border border-white/10 backdrop-blur-md active:scale-95 transition-all"
                        >
                            <ImageIcon size={20} className="group-hover:scale-110 transition-transform text-blue-400" />
                            <span>Subir Foto</span>
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />

                    {error && (
                        <div className="mt-8 flex items-center gap-3 text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                            <XCircle size={20} />
                            <span className="text-sm font-bold tracking-tight">{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Overlay de escaneo (animación de línea) */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-500/50 rounded-lg">
                        {/* Esquinas del escáner */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                        {/* Línea de escaneo animada */}
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent absolute top-0 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 text-center flex flex-col items-center gap-4 pointer-events-auto">
                        <span className="bg-blue-600/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
                            Cámara Activa • Escaneando...
                        </span>

                        <button
                            onClick={stopScanner}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-xl text-sm font-bold border border-white/20 transition-all active:scale-95"
                        >
                            Apagar Cámara
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
        </div>
    )
}

export default ScannerPlugin
