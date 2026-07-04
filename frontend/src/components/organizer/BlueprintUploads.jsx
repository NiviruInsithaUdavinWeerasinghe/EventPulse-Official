import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Map, 
  Trash2, 
  Eye, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BlueprintUploads() {
  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlueprints = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.success) {
          // Map events that contain floorMap images to our blueprint format
          const mapped = data.data
            .filter(e => e.floorMapUrl)
            .map(e => ({
              id: `MAP-${e._id.substring(18)}`,
              name: `${e.name} Layout Blueprint`,
              event: e.name,
              eventId: e._id,
              dimensions: "Vector Scale",
              fileSize: "N/A",
              format: "SVG/Image",
              stallsMapped: 30,
              status: "Verified",
              uploadDate: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "Just now",
            }));
          setBlueprints(mapped);
        }
      } catch (err) {
        console.error("Blueprint fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlueprints();
  }, []);

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateUpload(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0].name);
    }
  };

  const simulateUpload = (fileName) => {
    setIsUploading(true);
    setTimeout(() => {
      const newMap = {
        id: `MAP-${400 + blueprints.length + 1}`,
        name: fileName.replace(/\.[^/.]+$/, "") + " Layout",
        event: "Unassigned Event",
        dimensions: "2000 x 1500 px",
        fileSize: "3.4 MB",
        format: fileName.split('.').pop().toUpperCase() || "SVG",
        stallsMapped: 0,
        status: "Draft",
        uploadDate: new Date().toLocaleString('en-US', { hour12: true, month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      setBlueprints([newMap, ...blueprints]);
      setIsUploading(false);
    }, 1500);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this blueprint layout? Any stall linkages on this map will be dropped.")) {
      setBlueprints(blueprints.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Blueprint / Map Uploads</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Upload vector SVG drawings, PNG diagrams, or layouts and define interactive stall coordinates.</p>
      </div>

      {/* ── Large Drag-and-Drop Area ────────────────────────── */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 scale-[0.99]' 
            : 'border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/10 hover:border-slate-300 dark:hover:border-zinc-800'
        } ${isUploading ? 'pointer-events-none' : ''}`}
      >
        <input 
          type="file" 
          id="file-upload" 
          multiple={false} 
          accept=".svg,.png,.jpg,.jpeg"
          className="hidden" 
          onChange={handleFileChange} 
        />
        
        <div className="max-w-md mx-auto space-y-4">
          {isUploading ? (
            <div className="py-6 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Processing layout file...</p>
                <p className="text-xs text-slate-400">Extracting vectors and configuring canvas layers</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                <Upload size={26} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Drag and drop your event layout blueprint file here, or{' '}
                  <label htmlFor="file-upload" className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-extrabold">
                    browse files
                  </label>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Supports SVG (recommended for interactive mapping), PNG, or JPG up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Grid of Uploaded blueprints ───────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Active Blueprints Layouts</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blueprints.map((bp) => (
            <div 
              key={bp.id} 
              className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700/80 transition-all duration-200"
            >
              {/* Simulated Map Preview Container */}
              <div className="h-44 bg-slate-100 dark:bg-zinc-950 relative flex items-center justify-center p-4 overflow-hidden border-b border-slate-100 dark:border-zinc-850">
                {/* Visual Grid Mock */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
                
                {/* Graphic Placeholders for Stalls */}
                <div className="relative border border-dashed border-indigo-500/30 rounded-lg p-6 bg-white/50 dark:bg-zinc-900/30 text-center w-full max-w-[200px] shadow-2xs">
                  <Map size={24} className="mx-auto text-indigo-400/80 mb-1" />
                  <span className="text-[10px] font-bold text-indigo-600/80 dark:text-indigo-400/80 block">{bp.format} Layout Map</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{bp.dimensions}</span>
                </div>

                {/* Tag info overlay */}
                <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {bp.id}
                </span>

                <span className={`absolute top-3 right-3 text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                  bp.status === 'Verified' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {bp.status}
                </span>
              </div>

              {/* Blueprint details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white leading-tight truncate">{bp.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal flex items-center gap-1">
                    <CheckCircle size={12} className="text-slate-400" />
                    <span>Linked to: <strong>{bp.event}</strong></span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 text-[10px] font-semibold text-slate-500">
                  <div>
                    <span className="block text-slate-400">FILE DETAILS</span>
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold">{bp.fileSize} • {bp.format}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">STALLS COUNT</span>
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold">{bp.stallsMapped} positions mapped</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    onClick={() => navigate(`/map-viewer/${bp.eventId}`)}
                    title="Open layout mapper editor"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 font-bold text-[11px] py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Maximize2 size={12} />
                    Edit Map Layout
                  </button>
                  <button 
                    onClick={() => handleDelete(bp.id)}
                    title="Delete layout blueprint"
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ── Version & Upload History log ───────────────────── */}
      <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Blueprint Upload Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">File Name</th>
                <th className="pb-3 px-4">Upload Timestamp</th>
                <th className="pb-3 px-4">Resolution</th>
                <th className="pb-3 px-4">File Size</th>
                <th className="pb-3 px-4">Format</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-slate-300 font-medium">
              {blueprints.map((bp) => (
                <tr key={bp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                  <td className="py-3.5 pr-4">
                    <span className="font-bold text-slate-900 dark:text-white block">{bp.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Map ID: {bp.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-normal text-slate-500">{bp.uploadDate}</td>
                  <td className="py-3.5 px-4 font-normal text-slate-500">{bp.dimensions}</td>
                  <td className="py-3.5 px-4 font-normal text-slate-500">{bp.fileSize}</td>
                  <td className="py-3.5 px-4 font-normal text-slate-500">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold">
                      {bp.format}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button 
                      onClick={() => alert(`Reviewing blueprint log ${bp.id}`)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Audit Version
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center pt-8 pb-4">
        <p className="text-orange-500 font-extrabold text-2xl tracking-wide uppercase animate-pulse">
          will give a purpose for this section later
        </p>
      </div>

    </div>
  );
}
