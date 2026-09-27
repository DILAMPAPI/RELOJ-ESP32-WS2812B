import React, { useState } from 'react';
import { FLUTTER_PROJECT_FILES, FlutterFile, downloadFlutterZip } from '../services/flutterCodeRepository';
import { Download, Copy, Check, X, FileCode, Folder, Terminal, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlutterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterExportModal: React.FC<FlutterExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(FLUTTER_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadFlutterZip();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>Código Fuente Flutter (Material 3)</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  Dart 3 + BLE
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Estructura completa lista para Android Studio, VS Code y compilación nativa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Generando ZIP...' : 'Descargar Proyecto (.ZIP)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Explorer & Code View */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-stone-900">
          {/* File Tree Sidebar */}
          <div className="w-full md:w-72 border-r border-stone-800 p-3 overflow-y-auto space-y-1 bg-stone-950/60 shrink-0">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>Archivos del Proyecto</span>
            </div>

            {FLUTTER_PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="text-[10px] text-stone-500 uppercase ml-1 shrink-0">
                    {file.category}
                  </span>
                </button>
              );
            })}

            {/* Instrucciones de ejecución */}
            <div className="mt-4 p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2 text-[11px]">
              <div className="font-bold text-stone-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Ejecutar en terminal:</span>
              </div>
              <div className="bg-black p-2 rounded-lg font-mono text-[10px] text-stone-400 space-y-1">
                <div>$ flutter pub get</div>
                <div>$ flutter run</div>
              </div>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col min-w-0 bg-black/60">
            {/* Sub-header with file path and copy */}
            <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs">
              <span className="font-mono text-stone-300 font-semibold truncate">
                {selectedFile.path}
              </span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1.5 transition-colors font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Archivo'}</span>
              </button>
            </div>

            {/* Code lines */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-stone-200 selection:bg-amber-500/30 leading-relaxed">
              <pre className="whitespace-pre">
                <code>{selectedFile.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
