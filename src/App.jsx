import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ArrowLeft, Volume2, Mic, MicOff, Tag, X } from 'lucide-react';
import { glossaryService } from '@/lib/glossaryService';

const debounce = (func, wait) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; };

export default function GlossaryApp() {
  const [s, setS] = useState({ terms: [], search: '', selected: null, view: 'list', isListening: false, feedback: '', isGeneratingAudio: false, elevenLabsKey: localStorage.getItem('elevenLabsKey') || '', tags: [], selectedTag: 'all', loading: true, error: null, localTerm: null, newTag: '', recognition: null, importJson: '', importStatus: '' });
  const update = (u) => setS(p => ({ ...p, ...u }));

  useEffect(() => { (async () => { try { update({ loading: true }); const [allTerms, allTags] = await Promise.all([glossaryService.getAllTerms(), glossaryService.getAllTags()]); update({ terms: allTerms, tags: allTags, error: null, loading: false }); } catch (err) { update({ error: 'Failed to load data. Please check Firebase configuration.', loading: false }); } })(); }, []);
  useEffect(() => { update({ localTerm: s.selected }); }, [s.selected]);
  useEffect(() => { if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; const r = new SpeechRecognition(); Object.assign(r, { continuous: false, interimResults: false, lang: 'en-AU' }); r.onresult = (e) => { const spoken = e.results[0][0].transcript.toLowerCase().trim(); const target = s.localTerm?.term?.toLowerCase().trim(); update({ feedback: spoken === target ? 'Perfect! 🎉' : spoken.includes(target) || target.includes(spoken) ? 'Close! Try again.' : `You said "${spoken}" - try saying "${s.localTerm?.term}"`, isListening: false }); }; r.onerror = () => update({ feedback: 'Speech recognition error. Try again.', isListening: false }); update({ recognition: r }); } }, [s.localTerm?.term]);

  const debouncedSave = useCallback(debounce(async (field, value) => { if (!s.selected) return; try { await glossaryService.updateTerm(s.selected.id, { [field]: value }); update({ terms: s.terms.map(t => t.id === s.selected.id ? {...t, [field]: value} : t), selected: {...s.selected, [field]: value} }); if (field === 'tags') { const allTags = await glossaryService.getAllTags(); update({ tags: allTags }); } } catch (err) { update({ error: 'Failed to save. Please try again.' }); } }, 500), [s.selected, s.terms]);

  const h = {
    inputChange: (field, value) => { update({ localTerm: { ...s.localTerm, [field]: value } }); debouncedSave(field, value); },
    add: async (searchTerm = '') => { try { const termData = { term: searchTerm, definition: "", ipa: "", mandarin: "", tags: [] }; const termId = await glossaryService.addTerm(termData); const newTerm = { id: termId, ...termData }; update({ terms: [newTerm, ...s.terms], selected: newTerm, view: 'detail', search: searchTerm ? '' : s.search }); } catch (err) { update({ error: 'Failed to add term. Please try again.' }); } },
    delete: async (termId) => { try { await glossaryService.deleteTerm(termId); const allTags = await glossaryService.getAllTags(); update({ terms: s.terms.filter(t => t.id !== termId), tags: allTags }); } catch (err) { update({ error: 'Failed to delete term. Please try again.' }); } },
    addTag: () => { if (s.newTag.trim() && !s.localTerm.tags?.includes(s.newTag.trim())) { const updatedTags = [...(s.localTerm.tags || []), s.newTag.trim()]; update({ localTerm: { ...s.localTerm, tags: updatedTags }, newTag: '' }); debouncedSave('tags', updatedTags); } },
    removeTag: (tagToRemove) => { const updatedTags = s.localTerm.tags?.filter(tag => tag !== tagToRemove) || []; update({ localTerm: { ...s.localTerm, tags: updatedTags } }); debouncedSave('tags', updatedTags); },
    speak: async () => { if (!s.elevenLabsKey || !s.localTerm?.term) return; update({ isGeneratingAudio: true }); try { const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', { method: 'POST', headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': s.elevenLabsKey }, body: JSON.stringify({ text: s.localTerm.term, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.5 } }) }); if (response.ok) { const audio = new Audio(); audio.src = URL.createObjectURL(await response.blob()); audio.play(); } } catch (error) { console.error('ElevenLabs error:', error); } finally { update({ isGeneratingAudio: false }); } },
    speakFallback: () => { if ('speechSynthesis' in window && s.localTerm?.term) { const utterance = new SpeechSynthesisUtterance(s.localTerm.term); utterance.lang = 'en-AU'; speechSynthesis.speak(utterance); } },
    startListening: () => { if (s.recognition) { update({ feedback: '', isListening: true }); s.recognition.start(); } },
    stopListening: () => { if (s.recognition) { s.recognition.stop(); update({ isListening: false }); } },
    importTerms: async () => { try { update({ importStatus: 'Importing...' }); const terms = JSON.parse(s.importJson); let success = 0; for (const term of terms) { await glossaryService.addTerm(term); success++; } update({ importStatus: `✅ Imported ${success} terms successfully!`, importJson: '' }); const [allTerms, allTags] = await Promise.all([glossaryService.getAllTerms(), glossaryService.getAllTags()]); update({ terms: allTerms, tags: allTags }); } catch (err) { update({ importStatus: `❌ Import failed: ${err.message}` }); } },
    cleanupBlankEntries: async () => { try { update({ importStatus: 'Cleaning up blank entries...' }); const blankTerms = s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled'); let deleted = 0; for (const term of blankTerms) { await glossaryService.deleteTerm(term.id); deleted++; } update({ importStatus: `✅ Cleaned up ${deleted} blank entries!` }); const [allTerms, allTags] = await Promise.all([glossaryService.getAllTerms(), glossaryService.getAllTags()]); update({ terms: allTerms, tags: allTags }); } catch (err) { update({ importStatus: `❌ Cleanup failed: ${err.message}` }); } }
  };

  const getFilteredTerms = () => { let filtered = s.terms; if (s.selectedTag !== 'all') filtered = filtered.filter(term => term.tags?.includes(s.selectedTag)); if (s.search) filtered = filtered.filter(term => term.term.toLowerCase().includes(s.search.toLowerCase()) || term.definition.toLowerCase().includes(s.search.toLowerCase()) || term.mandarin?.toLowerCase().includes(s.search.toLowerCase()) || term.tags?.some(tag => tag.toLowerCase().includes(s.search.toLowerCase()))); return filtered; };

  if (s.loading) return <div className="w-full max-w-md mx-auto min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading glossary...</p></div></div>;
  if (s.error) return <div className="w-full max-w-md mx-auto min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><div className="text-destructive mb-4">⚠️</div><p className="text-destructive mb-4">{s.error}</p><Button onClick={() => window.location.reload()}>Try Again</Button></div></div>;

  return <div className="w-full max-w-md mx-auto min-h-screen bg-background">
    {s.view === 'list' ? <div className="flex flex-col h-screen w-full">
      <div className="flex-none p-4 border-b border-border bg-background space-y-3">
        <div className="relative max-w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search" value={s.search} onChange={(e) => update({ search: e.target.value })} className="w-full pl-10 h-12 text-base" onKeyDown={(e) => e.key === 'Enter' && s.search && !s.terms.length && h.add(s.search)} /></div>
        {s.tags.length > 0 && <div className="flex flex-wrap gap-2"><Button variant={s.selectedTag === 'all' ? 'default' : 'outline'} size="sm" onClick={() => update({ selectedTag: 'all' })} className="text-xs">All</Button>{s.tags.map(tag => <Button key={tag} variant={s.selectedTag === tag ? 'default' : 'outline'} size="sm" onClick={() => update({ selectedTag: tag })} className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Button>)}</div>}
      </div>
      <ScrollArea className="flex-1"><div className="divide-y divide-border">
        {getFilteredTerms().map(term => <div key={term.id} className="p-4 hover:bg-accent active:bg-accent/80 cursor-pointer transition-colors" onClick={() => { update({ selected: term, view: 'detail' }); }}><div className="font-medium text-base mb-1 text-foreground break-words">{term.term || "Untitled"}</div><div className="text-sm text-muted-foreground line-clamp-2 break-words mb-2">{term.definition || "Tap to add definition"}</div>{term.tags && term.tags.length > 0 && <div className="flex flex-wrap gap-1">{term.tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"><Tag className="h-2 w-2 mr-1" />{tag}</span>)}</div>}</div>)}
        {s.terms.length === 0 && <div className="p-8 text-center text-muted-foreground">{s.search ? 'No matches - press Enter to create' : 'No terms yet'}</div>}
      </div></ScrollArea>
      <div className="flex-none p-4 space-y-2"><Button className="w-full h-12" onClick={() => h.add()}><Plus className="h-4 w-4 mr-2" />Add Term</Button><Button className="w-full h-12" variant="secondary" onClick={() => update({ view: 'import' })}>📥 Import Terms</Button></div>
    </div> : s.view === 'import' ? <div className="flex flex-col h-screen w-full">
      <div className="flex-none p-4 border-b border-border bg-background flex justify-between items-center">
        <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => update({ view: 'list' })}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <span className="text-lg font-medium">Import Terms</span>
        <div></div>
      </div>
      <ScrollArea className="flex-1"><div className="p-4 space-y-4">
        <div className="bg-muted border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">JSON Format</h3>
          <pre className="text-xs text-muted-foreground bg-muted/50 p-2 rounded overflow-x-auto">{`[
  {
    "term": "Algorithm",
    "definition": "Step-by-step procedure...",
    "ipa": "/ˈælɡərɪðəm/",
    "mandarin": "算法",
    "tags": ["computer-science", "programming"]
  }
]`}</pre>
        </div>
        <Textarea placeholder="Paste your JSON array here..." value={s.importJson} onChange={(e) => update({ importJson: e.target.value })} className="w-full min-h-60 text-sm font-mono" rows={15} />
        {s.importStatus && <div className={`text-sm p-3 rounded ${s.importStatus.includes('✅') ? 'bg-green-100 text-green-700' : s.importStatus.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.importStatus}</div>}
        <div className="space-y-2">
          <Button className="w-full h-12" onClick={h.importTerms} disabled={!s.importJson.trim()}>Import Terms</Button>
          <Button className="w-full h-12" variant="destructive" onClick={h.cleanupBlankEntries} disabled={s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled').length === 0}>🧹 Clean Blank Entries ({s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled').length})</Button>
        </div>
      </div></ScrollArea>
    </div> : <div className="flex flex-col h-screen w-full">
      <div className="flex-none p-4 border-b border-border bg-background flex justify-between items-center">
        <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => update({ view: 'list', selected: null })}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm('Delete this term?')) { h.delete(s.selected.id); update({ view: 'list', selected: null }); } }}>Delete</Button>
      </div>
      <ScrollArea className="flex-1"><div className="p-4 space-y-4">
        <div className="space-y-2">
          <Input placeholder="Term" value={s.localTerm?.term || ''} onChange={(e) => h.inputChange('term', e.target.value)} className="w-full h-12 text-lg font-medium" />
          {s.localTerm?.term && <div className="bg-muted border border-border rounded-lg p-3 space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">Practice Pronunciation</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={s.elevenLabsKey ? h.speak : h.speakFallback} disabled={s.isGeneratingAudio}><Volume2 className="h-3 w-3 mr-1" />{s.isGeneratingAudio ? 'Loading...' : s.elevenLabsKey ? 'Listen (AusE)' : 'Listen'}</Button><Button size="sm" variant={s.isListening ? "destructive" : "default"} onClick={s.isListening ? h.stopListening : h.startListening}>{s.isListening ? <MicOff className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}{s.isListening ? 'Stop' : 'Practice'}</Button></div></div>{s.feedback && <div className={`text-sm p-2 rounded ${s.feedback.includes('Perfect') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.feedback}</div>}{s.isListening && <div className="text-sm text-muted-foreground italic">🎤 Listening... Say "{s.localTerm.term}"</div>}</div>}
        </div>
        <Input placeholder="IPA" value={s.localTerm?.ipa || ''} onChange={(e) => h.inputChange('ipa', e.target.value)} className="w-full h-12 text-base font-mono" />
        <Input placeholder="Mandarin" value={s.localTerm?.mandarin || ''} onChange={(e) => h.inputChange('mandarin', e.target.value)} className="w-full h-12 text-base" />
        <Textarea placeholder="Definition" value={s.localTerm?.definition || ''} onChange={(e) => h.inputChange('definition', e.target.value)} className="w-full min-h-40 text-base resize-none" rows={10} />
        <div className="space-y-3">{s.localTerm?.tags && s.localTerm.tags.length > 0 && <div className="flex flex-wrap gap-2">{s.localTerm.tags.map(tag => <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"><Tag className="h-3 w-3 mr-1" />{tag}<button onClick={() => h.removeTag(tag)} className="ml-2 hover:text-primary/80"><X className="h-3 w-3" /></button></span>)}</div>}<div className="flex gap-2"><Input placeholder="Tag" value={s.newTag} onChange={(e) => update({ newTag: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && h.addTag()} className="flex-1 text-sm" /><Button size="sm" variant="outline" onClick={h.addTag} disabled={!s.newTag.trim()}><Tag className="h-3 w-3 mr-1" />Add</Button></div></div>
      </div></ScrollArea>
    </div>}
  </div>;
}