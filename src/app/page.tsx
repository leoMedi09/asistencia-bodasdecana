"use client"
import Link from 'next/link'
import { QrCode, ClipboardList } from 'lucide-react'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2">Asistencia Bodas de Cana</h1>
                <p className="text-lg text-blue-700 dark:text-blue-300">Sistema de Control de Asistencia con QR</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                <Link href="/scanner" className="group">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-blue-100 dark:border-slate-700 flex flex-col items-center gap-4 group-hover:-translate-y-1">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400">
                            <QrCode size={48} />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Modo Escáner</h2>
                        <p className="text-center text-gray-500 dark:text-gray-400">
                            Activar la cámara para registrar entrada
                        </p>
                    </div>
                </Link>

                <Link href="/admin" className="group">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-blue-100 dark:border-slate-700 flex flex-col items-center gap-4 group-hover:-translate-y-1">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full text-emerald-600 dark:text-emerald-400">
                            <ClipboardList size={48} />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Panel Admin</h2>
                        <p className="text-center text-gray-500 dark:text-gray-400">
                            Gestionar miembros e imprimir carnets
                        </p>
                    </div>
                </Link>
            </div>
        </main>
    )
}
