'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '@/lib/settings-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, Send, X, Bot, User, VolumeX, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface ReportData {
  issue?: string;
  machine?: string;
  location?: string;
  technicalObservation?: string;
  severity?: 'High' | 'Medium' | 'Low';
}

interface GramSahayakProps {
  onReportComplete: (report: any) => void;
  onClose: () => void;
}

export function GramSahayak({ onReportComplete, onClose }: GramSahayakProps) {
  const { t, language } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState<'A' | 'B' | 'C' | 'D' | 'COMPLETE'>('A');
  const [reportData, setReportData] = useState<ReportData>({});
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load voices for TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.onvoiceschanged = updateVoices;
      updateVoices();
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Initial greeting
  useEffect(() => {
    const greeting = language === 'te' 
      ? "నమస్తే! నేను గ్రామ్-సహాయక్. ఈ రోజు మీకు ఏ సమస్య ఉంది?" 
      : language === 'hi' 
        ? "नमस्ते! मैं ग्राम-सहायक हूँ। आज आपको क्या समस्या है?" 
        : "Namaste! I am Gram-Sahayak. Which machine or facility is having a problem today?";
    
    const initialId = '1';
    setMessages([
      {
        id: initialId,
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      }
    ]);
    
    // Small delay to ensure voices are loaded and browser is ready
    const timer = setTimeout(() => speak(greeting, initialId), 500);
    return () => clearTimeout(timer);
  }, [language]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  const speak = (text: string, messageId?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    setSpeakingMessageId(messageId || null);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good voice for the language
    let targetLang = 'en-IN';
    if (language === 'te') targetLang = 'te-IN';
    else if (language === 'hi') targetLang = 'hi-IN';
    
    const voice = voices.find(v => v.lang === targetLang) || 
                  voices.find(v => v.lang.startsWith(targetLang.split('-')[0])) ||
                  voices.find(v => v.lang.includes(targetLang.split('-')[0]));
    
    if (voice) utterance.voice = voice;
    utterance.lang = targetLang;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };

    recognition.start();
  };

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    processLogic(text);
  };

  const processLogic = async (text: string) => {
    // Artificial delay for "thinking"
    await new Promise(resolve => setTimeout(resolve, 1000));

    let response = "";
    let nextStep = currentStep;

    if (currentStep === 'A') {
      setReportData(prev => ({ ...prev, machine: text }));
      response = language === 'te'
        ? "నేను అర్థం చేసుకున్నాను. ఇది శబ్దం చేస్తోందా లేదా పూర్తిగా ఆగిపోయిందా? ఏవైనా వాసనలు వస్తున్నాయా?"
        : language === 'hi'
          ? "मैं समझ गया। क्या यह शोर कर रहा है या पूरी तरह से बंद हो गया है? क्या कोई गंध आ रही है?"
          : "I understand. Is it making a grinding noise, or is it completely silent? Are there any leaks or smells of burning?";
      nextStep = 'B';
    } else if (currentStep === 'B') {
      setReportData(prev => ({ ...prev, technicalObservation: text, severity: text.toLowerCase().includes('smoke') || text.toLowerCase().includes('fire') ? 'High' : 'Medium' }));
      response = language === 'te'
        ? "దయచేసి దెబ్బతిన్న భాగం యొక్క ఫోటోను తీయండి. ఇది నాకు సమస్యను బాగా అర్థం చేసుకోవడానికి సహాయపడుతుంది. మీరు దాన్ని 'అటాచ్మెంట్' బటన్ ద్వారా అప్లోడ్ చేయవచ్చు."
        : language === 'hi'
          ? "कृपया क्षतिग्रस्त हिस्से की फोटो लें। इससे मुझे समस्या को बेहतर ढंग से समझने में मदद मिलेगी। आप इसे 'अटैचमेंट' बटन का उपयोग करके अपलोड कर सकते हैं।"
          : "Please take a clear photo of the damaged part. I need to see the component to help you better. You can upload it using the 'Attachment' button on the reporter page.";
      nextStep = 'C';
    } else if (currentStep === 'C') {
      response = language === 'te'
        ? "ధన్యవాదాలు. రిపేర్ చేసేటప్పుడు దయచేసి జాగ్రత్తగా ఉండండి. వైర్లను తాకడానికి ముందు మెయిన్ పవర్ స్విచ్ ఆఫ్ చేయండి. టెక్నీషియన్ వస్తున్నారు."
        : language === 'hi'
          ? "धन्यवाद। मरम्मत करते समय कृपया सावधान रहें। तारों को छूने से पहले मुख्य पावर स्विच बंद कर दें। तकनीशियन आ रहा है।"
          : "Thank you. Please be safe while checking. Turn off the main power switch before touching any wires. A technician has been alerted.";
      nextStep = 'D';
    } else if (currentStep === 'D') {
      response = language === 'te'
        ? "మీ రిపోర్ట్ సిద్ధంగా ఉంది. దాన్ని సబ్మిట్ చేయడానికి 'Done' అని చెప్పండి."
        : language === 'hi'
          ? "आपकी रिपोर्ट तैयार है। इसे सबमिट करने के लिए 'Done' कहें।"
          : "Your report is ready. Speak 'Done' to finalize the submission.";
      
      if (text.toLowerCase().includes('done') || text.includes('పూర్తయింది') || text.includes('हो गया')) {
        nextStep = 'COMPLETE';
      }
    }

    const assistantMsgId = Date.now().toString();
    if (nextStep === 'COMPLETE') {
      const summary = {
        issue: reportData.machine,
        machine: reportData.machine,
        severity: reportData.severity || 'Medium',
        technicalObservation: reportData.technicalObservation,
        actionTaken: "User provided diagnostic details via Gram-Sahayak"
      };
      
      const finalMsg = language === 'te'
        ? "రిపోర్ట్ విజయవంతంగా రూపొందించబడింది! నేను మీ కోసం ఫారమ్ నింపేసాను."
        : language === 'hi'
          ? "रिपोर्ट सफलतापूर्वक जेनरेट की गई! मैंने आपके लिए फॉर्म भर दिया है।"
          : "Report generated successfully! I have auto-filled the form for you.";
      
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: finalMsg,
        timestamp: new Date(),
      }]);
      speak(finalMsg, assistantMsgId);
      onReportComplete(summary);
    } else {
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
      speak(response, assistantMsgId);
      setCurrentStep(nextStep);
    }
  };

  return (
    <Card className="w-full h-full bg-card shadow-xl border-primary/20 flex flex-col overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground py-3 px-4 flex flex-row items-center justify-between shrink-0">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Gram-Sahayak AI
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 hover:bg-white/20 text-white">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-slate-50">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-slate-200 rounded-tl-none shadow-sm text-slate-800'
                      : 'bg-primary text-primary-foreground rounded-tr-none shadow-md'
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-between mt-1 gap-4">
                    <span className="text-[10px] opacity-50">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                {msg.role === 'assistant' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`mt-1.5 h-8 w-8 rounded-full transition-all border shadow-sm ${
                      speakingMessageId === msg.id 
                        ? 'bg-green-100 text-green-700 border-green-200 animate-pulse' 
                        : 'bg-white text-slate-400 hover:text-green-600 hover:bg-green-50 border-slate-100'
                    }`}
                    onClick={() => speakingMessageId === msg.id ? stopSpeaking() : speak(msg.content, msg.id)}
                  >
                    {speakingMessageId === msg.id ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
            
            {/* Visual Speaking Indicator */}
            {isSpeaking && !speakingMessageId && (
              <div className="flex justify-start">
                <div className="bg-green-100 text-green-700 rounded-full py-1 px-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider animate-bounce">
                  <Volume2 className="h-3 w-3" /> Assistant is speaking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 border-t bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex w-full gap-2 items-center">
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            className={`rounded-full h-10 w-10 shadow-sm transition-all flex-shrink-0 ${
              isListening ? 'animate-pulse ring-4 ring-destructive/20' : 'hover:border-primary hover:text-primary'
            }`}
            onClick={startListening}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-4 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder={language === 'te' ? "టైప్ చేయండి..." : language === 'hi' ? "टाइप करें..." : "Type a message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10 rounded-full"
              onClick={() => handleSend()}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>

      {/* Quick Summary Preview */}
      {currentStep === 'COMPLETE' && (
        <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 backdrop-blur-sm">
          <div className="bg-green-100 border-4 border-green-50 rounded-full p-5 mb-4 shadow-inner">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800 mb-2">Report Ready</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">I've gathered all the details. Form has been auto-filled for you.</p>
          
          <div className="bg-slate-50 rounded-[24px] p-5 w-full text-left space-y-3 text-sm mb-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Machine</span>
              <span className="font-bold text-slate-700">{reportData.machine}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Severity</span>
              <span className={`font-black uppercase tracking-widest text-[10px] px-2 py-0.5 rounded-full ${
                reportData.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>{reportData.severity}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
               <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Diagnosis</span>
               <p className="text-slate-600 leading-relaxed italic">"{reportData.technicalObservation}"</p>
            </div>
          </div>
          
          <Button onClick={onClose} size="lg" className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest shadow-xl shadow-green-200">
            Proceed to Report
          </Button>
        </div>
      )}
    </Card>
  );
}
