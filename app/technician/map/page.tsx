'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { useFaultStore } from '@/lib/store';
import { villages, telanganaDistricts, getTechnicianById } from '@/lib/data';
import { 
  MapPin, 
  User, 
  AlertTriangle, 
  X, 
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Dynamically import Leaflet with SSR disabled
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-secondary animate-pulse flex items-center justify-center">
      <MapPin className="h-8 w-8 text-muted-foreground animate-bounce" />
    </div>
  )
});

export default function MapPage() {
  const { user } = useAuth();
  const { faults } = useFaultStore();
  const [selectedVillage, setSelectedVillage] = useState<typeof villages[0] | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<string>("All Districts");

  // Filter villages based on active district
  const filteredVillages = useMemo(() => {
    let result = villages;
    if (activeDistrict !== "All Districts") {
      result = villages.filter(v => v.district === activeDistrict);
    }
    // Prioritize assigned villages for the current technician
    return [...result].sort((a, b) => {
      if (a.assignedTechnician === user?.id) return -1;
      if (b.assignedTechnician === user?.id) return 1;
      return 0;
    });
  }, [activeDistrict, user?.id]);

  const getVillageStatus = (villageId: string) => {
    const villageFaults = faults.filter(f => f.villageId === villageId && f.status !== 'repaired');
    if (villageFaults.some(f => f.urgency === 'critical')) return 'critical';
    if (villageFaults.length > 0) return 'warning';
    return 'good';
  };

  const getVillageFaultCount = (villageId: string) => {
    return faults.filter(f => f.villageId === villageId && f.status !== 'repaired').length;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Village Map</h2>
          <p className="text-sm text-slate-500">View fault locations across your assigned villages</p>
        </div>

        {/* District Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Select District</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-4">
              <Button
                variant={activeDistrict === "All Districts" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDistrict("All Districts")}
                className={`rounded-full px-6 transition-all ${
                  activeDistrict === "All Districts" 
                    ? "bg-green-700 hover:bg-green-800 text-white border-transparent" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                All Districts
              </Button>
              {telanganaDistricts.map((d) => (
                <Button
                  key={d}
                  variant={activeDistrict === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDistrict(d)}
                  className={`rounded-full px-6 transition-all ${
                    activeDistrict === d 
                      ? "bg-green-700 hover:bg-green-800 text-white border-transparent" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        {/* Map Legend & Summary */}
        <Card className="border-none shadow-sm bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-green-800 font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Telangana Village Map - {activeDistrict}
              </h3>
              <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                  No Issues
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-200"></span>
                  Active Faults
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
                  Critical Issues
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Village Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVillages.map((v) => {
            const status = getVillageStatus(v.id);
            const faultsCount = getVillageFaultCount(v.id);
            const technician = getTechnicianById(v.assignedTechnician || '');
            const isAssignedToMe = v.assignedTechnician === user?.id;

            return (
              <Card 
                key={v.id}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-md border-2 ${
                  isAssignedToMe ? 'bg-green-50/30' : 'bg-white'
                } ${
                  status === 'warning' ? 'border-amber-200' : 
                  status === 'critical' ? 'border-rose-200' : 
                  isAssignedToMe ? 'border-green-600' : 'border-slate-100'
                }`}
                onClick={() => setSelectedVillage(v)}
              >
                <CardContent className="p-5 relative">
                  <div className={`absolute top-4 right-4 w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm ${
                    status === 'good' ? 'bg-emerald-500' : 
                    status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'
                  }`} />
                  
                  {isAssignedToMe && (
                    <Badge variant="secondary" className="mb-2 bg-green-100 text-green-700 hover:bg-green-100 transition-none border-none">
                      Assigned to You
                    </Badge>
                  )}

                  <h4 className="font-bold text-slate-800 group-hover:text-green-700 transition-colors uppercase text-sm tracking-wide">
                    {v.name}
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">{v.mandal}, {v.district}</p>
                  
                  <div className="flex flex-col gap-3">
                    {faultsCount > 0 ? (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded w-fit text-[11px] font-bold ${
                        status === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {faultsCount} {faultsCount === 1 ? 'fault' : 'faults'}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded w-fit text-[11px] font-bold bg-emerald-100 text-emerald-700">
                        <MapPin className="h-3.5 w-3.5" />
                        Operational
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <User className="h-3.5 w-3.5" />
                      {technician?.name || 'Unassigned'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Precise Location Modal Overlay */}
      {selectedVillage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-3xl overflow-hidden shadow-2xl border-none">
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedVillage.name}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Precise Village Location
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedVillage(null)} 
                className="rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 h-10 w-10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="h-[450px] w-full bg-slate-100 relative">
              <LeafletMap 
                center={[selectedVillage.coordinates.lat, selectedVillage.coordinates.lng]}
                markers={[{
                  position: [selectedVillage.coordinates.lat, selectedVillage.coordinates.lng],
                  label: selectedVillage.name,
                  description: `${getVillageFaultCount(selectedVillage.id)} active issues`
                }]}
              />
            </div>
            
            <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  Coordinates: {selectedVillage.coordinates.lat.toFixed(4)}, {selectedVillage.coordinates.lng.toFixed(4)}
                </div>
                <Button 
                  onClick={() => setSelectedVillage(null)}
                  className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-bold px-8 shadow-lg shadow-green-200/50"
                >
                    Close Preview
                </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
