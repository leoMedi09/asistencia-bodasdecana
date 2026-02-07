"use client"
import ScannerPlugin from '@/components/ScannerPlugin'
import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ScannerPage() {
    const [message, setMessage] = useState<string>('Escanee su código QR')
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle')
    const [lastUser, setLastUser] = useState<string | null>(null)
    const isProcessing = useRef(false)

    const onNewScanResult = useCallback((decodedText: string, decodedResult: any) => {
        if (isProcessing.current || status === 'success' || status === 'loading') return

        isProcessing.current = true
        setStatus('loading')

        fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: decodedText }),
        })
            .then(async (res) => {
                const data = await res.json()
                if (res.ok) {
                    setLastUser(data.user)
                    if (data.alreadyRegistered) {
                        setMessage(`¡Hola ${data.user}, ya registramos tu asistencia hoy!`)
                    } else {
                        setMessage(`¡Bienvenido/a, ${data.user}!`)
                    }
                    setStatus('success')

                    // Auto reset after 4 seconds
                    setTimeout(() => {
                        setStatus('idle')
                        setMessage('Escanee su código QR')
                        isProcessing.current = false
                    }, 4000)
                } else {
                    setMessage(`Error: ${data.error || 'Código no reconocido'}`)
                    setStatus('error')
                    setTimeout(() => {
                        setStatus('idle')
                        isProcessing.current = false
                    }, 3000)
                }
            })
            .catch((err) => {
                console.error(err)
                setMessage('Error de conexión con el servidor')
                setStatus('error')
                setTimeout(() => {
                    setStatus('idle')
                    isProcessing.current = false
                }, 3000)
            })
    }, [status])

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-700 ${status === 'success' ? 'bg-emerald-500' :
            status === 'error' ? 'bg-rose-500' :
                'bg-slate-950'
            }`}>
            {/* Botón Volver */}
            <Link href="/" className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl shadow-xl text-white transition-all active:scale-95 group">
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </Link>

            <div className="w-full max-w-xl flex flex-col items-center">
                {/* Encabezado */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">ESCÁNER DE ACCESO</h1>
                    <p className="text-slate-400 font-medium">Muestra tu tarjeta frente a la cámara</p>
                </div>

                {/* Contenedor del Escáner */}
                <div className="w-full relative">
                    {/* Feedback Visual: Cargando */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                            <p className="text-white font-bold text-xl">Verificando...</p>
                        </div>
                    )}

                    {/* Feedback Visual: Éxito */}
                    {status === 'success' && (
                        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl animate-in fade-in zoom-in duration-300 ${message.includes('ya registramos') ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}>
                            <div className="bg-white rounded-full p-6 mb-8 shadow-2xl animate-bounce">
                                <CheckCircle2 className={`w-24 h-24 ${message.includes('ya registramos') ? 'text-amber-500' : 'text-emerald-500'
                                    }`} strokeWidth={3} />
                            </div>

                            <div className="px-8 text-center">
                                <span className="inline-block bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-4 backdrop-blur-sm">
                                    {message.includes('ya registramos') ? 'AVISO DE SISTEMA' : 'ASISTENCIA REGISTRADA'}
                                </span>
                                <h2 className="text-5xl font-black text-white leading-tight mb-4 drop-shadow-lg uppercase">
                                    {message.includes('ya registramos') ? 'YA FUE REGISTRADO HOY' : '¡BIENVENIDO/A!'}
                                </h2>
                                <p className="text-white font-bold text-2xl opacity-90">
                                    {lastUser}
                                </p>
                            </div>

                            <div className={`absolute bottom-8 flex items-center gap-2 px-4 py-2 rounded-full border ${message.includes('ya registramos') ? 'bg-amber-600/50 border-amber-400/30' : 'bg-emerald-600/50 border-emerald-400/30'
                                }`}>
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <p className="text-white text-[10px] font-bold uppercase tracking-widest">Sincronizado con Google Sheets</p>
                            </div>
                        </div>
                    )}

                    {/* Feedback Visual: Error */}
                    {status === 'error' && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-rose-500 rounded-2xl animate-in fade-in zoom-in duration-300">
                            <AlertCircle className="w-28 h-28 text-white mb-6 animate-pulse" />
                            <h2 className="text-3xl font-bold text-white text-center px-10">
                                {message}
                            </h2>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-8 bg-white text-rose-600 px-8 py-3 rounded-xl font-bold hover:bg-rose-50 shadow-xl transition-all"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    <ScannerPlugin
                        qrCodeSuccessCallback={onNewScanResult}
                    />
                </div>

                {/* Footer info */}
                <div className="mt-12 flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-widest">Sistema Operativo • Terminal 01</span>
                </div>
            </div>
        </div>
    )
}
