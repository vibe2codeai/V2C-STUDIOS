/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  ArrowRight, 
  Sparkles, 
  Camera, 
  Zap, 
  Lightbulb, 
  User, 
  Layout, 
  Layers, 
  Download, 
  ChevronLeft,
  Loader2,
  FileJson,
  Clapperboard,
  Image as ImageIcon,
  PenTool,
  Info,
  ExternalLink
} from 'lucide-react';
import { CreativeProfile, Step, Shot, ProtocolOutput } from './types';
import { OPTIONS } from './constants';
import { analyzeMusic, generateV2CScenes, analyzeCharacterImages, generateLyrics } from './lib/gemini';

const INITIAL_PROFILE: CreativeProfile = {
  lyrics: '',
  style: '',
  length: '3:00',
  direction: '',
  aesthetic: '',
  characters: '',
  energy: '',
  camera: '',
  lighting: '',
  promptType: '',
  videoDuration: '',
  model: null,
};

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [profile, setProfile] = useState<CreativeProfile>(INITIAL_PROFILE);
  const [analysis, setAnalysis] = useState<string>('');
  const [characterDescription, setCharacterDescription] = useState<string>('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [protocol, setProtocol] = useState<ProtocolOutput>({});
  const [loading, setLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState('Shot List');
  const [uploadedImages, setUploadedImages] = useState<{base64: string, mimeType: string}[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  
  // Lyrics Wizard State
  const [wizardData, setWizardData] = useState({ concept: '', genre: '', mood: '' });
  const [wizardResult, setWizardResult] = useState('');

  const updateProfile = (key: keyof CreativeProfile, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = (next: Step) => setStep(next);
  const prevStep = (prev: Step) => setStep(prev);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await analyzeMusic(profile.lyrics, profile.style, profile.length);
      setAnalysis(result || '');
      setStep('direction');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelection = (model: string) => {
    setProfile(prev => ({ ...prev, model }));
    setStep('generation');
  };

  const handleDualModelSelection = () => {
    if (profile.imageModel && profile.videoModel) {
      setProfile(prev => ({ 
        ...prev, 
        model: `${prev.imageModel} + ${prev.videoModel}` 
      }));
      setStep('generation');
    }
  };

  useEffect(() => {
    if (step === 'generation') {
      const generate = async () => {
        setLoading(true);
        try {
          let charDesc = characterDescription;
          if (uploadedImages.length > 0 && !charDesc) {
            const result = await analyzeCharacterImages(uploadedImages);
            charDesc = result || '';
            setCharacterDescription(charDesc);
          }
          const result = await generateV2CScenes(profile, analysis, charDesc);
          setShots(result.shots);
          setProtocol(result.protocol);
          setStep('output');
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      generate();
    }
  }, [step, profile, analysis, uploadedImages, characterDescription]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: {base64: string, mimeType: string}[] = [];
      let loadedCount = 0;
      
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          newImages.push({ base64, mimeType: file.type });
          loadedCount++;
          if (loadedCount === files.length) {
            setUploadedImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateLyrics(wizardData.concept, wizardData.genre, wizardData.mood);
      setWizardResult(result || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyWizardResult = () => {
    // Basic extraction - assuming Gemini returns structured blocks as requested
    // If not, the user can just copy-paste, but we'll try to help
    setProfile(prev => ({
      ...prev,
      lyrics: wizardResult,
      style: wizardData.genre
    }));
    setStep('input');
  };

  const getFullPromptText = () => {
    return shots.map(s => {
      let text = `[SHOT ${s.shotNumber}] (${s.mode})\nACTION: ${s.description}\nCAMERA: ${s.camera}\nLIGHTING: ${s.lighting}\nDURATION: ${s.duration}`;
      if (s.imagePrompt) text += `\n\nIMAGE PROMPT:\n${s.imagePrompt}`;
      if (s.videoPrompt) text += `\n\nVIDEO PROMPT:\n${s.videoPrompt}`;
      return text;
    }).join('\n\n' + '='.repeat(40) + '\n\n');
  };

  const getFormattedOutput = (format: string) => {
    if (format === 'Shot List') {
      return getFullPromptText();
    }
    if (format === 'JSON') return JSON.stringify({ profile, analysis, shots }, null, 2);
    if (format === 'Fast Prompt') return shots.map(s => `• ${s.description}`).join('\n\n');
    if (format === 'Pro Prompt') return shots.map(s => {
      let text = `[SHOT ${s.shotNumber}]\nACTION: ${s.description}`;
      if (s.imagePrompt) text += `\nIMAGE: ${s.imagePrompt}`;
      if (s.videoPrompt) text += `\nVIDEO: ${s.videoPrompt}`;
      return text;
    }).join('\n\n');
    if (format === 'Model Protocol') {
      const parts: string[] = [];
      if (protocol.t2i) {
        parts.push(`// [V2C] TEXT-TO-IMAGE PROTOCOL\n// Optimized for: ${profile.model}\n\n${protocol.t2i}`);
      }
      if (protocol.i2i) {
        parts.push(`// [V2C] IMAGE-TO-IMAGE PROTOCOL\n// Optimized for: ${profile.model}\n\n${protocol.i2i}`);
      }
      if (protocol.i2v && protocol.i2v.length > 0) {
        const videoPrompts = protocol.i2v.map((p, i) => `// SHOT ${i + 1}\n${p}`).join('\n\n');
        parts.push(`// [V2C] IMAGE-TO-VIDEO PROTOCOL\n// Optimized for: ${profile.videoModel || profile.model}\n\n${videoPrompts}`);
      }
      return parts.join('\n\n' + '='.repeat(40) + '\n\n') || "INITIALIZING PROTOCOL DATA...";
    }
    if (format === 'Start/End Frame Pair') return `[START FRAME PROTOCOL]\n${shots[0]?.imagePrompt || shots[0]?.description}\n\n[END FRAME PROTOCOL]\n${shots[shots.length-1]?.imagePrompt || shots[shots.length-1]?.description}`;
    if (format === 'Character Plates' || format === 'Environment Plates') return `// PROTOCOL DATA\n// SUBJECT: ${profile.characters}\n// ENVIRONMENT: ${profile.aesthetic}\n// ENERGY: ${profile.energy}\n// LIGHTING: ${profile.lighting}`;
    return getFullPromptText();
  };

  const handleExport = () => {
    const content = getFormattedOutput(outputFormat);
    const extension = outputFormat === 'JSON' ? 'json' : 'txt';
    const blob = new Blob([content], { type: outputFormat === 'JSON' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `v2c-protocol-${outputFormat.toLowerCase().replace(/ /g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-white text-slate-900">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 speckled-orange rounded flex items-center justify-center font-bold text-lg text-white">V</div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sm">V2C‑GEM <span className="text-orange-600">2.0</span></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Guided Creative Engine</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setShowChecklist(!showChecklist)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors text-[10px] font-bold uppercase tracking-widest border border-orange-200"
          >
            <Info className="w-3.5 h-3.5" /> Suno Workflow
          </button>
          <div className="flex items-center gap-2">
            {['direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting', 'promptCapabilities'].map((s, i) => (
              <div 
                key={s} 
                className={`stepper-dot ${(['direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting', 'promptCapabilities'].indexOf(step as any) >= i || ['summary', 'modelSelection', 'generation', 'output'].includes(step)) ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-xs text-slate-400">
            Step <span className="text-slate-900 font-mono">{String(['input', 'direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting', 'summary', 'modelSelection', 'generation', 'output'].indexOf(step)).padStart(2, '0')}</span> / 10
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Main Flow Content */}
        <section className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto relative no-scrollbar">
          {/* Creator Checklist Overlay */}
          <AnimatePresence>
            {showChecklist && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-50 p-12 bg-white/95 backdrop-blur-xl overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">V2C-GEM Creator Checklist</h2>
                    <button onClick={() => setShowChecklist(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <Zap className="w-5 h-5 text-orange-500 rotate-45" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="space-y-4">
                      <h4 className="text-orange-500 font-bold uppercase tracking-widest text-[10px]">Workflow Principles</h4>
                      <div className="glass-panel p-6 space-y-4">
                        <div>
                          <p className="font-bold text-slate-900 mb-1">1. Generate in Chunks</p>
                          <p className="text-slate-500 text-xs">If the AI struggles, focus on a flawless Intro/Verse 1 first, then use Extend.</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 mb-1">2. Suno Studio Mastery</p>
                          <p className="text-slate-500 text-xs">Use Tempo Locking, Stem Extraction, and Fades for post-production polish.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-orange-500 font-bold uppercase tracking-widest text-[10px]">Copyright & Legal</h4>
                      <div className="glass-panel p-6 space-y-4">
                        <div>
                          <p className="font-bold text-slate-900 mb-1">The Hybrid Workflow</p>
                          <p className="text-slate-500 text-xs italic">"Meaningful Human Authorship" is required for copyright ownership.</p>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                          <li>Generate on Paid Plan</li>
                          <li>Extract Stems</li>
                          <li>Import to DAW & Add Human Elements</li>
                          <li>Document the process as Hybrid work</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                     <div className="flex items-center gap-2 text-orange-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                       <Sparkles className="w-4 h-4" /> Recommended Human Authorship
                     </div>
                     <p className="text-slate-600 text-sm leading-relaxed">
                       Record your own lead vocals, replace AI drums with human programming, or play live instruments over the AI base to secure full creative ownership.
                     </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`${step === 'output' || step === 'lyricsWizard' ? 'max-w-5xl' : 'max-w-2xl'} w-full transition-all duration-500`}>
            <AnimatePresence mode="wait">
              {step === 'lyricsWizard' && (
                <StepLayout key="lyricsWizard" title="Lyrics Architect" subtitle="AI-Powered Professional Songwriting">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="sidebar-label block mb-2">Song Concept</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm text-slate-700"
                            placeholder="e.g. A cyberpunk romance in neon rain"
                            value={wizardData.concept}
                            onChange={e => setWizardData(prev => ({ ...prev, concept: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="sidebar-label block mb-2">Target Genre</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm text-slate-700"
                            placeholder="e.g. Synthwave / Dark Pop"
                            value={wizardData.genre}
                            onChange={e => setWizardData(prev => ({ ...prev, genre: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="sidebar-label block mb-2">Mood</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm text-slate-700"
                            placeholder="e.g. Melancholic yet hopeful"
                            value={wizardData.mood}
                            onChange={e => setWizardData(prev => ({ ...prev, mood: e.target.value }))}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleWizardSubmit}
                        disabled={loading || !wizardData.concept}
                        className="btn-primary w-full flex items-center justify-center gap-3"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Professional Lyrics <PenTool className="w-4 h-4" /></>}
                      </button>
                      <button 
                        onClick={() => setStep('input')}
                        className="w-full text-[10px] text-slate-500 uppercase font-bold tracking-widest hover:text-white transition-colors"
                      >
                        Skip to Manual Ingest
                      </button>
                    </div>

                    <div className="glass-panel p-6 flex flex-col gap-4 min-h-[400px]">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Architect Output</span>
                        {wizardResult && (
                          <button 
                            onClick={applyWizardResult}
                            className="text-[10px] font-bold text-white speckled-orange px-3 py-1 rounded hover:opacity-90 transition-all uppercase"
                          >
                            Apply to Profile
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar">
                        {wizardResult ? (
                          <pre className="font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {wizardResult}
                          </pre>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <PenTool className="w-12 h-12" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Waiting for parameters...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </StepLayout>
              )}

              {step === 'input' && (
                <StepLayout key="input" title="Initialize Engine" subtitle="Ingest core track data">
                  <div className="mb-6 flex justify-end">
                    <button 
                      onClick={() => setStep('lyricsWizard')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-600 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-all"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Launch Lyrics Assistant
                    </button>
                  </div>
                  <form onSubmit={handleInitialSubmit} className="space-y-6">
                    <div>
                      <label className="sidebar-label block mb-2">Track Lyrics</label>
                      <textarea
                        required
                        className="w-full h-32 bg-white border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm resize-none text-slate-700"
                        placeholder="Paste lyrics here..."
                        value={profile.lyrics}
                        onChange={e => updateProfile('lyrics', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="sidebar-label block mb-2">Song Style</label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm text-slate-700"
                          placeholder="e.g. Synthwave"
                          value={profile.style}
                          onChange={e => updateProfile('style', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="sidebar-label block mb-2">Total Length</label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-lg p-4 focus:border-orange-500 focus:outline-none transition-all font-mono text-sm text-slate-700"
                          placeholder="MM:SS"
                          value={profile.length}
                          onChange={e => updateProfile('length', e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm Track Data <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </StepLayout>
              )}

              {['direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting'].includes(step) && (
                <StepLayout 
                  key={step} 
                  title={`${step.charAt(0).toUpperCase() + step.slice(1)} Logic`} 
                  subtitle={`Select the visual DNA for the sequence`}
                  onBack={() => {
                    const steps: Step[] = ['input', 'direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting'];
                    const idx = steps.indexOf(step as Step);
                    prevStep(steps[idx - 1]);
                  }}
                >
                  <div className="space-y-6">
                    {step === 'characters' && (
                      <div className="space-y-4">
                        <div className="p-6 rounded-xl border-2 border-dashed border-slate-100 bg-white text-center">
                          <label className="cursor-pointer group">
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                {uploadedImages.length > 0 ? <Sparkles className="w-6 h-6 text-orange-500" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {uploadedImages.length > 0 ? `${uploadedImages.length} References Loaded` : "Upload Character Visual References (Multiple Allowed)"}
                              </span>
                              <p className="text-[10px] text-slate-400">Gemini will synthesize a consistent visual anchor from all provided images.</p>
                            </div>
                          </label>
                        </div>
                        {uploadedImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-center">
                             {uploadedImages.map((img, idx) => (
                               <div key={idx} className="relative group w-16 h-16 rounded border border-slate-100 overflow-hidden bg-white">
                                 <img 
                                   src={`data:${img.mimeType};base64,${img.base64}`} 
                                   className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                   alt="Ref"
                                   referrerPolicy="no-referrer"
                                 />
                                 <button 
                                   onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                                   className="absolute top-0 right-0 p-1 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   <Zap className="w-2 h-2 rotate-45" />
                                 </button>
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {OPTIONS[step as keyof typeof OPTIONS].map(option => (
                        <button
                          key={option}
                          onClick={() => {
                            updateProfile(step as keyof CreativeProfile, option);
                            const steps: Step[] = ['direction', 'aesthetic', 'characters', 'energy', 'camera', 'lighting', 'promptCapabilities', 'summary'];
                            const idx = steps.indexOf(step as Step);
                            nextStep(steps[idx + 1]);
                          }}
                          className={`option-card p-5 rounded-xl text-left hover:accent-glow relative ${profile[step as keyof CreativeProfile] === option ? 'border-orange-500 bg-orange-50 accent-glow' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`font-bold text-sm ${profile[step as keyof CreativeProfile] === option ? 'text-orange-600' : 'text-slate-800'}`}>{option}</span>
                            {profile[step as keyof CreativeProfile] === option && (
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-tight font-medium opacity-60">
                            {step} parameter set
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </StepLayout>
              )}

              {step === 'promptCapabilities' && (
                <StepLayout key="promptCapabilities" title="Capability Lock" subtitle="Configure output format and timing">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-2">Target Format</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {OPTIONS.promptType.map(type => (
                          <button 
                            key={type}
                            onClick={() => updateProfile('promptType', type)}
                            className={`p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold transition-all ${profile.promptType === type ? 'border-orange-500 bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-900'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-2">Video Window (Duration)</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {OPTIONS.videoDuration.map(dur => (
                          <button 
                            key={dur}
                            onClick={() => updateProfile('videoDuration', dur)}
                            className={`p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold transition-all ${profile.videoDuration === dur ? 'border-orange-500 bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-900'}`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      disabled={!profile.promptType || !profile.videoDuration}
                      onClick={() => nextStep('summary')}
                      className="btn-primary w-full flex items-center justify-center gap-3 mt-4"
                    >
                      Synchronize Protocol <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </StepLayout>
              )}

              {step === 'summary' && (
                <StepLayout 
                  key="summary" 
                  title="Creative Profile" 
                  subtitle="System summarized metadata for generation"
                  onBack={() => setStep('lighting')}
                >
                  <div className="glass-panel p-6 mb-8 space-y-4 font-mono text-xs">
                    <div className="grid grid-cols-2 gap-y-3">
                      <div className="text-slate-500 uppercase tracking-tighter">Direction</div><div className="text-orange-500 font-bold">{profile.direction}</div>
                      <div className="text-slate-500 uppercase tracking-tighter">Aesthetic</div><div className="text-orange-500 font-bold">{profile.aesthetic}</div>
                      <div className="text-slate-500 uppercase tracking-tighter">Characters</div><div className="text-orange-500 font-bold">{profile.characters}</div>
                      <div className="text-slate-500 uppercase tracking-tighter">Energy</div><div className="text-orange-500 font-bold">{profile.energy}</div>
                      <div className="text-slate-500 uppercase tracking-tighter">Camera</div><div className="text-orange-500 font-bold">{profile.camera}</div>
                      <div className="text-slate-500 uppercase tracking-tighter">Lighting</div><div className="text-orange-500 font-bold">{profile.lighting}</div>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-2">Emotional Arc</div>
                      <div className="text-sm italic text-slate-300 leading-relaxed">{analysis}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setStep('modelSelection')}
                    className="btn-primary w-full flex items-center justify-center gap-3"
                  >
                    Confirm & Proceed to Model Selection<ArrowRight className="w-4 h-4" />
                  </button>
                </StepLayout>
              )}

              {step === 'modelSelection' && (
                <StepLayout 
                  key="modelSelection" 
                  title="Model Selection" 
                  subtitle="Select the target generation engine protocol"
                  onBack={() => setStep('summary')}
                >
                  {profile.promptType === 'Combined (Pair)' ? (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-2">1. Select Visual Anchor Engine (Image)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {OPTIONS.models.filter(m => !m.includes('(Video)')).map(model => (
                            <button
                              key={model}
                              onClick={() => updateProfile('imageModel', model)}
                              className={`option-card p-4 rounded-lg text-left transition-all ${profile.imageModel === model ? 'border-orange-500 bg-orange-50 accent-glow shadow-md shadow-orange-200/20' : ''}`}
                            >
                               <span className={`font-mono text-[10px] uppercase font-bold tracking-tight block leading-tight ${profile.imageModel === model ? 'text-orange-600' : 'text-slate-500'}`}>
                                 {model}
                               </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-2">2. Select Motion Conversion Engine (Video)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {OPTIONS.models.filter(m => m.includes('(Video)') || m.includes('Seedream')).map(model => (
                            <button
                              key={model}
                              onClick={() => updateProfile('videoModel', model)}
                              className={`option-card p-4 rounded-lg text-left transition-all ${profile.videoModel === model ? 'border-orange-500 bg-orange-50 accent-glow shadow-md shadow-orange-200/20' : ''}`}
                            >
                               <span className={`font-mono text-[10px] uppercase font-bold tracking-tight block leading-tight ${profile.videoModel === model ? 'text-orange-600' : 'text-slate-500'}`}>
                                 {model}
                               </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        disabled={!profile.imageModel || !profile.videoModel}
                        onClick={handleDualModelSelection}
                        className="btn-primary w-full flex items-center justify-center gap-3 mt-4"
                      >
                        Initialize Combined Protocol <Zap className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {OPTIONS.models.map(model => (
                        <button
                          key={model}
                          onClick={() => handleModelSelection(model)}
                          className={`option-card p-4 rounded-lg text-left ${profile.model === model ? 'border-orange-500 bg-orange-50 accent-glow' : ''}`}
                        >
                          <span className="font-mono text-xs block text-slate-800">{model}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </StepLayout>
              )}

              {step === 'generation' && (
                <StepLayout key="generation" title="Synchronizing Engine" subtitle="Compiling visual logic blocks into V2C 2.0 sequences">
                  <div className="flex flex-col items-center justify-center py-12 space-y-8">
                    <div className="relative">
                      <motion.div 
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 border-b-2 border-r-2 border-orange-500 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-orange-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center font-mono text-[10px] text-slate-400 uppercase tracking-widest space-y-2">
                      <p className="text-orange-500 font-bold">Target Model: {profile.model}</p>
                      <p>Applying V2C Grammar Protocol...</p>
                      <p>Building Emotional Keyframes...</p>
                    </div>
                  </div>
                </StepLayout>
              )}

              {step === 'output' && (
                <StepLayout key="output" title="Generated Sequence" subtitle="Verified V2C 2.0 Protocol output">
                  <div className="space-y-6 w-full max-w-4xl">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-100">
                      {['Master Prompt', ...OPTIONS.outputs].map(format => (
                        <button
                          key={format}
                          onClick={() => setOutputFormat(format)}
                          className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${outputFormat === format ? 'speckled-orange text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                          {format}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto no-scrollbar space-y-4 pr-2">
                      {outputFormat === 'Master Prompt' ? (
                        <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Full Creative Specification</h4>
                              <p className="text-xs text-orange-500 uppercase font-bold tracking-widest">Single Copy-Ready Protocol Block</p>
                            </div>
                            <button 
                              onClick={() => navigator.clipboard.writeText(getFullPromptText())}
                              className="px-4 py-2 speckled-orange text-white rounded text-[10px] font-bold uppercase hover:opacity-90 transition-all"
                            >
                              Copy All
                            </button>
                          </div>
                          <div className="w-full p-6 rounded bg-slate-50 font-mono text-xs leading-relaxed text-slate-600 border border-slate-100 selection:bg-orange-100">
                            <div className="text-orange-500/50 mb-4 pb-2 border-b border-orange-500/10 uppercase tracking-tighter">
                              // START V2C 2.0 PROTOCOL BLOCK
                            </div>
                            {getFullPromptText()}
                            <div className="text-orange-500/50 mt-4 pt-2 border-t border-orange-500/10 uppercase tracking-tighter">
                              // END V2C 2.0 PROTOCOL BLOCK
                            </div>
                          </div>
                        </div>
                      ) : outputFormat === 'JSON' ? (
                        <pre className="p-4 rounded bg-slate-50 border border-slate-100 font-mono text-[10px] whitespace-pre-wrap text-orange-700">
                          {JSON.stringify({ profile, analysis, shots }, null, 2)}
                        </pre>
                      ) : outputFormat === 'Shot List' ? (
                        <div className="space-y-3">
                          {shots.map((shot, i) => (
                            <div key={i} className="p-6 rounded-xl bg-white border border-slate-200 hover:border-orange-200 transition-colors shadow-sm">
                              <div className="flex justify-between items-center mb-4">
                                <span className="v2c-tag">SHOT {shot.shotNumber}</span>
                                <span className="text-[10px] font-bold text-slate-400 tracking-tighter">{shot.mode}</span>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-4">{shot.description}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {shot.imagePrompt && (
                                  <div className="p-4 rounded bg-white border border-slate-100">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase block mb-2 tracking-widest">Image Prompt (Still)</span>
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">{shot.imagePrompt}</p>
                                  </div>
                                )}
                                {shot.videoPrompt && (
                                  <div className="p-4 rounded bg-white border border-slate-100">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase block mb-2 tracking-widest">Video Prompt (Motion)</span>
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">{shot.videoPrompt}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-6 mt-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-1.5 opacity-60">
                                  <Camera className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="text-[10px] font-bold text-slate-500">{shot.camera}</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-60">
                                  <Lightbulb className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="text-[10px] font-bold text-slate-500">{shot.lighting}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 rounded-xl bg-white border border-slate-100 text-center flex flex-col items-center gap-4 shadow-sm">
                          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                            {outputFormat.includes('Plates') ? <ImageIcon className="w-6 h-6 text-orange-500" /> : <Clapperboard className="w-6 h-6 text-orange-500" />}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-slate-900 uppercase tracking-tight">{outputFormat} Protocol</h4>
                            <p className="text-xs text-slate-400">Literal visual translation verified for {profile.model}</p>
                          </div>
                          <div className="w-full text-left p-6 rounded bg-slate-50 border border-slate-100 font-mono text-[10px] leading-relaxed text-slate-500">
                            {getFormattedOutput(outputFormat)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                      <button onClick={() => setStep('input')} className="btn-secondary">
                        Re-Ingest Track
                      </button>
                      <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export Protocol
                      </button>
                    </div>
                  </div>
                </StepLayout>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Bottom Tray: Creative Profile Summary */}
        <div className="bottom-tray px-8 py-3 flex items-center justify-between gap-8 flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Model</span>
              <span className="text-xs font-bold text-orange-600">{profile.model || "[PENDING]"}</span>
            </div>
            <div className="h-6 w-px bg-slate-100"></div>
            <div className="flex flex-col max-w-[200px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Vibe</span>
              <span className="text-xs font-medium truncate italic">{profile.style || "Initializing..."}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar">
            {[
              { label: 'DIR', value: profile.direction },
              { label: 'AES', value: profile.aesthetic },
              { label: 'CHAR', value: profile.characters },
              { label: 'ENG', value: profile.energy },
              { label: 'CAM', value: profile.camera },
              { label: 'LGT', value: profile.lighting },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm flex-shrink-0 ${!item.value ? 'opacity-30' : ''}`}>
                <span className="text-[9px] font-bold text-slate-400">{item.label}</span>
                <span className="text-[10px] font-bold uppercase text-slate-700">{item.value || "-"}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {characterDescription && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-orange-50 px-2 py-1 rounded border border-orange-100 italic">
                <Sparkles className="w-3 h-3 text-orange-500" /> Ref Loaded
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">V2C 2.0 SYNC</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepLayout({ title, subtitle, children, onBack }: { title: string, subtitle: string, children: React.ReactNode, onBack?: () => void, key?: React.Key }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8 text-center">
        <span className="text-orange-500 text-xs font-bold uppercase tracking-widest">{title}</span>
        <h2 className="text-3xl font-bold mt-2 text-slate-900">{subtitle}</h2>
        {onBack && (
           <div className="mt-4 flex justify-center">
             <button onClick={onBack} className="text-[10px] uppercase font-bold text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-1">
               <ChevronLeft className="w-3 h-3" /> Back to Previous Protocol
             </button>
           </div>
        )}
      </div>
      <div>
        {children}
      </div>
    </motion.div>
  );
}

