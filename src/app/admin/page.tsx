"use client"

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Printer, Download, FileText, Loader2, Share2, Table, Trash2, Search, Pencil, LayoutGrid, List, X, Check, RefreshCw } from 'lucide-react'
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
    const [isMounted, setIsMounted] = useState(false)
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

    const [activeTab, setActiveTab] = useState<'members' | 'audit'>('members')
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [auditSearch, setAuditSearch] = useState('')

    useEffect(() => {
        setIsMounted(true)
        fetchUsers()
    }, [])

    const refreshAuditLogs = async () => {
        try {
            const res = await fetch('/api/reports/attendance', { cache: 'no-store' })
            const data = await res.json()
            setAuditLogs(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        if (activeTab === 'audit') {
            refreshAuditLogs()
        }
    }, [activeTab])

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
            const usersRes = await fetch('/api/users')
            const allUsers: User[] = await usersRes.json()

            const reportsRes = await fetch('/api/reports/attendance')
            const allAttendances = await reportsRes.json()

            if (!usersRes.ok || !reportsRes.ok) throw new Error('Error al obtener datos')

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

            // Crear el encabezado de las columnas
            const tableColumn = ["ID", "NOMBRE Y APELLIDO", "N° COM", ...meetingDates.map(m => m.str)]

            // Crear las filas de datos
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
                        att.ID === user.id.toString().padStart(4, '0') && att.Fecha === mDate.str
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

            // Unir encabezados y filas
            const worksheetData = [
                [`COMUNIDAD CATOLICA BODAS DE CANA - ASISTENCIA ${months[selectedMonth]} 2026`],
                [], // Espacio
                tableColumn,
                ...tableRows
            ]

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

            // Ajustar ancho de columnas para que se vea bien
            const wscols = [
                { wch: 8 },  // ID
                { wch: 35 }, // Nombre
                { wch: 10 }, // N° Com
                ...meetingDates.map(() => ({ wch: 12 })) // Fechas
            ]
            worksheet['!cols'] = wscols

            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia")

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

            // Unique filename with timestamp
            const now = new Date()
            const timestamp = `${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}_${now.getHours()}${now.getMinutes()}${now.getSeconds()}`
            const uniqueId = Math.random().toString(36).substring(7)
            const fileName = `Asistencia_${months[selectedMonth]}_2026_${timestamp}_${uniqueId}.xlsx`

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Reporte Asistencia - ${months[selectedMonth]}`,
                        text: `Reporte de asistencia de la comunidad bdc - ${months[selectedMonth]} 2026`,
                    })
                } catch (shareErr: any) {
                    if (shareErr.name !== 'AbortError') {
                        console.error('Share error:', shareErr)
                        // Fallback to manual download
                        XLSX.writeFile(workbook, fileName)
                    }
                }
            } else {
                // Regular browser download
                XLSX.writeFile(workbook, fileName)
            }
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
                scale: 3, // Higher scale for better QR readability on share
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    // Ensure the cloned element is visible for capture
                    const element = clonedDoc.getElementById(`card-${user.id}`)
                    if (element && element.parentElement) {
                        element.parentElement.style.display = 'block'
                        element.parentElement.style.opacity = '1'
                        element.parentElement.style.visibility = 'visible'
                    }
                }
            })

            cardElement.style.transition = ''

            // Convert canvas to blob and share
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0))

            if (!blob) {
                return
            }

            const fileName = `carnet-${user.fullName.replace(/\s+/g, '-').toLowerCase()}.png`
            const file = new File([blob], fileName, { type: 'image/png' })

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Carnet`,
                        text: `Carnet de Asistencia: ${user.fullName}`,
                    })
                } catch (shareErr: any) {
                    if (shareErr.name !== 'AbortError') {
                        console.error('Share error:', shareErr)
                    }
                }
            } else {
                // Manual download fallback
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = fileName
                link.click()
                alert('Tu celular no permite compartir directo. La imagen se descargó.')
            }
        } catch (error) {
            console.error('Error sharing card:', error)
        } finally {
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
                        att.ID === user.id.toString().padStart(4, '0') && att.Fecha === mDate.str
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

            const now = new Date()
            const timestamp = `${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}_${now.getHours()}${now.getMinutes()}${now.getSeconds()}`
            const uniqueId = Math.random().toString(36).substring(7)
            doc.save(`Asistencia_Matriz_${months[selectedMonth]}_2026_${timestamp}_${uniqueId}.pdf`)
        } catch (error) {
            console.error('Error:', error)
            alert('Error al generar el reporte matriz')
        } finally {
            setIsGeneratingFullReport(false)
        }
    }

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 print:hidden">
                    <div className="flex flex-col gap-4">
                        <Link href="/" className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl text-slate-500 hover:text-blue-600 transition-all active:scale-95 group w-fit -ml-1">
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} strokeWidth={2.5} />
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Panel <span className="text-blue-600">Admin</span>
                        </h1>
                    </div>
                </header>

                <div className="mb-10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-blue-500/10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 overflow-hidden relative border border-white/10 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
                    {/* Decorative Blobs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="z-10 flex-1 text-center lg:text-left">
                        <h2 className="text-2xl md:text-3xl font-black mb-1.5 text-white tracking-tight">Reporte Mensual <span className="text-blue-200">2026</span></h2>
                        <p className="text-blue-100/80 text-sm md:text-base font-medium max-w-lg">Exporta la asistencia detallada con formato oficial.</p>

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                            <label className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest">Seleccionar Mes:</label>
                            <div className="relative w-full sm:w-48 group">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 px-5 rounded-2xl border-2 border-white/10 outline-none appearance-none transition-all cursor-pointer text-sm"
                                >
                                    {months.map((month, index) => (
                                        <option key={month} value={index} className="bg-slate-900 text-white font-bold py-2">
                                            {month}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="z-10 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <button
                            onClick={exportToExcel}
                            disabled={isGeneratingExcel}
                            className="flex-1 lg:w-auto z-10 bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-4 rounded-2xl font-black text-sm md:text-base transition-all active:scale-95 flex items-center justify-center shadow-2xl disabled:opacity-50 border-2 border-emerald-400/30 group"
                        >
                            {isGeneratingExcel ? (
                                <Loader2 className="animate-spin mr-2" size={20} />
                            ) : (
                                <Table className="mr-2 group-hover:scale-110 transition-transform" size={20} />
                            )}
                            EXCEL {months[selectedMonth]}
                        </button>
                        <button
                            onClick={generateFullReportPDF}
                            disabled={isGeneratingFullReport}
                            className="flex-1 lg:w-auto z-10 bg-white text-blue-700 hover:bg-blue-50 px-6 py-4 rounded-2xl font-black text-sm md:text-base transition-all active:scale-95 flex items-center justify-center shadow-2xl disabled:opacity-50 ring-4 ring-blue-400/30 group"
                        >
                            {isGeneratingFullReport ? (
                                <Loader2 className="animate-spin mr-2" size={20} />
                            ) : (
                                <FileText className="mr-2 group-hover:rotate-12 transition-transform" size={20} />
                            )}
                            PDF {months[selectedMonth]}
                        </button>
                    </div>
                </div>

                {/* Buscador y Selector de Vista */}
                <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-1">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'members'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        GESTIÓN DE MIEMBROS
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'audit'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        AUDITORÍA DE ASISTENCIA
                    </button>
                </div>

                {activeTab === 'members' ? (
                    <>
                        {/* Buscador y Selector de Vista */}
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-10 print:hidden sticky top-4 z-40 px-1 md:px-0">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar miembro..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-6 py-3.5 md:py-4 bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 shadow-xl shadow-slate-200/5 transition-all font-bold text-base md:text-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
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
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-10 border-2 border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group mb-10 print:hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/10 transition-colors" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="bg-green-500/10 p-2.5 rounded-2xl">
                                        <UserPlus className="text-green-600" size={24} />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Registrar Nuevo Miembro</h2>
                                </div>

                                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    <div className="md:col-span-7 flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Ej. Juan Pérez"
                                            className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Comunidad</label>
                                        <input
                                            type="text"
                                            value={newCommunityNumber}
                                            onChange={(e) => setNewCommunityNumber(e.target.value)}
                                            placeholder="N°"
                                            className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-center"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-3 flex items-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white p-4 h-[60px] md:h-full max-h-[60px] rounded-2xl font-black text-sm shadow-xl shadow-green-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                            {loading ? 'GUARDANDO...' : 'REGISTRAR'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-10 border-2 border-slate-100 dark:border-slate-800 shadow-2xl mb-10">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Auditoría de Asistencias</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Registro histórico completo de todos lo escaneos realizados.</p>

                                    {/* Selector de Mes Compacto para Auditoría */}
                                    <div className="flex items-center gap-3 mb-8 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 w-fit">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">MES:</span>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="bg-transparent text-slate-900 dark:text-white font-black text-sm outline-none cursor-pointer pr-8 border-none appearance-none"
                                            style={{
                                                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236366f1\' stroke-width=\'4\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right center',
                                                backgroundSize: '12px'
                                            }}
                                        >
                                            {months.map((month, index) => (
                                                <option key={month} value={index} className="bg-white dark:bg-slate-900">{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Filtrar por nombre..."
                                            value={auditSearch}
                                            onChange={(e) => setAuditSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200"
                                        />
                                    </div>
                                    <button
                                        onClick={refreshAuditLogs}
                                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        title="Actualizar tabla"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto pb-4">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white dark:bg-slate-900 z-10 w-[200px]">Miembro</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[80px]">Com.</th>
                                            {(() => {
                                                const year = 2026;
                                                const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
                                                const dates = [];
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const date = new Date(year, selectedMonth, d);
                                                    if (date.getDay() === 2 || date.getDay() === 6) {
                                                        dates.push({ str: format(date, 'dd/MM/yyyy'), date });
                                                    }
                                                }
                                                return dates.map((date, i) => (
                                                    <th key={i} className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[60px]">
                                                        {format(date.date, 'dd/MM')}
                                                    </th>
                                                ));
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {users.filter(u =>
                                            u.fullName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                            (u.communityNumber && u.communityNumber.includes(auditSearch))
                                        ).map((user) => {
                                            const year = 2026;
                                            const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
                                            const dates = [];
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const date = new Date(year, selectedMonth, d);
                                                if (date.getDay() === 2 || date.getDay() === 6) {
                                                    dates.push({ str: format(date, 'dd/MM/yyyy'), date });
                                                }
                                            }

                                            return (
                                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <td className="py-3 px-4 text-slate-900 dark:text-white font-bold text-xs sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                        {user.fullName}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {user.communityNumber && (
                                                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black">
                                                                {user.communityNumber}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {dates.map((dateObj, idx) => {
                                                        const isPresent = auditLogs.some(log =>
                                                            log.ID === user.id.toString().padStart(4, '0') &&
                                                            log.Fecha === dateObj.str
                                                        );

                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const isPast = dateObj.date <= today;

                                                        return (
                                                            <td key={idx} className="py-3 px-2 text-center">
                                                                {isPresent ? (
                                                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">A</span>
                                                                ) : isPast ? (
                                                                    <span className="font-bold text-rose-500 dark:text-rose-400 text-xs">F</span>
                                                                ) : (
                                                                    <span className="text-slate-300 dark:text-slate-700 text-[10px]">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="py-8 text-center text-slate-400 text-sm">
                                                    No hay miembros registrados para auditar.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lista de Carnets */}
                {/* Lista de Miembros */}
                {/* Lista de Miembros (Solo si está activo el tab 'members') */}
                {
                    activeTab === 'members' && (
                        <div ref={cardsContainerRef} className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4" : "flex flex-col gap-4"}>
                            {Array.isArray(users) && users.filter(u => {
                                const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                return matchesName && matchesCommunity;
                            }).map((user) => (
                                <div key={user.id} className={viewMode === 'grid' ? "flex flex-col gap-3" : "flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 transition-all gap-4"}>
                                    {/* Hidden Card for capture (Always present in DOM but hidden from view if in list mode) */}
                                    <div className={viewMode === 'grid' ? "" : "absolute -left-[9999px] top-0 opacity-0 pointer-events-none"}>
                                        <div
                                            id={`card-${user.id}`}
                                            className="card-to-pdf bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4 break-inside-avoid print:border-black print:shadow-none"
                                            style={{ backgroundColor: '#ffffff', border: '2px solid #f3f4f6', minWidth: '300px' }}
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
                                    </div>

                                    {viewMode === 'grid' ? (
                                        <>
                                            {/* Acciones (Grid) */}
                                            <div className="flex flex-col gap-2 print:hidden w-full">
                                                <button
                                                    onClick={() => handleShareCard(user)}
                                                    disabled={downloadingId !== null}
                                                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {downloadingId === user.id ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                                                    Enviar por WhatsApp
                                                </button>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadImage(user)}
                                                        className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200"
                                                        title="Descargar Foto"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="flex items-center justify-center bg-rose-50 text-rose-600 py-3 rounded-xl hover:bg-rose-100"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* List Item View Optimized for Mobile */}
                                            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-2xl flex-shrink-0 border border-blue-100/50 dark:border-blue-800/30">
                                                    <QRCodeSVG value={user.qrCode} size={40} />
                                                </div>
                                                <div className="flex flex-col min-w-0 overflow-hidden">
                                                    <h3 className="font-bold text-slate-900 dark:text-white uppercase text-sm md:text-base leading-tight truncate">
                                                        {user.fullName}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                                                            ID: {user.id.toString().padStart(4, '0')}
                                                        </span>
                                                        {user.communityNumber && (
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                Com. {user.communityNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 print:hidden ml-auto">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleShareCard(user)}
                                                    disabled={downloadingId !== null}
                                                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                                                    title="WhatsApp"
                                                >
                                                    {downloadingId === user.id ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadImage(user)}
                                                    disabled={downloadingId !== null}
                                                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 disabled:opacity-50"
                                                    title="Descargar Foto"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                {/* Modal de Edición */}
                {
                    editingUser && (
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
                    )
                }

                {
                    activeTab === 'members' && users.length === 0 && (
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
