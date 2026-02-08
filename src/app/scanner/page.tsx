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
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-700 ${status === 'success'
            ? (message.includes('ya registramos') ? 'bg-amber-500' : 'bg-emerald-500')
            : status === 'error' ? 'bg-rose-500' : 'bg-slate-950'
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
                        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-2xl animate-in fade-in zoom-in duration-500 overflow-hidden ${message.includes('ya registramos')
                            ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600'
                            : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
                            }`}>
                            {/* Decorative background circle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/10 rounded-full blur-[100px] pointer-events-none" />

                            <div className="bg-white rounded-full p-8 mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-50 duration-500 relative z-10">
                                <CheckCircle2 className={`w-20 h-20 md:w-28 md:h-28 ${message.includes('ya registramos') ? 'text-amber-500' : 'text-emerald-500'
                                    }`} strokeWidth={3} />
                            </div>

                            <div className="px-8 text-center relative z-10">
                                <div className={`inline-block backdrop-blur-md text-[10px] md:text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-6 border ${message.includes('ya registramos')
                                        ? 'bg-black/5 text-black border-black/10'
                                        : 'bg-white/30 text-white border-white/20'
                                    }`}>
                                    {message.includes('ya registramos') ? 'Aviso de Registro' : 'Asistencia Confirmada'}
                                </div>
                                <h2 className={`text-4xl md:text-6xl font-black leading-[0.9] mb-4 drop-shadow-xl uppercase tracking-tighter ${message.includes('ya registramos') ? 'text-black' : 'text-white'
                                    }`}>
                                    {message.includes('ya registramos') ? (
                                        <>YA FUE <br /> <span className="text-black/60">REGISTRADO</span></>
                                    ) : (
                                        <>¡MUCHAS <br /> <span className="text-emerald-200">GRACIAS!</span></>
                                    )}
                                </h2>
                                <div className={`h-1 w-20 mx-auto mb-6 rounded-full ${message.includes('ya registramos') ? 'bg-black/20' : 'bg-white/40'
                                    }`} />
                                <p className={`font-bold text-2xl md:text-3xl tracking-tight drop-shadow-sm ${message.includes('ya registramos') ? 'text-black' : 'text-white'
                                    }`}>
                                    {lastUser}
                                </p>
                            </div>

                            <div className={`absolute bottom-8 flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-sm ${message.includes('ya registramos')
                                    ? 'border-black/10 bg-black/5 text-black'
                                    : 'border-white/20 bg-white/10 text-white'
                                }`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${message.includes('ya registramos') ? 'bg-black' : 'bg-white'
                                    }`} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Acceso Concedido • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
