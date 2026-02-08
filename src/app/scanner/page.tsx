"use client"
import ScannerPlugin from '@/components/ScannerPlugin'
import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

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

                    // Auto reset after 2 seconds
                    setTimeout(() => {
                        setStatus('idle')
                        setMessage('Escanee su código QR')
                        isProcessing.current = false
                    }, 2000)
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
            ? (message.includes('ya registramos') ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white')
            : status === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'
            }`}>
            {/* Botón Volver */}
            <Link href="/" className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl text-white transition-all active:scale-95 group">
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} strokeWidth={2.5} />
            </Link>

            <div className="w-full max-w-xl flex flex-col items-center flex-1 justify-center py-4 md:py-8">
                {/* Encabezado Responsivo */}
                <div className="text-center mb-6 md:mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className={`inline-block px-3 py-1 rounded-full mb-3 md:mb-4 border ${status === 'success' && message.includes('ya registramos')
                        ? 'bg-black/10 border-black/20'
                        : 'bg-blue-500/10 border-blue-500/20'}`}>
                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] ${status === 'success' && message.includes('ya registramos') ? 'text-black' : 'text-blue-400'}`}>
                            Control de Acceso v2.0
                        </span>
                    </div>
                    <h1 className={`text-3xl md:text-6xl font-black mb-2 md:mb-3 tracking-tighter drop-shadow-2xl ${status === 'success' && message.includes('ya registramos') ? 'text-black' : 'text-white'}`}>
                        ESCÁNER DE <span className={status === 'success' && message.includes('ya registramos') ? 'text-black' : 'text-blue-500'}>ACCESO</span>
                    </h1>
                    <p className={`text-xs md:text-base font-medium tracking-wide px-4 ${status === 'success' && message.includes('ya registramos') ? 'text-black/80' : 'text-slate-400 opacity-80'}`}>
                        Muestra tu tarjeta frente a la cámara del dispositivo
                    </p>
                </div>

                {/* Contenedor del Escáner */}
                <div className="w-full relative">
                    {/* Feedback Visual: Cargando (Moderno) */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xl rounded-3xl animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                <Loader2 className="w-8 h-8 text-blue-500 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-white font-black text-2xl mt-6 tracking-tight animate-pulse">VERIFICANDO...</p>
                            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest opacity-60">Consultando base de datos</p>
                        </div>
                    )}

                    {/* Feedback Visual: Éxito/Alerta */}
                    {status === 'success' && (
                        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-between p-6 rounded-3xl animate-in fade-in zoom-in duration-300 overflow-hidden ${message.includes('ya registramos')
                            ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600'
                            : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
                            }`}>

                            {/* Círculos decorativos de fondo */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

                            {/* Icono Principal Compacto */}
                            <div className="relative z-10 mt-1">
                                <div className="bg-white rounded-full p-3 shadow-xl animate-in zoom-in-50 duration-500">
                                    <CheckCircle2 className={`w-12 h-12 md:w-14 md:h-14 ${message.includes('ya registramos') ? 'text-amber-500' : 'text-emerald-500'
                                        }`} strokeWidth={3} />
                                </div>
                            </div>

                            <div className="w-full px-2 text-center relative z-10 flex flex-col items-center flex-1 justify-center py-2">
                                <div className={`inline-block backdrop-blur-md text-[8px] md:text-xs font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-2 border ${message.includes('ya registramos')
                                    ? 'bg-black/10 text-black border-black/20'
                                    : 'bg-white/20 text-white border-white/30'
                                    }`}>
                                    {message.includes('ya registramos') ? '⚠️ ALERTA DE REGISTRO' : '✅ ASISTENCIA CONFIRMADA'}
                                </div>

                                <h2 className={`text-2xl md:text-4xl font-black leading-none drop-shadow-2xl uppercase tracking-tighter ${message.includes('ya registramos') ? 'text-black' : 'text-white'
                                    }`}>
                                    {message.includes('ya registramos') ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-lg md:text-xl font-bold">YA FUE</span>
                                            <span className="leading-none">REGISTRADO</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-lg md:text-xl opacity-80">¡MUCHAS</span>
                                            <span className="text-emerald-50/90 leading-none">GRACIAS!</span>
                                        </div>
                                    )}
                                </h2>

                                <div className={`h-1 w-10 mx-auto my-2 rounded-full ${message.includes('ya registramos') ? 'bg-black/20' : 'bg-white/40'
                                    }`} />

                                <p className={`font-black text-lg md:text-2xl tracking-tight drop-shadow-lg leading-tight w-full line-clamp-2 px-4 ${message.includes('ya registramos') ? 'text-black' : 'text-white'
                                    }`}>
                                    {lastUser}
                                </p>
                            </div>

                            {/* Acciones y Footer */}
                            <div className="relative z-10 w-full max-w-[220px] mb-2">
                                <button
                                    onClick={() => {
                                        setStatus('idle')
                                        setMessage('Escanee su código QR')
                                        isProcessing.current = false
                                    }}
                                    className={`w-full py-3 rounded-2xl font-black text-xs shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${message.includes('ya registramos')
                                        ? 'bg-black text-amber-500 border border-amber-500/20'
                                        : 'bg-white text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                >
                                    <RefreshCw size={16} strokeWidth={3} />
                                    <span>ESCANEAR SIGUIENTE</span>
                                </button>
                                <div className={`flex justify-center items-center gap-2 mt-2 opacity-60 font-bold uppercase tracking-widest text-[8px] ${message.includes('ya registramos') ? 'text-black' : 'text-white'}`}>
                                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="w-1 h-1 bg-current rounded-full" />
                                    <span>T-01</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feedback Visual: Error (Moderno) */}
                    {status === 'error' && (
                        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center p-8 bg-rose-500 rounded-3xl animate-in fade-in zoom-in duration-300 overflow-hidden text-white">
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="bg-white/20 backdrop-blur-md rounded-full p-6 mb-6 border border-white/30 animate-bounce duration-1000">
                                <AlertCircle className="w-16 h-16 text-white" />
                            </div>

                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Error de Lectura</h2>
                            <p className="text-xl font-bold text-center px-4 leading-tight opacity-90 drop-shadow-md">
                                {message.replace('Error: ', '')}
                            </p>

                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-10 bg-white text-rose-600 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={18} strokeWidth={3} />
                                Reintentar
                            </button>
                        </div>
                    )}

                    <ScannerPlugin
                        qrCodeSuccessCallback={onNewScanResult}
                    />
                </div>

                {/* Footer Status Bar Premium - Ajustado para móviles y contraste */}
                <div className={`mt-8 md:mt-14 flex items-center gap-3 md:gap-4 border px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000 ${status === 'success' && message.includes('ya registramos')
                    ? 'bg-black/5 border-black/10'
                    : 'bg-white/5 border-white/10'}`}>
                    <div className="relative">
                        <div className={`w-2 md:w-3 h-2 md:h-3 rounded-full animate-ping absolute inset-0 ${status === 'success' && message.includes('ya registramos') ? 'bg-black' : 'bg-emerald-500'}`} />
                        <div className={`w-2 md:w-3 h-2 md:h-3 rounded-full relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.3)] ${status === 'success' && message.includes('ya registramos') ? 'bg-black' : 'bg-emerald-500 shadow-[#10b981]'}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] leading-none ${status === 'success' && message.includes('ya registramos') ? 'text-black' : 'text-white'}`}>Sistema Activo</span>
                        <span className={`text-[6px] md:text-[8px] font-bold uppercase tracking-widest mt-1 ${status === 'success' && message.includes('ya registramos') ? 'text-black/60' : 'text-slate-500'}`}>Terminal 01 • Conexión Segura SSL</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
