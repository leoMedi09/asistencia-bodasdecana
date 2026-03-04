"use client"

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Printer, Download, FileText, Loader2, Share2, Table, Trash2, Search, Pencil, LayoutGrid, List, X, Check, RefreshCw, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import autoTable from 'jspdf-autotable'

interface User {
    id: number
    fullName: string
    communityNumber?: string
    qrCode: string
    createdAt: string
    partnerId?: number | null
    partner?: User | null
    gender?: 'M' | 'F'
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
    const [selectedAuditCommunity, setSelectedAuditCommunity] = useState<string>('all')
    const [isCouple, setIsCouple] = useState(false)
    const [partnerName, setPartnerName] = useState('')
    const [editPartnerName, setEditPartnerName] = useState('')
    const [editPartnerId, setEditPartnerId] = useState<number | null>(null)
    const [newGender, setNewGender] = useState<'M' | 'F'>('M')
    const [editGender, setEditGender] = useState<'M' | 'F'>('M')
    const [editPartnerGender, setEditPartnerGender] = useState<'M' | 'F'>('F')

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedCommunity])
    const [isMounted, setIsMounted] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
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
    const todayRef = useRef<HTMLTableHeaderCellElement>(null)
    const auditScrollContainerRef = useRef<HTMLDivElement>(null)

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
        let interval: NodeJS.Timeout;
        if (activeTab === 'audit') {
            refreshAuditLogs()
            // Auto-refresh cada 5 segundos para ver registros en tiempo real
            interval = setInterval(refreshAuditLogs, 5000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [activeTab])

    useEffect(() => {
        if (searchQuery.trim() !== '' && activeTab === 'members' && cardsContainerRef.current) {
            const yOffset = -120; // Ajuste para que el buscador sticky no tape el primer resultado
            const element = cardsContainerRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, [searchQuery, activeTab])

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        setLoading(true)
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: newName,
                communityNumber: newCommunityNumber,
                isCouple,
                partnerName: isCouple ? partnerName : undefined,
                gender: newGender
            }),
        })
        setNewName('')
        setNewCommunityNumber('')
        setPartnerName('')
        setIsCouple(false)
        setNewGender('M')
        setLoading(false)
        fetchUsers()
    }

    const handleDeleteAttendance = async (userId: number, dateStr: string) => {
        if (!confirm(`¿Desea eliminar la asistencia para este miembro el día ${dateStr}?`)) return

        try {
            const res = await fetch(`/api/attendance/delete?userId=${userId}&date=${dateStr}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                refreshAuditLogs()
            }
        } catch (error) {
            console.error('Error deleting attendance:', error)
        }
    }

    const handleManualAttendance = async (qrCode: string, dateStr: string) => {
        if (!confirm(`¿Desea registrar asistencia manual para el día ${dateStr}?`)) return

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrCode, date: dateStr }),
            })
            if (res.ok) {
                refreshAuditLogs()
            }
        } catch (error) {
            console.error('Error logging attendance:', error)
        }
    }
    const handleMarkAllPresent = async (dateStr: string) => {
        const filteredUsers = users.filter(u =>
            u.fullName.toLowerCase().includes(auditSearch.toLowerCase()) ||
            (u.communityNumber && u.communityNumber.includes(auditSearch))
        );

        if (!confirm(`¿Desea marcar asistencia a los ${filteredUsers.length} miembros para el día ${dateStr}?`)) return

        setLoading(true)
        try {
            // Enviamos las peticiones en paralelo para mayor velocidad
            await Promise.all(filteredUsers.map(user =>
                fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrCode: user.qrCode, date: dateStr }),
                })
            ));
            refreshAuditLogs()
        } catch (error) {
            console.error('Error marking all present:', error)
        }
        setLoading(false)
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
                communityNumber: editCommunityNumber,
                partnerId: editPartnerId,
                partnerName: editPartnerName,
                gender: editGender,
                partnerGender: editPartnerGender
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
        setEditGender(user.gender || 'M')

        // Cargar datos de pareja si existe (buscar por partnerId o si alguien nos tiene como partner)
        const partner = user.partnerId
            ? users.find(u => u.id === user.partnerId)
            : users.find(u => u.partnerId === user.id)

        if (partner) {
            setEditPartnerId(partner.id)
            setEditPartnerName(partner.fullName)
            setEditPartnerGender(partner.gender || (user.gender === 'M' ? 'F' : 'M'))
        } else {
            setEditPartnerId(null)
            setEditPartnerName('')
            setEditPartnerGender('F')
        }
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

            // Ordenar por N° de Comunidad (de forma natural/numérica)
            allUsers.sort((a, b) => {
                const numA = parseInt(a.communityNumber || '999')
                const numB = parseInt(b.communityNumber || '999')
                if (numA !== numB) return numA - numB
                return a.fullName.localeCompare(b.fullName)
            })

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
            const tableColumn = ["№", "NOMBRE Y APELLIDO", "N° COM", ...meetingDates.map(m => m.str)]

            // Crear las filas de datos con agrupación de parejas y encabezados de comunidad
            const processedIds = new Set<number>()
            const tableRows: any[][] = []
            let currentCommunity: string | null = null
            let entityCounter = 0

            allUsers.forEach(user => {
                if (processedIds.has(user.id)) return

                // Encabezado de comunidad
                if (user.communityNumber !== currentCommunity) {
                    currentCommunity = user.communityNumber || '-'
                    entityCounter = 0
                    tableRows.push(["", `--- COMUNIDAD ${currentCommunity} ---`, ""])
                }

                const partner = user.partnerId ? allUsers.find(u => u.id === user.partnerId) : null

                // Función para añadir una fila de usuario con indicador de pareja
                const addUserRow = (u: User, isPartnerRow = false) => {
                    // Sin flecha ni excedente de espacios
                    const name = u.fullName.toUpperCase()
                    const row = [
                        entityCounter.toString(),
                        name,
                        u.communityNumber || '-'
                    ]

                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    meetingDates.forEach(mDate => {
                        const attended = allAttendances.some((att: any) =>
                            att.ID === u.id.toString().padStart(4, '0') &&
                            att.Fecha === mDate.str
                        )

                        if (attended) {
                            row.push('A')
                        } else if (mDate.dateObject <= today) {
                            row.push('F')
                        } else {
                            row.push('') // Future date
                        }
                    })
                    tableRows.push(row)
                    processedIds.add(u.id)
                }

                if (partner && !processedIds.has(partner.id)) {
                    entityCounter++
                    // Orden Hombre primero
                    // Orden Hombre primero estricto
                    const isM1 = user.gender === 'M';
                    const isF1 = user.gender === 'F';
                    const isM2 = partner.gender === 'M';
                    const isF2 = partner.gender === 'F';

                    let first = user;
                    if ((isM2 && !isM1) || (isF1 && !isF2)) {
                        first = partner;
                    }
                    const second = first === user ? partner : user;

                    addUserRow(first, false)
                    addUserRow(second, true)
                } else if (!processedIds.has(user.id)) {
                    entityCounter++
                    addUserRow(user)
                }
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
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                removeContainer: true,
                onclone: (clonedDoc) => {
                    const element = clonedDoc.getElementById(`card-${user.id}`)
                    if (element && element.parentElement) {
                        element.parentElement.style.display = 'block'
                        element.parentElement.style.opacity = '1'
                        element.parentElement.style.visibility = 'visible'
                        element.parentElement.style.position = 'relative'
                        element.parentElement.style.left = '0'
                    }
                }
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
                        element.parentElement.style.position = 'relative'
                        element.parentElement.style.left = '0'
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

            // Ordenar por N° de Comunidad (de forma natural/numérica)
            allUsers.sort((a, b) => {
                const numA = parseInt(a.communityNumber || '999')
                const numB = parseInt(b.communityNumber || '999')
                if (numA !== numB) return numA - numB
                return a.fullName.localeCompare(b.fullName)
            })

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

            const tableColumn = ["№", "NOMBRE Y APELLIDO", "N° COM", ...meetingDates.map(m => m.str)]
            // Reducir un poco el tamaño de fuente para que quepan las fechas si son muchas
            const fontSize = meetingDates.length > 10 ? 7 : 8;

            const processedIds = new Set<number>()
            const tableRows: any[][] = []
            let currentCommunity: string | null = null
            let entityCounter = 0

            allUsers.forEach(user => {
                if (processedIds.has(user.id)) return

                // Encabezado de comunidad
                if (user.communityNumber !== currentCommunity) {
                    currentCommunity = user.communityNumber || '-'
                    entityCounter = 0 // Reiniciar contador por comunidad
                    tableRows.push([
                        {
                            content: `--- COMUNIDAD ${currentCommunity} ---`,
                            colSpan: tableColumn.length,
                            styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'bold' }
                        }
                    ])
                }

                const partner = user.partnerId ? allUsers.find(u => u.id === user.partnerId) : null

                // Función para añadir una fila de usuario
                const addUserRow = (u: User, isPartnerRow: boolean, hasPartner: boolean) => {
                    const row = []

                    // Columna № con rowSpan para parejas
                    if (!isPartnerRow) {
                        row.push({
                            content: entityCounter.toString(),
                            rowSpan: hasPartner ? 2 : 1,
                            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' }
                        })
                    }

                    // Sin flecha ni excedente de espacios
                    row.push(u.fullName.toUpperCase())
                    row.push(u.communityNumber || '-')

                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    meetingDates.forEach(mDate => {
                        const attended = allAttendances.some((att: any) =>
                            att.ID === u.id.toString().padStart(4, '0') &&
                            att.Fecha === mDate.str
                        )

                        if (attended) {
                            row.push('A')
                        } else if (mDate.dateObject <= today) {
                            row.push('F')
                        } else {
                            row.push('') // Future date
                        }
                    })

                    tableRows.push(row)
                    processedIds.add(u.id)
                }

                if (partner && !processedIds.has(partner.id)) {
                    entityCounter++
                    // Orden Hombre primero
                    // Orden Hombre primero estricto
                    const isM1 = user.gender === 'M';
                    const isF1 = user.gender === 'F';
                    const isM2 = partner.gender === 'M';
                    const isF2 = partner.gender === 'F';

                    let first = user;
                    if ((isM2 && !isM1) || (isF1 && !isF2)) {
                        first = partner;
                    }
                    const second = first === user ? partner : user;

                    addUserRow(first, false, true)
                    addUserRow(second, true, false)
                } else if (!processedIds.has(user.id)) {
                    entityCounter++
                    addUserRow(user, false, false)
                }
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
                startY: 40,
                theme: 'grid',
                styles: { fontSize: fontSize, cellPadding: 2, textColor: [0, 0, 0], valign: 'middle' },
                headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold', halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 'auto', fontStyle: 'bold' },
                    2: { cellWidth: 15, halign: 'center' }
                },
                didParseCell: (data) => {
                    // Si la celda es del nombre y tiene el prefijo de pareja (->)
                    // o si sabemos que es una fila de pareja por la lógica de procesamiento
                    if (data.section === 'body') {
                        const cellText = data.cell.text.join('');
                        if (cellText.includes('->')) {
                            data.row.cells[1].styles.fontStyle = 'bold';
                            // Aplicar un fondo sutil a toda la fila de la pareja
                            Object.values(data.row.cells).forEach((cell: any) => {
                                cell.styles.fillColor = [245, 248, 255]; // Azul muy claro
                            });
                        }

                        // Colores para asistencia
                        if (data.column.index >= 3) {
                            if (cellText === 'F') {
                                data.cell.styles.textColor = [225, 29, 72];
                            } else if (cellText === 'A') {
                                data.cell.styles.textColor = [5, 150, 105];
                                data.cell.styles.fontStyle = 'bold';
                            }
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 md:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto animate-fade-in">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-10 print:hidden text-center md:text-left">
                    <div className="flex flex-col gap-3">
                        <Link href="/" className="p-2.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl text-slate-500 hover:text-blue-600 transition-all active:scale-95 group w-fit -ml-1 mx-auto md:ml-0">
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={18} strokeWidth={2.5} />
                        </Link>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Panel <span className="text-blue-600">Admin</span>
                        </h1>
                    </div>
                </header>

                <div className="mb-10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-blue-500/10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 overflow-hidden relative border border-white/10 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
                    {/* Decorative Blobs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="z-10 flex-1 text-center lg:text-left">
                        <h2 className="text-2xl md:text-3xl font-black mb-1 text-white tracking-tight">Reporte Mensual <span className="text-blue-200">2026</span></h2>
                        <p className="text-blue-100/80 text-xs md:text-sm lg:text-base font-medium max-w-lg">Exporta la asistencia detallada con formato oficial.</p>

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                            <label className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest">Seleccionar Mes:</label>
                            <div className="relative w-full sm:w-48 group">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 px-5 rounded-2xl border-2 border-white/10 outline-none transition-all cursor-pointer text-sm"
                                >
                                    {months.map((month, index) => (
                                        <option key={month} value={index} className="bg-slate-900 text-white font-bold py-2">
                                            {month}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="z-10 flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
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
                                    <div className="md:col-span-12 flex flex-col gap-3 mb-2">
                                        <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isCouple ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isCouple ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isCouple}
                                                onChange={(e) => setIsCouple(e.target.checked)}
                                                className="hidden"
                                            />
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Registrar como Pareja</span>
                                            {isCouple && <div className="p-1 px-2 border-2 border-pink-100 dark:border-pink-900/30 bg-pink-50 dark:bg-pink-900/10 text-pink-500 dark:text-pink-400 text-[10px] rounded-lg font-black animate-pulse">MODO PAREJA</div>}
                                        </label>
                                    </div>

                                    <div className={isCouple ? "md:col-span-5 flex flex-col gap-2" : "md:col-span-11 flex flex-col gap-2"}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{isCouple ? "Nombre Cónyuge 1" : "Nombre Completo"}</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Ej. Juan Pérez"
                                            className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>

                                    {isCouple && (
                                        <div className="md:col-span-5 flex flex-col gap-2 animate-in slide-in-from-left-4 duration-300">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Cónyuge 2</label>
                                            <input
                                                type="text"
                                                value={partnerName}
                                                onChange={(e) => setPartnerName(e.target.value)}
                                                placeholder="Ej. María Lozano"
                                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="md:col-span-1 flex flex-col gap-2 text-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Comunidad</label>
                                        <input
                                            type="text"
                                            value={newCommunityNumber}
                                            onChange={(e) => setNewCommunityNumber(e.target.value)}
                                            placeholder="N°"
                                            className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-center h-[60px]"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-12 flex items-end mt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white p-4 h-[60px] md:h-full max-h-[60px] rounded-2xl font-black text-sm shadow-xl shadow-green-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                            {loading ? 'GUARDANDO...' : isCouple ? 'REGISTRAR PAREJA' : 'REGISTRAR'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Buscador y Selector de Vista - Ahora debajo del registro */}
                        <div className="flex flex-col xl:flex-row gap-3 md:gap-4 mb-8 print:hidden sticky top-3 z-40 px-1 md:px-0">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar miembro..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-6 py-3 bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 shadow-xl shadow-slate-200/5 transition-all font-bold text-sm md:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                        {/* Resumen de Auditoría */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center group hover:border-emerald-500/30 transition-all">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presentes Hoy</span>
                                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                    {auditLogs.filter(log => log.Fecha === format(new Date(), 'dd/MM/yyyy')).length}
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center group hover:border-rose-500/30 transition-all">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faltas Hoy</span>
                                <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                                    {users.length - auditLogs.filter(log => log.Fecha === format(new Date(), 'dd/MM/yyyy')).length}
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center group hover:border-blue-500/30 transition-all">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Miembros</span>
                                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{users.length}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-10 border-2 border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8 relative z-10">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Periodo:</label>
                                        <div className="relative bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-blue-400 group">
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                                className="w-full bg-transparent text-slate-900 dark:text-white font-black text-sm py-3 pl-4 pr-10 outline-none cursor-pointer appearance-none"
                                            >
                                                {months.map((month, index) => (
                                                    <option key={month} value={index} className="bg-white dark:bg-slate-900">{month} 2026</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                                <ChevronRight className="rotate-90" size={16} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Comunidad:</label>
                                        <div className="relative bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-blue-400 group">
                                            <select
                                                value={selectedAuditCommunity}
                                                onChange={(e) => setSelectedAuditCommunity(e.target.value)}
                                                className="w-full bg-transparent text-slate-900 dark:text-white font-black text-sm py-3 pl-4 pr-10 outline-none cursor-pointer appearance-none"
                                            >
                                                <option value="all" className="bg-white dark:bg-slate-900">Todas</option>
                                                {[...new Set(users.map(u => u.communityNumber).filter(Boolean))].sort().map(num => (
                                                    <option key={num} value={num} className="bg-white dark:bg-slate-900">Com. {num}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                                <ChevronRight className="rotate-90" size={16} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 flex-[2]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Buscar en Auditoría:</label>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Nombre o comunidad..."
                                                value={auditSearch}
                                                onChange={(e) => setAuditSearch(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end pt-1 md:pt-4 gap-2">
                                    <button
                                        onClick={refreshAuditLogs}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                        <span>Actualizar</span>
                                    </button>
                                    <div className="md:hidden flex items-center gap-1.5 px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap">
                                        <ChevronRight size={12} className="animate-pulse text-blue-500" />
                                        <span>Desliza</span>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={auditScrollContainerRef}
                                className={`relative overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-slate-800 custom-scrollbar shadow-inner bg-slate-50/20 dark:bg-black/10 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'} scroll-smooth`}
                            >
                                <table className="w-full text-left border-separate border-spacing-0 min-w-[900px]">
                                    <thead>
                                        <tr>
                                            <th className="py-6 px-3 md:px-8 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white dark:bg-slate-900 z-50 border-b-2 border-slate-100 dark:border-slate-800 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.2)] max-w-[100px] md:max-w-none md:min-w-[250px]">
                                                INTEGRANTE
                                            </th>
                                            <th className="py-6 px-1 md:px-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 min-w-[35px]">
                                                COM.
                                            </th>
                                            {(() => {
                                                const year = 2026;
                                                const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
                                                const dates = [];
                                                const todayStr = format(new Date(), 'dd/MM/yyyy');
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const date = new Date(year, selectedMonth, d);
                                                    if (date.getDay() === 2 || date.getDay() === 6) {
                                                        dates.push({ str: format(date, 'dd/MM/yyyy'), date });
                                                    }
                                                }
                                                return dates.map((date, i) => {
                                                    const isToday = date.str === todayStr;
                                                    return (
                                                        <th
                                                            key={i}
                                                            ref={isToday ? todayRef : null}
                                                            className={`relative group py-6 px-1.5 md:px-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all min-w-[55px] md:min-w-[75px] ${isToday
                                                                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-[inset_0_-2px_0_0_currentColor]'
                                                                : 'text-slate-400 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                                                                }`}
                                                        >
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <span className={isToday ? "scale-125 origin-center font-black" : ""}>{format(date.date, 'dd')}</span>
                                                                <span className="text-[9px] opacity-60 font-black">{format(date.date, 'MMM', { locale: es })}</span>

                                                                <button
                                                                    onClick={() => handleMarkAllPresent(date.str)}
                                                                    className="mt-3 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                                                                    title="Marcar todos como presentes"
                                                                >
                                                                    <Check size={12} strokeWidth={4} />
                                                                </button>
                                                            </div>
                                                        </th>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {(() => {
                                            const sortedUsers = [...users].sort((a, b) => {
                                                const numA = parseInt(a.communityNumber || '999')
                                                const numB = parseInt(b.communityNumber || '999')
                                                if (numA !== numB) return numA - numB
                                                return a.fullName.localeCompare(b.fullName)
                                            }).filter(u => {
                                                const matchesName = u.fullName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                                    (u.communityNumber && u.communityNumber.includes(auditSearch));
                                                const matchesCommunity = selectedAuditCommunity === 'all' || u.communityNumber === selectedAuditCommunity;
                                                return matchesName && matchesCommunity;
                                            });

                                            const processedIds = new Set<number>();
                                            const finalRows: User[] = [];

                                            sortedUsers.forEach(user => {
                                                if (processedIds.has(user.id)) return;
                                                const partner = user.partnerId ? sortedUsers.find(u => u.id === user.partnerId) : null;

                                                if (partner && !processedIds.has(partner.id)) {
                                                    // Determinar orden hombre-mujer si es posible
                                                    // Orden Hombre primero estricto
                                                    const isM1 = user.gender === 'M';
                                                    const isF1 = user.gender === 'F';
                                                    const isM2 = partner.gender === 'M';
                                                    const isF2 = partner.gender === 'F';

                                                    let first = user;
                                                    if ((isM2 && !isM1) || (isF1 && !isF2)) {
                                                        first = partner;
                                                    }
                                                    const second = first === user ? partner : user;

                                                    finalRows.push(first);
                                                    finalRows.push(second);
                                                    processedIds.add(user.id);
                                                    processedIds.add(partner.id);
                                                } else if (!processedIds.has(user.id)) {
                                                    finalRows.push(user);
                                                    processedIds.add(user.id);
                                                }
                                            });

                                            return finalRows.map((user, rowIndex) => {
                                                const year = 2026;
                                                const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
                                                const dates = [];
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const date = new Date(year, selectedMonth, d);
                                                    if (date.getDay() === 2 || date.getDay() === 6) {
                                                        dates.push({ str: format(date, 'dd/MM/yyyy'), date });
                                                    }
                                                }

                                                const isPartOfCouple = !!user.partnerId;
                                                const isFirstOfCouple = isPartOfCouple && (rowIndex === 0 || finalRows[rowIndex - 1].partnerId !== user.id);
                                                const isSecondOfCouple = isPartOfCouple && !isFirstOfCouple;

                                                return (
                                                    <tr
                                                        key={user.id}
                                                        className={`group transition-all duration-300 ${isFirstOfCouple ? 'bg-blue-50/30 dark:bg-blue-900/10' :
                                                            isSecondOfCouple ? 'bg-blue-50/30 dark:bg-blue-900/10' :
                                                                'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                            }`}
                                                    >
                                                        <td className={`py-3 md:py-4 px-2 md:px-8 text-slate-900 dark:text-white font-black text-[10px] md:text-[13px] sticky left-0 z-40 transition-all border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.2)] max-w-[100px] md:max-w-none ${isFirstOfCouple || isSecondOfCouple ? 'bg-[#f8faff] dark:bg-[#0f172a]' : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                                                            }`}>
                                                            <div className="flex items-center gap-1.5 md:gap-3 relative overflow-hidden">
                                                                {isPartOfCouple && (
                                                                    <div className={`absolute -left-3 md:-left-8 w-1 md:w-1.5 transition-all bg-blue-500/50 ${isFirstOfCouple ? 'h-[100%] top-[50%] rounded-t-full' :
                                                                        'h-[100%] bottom-[50%] rounded-b-full'
                                                                        }`} />
                                                                )}
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <span className="truncate block uppercase tracking-tight" title={user.fullName}>{user.fullName}</span>
                                                                    {isFirstOfCouple && <span className="text-[8px] text-blue-500 font-black uppercase mt-0.5 opacity-60 tracking-widest">{user.gender === 'F' ? 'Titular' : 'Titular'}</span>}
                                                                    {isSecondOfCouple && <span className="text-[8px] text-blue-500 font-black uppercase mt-0.5 opacity-60 tracking-widest">{user.gender === 'F' ? 'Cónyuge' : 'Cónyuge'}</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={`py-3 px-2 md:px-4 text-center border-r border-slate-100 dark:border-slate-800 z-30 bg-inherit ${isFirstOfCouple || isSecondOfCouple ? 'bg-blue-50/10 dark:bg-blue-900/5' : ''
                                                            }`}>
                                                            {user.communityNumber && (
                                                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] md:text-[10px] font-black border border-slate-200 dark:border-slate-700">
                                                                    {user.communityNumber}
                                                                </span>
                                                            )}
                                                        </td>
                                                        {dates.map((dateObj, idx) => {
                                                            const isPresent = auditLogs.some(log =>
                                                                log.ID === user.id.toString().padStart(4, '0') &&
                                                                log.Fecha === dateObj.str
                                                            );

                                                            const todayStr = format(new Date(), 'dd/MM/yyyy');
                                                            const isToday = dateObj.str === todayStr;
                                                            const isPast = dateObj.date <= new Date();

                                                            return (
                                                                <td
                                                                    key={idx}
                                                                    className={`py-4 px-2 text-center border-r border-slate-100 dark:border-slate-800 transition-all ${isToday ? 'bg-blue-100/30 dark:bg-blue-900/20' :
                                                                        isFirstOfCouple || isSecondOfCouple ? 'bg-blue-50/5 dark:bg-blue-900/5' : ''
                                                                        }`}
                                                                >
                                                                    {isPresent ? (
                                                                        <button
                                                                            onClick={() => handleDeleteAttendance(user.id, dateObj.str)}
                                                                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-[10px] md:text-[12px] bg-emerald-500 text-white rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-110 transition-all active:scale-95 mx-auto animate-in zoom-in duration-300"
                                                                        >
                                                                            A
                                                                        </button>
                                                                    ) : isPast ? (
                                                                        <button
                                                                            onClick={() => handleManualAttendance(user.qrCode, dateObj.str)}
                                                                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-[10px] md:text-[12px] rounded-xl md:rounded-2xl transition-all mx-auto bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-500 hover:text-white border-2 border-rose-100 dark:border-rose-900/30 active:scale-95"
                                                                        >
                                                                            F
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto opacity-30" />
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            });
                                        })()}
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
                        <div ref={cardsContainerRef} className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 print:grid-cols-2 print:gap-4" : "flex flex-col gap-4"}>
                            {(() => {
                                const processedIds = new Set<number>();
                                const filteredAndSorted = Array.isArray(users) ? [...users].sort((a, b) => {
                                    const numA = parseInt(a.communityNumber || '999')
                                    const numB = parseInt(b.communityNumber || '999')
                                    if (numA !== numB) return numA - numB
                                    return a.fullName.localeCompare(b.fullName)
                                }).filter(u => {
                                    const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                    return matchesName && matchesCommunity;
                                }) : [];

                                return filteredAndSorted.map((user) => {
                                    if (processedIds.has(user.id)) return null;

                                    const partner = user.partnerId ? Array.isArray(users) ? users.find(u => u.id === user.partnerId) : null : null;

                                    let displayUser = user;
                                    let displayPartner = partner;

                                    if (partner) {
                                        // Orden Hombre primero estricto
                                        const isM1 = user.gender === 'M';
                                        const isF1 = user.gender === 'F';
                                        const isM2 = partner.gender === 'M';
                                        const isF2 = partner.gender === 'F';

                                        if ((isM2 && !isM1) || (isF1 && !isF2)) {
                                            displayUser = partner;
                                            displayPartner = user;
                                        }
                                        processedIds.add(partner.id);
                                    }
                                    processedIds.add(user.id);

                                    return (
                                        <div key={displayUser.id} className={viewMode === 'grid'
                                            ? `flex flex-col gap-6 p-6 rounded-[2.5rem] border-2 transition-all ${displayPartner
                                                ? 'bg-blue-50/30 dark:bg-blue-900/5 border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-500/5'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`
                                            : `flex flex-col gap-4 p-4 rounded-2xl border transition-all ${displayPartner
                                                ? 'bg-blue-50/30 dark:bg-blue-900/5 border-blue-200 dark:border-blue-800 shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>

                                            {displayPartner && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Heart size={14} fill="currentColor" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pareja Vinculada</span>
                                                </div>
                                            )}

                                            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6 w-full" : "flex flex-col md:flex-row md:items-center flex-1 gap-6"}>
                                                <div className="flex flex-col gap-4 flex-1 min-w-0">
                                                    <MemberCard user={displayUser} viewMode={viewMode} />
                                                    <MemberActions
                                                        user={displayUser}
                                                        viewMode={viewMode}
                                                        downloadingId={downloadingId}
                                                        onShare={handleShareCard}
                                                        onEdit={openEditModal}
                                                        onDownload={handleDownloadImage}
                                                        onDelete={handleDeleteUser}
                                                        hideEditDelete={!!displayPartner}
                                                    />
                                                </div>
                                                {displayPartner && (
                                                    <div className="flex flex-col gap-4 flex-1 min-w-0 relative">
                                                        <MemberCard user={displayPartner} viewMode={viewMode} isPartner />
                                                        <MemberActions
                                                            user={displayPartner}
                                                            viewMode={viewMode}
                                                            downloadingId={downloadingId}
                                                            onShare={handleShareCard}
                                                            onEdit={openEditModal}
                                                            onDownload={handleDownloadImage}
                                                            onDelete={handleDeleteUser}
                                                            hideEditDelete={true}
                                                        />
                                                    </div>
                                                )}
                                                {displayPartner && (
                                                    <div className={viewMode === 'list' ? "ml-auto pl-4 border-l border-slate-100 dark:border-slate-800" : "col-span-1 md:col-span-2 flex justify-center mt-2"}>
                                                        <MemberActions
                                                            user={displayUser}
                                                            viewMode={viewMode}
                                                            downloadingId={null}
                                                            onShare={() => { }}
                                                            onEdit={openEditModal}
                                                            onDownload={() => { }}
                                                            onDelete={handleDeleteUser}
                                                            onlyEditDelete={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean);
                            })()}
                            {/* Paginación */}
                            {Array.isArray(users) && users.filter(u => {
                                const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                return matchesName && matchesCommunity;
                            }).length > itemsPerPage && (
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-12 pb-10">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {Array.from({
                                                    length: Math.ceil(users.filter(u => {
                                                        const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                                        const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                                        return matchesName && matchesCommunity;
                                                    }).length / itemsPerPage)
                                                }, (_, i) => i + 1).map(page => {
                                                    // Mostrar solo algunas páginas si hay demasiadas
                                                    const totalPages = Math.ceil(users.filter(u => {
                                                        const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                                        const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                                        return matchesName && matchesCommunity;
                                                    }).length / itemsPerPage);

                                                    if (
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`w-11 h-11 rounded-2xl font-black text-sm transition-all border ${currentPage === page
                                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    } else if (
                                                        (page === 2 && currentPage > 3) ||
                                                        (page === totalPages - 1 && currentPage < totalPages - 2)
                                                    ) {
                                                        return <span key={page} className="px-1 text-slate-400">...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>

                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.filter(u => {
                                                    const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                                    return matchesName && matchesCommunity;
                                                }).length / itemsPerPage), prev + 1))}
                                                disabled={currentPage === Math.ceil(users.filter(u => {
                                                    const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                                    return matchesName && matchesCommunity;
                                                }).length / itemsPerPage)}
                                                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                            Página {currentPage} de {Math.ceil(users.filter(u => {
                                                const matchesName = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                                                const matchesCommunity = selectedCommunity === 'all' || u.communityNumber === selectedCommunity;
                                                return matchesName && matchesCommunity;
                                            }).length / itemsPerPage)}
                                        </span>
                                    </div>
                                )}
                        </div>
                    )}

                {
                    activeTab === 'members' && users.length === 0 && (
                        <p className="text-center text-gray-500 mt-10">No hay miembros registrados aún.</p>
                    )
                }
            </div>

            {/* Modal de Edición */}
            {
                editingUser && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 md:p-10 border-2 border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300 relative z-[210] my-8">
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

                                <div className="flex flex-col gap-2 p-4 bg-pink-50/50 dark:bg-pink-900/5 rounded-2xl border border-pink-100 dark:border-pink-900/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Heart size={14} className="text-pink-500" fill="currentColor" />
                                        <label className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest leading-none">Cónyuge / Pareja</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={editPartnerName}
                                        onChange={(e) => setEditPartnerName(e.target.value)}
                                        className="p-4 rounded-xl border-2 border-white dark:border-slate-800 dark:bg-slate-950 focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                        placeholder="Nombre de la pareja"
                                    />
                                    {!editPartnerId && editPartnerName && (
                                        <p className="text-[9px] font-black text-pink-500 uppercase tracking-tight animate-pulse ml-1">Vincular como Nueva Pareja</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">N° Comunidad</label>
                                        <input
                                            type="text"
                                            value={editCommunityNumber}
                                            onChange={(e) => setEditCommunityNumber(e.target.value)}
                                            className="p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>


                                <div className="flex flex-wrap sm:flex-nowrap gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 py-4 rounded-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase text-[10px] tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] sm:flex-[3] bg-blue-600 text-white py-4 px-6 sm:px-8 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 text-[10px] sm:text-xs tracking-widest"
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

// --- SUB-COMPONENTES PARA LA LISTA ---
function MemberCard({ user, viewMode, isPartner }: { user: User, viewMode: 'grid' | 'list', isPartner?: boolean }) {
    return (
        <div className={viewMode === 'list' ? "flex items-center gap-3 md:gap-4 min-w-0 flex-1" : "flex flex-col w-full"}>
            {/* Hidden Card for capture (Always present in DOM but hidden from view if in list mode) */}
            <div className={viewMode === 'grid' ? "mb-4" : "absolute -left-[9999px] top-0 opacity-0 pointer-events-none"}>
                <div
                    id={`card-${user.id}`}
                    className="card-to-pdf bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4 break-inside-avoid print:border-black print:shadow-none mx-auto"
                    style={{ backgroundColor: '#ffffff', border: '2px solid #f3f4f6', minWidth: '300px', maxWidth: '300px' }}
                >
                    <div className="w-full border-b pb-3 text-center" style={{ borderBottomColor: '#f3f4f6' }}>
                        <h3 className="font-bold text-lg text-gray-800 uppercase tracking-wide truncate" style={{ color: '#1f2937' }}>{user.fullName}</h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter" style={{ color: isPartner ? '#db2777' : '#3b82f6', backgroundColor: isPartner ? '#fdf2f8' : '#eff6ff' }}>
                                {isPartner ? 'Cónyuge' : 'Miembro Activo'}
                            </span>
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

            {viewMode === 'list' && (
                <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-2xl flex-shrink-0 border border-blue-100/50 dark:border-blue-800/30">
                        <QRCodeSVG value={user.qrCode} size={40} />
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden">
                        <h3 className="font-bold text-slate-900 dark:text-white uppercase text-sm md:text-base leading-tight truncate">
                            {user.fullName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isPartner ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}>
                                ID: {user.id.toString().padStart(4, '0')}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function MemberActions({
    user,
    viewMode,
    downloadingId,
    onShare,
    onEdit,
    onDownload,
    onDelete,
    hideEditDelete = false,
    onlyEditDelete = false
}: {
    user: User,
    viewMode: 'grid' | 'list',
    downloadingId: number | null,
    onShare: (u: User) => void,
    onEdit: (u: User) => void,
    onDownload: (u: User) => void,
    onDelete: (u: User) => void,
    hideEditDelete?: boolean,
    onlyEditDelete?: boolean
}) {
    return (
        <div className={viewMode === 'list' ? "flex items-center gap-1.5 print:hidden ml-auto" : "flex flex-col gap-2 w-full"}>
            {!onlyEditDelete && (
                <div className={viewMode === 'list' ? "flex items-center gap-1.5" : "flex flex-col gap-2"}>
                    <div className={viewMode === 'list' ? "flex items-center gap-1.5" : "grid grid-cols-2 gap-2"}>
                        <button
                            onClick={() => onShare(user)}
                            disabled={downloadingId !== null}
                            className={viewMode === 'list'
                                ? "p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                                : "flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 active:scale-95 transition-all disabled:opacity-50 w-full"}
                            title="Compartir por WhatsApp"
                        >
                            {downloadingId === user.id ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                            {viewMode === 'grid' && "Enviar"}
                        </button>

                        <button
                            onClick={() => onDownload(user)}
                            disabled={downloadingId !== null}
                            className={viewMode === 'list'
                                ? "p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 disabled:opacity-50"
                                : "flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 w-full"}
                            title="Descargar Carnet"
                        >
                            {downloadingId === user.id ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                            {viewMode === 'grid' && "Carnet"}
                        </button>
                    </div>

                    {!user.partnerId && (
                        <button
                            onClick={() => onEdit(user)}
                            className={viewMode === 'list'
                                ? "p-2.5 bg-pink-50 dark:bg-pink-900/10 text-pink-500 rounded-xl hover:bg-pink-100 transition-all active:scale-95"
                                : "flex items-center justify-center gap-2 bg-pink-50 dark:bg-pink-900/10 text-pink-600 dark:text-pink-400 py-3 rounded-xl font-bold text-sm hover:bg-pink-100 transition-all active:scale-95 w-full"}
                            title="Agregar Pareja"
                        >
                            <Heart size={18} fill={viewMode === 'grid' ? "currentColor" : "none"} />
                            {viewMode === 'grid' && "Agregar Pareja"}
                        </button>
                    )}
                </div>
            )}

            <div className={viewMode === 'list' ? "flex items-center gap-1.5" : "grid grid-cols-2 gap-2 w-full"}>
                {(!hideEditDelete || onlyEditDelete) && (
                    <>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit(user);
                            }}
                            className={viewMode === 'list'
                                ? "p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 cursor-pointer"
                                : "flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200 cursor-pointer"}
                            title="Editar"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(user)}
                            className={viewMode === 'list'
                                ? "p-2.5 bg-slate-100 dark:bg-slate-800 text-rose-500/70 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
                                : "flex items-center justify-center bg-rose-50 dark:bg-rose-900/10 text-rose-500 py-3 rounded-xl hover:bg-rose-100 transition-all"}
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
