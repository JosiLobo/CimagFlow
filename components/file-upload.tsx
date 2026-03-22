"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, File, Loader2, FileText, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  fileName: string;
  cloud_storage_path: string;
  size: number;
  type: string;
}

interface FileUploadProps {
  onFilesChange: (files: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  publicUpload?: boolean;
}

const ALLOWED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-600' },
  'application/msword': { icon: FileText, label: 'DOC', color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'DOCX', color: 'text-blue-600' },
  'application/vnd.ms-excel': { icon: FileSpreadsheet, label: 'XLS', color: 'text-green-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, label: 'XLSX', color: 'text-green-600' },
  'image/jpeg': { icon: ImageIcon, label: 'JPG', color: 'text-purple-600' },
  'image/png': { icon: ImageIcon, label: 'PNG', color: 'text-purple-600' },
  'image/gif': { icon: ImageIcon, label: 'GIF', color: 'text-purple-600' },
  'image/webp': { icon: ImageIcon, label: 'WEBP', color: 'text-purple-600' },
  'text/plain': { icon: File, label: 'TXT', color: 'text-gray-600' },
  'application/zip': { icon: File, label: 'ZIP', color: 'text-orange-600' },
  'application/x-rar-compressed': { icon: File, label: 'RAR', color: 'text-orange-600' },
};

export default function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  publicUpload = false,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    const config = ALLOWED_TYPES[type as keyof typeof ALLOWED_TYPES];
    if (!config) return { icon: File, label: 'FILE', color: 'text-gray-600' };
    return config;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validar número máximo de arquivos
    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        // Validar tamanho
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
          toast.error(`${file.name} excede o tamanho máximo de ${maxSizeMB}MB`);
          continue;
        }

        // Validar tipo
        if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
          toast.error(`Tipo de arquivo não permitido: ${file.name}`);
          continue;
        }

        let finalUrl = '';

        // Tentar upload via presigned URL (S3)
        let s3Success = false;
        try {
          const endpoint = publicUpload
            ? '/api/upload/presigned-public'
            : '/api/upload/presigned';

          const presignedRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              isPublic: true,
            }),
          });

          if (presignedRes.ok) {
            const presignedData = await presignedRes.json();
            const { uploadUrl, cloud_storage_path } = presignedData;

            const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            });

            if (uploadRes.ok) {
              finalUrl = cloud_storage_path;
              s3Success = true;
            }
          }
        } catch (s3Err) {
          console.warn('S3 presigned upload failed, trying direct upload:', s3Err);
        }

        // Fallback: upload direto via servidor
        if (!s3Success) {
          const formData = new FormData();
          formData.append('file', file);

          const directEndpoint = publicUpload
            ? '/api/upload/direct-public'
            : '/api/upload/direct-public';

          const directRes = await fetch(directEndpoint, {
            method: 'POST',
            body: formData,
          });

          if (!directRes.ok) {
            const error = await directRes.json();
            throw new Error(error.error || 'Erro ao fazer upload do arquivo');
          }

          const directData = await directRes.json();
          finalUrl = directData.fileUrl;
        }

        // Adicionar à lista
        const newFile: UploadedFile = {
          fileName: file.name,
          cloud_storage_path: finalUrl,
          size: file.size,
          type: file.type,
        };

        setUploadedFiles(prev => {
          const updated = [...prev, newFile];
          onFilesChange(updated.map(f => f.cloud_storage_path));
          return updated;
        });

        toast.success(`${file.name} enviado com sucesso`);
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      // Limpar input
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange(updated.map(f => f.cloud_storage_path));
      return updated;
    });
    toast.success('Arquivo removido');
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={uploading || uploadedFiles.length >= maxFiles}
          onClick={() => document.getElementById('file-upload')?.click()}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Anexar Arquivos
            </>
          )}
        </Button>
        
        <div className="text-sm text-gray-500">
          {uploadedFiles.length}/{maxFiles} arquivo(s) • Máx. {maxSizeMB}MB cada
        </div>

        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Tipos aceitos */}
      <div className="text-xs text-gray-500">
        Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, imagens (JPG, PNG, GIF), TXT, ZIP, RAR
      </div>

      {/* Lista de arquivos */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => {
            const { icon: Icon, label, color } = getFileIcon(file.type);
            
            return (
              <Card key={index} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="uppercase font-semibold">{label}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
