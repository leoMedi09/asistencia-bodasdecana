"use client"

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Printer, Download, FileText, Loader2, Share2, Table, Trash2, Search, Pencil, LayoutGrid, List, X, Check } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

import autoTable from 'jspdf-autotable'

interface User {
    id: number
    fullName: string
    communityNumber?: string
    qrCode: string
    createdAt: string
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [newName, setNewName] = useState('')
    const [newCommunityNumber, setNewCommunityNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false)
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [downloadingId, setDownloadingId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [editName, setEditName] = useState('')
    const [editCommunityNumber, setEditCommunityNumber] = useState('')
    const [selectedCommunity, setSelectedCommunity] = useState<string>('all')
    const cardsContainerRef = useRef<HTMLDivElement>(null)

    const months = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ]

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users')
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
            setUsers([])
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        setLoading(true)
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: newName,
                communityNumber: newCommunityNumber
            }),
        })
        setNewName('')
        setNewCommunityNumber('')
        setLoading(false)
        fetchUsers()
    }

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser || !editName.trim()) return

        setLoading(true)
        const res = await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editingUser.id,
                fullName: editName,
                communityNumber: editCommunityNumber
            }),
        })

        if (res.ok) {
            setEditingUser(null)
            fetchUsers()
        } else {
            alert('Error al actualizar el usuario')
        }
        setLoading(false)
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setEditName(user.fullName)
        setEditCommunityNumber(user.communityNumber || '')
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar a ${user.fullName}? Se borrará también su historial de asistencia.`)) return

        try {
            const res = await fetch(`/api/users?id=${user.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                fetchUsers()
            } else {
                alert('Error al eliminar el usuario')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            alert('Error al eliminar el usuario')
        }
    }

    const exportToExcel = async () => {
        setIsGeneratingExcel(true)
        try {
            const res = await fetch('/api/reports/attendance')
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Error al obtener datos')

            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia")

            // Generate buffer and download
            XLSX.writeFile(workbook, `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            alert('Error al generar el reporte de Excel')
        } finally {
            setIsGeneratingExcel(false)
        }
    }

    const handleDownloadImage = async (user: User) => {
        const cardElement = document.getElementById(`card-${user.id}`)
        if (!cardElement) return

        setDownloadingId(user.id)
        try {
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 100))
            // Disable transitions temporarily for cleaner capture
            cardElement.style.transition = 'none'

            const canvas = await html2canvas(cardElement, {
                scale: 2, // 2 is usually enough for cards and more stable
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                removeContainer: true
            })

            const imgData = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = imgData
            link.download = `carnet-${user.fullName.replace(/\s+/g, '-').toLowerCase()}.png`
            link.click()

            // Restore transition
            cardElement.style.transition = ''
        } catch (error) {
            console.error('Error downloading image:', error)
            alert('No se pudo generar la imagen. Intenta cerrar otras pestañas o usar un navegador más moderno.')
        } finally {
            setDownloadingId(null)
        }
    }


    const handleShareCard = async (user: User) => {
        const cardElement = document.getElementById(`card-${user.id}`)
        if (!cardElement) return

        setDownloadingId(user.id)
        try {
            await new Promise(resolve => setTimeout(resolve, 100))
            cardElement.style.transition = 'none'
            const canvas = await html2canvas(cardElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            })

            cardElement.style.transition = ''

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setDownloadingId(null)
                    return
                }

                const fileName = `carnet-${user.fullName.replace(/\s+/g, '-').toLowerCase()}.png`
                const file = new File([blob], fileName, { type: 'image/png' })

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: `Carnet de Asistencia - ${user.fullName}`,
                            text: `Aquí tienes tu carnet de asistencia para ${user.fullName}.`,
                        })
                    } catch (shareErr) {
                        // User might have cancelled the share
                        console.log('Compartir cancelado o fallido', shareErr)
                    }
                } else {
                    // Manual download fallback
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = fileName
                    link.click()
                    alert('Tu navegador no permite enviar fotos directo. Se guardó en tu galería.')
                }
                setDownloadingId(null)
            }, 'image/png')
        } catch (error) {
            console.error('Error sharing card:', error)
            setDownloadingId(null)
        }
    }


    const generateFullReportPDF = async () => {
        setIsGeneratingFullReport(true)
        try {
            const usersRes = await fetch('/api/users')
            const allUsers: User[] = await usersRes.json()

            const reportsRes = await fetch('/api/reports/attendance')
            const allAttendances = await reportsRes.json()

            if (!usersRes.ok || !reportsRes.ok) throw new Error('Error al obtener datos')

            const doc = new jsPDF('l', 'mm', 'a4')

            const year = 2026
            const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate()
            const meetingDates: { str: string, dateObject: Date }[] = []

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, selectedMonth, d)
                const dayOfWeek = date.getDay()
                if (dayOfWeek === 2 || dayOfWeek === 6) {
                    meetingDates.push({
                        str: format(date, 'dd/MM/yyyy'),
                        dateObject: date
                    })
                }
            }

            // --- HEADER MEJORADO CON LOGO ---
            try {
                // El usuario debe guardar el logo en public/logo.jpg
                // Posición: Izquierda (15, 10), Tamaño: 30x30
                doc.addImage('/logo.jpg', 'JPEG', 15, 10, 30, 30)
            } catch (e) {
                console.warn("Logo no encontrado en /public/logo.jpg")
            }

            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text('COMUNIDAD CATOLICA BODAS DE CANA', 148, 18, { align: 'center' })

            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text('ZONA 28 LAMBAYEQUE', 148, 25, { align: 'center' })

            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text(`ASISTENCIA DE ${months[selectedMonth]}`, 148, 35, { align: 'center' })

            const tableColumn = ["ID", "NOMBRE Y APELLIDO", "N° COM", ...meetingDates.map(m => m.str)]

            const tableRows = allUsers.map(user => {
                const row = [
                    user.id.toString().padStart(4, '0'),
                    user.fullName.toUpperCase(),
                    user.communityNumber || '-'
                ]

                const today = new Date()
                today.setHours(0, 0, 0, 0)

                meetingDates.forEach(mDate => {
                    const attended = allAttendances.some((att: any) =>
                        att.Nombre === user.fullName && att.Fecha === mDate.str
                    )

                    if (attended) {
                        row.push('A')
                    } else if (mDate.dateObject <= today) {
                        row.push('F')
                    } else {
                        row.push('') // Future date
                    }
                })

                return row
            })

            autoTable(doc, {
                head: [
                    [
                        { content: '', colSpan: 3 },
                        { content: months[selectedMonth], colSpan: meetingDates.length, styles: { halign: 'center', fillColor: [0, 0, 0] } }
                    ],
                    tableColumn
                ],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
                headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold', halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 'auto', fontStyle: 'bold' },
                    2: { cellWidth: 15, halign: 'center' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index >= 3) {
                        if (data.cell.text[0] === 'F') {
                            data.cell.styles.textColor = [225, 29, 72]
                        } else if (data.cell.text[0] === 'A') {
                            data.cell.styles.textColor = [5, 150, 105]
                            data.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
            })

            const finalY = (doc as any).lastAutoTable.finalY + 25
            doc.setFontSize(10)

            // Línea de Firmas (Parejas)
            doc.setTextColor(0, 0, 0)
            doc.setDrawColor(0, 0, 0)
            doc.line(40, finalY, 110, finalY)
            doc.line(180, finalY, 250, finalY)
            doc.setFont('helvetica', 'bold')
            doc.text('JORGE Y GLADYS SAMAME CHOZO', 75, finalY + 5, { align: 'center' })
            doc.text('WILMER Y ESTHER MEDINA FLORES', 215, finalY + 5, { align: 'center' })
            doc.setFont('helvetica', 'normal')
            doc.text('RESPONSABLES ZONAL', 75, finalY + 12, { align: 'center' })
            doc.text('RESPONSABLES SECRETARIA', 215, finalY + 12, { align: 'center' })

            doc.save(`Asistencia_Matriz_${months[selectedMonth]}_2026.pdf`)
        } catch (error) {
            console.error('Error:', error)
            alert('Error al generar el reporte matriz')
        } finally {
            setIsGeneratingFullReport(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 print:hidden px-2">
                    <div className="flex flex-col gap-1">
                        <Link href="/" className="flex items-center text-slate-500 hover:text-blue-600 transition-all dark:text-slate-400 group w-fit">
                            <ArrowLeft className="mr-1.5 group-hover:-translate-x-1 transition-transform" size={16} />
                            <span className="font-bold text-xs uppercase tracking-widest">Inicio</span>
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Panel <span className="text-blue-600">Admin</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToExcel}
                            disabled={isGeneratingExcel}
                            className="flex-1 md:flex-none flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all font-bold border border-emerald-200 dark:border-emerald-800/50 text-sm"
                        >
                            {isGeneratingExcel ? <Loader2 className="animate-spin mr-2" size={16} /> : <Table className="mr-2" size={16} />}
                            Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={users.length === 0}
                            className="flex-1 md:flex-none flex items-center justify-center bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 font-bold disabled:opacity-50 text-sm"
                        >
                            <Printer className="mr-2" size={16} /> Imprimir
                        </button>
                    </div>
                </header>

                <div className="mb-10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-blue-500/10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 overflow-hidden relative border border-white/10 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
                    {/* Decorative Blobs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="z-10 flex-1 text-center lg:text-left">
                        <h2 className="text-2xl md:text-3xl font-black mb-1.5 text-white tracking-tight">Reporte Mensual <span className="text-blue-200">2026</span></h2>
                        <p className="text-blue-100/80 text-sm md:text-base font-medium max-w-lg">Exporta la asistencia detallada con formato oficial.</p>

                        <div className="mt-5 flex flex-wrap gap-1.5 justify-center lg:justify-start">
                            {months.map((month, index) => (
                                <button
                                    key={month}
                                    onClick={() => setSelectedMonth(index)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${selectedMonth === index
                                        ? 'bg-white text-blue-700 shadow-xl scale-110 ring-2 ring-white/30'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                        }`}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={generateFullReportPDF}
                        disabled={isGeneratingFullReport}
                        className="w-full lg:w-auto z-10 bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center shadow-2xl disabled:opacity-50 ring-4 ring-blue-400/30 group"
                    >
                        {isGeneratingFullReport ? (
                            <Loader2 className="animate-spin mr-3" size={24} />
                        ) : (
                            <FileText className="mr-3 group-hover:rotate-12 transition-transform" size={24} />
                        )}
                        DESCARGAR {months[selectedMonth]}
                    </button>
                </div>

                {/* Buscador y Selector de Vista */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-10 print:hidden sticky top-4 z-40 px-1 md:px-0">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar miembro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-6 py-3.5 md:py-4 bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 shadow-xl shadow-slate-200/10 dark:shadow-none transition-all font-bold text-base md:text-lg"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0">
                        <div className="flex bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] p-1 shadow-xl border-2 border-slate-100 dark:border-slate-800 flex-1 md:flex-none">
                            <select
                                value={selectedCommunity}
                                onChange={(e) => setSelectedCommunity(e.target.value)}
                                className="bg-transparent px-4 md:px-6 py-2 outline-none font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-200 cursor-pointer min-w-[120px] md:min-w-0"
                            >
                                <option value="all">Todas</option>
                                {[...new Set(users.map(u => u.communityNumber).filter(Boolean))].sort().map(num => (
                                    <option key={num} value={num} className="bg-slate-900 text-white">Com. {num}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] p-1 shadow-xl border-2 border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-xl md:rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <LayoutGrid size={18} />
                                <span className="hidden md:inline font-black text-sm">Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-xl md:rounded-2xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <List size={18} />
                                <span className="hidden md:inline font-black text-sm">Lista</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Formulario de Agregar - Oculto al imprimir */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8 print:hidden">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Registrar Nuevo Miembro</h2>
                    <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nombre completo"
                            className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                        <input
                            type="text"
                            value={newCommunityNumber}
                            onChange={(e) => setNewCommunityNumber(e.target.value)}
                            placeholder="N° Comunidad"
                            className="md:w-32 p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center font-black disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus className="mr-2" size={20} />}
                            {loading ? 'Guardando...' : 'AGREGAR MIEMBRO'}
                        </button>
                    </form>
                </div>

                {/* Lista de Carnets */}
                {/* Lista de Miembros */}
                <div ref={cardsContainerRef} className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4" : "flex flex-col gap-4"}>
                    {Array.isArray(users) && users.filter(u => {
                        const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                        return matchesName && matchesCommunity;
                    }).map((user) => (
                        <div key={user.id} className={viewMode === 'grid' ? "flex flex-col gap-3" : "flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 transition-all"}>
                            {viewMode === 'grid' ? (
                                <>
                                    {/* Card Content (Original) */}
                                    <div
                                        id={`card-${user.id}`}
                                        className="card-to-pdf bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4 break-inside-avoid print:border-black print:shadow-none"
                                        style={{ backgroundColor: '#ffffff', border: '2px solid #f3f4f6' }}
                                    >
                                        <div className="w-full border-b pb-3 text-center" style={{ borderBottomColor: '#f3f4f6' }}>
                                            <h3 className="font-bold text-lg text-gray-800 uppercase tracking-wide" style={{ color: '#1f2937' }}>{user.fullName}</h3>
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter" style={{ color: '#3b82f6', backgroundColor: '#eff6ff' }}>Miembro Activo</span>
                                                {user.communityNumber && (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter" style={{ color: '#64748b', backgroundColor: '#f1f5f9' }}>Comunidad {user.communityNumber}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="qr-container p-3 bg-white rounded-xl border shadow-inner" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}>
                                            <QRCodeCanvas value={user.qrCode} size={160} level="H" />
                                        </div>

                                        <div className="text-center text-[10px] font-mono tracking-widest mt-2" style={{ color: '#9ca3af' }}>
                                            ID: {user.id.toString().padStart(4, '0')}
                                        </div>
                                    </div>

                                    {/* Acciones (Grid) */}
                                    <div className="flex flex-col gap-2 print:hidden">
                                        <button
                                            onClick={() => handleShareCard(user)}
                                            disabled={downloadingId !== null}
                                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {downloadingId === user.id ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                                            WhatsApp
                                        </button>

                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadImage(user)}
                                                className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="flex items-center justify-center bg-rose-50 text-rose-600 py-3 rounded-xl hover:bg-rose-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* List Item View */}
                                    <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl flex-shrink-0">
                                            <QRCodeSVG value={user.qrCode} size={32} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs md:text-sm leading-tight truncate">{user.fullName}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] md:text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">ID: {user.id.toString().padStart(4, '0')}</span>
                                                {user.communityNumber && (
                                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">• Com. {user.communityNumber}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2 print:hidden ml-2 flex-shrink-0">
                                        <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Editar">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => handleShareCard(user)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="WhatsApp">
                                            <Share2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteUser(user)} className="hidden md:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title="Eliminar">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Modal de Edición */}
                {editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border-2 border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Editar Miembro</h3>
                                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleEditUser} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">N° Comunidad</label>
                                    <input
                                        type="text"
                                        value={editCommunityNumber}
                                        onChange={(e) => setEditCommunityNumber(e.target.value)}
                                        className="p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 py-4 rounded-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase text-xs tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-3 bg-blue-600 text-white py-4 px-8 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                        GUARDAR CAMBIOS
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {
                    users.length === 0 && (
                        <p className="text-center text-gray-500 mt-10">No hay miembros registrados aún.</p>
                    )
                }
            </div >

            <style jsx global>{`
        @media print {
          body { visibility: hidden; }
          .max-w-4xl { max-width: none; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:grid-cols-2 { display: grid; grid-template-columns: repeat(2, 1fr); }
          .print\\:gap-4 { gap: 1rem; }
          .print\\:border-black { border-color: black; }
          .print\\:shadow-none { box-shadow: none; }
          .break-inside-avoid { break-inside: avoid; }
          /* Show only the grid of cards */
           div.grid { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
           div.grid * { visibility: visible; }
        }
      `}</style>
        </div >
    )
}
