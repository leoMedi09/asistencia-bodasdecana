"use client"
import Link from 'next/link'
import { QrCode, ClipboardList } from 'lucide-react'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-delay-1000 animate-pulse" />
            </div>

            <div className="text-center mb-16 relative z-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">Iglesia Bodas de Caná</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-none">
                    Control de <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Asistencia</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                    Gestión inteligente y rápida con tecnología de códigos QR.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-700 delay-300">
                <Link href="/scanner" className="group h-full">
                    <div className="h-full bg-white dark:bg-slate-900/50 p-10 rounded-[2.5rem] shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-6 group-hover:-translate-y-2 backdrop-blur-xl group-hover:border-blue-500/30">
                        <div className="bg-blue-600 dark:bg-blue-500 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/40 group-hover:scale-110 transition-transform duration-500">
                            <QrCode size={40} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Escanear QR</h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                                Registra ingresos al instante usando la cámara de tu celular.
                            </p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin" className="group h-full">
                    <div className="h-full bg-white dark:bg-slate-900/50 p-10 rounded-[2.5rem] shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-6 group-hover:-translate-y-2 backdrop-blur-xl group-hover:border-emerald-500/30">
                        <div className="bg-emerald-500 dark:bg-emerald-400 p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/40 group-hover:scale-110 transition-transform duration-500">
                            <ClipboardList size={40} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Administración</h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                                Gestiona miembros, exporta reportes y genera nuevos carnets.
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            <p className="mt-20 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] z-10">
                PROYECTO BODA DE CANÁ • 2026
            </p>
        </main>
    )
}
