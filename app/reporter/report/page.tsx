'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useFaultStore } from '@/lib/store';
import { villages, getTechnicianByVillage, getVillageById } from '@/lib/data';
import type { FaultUrgency } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { GramSahayak } from '@/components/gram-sahayak';
import {
  Camera,
  MapPin,
  Mic,
  Image as ImageIcon,
  Sun,
  Zap,
  Battery,
  Activity,
  AlertTriangle,
  CheckCircle,
  Send,
  X,
  Map,
  Bot,
  Upload,
  Home,
  Clock,
  User,
  Check
} from 'lucide-react';

// District and Mandal Data
const REGION_DATA: Record<string, string[]> = {
  "Hyderabad": ["Amberpet", "Asifnagar", "Bahadurpura", "Musheerabad", "Khairatabad"],
  "Rangareddy": ["Ibrahimpatnam", "Maheshwaram", "Manchal", "Kandukur", "Saroornagar"],
  "Medchal-Malkajgiri": ["Alwal", "Balanagar", "Ghatkesar", "Keesara", "Uppal"],
  "Sangareddy": ["Patancheru", "Ameenpur", "Gummadidala", "Kandi"],
};

const deviceTypes = [
  { value: 'solar_panel', label: 'Solar Panel', icon: Sun },
  { value: 'microgrid', label: 'Microgrid', icon: Zap },
  { value: 'inverter', label: 'Inverter', icon: Activity },
  { value: 'battery', label: 'Battery', icon: Battery },
  { value: 'transformer', label: 'Transformer', icon: Zap },
];

const urgencyLevels: { value: FaultUrgency; labelKey: string; color: string }[] = [
  { value: 'low', labelKey: 'low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', labelKey: 'medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', labelKey: 'high', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', labelKey: 'critical', color: 'bg-red-100 text-red-800' },
];

export default function ReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useSettings();
  const { addFault } = useFaultStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [description, setDescription] = useState("");
  const [locationStr, setLocationStr] = useState("17.6174, 78.5712");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandal, setSelectedMandal] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [deviceType, setDeviceType] = useState("solar_panel");
  const [urgency, setUrgency] = useState<FaultUrgency>("medium");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
    } catch (err) {
      alert("Camera Error: Please allow camera permissions in your browser settings.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  // --- VOICE LOGIC (Speech to Text) ---
  const handleVoiceDescription = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription(prev => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  // --- GPS LOGIC ---
  const getPreciseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocationStr(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      }, (error) => {
        alert("GEOLOCATION ERROR: " + error.message);
      });
    }
  };

  const handleAiReportComplete = (summary: any) => {
    const summaryText = language === 'te' 
      ? `గ్రామ్-సహాయక్ నుండి సారాంశం:\n\nసమస్య: ${summary.issue}\nరోగనిర్ధారణ: ${summary.technicalObservation}\nతీవ్రత: ${summary.severity}`
      : language === 'hi'
        ? `ग्राम-सहायक से सारांश:\n\nसमस्या: ${summary.issue}\nनिदान: ${summary.technicalObservation}\nगंभीरता: ${summary.severity}`
        : `Summary from Gram-Sahayak:\n\nIssue: ${summary.issue}\nDiagnosis: ${summary.technicalObservation}\nSeverity: ${summary.severity}`;

    setDescription(summaryText);
    setUrgency(summary.severity.toLowerCase() === 'high' ? 'high' : summary.severity.toLowerCase() === 'critical' ? 'critical' : 'medium');

    const deviceMatch = deviceTypes.find(d => 
      summary.machine?.toLowerCase().includes(d.label.toLowerCase())
    );
    if (deviceMatch) {
      setDeviceType(deviceMatch.value);
    }
    
    setTimeout(() => setShowAiAssistant(false), 2000);
  };

  // Get villages for selected mandal using data.ts
  const villagesInMandal = useMemo(() => {
    if (!selectedMandal || !selectedDistrict) return [];
    return villages.filter(v => v.district === selectedDistrict && v.mandal === selectedMandal);
  }, [selectedDistrict, selectedMandal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !deviceType) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const village = getVillageById(selectedVillageId);
    const technician = getTechnicianByVillage(selectedVillageId);
    const coordinates = locationStr.split(',').map(s => parseFloat(s.trim()));

    addFault({
      reporterId: user?.id || '',
      reporterName: user?.name || '',
      reporterPhone: user?.phone || '',
      villageId: selectedVillageId || 'v1',
      villageName: village?.name || 'Manual Location',
      deviceType: deviceType as any,
      description: description,
      imageUrl: capturedImage || undefined,
      coordinates: { lat: coordinates[0], lng: coordinates[1] },
      status: 'pending',
      urgency: urgency as any,
      assignedTechnicianId: technician?.id,
      assignedTechnicianName: technician?.name,
    });

    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => router.push('/reporter'), 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center animate-in zoom-in duration-300">
          <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4 border-2 border-green-200">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Reported Successfully!</h2>
          <p className="text-slate-500 mb-6 font-medium">Technicians have been notified.</p>
          <Spinner className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-green-700 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight uppercase tracking-tight">Fault Reporter</h1>
              <p className="text-[10px] opacity-70 font-semibold uppercase tracking-widest leading-none mt-1">
                Village Renewable Energy
              </p>
            </div>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="gap-2 bg-white/10 hover:bg-white/20 text-white border-none transition-all rounded-full h-10 px-4"
            onClick={() => setShowAiAssistant(true)}
          >
            <Bot className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Help AI</span>
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        
        {/* 1. Camera Section */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative min-h-[300px] flex flex-col items-center justify-center group transition-all hover:shadow-md">
          {stream ? (
            <div className="relative w-full h-[400px]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-4">
                <Button 
                  onClick={capturePhoto} 
                  className="bg-green-600 hover:bg-green-700 text-white h-14 w-14 rounded-full shadow-xl border-4 border-white transition-transform active:scale-95"
                >
                  <Camera size={28} />
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="destructive"
                  className="h-14 w-14 rounded-full shadow-xl border-4 border-white transition-transform active:scale-95"
                >
                  <X size={28} />
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-[300px]">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <Button 
                onClick={() => setCapturedImage(null)} 
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 h-10 w-10 backdrop-blur-sm"
              >
                <X size={20} />
              </Button>
              <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                Photo Captured
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-slate-50/50 w-full h-[300px] flex flex-col justify-center items-center">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
                <Camera className="text-slate-300" size={56} strokeWidth={1.5} />
              </div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-6">Visual Evidence</p>
              <div className="flex gap-3">
                <Button onClick={startCamera} className="bg-green-700 hover:bg-green-800 text-white px-6 h-12 rounded-xl font-bold shadow-lg shadow-green-100 transition-all flex items-center gap-2">
                  <Camera size={20} /> Start Camera
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-slate-200 h-12 rounded-xl text-slate-500 font-bold">
                  <ImageIcon size={20} />
                </Button>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const reader = new FileReader();
               reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
               reader.readAsDataURL(file);
             }
          }} className="hidden" />
          <canvas ref={canvasRef} className="hidden" />
        </section>

        {/* 2. Manual Location Selection */}
        <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
              <MapPin size={14} className="text-green-600" /> Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">District</Label>
                <div className="relative">
                  <select 
                    value={selectedDistrict}
                    onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedMandal(""); }}
                    className="w-full h-12 pl-3 pr-10 border-2 border-slate-50 rounded-xl bg-slate-50 focus:bg-white focus:border-green-600 focus:ring-4 ring-green-600/5 outline-none transition-all text-sm font-bold appearance-none text-slate-700"
                  >
                    <option value="">District</option>
                    {Object.keys(REGION_DATA).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <Map size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left text-sm font-medium">
                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Mandal</Label>
                <select 
                  disabled={!selectedDistrict}
                  value={selectedMandal}
                  onChange={(e) => setSelectedMandal(e.target.value)}
                  className="w-full h-12 px-3 border-2 border-slate-50 rounded-xl bg-slate-50 disabled:opacity-40 focus:bg-white focus:border-green-600 focus:ring-4 ring-green-600/5 outline-none transition-all text-sm font-bold text-slate-700 appearance-none"
                >
                  <option value="">Mandal</option>
                  {selectedDistrict && REGION_DATA[selectedDistrict].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedMandal && (
              <div className="space-y-1.5 text-left animate-in slide-in-from-top-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Specific Village</Label>
                <select 
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full h-12 px-3 border-2 border-slate-50 rounded-xl bg-slate-50 focus:bg-white focus:border-green-600 focus:ring-4 ring-green-600/5 outline-none transition-all text-sm font-bold text-slate-700 appearance-none"
                >
                  <option value="">Select Village</option>
                  {villagesInMandal.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Device Type selection */}
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
            <Zap size={14} className="text-amber-500" /> Device Category
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {deviceTypes.map(device => {
              const Icon = device.icon;
              const isActive = deviceType === device.value;
              return (
                <button
                  key={device.value}
                  type="button"
                  onClick={() => setDeviceType(device.value)}
                  className={`p-4 text-left rounded-2xl border-2 transition-all duration-300 flex flex-col gap-2 ${
                    isActive 
                      ? 'bg-green-50 border-green-600 text-green-800 ring-4 ring-green-600/5' 
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 shadow-sm'
                  }`}
                >
                  <div className={`p-2 rounded-xl w-fit ${isActive ? 'bg-green-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">{device.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Problem Description with Voice */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Bot size={14} className="text-green-600" /> Fault details
            </Label>
            <button 
              type="button"
              onClick={handleVoiceDescription}
              className={`p-3 rounded-2xl transition-all shadow-lg active:scale-95 ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-600/10' 
                  : 'bg-white border-2 border-slate-50 text-green-700 hover:border-green-100'
              }`}
            >
              <Mic size={24} />
            </button>
          </div>
          <Textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "Describe the machine failure in simple words..."}
            className="w-full h-32 p-4 border-2 border-slate-100 rounded-2xl bg-white focus:border-green-600 focus:ring-8 ring-green-600/5 outline-none resize-none text-sm font-medium leading-relaxed placeholder:text-slate-300 transition-all shadow-sm"
          />
        </div>

        {/* 5. Urgency Selection */}
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
            <AlertTriangle size={14} className="text-rose-500" /> Urgency Level
          </Label>
          <div className="flex gap-2 bg-slate-100/50 p-1 rounded-2xl border-2 border-slate-50/50">
            {urgencyLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setUrgency(level.value)}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  urgency === level.value 
                    ? level.color + ' shadow-lg scale-105 z-10' 
                    : 'text-slate-400 hover:bg-white hover:text-slate-600'
                }`}
              >
                {t(level.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* 6. GPS Location Display */}
        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl shadow-xl border-t border-white/10 group">
          <div className="flex items-center gap-3">
            <div className="bg-green-600/20 p-2 rounded-xl">
              <MapPin size={18} className="text-green-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Live Coordinates</p>
              <p className="text-green-400 font-mono text-xs font-bold">{locationStr}</p>
            </div>
          </div>
          <Button 
            onClick={getPreciseLocation}
            variant="ghost"
            size="sm"
            className="text-[10px] uppercase font-black tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all px-4 rounded-xl border border-white/5"
          >
            Refetch GPS
          </Button>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !description || !deviceType}
          className="w-full bg-green-600 hover:bg-green-700 text-white h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-green-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 border-b-4 border-green-800"
        >
          {isSubmitting ? (
            <Spinner className="w-6 h-6 border-white" />
          ) : (
            <>
              <Upload size={22} strokeWidth={2.5} /> Send Report
            </>
          )}
        </Button>

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[60]">
        {[
          { icon: Home, label: "Home", active: false },
          { icon: Camera, label: "Camera", active: true },
          { icon: Upload, label: "Upload", active: false },
          { icon: Clock, label: "History", active: false },
          { icon: User, label: "Profile", active: false },
        ].map((item, idx) => (
          <button key={idx} className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${item.active ? 'text-green-700' : 'text-slate-300'}`}>
            <div className={`p-1.5 rounded-xl ${item.active ? 'bg-green-600 text-white shadow-lg shadow-green-100' : ''}`}>
              <item.icon size={22} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${item.active ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* AI Assistant Modal */}
      {showAiAssistant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="w-full max-w-xl h-[80vh] bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border-8 border-white">
            <GramSahayak 
              onReportComplete={handleAiReportComplete}
              onClose={() => setShowAiAssistant(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
