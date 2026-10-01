import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Download,
  Eye,
  Trash2,
  Edit,
  Search,
  Folder,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  X,
  ExternalLink,
  Calendar,
  User,
  Tag,
  Grid,
  List,
  Paperclip,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectAttachment, ProjectAttachmentCategory } from '../../types';
import {
  ATTACHMENT_CATEGORY_MAP,
  getAttachmentCategoryInfo,
  formatFileSize,
  formatDate,
} from '../../utils/formatters';

interface ProjectAttachmentsTabProps {
  project: Project;
}

export const ProjectAttachmentsTab: React.FC<ProjectAttachmentsTabProps> = ({ project }) => {
  const { db, currentUser, addProjectAttachment, updateProjectAttachment, deleteProjectAttachment } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProjectAttachmentCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<ProjectAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ProjectAttachment | null>(null);

  // Upload Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProjectAttachmentCategory>('blueprint');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formNotes, setFormNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachments for this project
  const projectAttachments = useMemo(() => {
    return (db.attachments || []).filter(a => a.projectId === project.id);
  }, [db.attachments, project.id]);

  // Filtered attachments
  const filteredAttachments = useMemo(() => {
    return projectAttachments.filter(att => {
      // Category filter
      if (selectedCategory !== 'all' && att.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = att.name.toLowerCase().includes(q);
        const origMatch = att.originalName.toLowerCase().includes(q);
        const notesMatch = att.notes ? att.notes.toLowerCase().includes(q) : false;
        const uploaderMatch = att.uploadedBy.toLowerCase().includes(q);
        if (!nameMatch && !origMatch && !notesMatch && !uploaderMatch) return false;
      }
      return true;
    });
  }, [projectAttachments, selectedCategory, searchQuery]);

  // Stats
  const totalFiles = projectAttachments.length;
  const totalSizeBytes = projectAttachments.reduce((s, a) => s + (a.sizeBytes || 0), 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes);
  const contractsCount = projectAttachments.filter(a => a.category === 'contract').length;
  const blueprintsCount = projectAttachments.filter(a => a.category === 'blueprint').length;
  const specsCount = projectAttachments.filter(a => a.category === 'specifications').length;
  const actsCount = projectAttachments.filter(a => a.category === 'acceptance_act').length;

  // File type icon and color helper
  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['pdf'].includes(ext)) {
      return { icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
    }
    if (['dwg', 'dxf', 'cad'].includes(ext)) {
      return { icon: FileCode, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      return { icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
    }
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return { icon: FileSpreadsheet, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' };
    }
    return { icon: Paperclip, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' };
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formName) {
        // Strip extension from display name
        const dotIdx = file.name.lastIndexOf('.');
        const cleanName = dotIdx > 0 ? file.name.substring(0, dotIdx).replace(/_/g, ' ') : file.name;
        setFormName(cleanName);
      }

      // Auto-detect category based on extension or keywords
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['dwg', 'dxf'].includes(ext) || file.name.includes('مخطط') || file.name.includes('لوحة')) {
        setFormCategory('blueprint');
      } else if (file.name.includes('عقد') || file.name.includes('اتفاقية')) {
        setFormCategory('contract');
      } else if (file.name.includes('مواصفات') || file.name.includes('شروط')) {
        setFormCategory('specifications');
      } else if (file.name.includes('محضر') || file.name.includes('استلام')) {
        setFormCategory('acceptance_act');
      }

      // Read as Data URL for preview if small
      if (file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedFileDataUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedFileDataUrl('');
      }
    }
  };

  // Open upload modal with template
  const handleOpenUploadWithTemplate = (templateName: string, category: ProjectAttachmentCategory) => {
    setFormName(templateName);
    setFormCategory(category);
    setFormVersion('v1.0');
    setFormNotes('');
    setSelectedFile(null);
    setSelectedFileDataUrl('');
    setUploadModalOpen(true);
  };

  // Handle upload submit
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let originalName = selectedFile ? selectedFile.name : `${formName.trim().replace(/\s+/g, '_')}.pdf`;
    let fileExtension = originalName.split('.').pop()?.toLowerCase() || (formCategory === 'blueprint' ? 'dwg' : 'pdf');
    let sizeBytes = selectedFile ? selectedFile.size : 2500000;
    let sizeFormatted = formatFileSize(sizeBytes);
    let fileType = selectedFile ? selectedFile.type : formCategory === 'blueprint' ? 'application/acad' : 'application/pdf';

    addProjectAttachment({
      projectId: project.id,
      name: formName.trim(),
      originalName,
      category: formCategory,
      fileType,
      fileExtension,
      sizeBytes,
      sizeFormatted,
      fileUrl: selectedFileDataUrl || undefined,
      uploadedBy: currentUser?.name || 'م. المشرف',
      notes: formNotes.trim() || undefined,
      version: formVersion.trim() || 'v1.0',
    });

    // Reset and close
    setUploadModalOpen(false);
    setFormName('');
    setFormCategory('blueprint');
    setFormVersion('v1.0');
    setFormNotes('');
    setSelectedFile(null);
    setSelectedFileDataUrl('');
  };

  // Handle edit submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttachment || !formName.trim()) return;

    updateProjectAttachment(editingAttachment.id, {
      name: formName.trim(),
      category: formCategory,
      version: formVersion.trim(),
      notes: formNotes.trim() || undefined,
    });

    setEditingAttachment(null);
  };

  // Download simulation
  const handleDownload = (att: ProjectAttachment) => {
    const filename = att.originalName.endsWith(`.${att.fileExtension}`)
      ? att.originalName
      : `${att.name}.${att.fileExtension}`;

    if (att.fileUrl && att.fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = att.fileUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Generate lightweight mock blob for download
    const blobContent = `Osboha Electric Document\nProject: ${project.name} (${project.code})\nAttachment: ${att.name}\nCategory: ${att.category}\nVersion: ${att.version || 'v1.0'}\nUploaded by: ${att.uploadedBy}\nUploaded at: ${att.uploadedAt}`;
    const blob = new Blob([blobContent], { type: att.fileType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header and KPI summary banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Folder className="w-4 h-4 text-emerald-700" />
                <span>مرفقات ومستندات المشروع ({totalFiles})</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                إجمالي الحجم: {totalSizeFormatted}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              رفع وأرشفة العقود الرسمية المعتمدة، المخططات الهندسية التنفيذية (CAD/DWG)، كراسات المواصفات، ومحاضر الاستلام
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormName('');
              setFormCategory('blueprint');
              setFormVersion('v1.0');
              setFormNotes('');
              setSelectedFile(null);
              setSelectedFileDataUrl('');
              setUploadModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع مرفق أو مخطط جديد</span>
          </button>
        </div>

        {/* 4 Category Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="p-2.5 bg-purple-50/60 border border-purple-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <div>
                <span className="text-[10px] text-purple-700 block font-medium">العقود الرسمية</span>
                <span className="font-bold text-purple-900 font-mono text-sm">{contractsCount} ملف</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📐</span>
              <div>
                <span className="text-[10px] text-blue-700 block font-medium">المخططات الهندسية</span>
                <span className="font-bold text-blue-900 font-mono text-sm">{blueprintsCount} مخطط</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <div>
                <span className="text-[10px] text-amber-700 block font-medium">المواصفات الفنية</span>
                <span className="font-bold text-amber-900 font-mono text-sm">{specsCount} كراسة</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📝</span>
              <div>
                <span className="text-[10px] text-emerald-700 block font-medium">محاضر الاستلام</span>
                <span className="font-bold text-emerald-900 font-mono text-sm">{actsCount} محضر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>كافة المرفقات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {totalFiles}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('contract')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'contract'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100'
            }`}
          >
            <span>📄 العقود</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === 'contract' ? 'bg-purple-800 text-purple-100' : 'bg-purple-200 text-purple-900'
            }`}>
              {contractsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('blueprint')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'blueprint'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100'
            }`}
          >
            <span>📐 المخططات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === 'blueprint' ? 'bg-blue-800 text-blue-100' : 'bg-blue-200 text-blue-900'
            }`}>
              {blueprintsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('specifications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'specifications'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <span>📋 المواصفات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === 'specifications' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200 text-amber-900'
            }`}>
              {specsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('acceptance_act')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'acceptance_act'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <span>📝 محاضر الاستلام</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === 'acceptance_act' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-200 text-emerald-900'
            }`}>
              {actsCount}
            </span>
          </button>
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px] w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في المرفقات والمخططات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كبطاقات شبكية"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كجدول"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Attachments List */}
      {filteredAttachments.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-dashed border-slate-200 rounded-xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              {searchQuery || selectedCategory !== 'all'
                ? 'لا توجد مستندات تطابق الفلترة المحددة'
                : 'لم يتم رفع مرفقات أو مخططات لهذا المشروع حتى الآن'}
            </h4>
            <p className="text-slate-500 mt-1 max-w-md mx-auto">
              يمكنك رفع وثائق العقود، مخططات الأوتوكاد (DWG)، المواصفات الفنية، وتصاريح العمل وحفظها داخل المشروع.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleOpenUploadWithTemplate('عقد المقاولة الرئيسي المعتمد', 'contract')}
              className="px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors flex items-center gap-1 border border-purple-200"
            >
              <span>+ إضافة عقد المقاولة</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenUploadWithTemplate('مخطط التمديدات الكهربائية التنفيذي', 'blueprint')}
              className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-1 border border-blue-200"
            >
              <span>+ إضافة مخطط هندسي</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenUploadWithTemplate('محضر الاستلام الابتدائي', 'acceptance_act')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1 border border-emerald-200"
            >
              <span>+ إضافة محضر استلام</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAttachments.map(att => {
            const catInfo = getAttachmentCategoryInfo(att.category);
            const { icon: FileIconComponent, color: iconColor, bg: iconBg } = getFileIcon(att.fileExtension);

            return (
              <div
                key={att.id}
                className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Icon + Category Badge + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                        <FileIconComponent className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${catInfo.badgeClass}`}>
                          <span>{catInfo.emoji}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-slate-100 transition-colors"
                        title="معاينة المرفق"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(att)}
                        className="p-1.5 text-slate-400 hover:text-blue-700 rounded-md hover:bg-slate-100 transition-colors"
                        title="تحميل الملف"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttachment(att);
                          setFormName(att.name);
                          setFormCategory(att.category);
                          setFormVersion(att.version || 'v1.0');
                          setFormNotes(att.notes || '');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
                        title="تعديل التفاصيل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف المرفق "${att.name}"؟`)) {
                            deleteProjectAttachment(att.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        title="حذف المرفق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Attachment Title & Original Name */}
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2" title={att.name}>
                    {att.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono truncate" title={att.originalName}>
                    <span className="uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                      {att.fileExtension}
                    </span>
                    <span className="truncate">{att.originalName}</span>
                  </div>

                  {/* Notes if any */}
                  {att.notes && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-2 border border-slate-100">
                      {att.notes}
                    </p>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5 font-sans">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{att.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {att.version && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {att.version}
                      </span>
                    )}
                    <span className="font-bold text-slate-700">{att.sizeFormatted}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">نوع الملف</th>
                  <th className="py-2.5 px-3">اسم المستند / المرفق</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3">الإصدار</th>
                  <th className="py-2.5 px-3">الحجم</th>
                  <th className="py-2.5 px-3">المسؤول / الرافع</th>
                  <th className="py-2.5 px-3">تاريخ الرفع</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttachments.map(att => {
                  const catInfo = getAttachmentCategoryInfo(att.category);
                  const { icon: FileIconComponent, color: iconColor } = getFileIcon(att.fileExtension);

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FileIconComponent className={`w-4 h-4 ${iconColor}`} />
                          <span className="font-mono uppercase font-bold text-[10px] text-slate-500">
                            {att.fileExtension}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{att.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{att.originalName}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${catInfo.badgeClass}`}>
                          <span>{catInfo.emoji}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {att.version || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {att.sizeFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {att.uploadedBy}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(att.uploadedAt)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-slate-100"
                            title="معاينة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(att)}
                            className="p-1.5 text-slate-400 hover:text-blue-700 rounded hover:bg-slate-100"
                            title="تحميل"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAttachment(att);
                              setFormName(att.name);
                              setFormCategory(att.category);
                              setFormVersion(att.version || 'v1.0');
                              setFormNotes(att.notes || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف المرفق "${att.name}"؟`)) {
                                deleteProjectAttachment(att.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD ATTACHMENT MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>رفع مستند أو مخطط هندسي للمشروع</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مشروع: {project.name} ({project.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag & Drop File Picker Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx,.zip"
                />
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">{selectedFile.name}</span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {formatFileSize(selectedFile.size)} · تم اختياره بنجاح
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      انقر لاختيار ملف أو قم بسحبه وإفلاته هنا
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      يدعم ملفات PDF، مخططات أوتوكاد DWG/DXF، الصور، كشوفات الإكسل حتى 50 ميجابايت
                    </span>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم أو عنوان المستند <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عقد المقاولة المعتمد، أو مخطط شبكة التغذية E-01"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Category & Version Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تصنيف المستند <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ProjectAttachmentCategory)}
                    className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="contract">📄 عقد رسمي / اتفاقية</option>
                    <option value="blueprint">📐 مخطط هندسي / لوحات CAD</option>
                    <option value="specifications">📋 مواصفات فنية وكراسة شروط</option>
                    <option value="acceptance_act">📝 محضر استلام / تسليم</option>
                    <option value="financial_invoice">💼 مستند مالي / إشعار بنكي</option>
                    <option value="permit">🏛️ تصريح / رخصة معتمدة</option>
                    <option value="other">📁 مستند عام آخر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الإصدار (Version)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: v1.0 أو مسودة نهائية"
                    value={formVersion}
                    onChange={e => setFormVersion(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات أو وصف إضافي للمستند
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: معتمد من الاستشاري المهندس، أو بانتظار توقيع الطرف الثاني..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Quick Template suggestions */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-600 block">نماذج شائعة وسريعة:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('عقد المقاولة والأعمال الكهربائية');
                      setFormCategory('contract');
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-purple-900"
                  >
                    📄 عقد المقاولة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('مخطط لوحات التوزيع وقواطع الجهد المنخفض');
                      setFormCategory('blueprint');
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-blue-900"
                  >
                    📐 مخطط التوزيع E-01
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('محضر الفحص الفني والاستلام الميداني');
                      setFormCategory('acceptance_act');
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-emerald-900"
                  >
                    📝 محضر فحص الموقع
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>تأكيد الرفع والأرشفة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATTACHMENT MODAL */}
      {editingAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-700" />
                <span>تعديل بيانات المرفق</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم أو عنوان المستند</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ProjectAttachmentCategory)}
                    className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="contract">📄 عقد رسمي</option>
                    <option value="blueprint">📐 مخطط هندسي</option>
                    <option value="specifications">📋 مواصفات فنية</option>
                    <option value="acceptance_act">📝 محضر استلام</option>
                    <option value="financial_invoice">💼 مستند مالي</option>
                    <option value="permit">🏛️ تصريح وموافقة</option>
                    <option value="other">📁 مستند عام</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الإصدار</label>
                  <input
                    type="text"
                    value={formVersion}
                    onChange={e => setFormVersion(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات المستند</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAttachment(null)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewAttachment.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{previewAttachment.originalName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              {previewAttachment.fileUrl && previewAttachment.fileType.startsWith('image/') ? (
                <img
                  src={previewAttachment.fileUrl}
                  alt={previewAttachment.name}
                  className="max-h-64 mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                />
              ) : (
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-emerald-700">
                    {previewAttachment.category === 'blueprint' ? (
                      <FileCode className="w-8 h-8 text-blue-600" />
                    ) : previewAttachment.category === 'contract' ? (
                      <FileText className="w-8 h-8 text-purple-600" />
                    ) : (
                      <Folder className="w-8 h-8 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {previewAttachment.category === 'blueprint'
                      ? 'مخطط أوتوكاد تنفيذي هندسي (CAD Engineering Schematic)'
                      : 'مستند مؤرشف وموثق رقمياً'}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    تم توثيق هذا الملف ضمن المستندات الهندسية والرسمية للمشروع بواسطة منصة Osboha Electric لإدارة المشاريع والمالية والأرباح.
                  </p>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">التصنيف:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {getAttachmentCategoryInfo(previewAttachment.category).label}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">الإصدار:</span>
                <span className="font-bold text-slate-900">{previewAttachment.version || 'v1.0'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">حجم الملف:</span>
                <span className="font-bold text-slate-900">{previewAttachment.sizeFormatted}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">تاريخ الرفع:</span>
                <span className="font-bold text-slate-900">{formatDate(previewAttachment.uploadedAt)}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 block font-sans">المسؤول عن الرفع:</span>
                <span className="font-bold text-slate-800 font-sans">{previewAttachment.uploadedBy}</span>
              </div>
              {previewAttachment.notes && (
                <div className="col-span-2 pt-1 border-t border-slate-200 font-sans">
                  <span className="text-[10px] text-slate-500 block">الملاحظات:</span>
                  <p className="text-slate-700 text-[11px] mt-0.5">{previewAttachment.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => handleDownload(previewAttachment)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الملف الأصلي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
