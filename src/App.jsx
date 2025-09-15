import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PronunciationPractice } from '@/components/ui/pronunciation-practice';
import { Plus, Search, ArrowLeft, Tag, X, ChevronDown, Volume2, Mic } from 'lucide-react';
import { glossaryService } from '@/lib/glossaryService';

const debounce = (func, wait) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; };
const APP_VERSION = "Version 9";

export default function GlossaryApp() {
  const [s, setS] = useState({ terms: [], search: '', selected: null, view: 'list', tags: [], selectedTag: 'all', loading: true, error: null, localTerm: null, newTag: '', importJson: '', importStatus: '', tagDropdownOpen: false, isGeneratingAudio: false, pronunciationModalOpen: false });
  const update = (u) => setS(p => ({ ...p, ...u })) ;
  useEffect(() => { (async () => { try { update({ loading: true }); const allTerms = await glossaryService.getAllTerms(); const allTags = [...new Set(allTerms.flatMap(term => term.tags || []))].sort(); update({ terms: allTerms, tags: allTags, error: null, loading: false }); } catch (err) { update({ error: 'Failed to load data. Please check Firebase configuration.', loading: false }); } })(); }, []);
  useEffect(() => { update({ localTerm: s.selected }); }, [s.selected]);
  useEffect(() => { const handleClickOutside = (e) => { if (s.tagDropdownOpen && !e.target.closest('.tag-dropdown')) { update({ tagDropdownOpen: false }); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [s.tagDropdownOpen]);

  const debouncedSave = useCallback(debounce(async (field, value) => { if (!s.selected) return; try { await glossaryService.updateTerm(s.selected.id, { [field]: value }); update({ terms: s.terms.map(t => t.id === s.selected.id ? {...t, [field]: value} : t), selected: {...s.selected, [field]: value} }); if (field === 'tags') { const allTags = [...new Set(s.terms.flatMap(term => term.tags || []))].sort(); update({ tags: allTags }); } } catch (err) { update({ error: 'Failed to save. Please try again.' }); } }, 500), [s.selected, s.terms]);

  const h = {
    inputChange: (field, value) => { update({ localTerm: { ...s.localTerm, [field]: value } }); debouncedSave(field, value); },
    add: async (searchTerm = '') => { try { const termData = { term: searchTerm, definition: "", ipa: "", mandarin: "", tags: [] }; const termId = await glossaryService.addTerm(termData); const newTerm = { id: termId, ...termData }; update({ terms: [newTerm, ...s.terms], selected: newTerm, view: 'detail', search: searchTerm ? '' : s.search }); } catch (err) { update({ error: 'Failed to add term. Please try again.' }); } },
    delete: async (termId) => { try { await glossaryService.deleteTerm(termId); const newTerms = s.terms.filter(t => t.id !== termId); const allTags = [...new Set(newTerms.flatMap(term => term.tags || []))].sort(); update({ terms: newTerms, tags: allTags }); } catch (err) { update({ error: 'Failed to delete term. Please try again.' }); } },
    addTag: () => { if (s.newTag.trim() && !s.localTerm.tags?.includes(s.newTag.trim())) { const updatedTags = [...(s.localTerm.tags || []), s.newTag.trim()]; update({ localTerm: { ...s.localTerm, tags: updatedTags }, newTag: '' }); debouncedSave('tags', updatedTags); } },
    removeTag: (tagToRemove) => { const updatedTags = s.localTerm.tags?.filter(tag => tag !== tagToRemove) || []; update({ localTerm: { ...s.localTerm, tags: updatedTags } }); debouncedSave('tags', updatedTags); },
    speak: async () => { if (!s.localTerm?.term || s.isGeneratingAudio) return; const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY; console.log('ElevenLabs API Key:', apiKey ? 'Found' : 'Missing'); if (!apiKey) { console.error('No ElevenLabs API key found. Set VITE_ELEVENLABS_API_KEY in .env.local'); return; } update({ isGeneratingAudio: true }); try { console.log('Making ElevenLabs request for:', s.localTerm.term); const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/IKne3meq5aSn9XLyUdCD', { method: 'POST', headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey }, body: JSON.stringify({ text: s.localTerm.term, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.3, similarity_boost: 0.3, style: 0.2, use_speaker_boost: true } }) }); console.log('ElevenLabs response status:', response.status); if (response.ok) { const audioBlob = await response.blob(); const audio = new Audio(); audio.preload = 'auto'; audio.crossOrigin = 'anonymous'; audio.src = URL.createObjectURL(audioBlob); audio.onloadeddata = () => { console.log('Audio playing...'); audio.play(); update({ isGeneratingAudio: false }); }; audio.onerror = (e) => { console.error('Audio playback error:', e); update({ isGeneratingAudio: false }); }; } else { console.error('ElevenLabs API error:', response.status, response.statusText); update({ isGeneratingAudio: false }); } } catch (error) { console.error('ElevenLabs error:', error); update({ isGeneratingAudio: false }); } },
    onPronunciationScore: (score, transcript) => { console.log('Pronunciation score:', score, 'Transcript:', transcript); },
    importTerms: async () => { try { update({ importStatus: 'Importing...' }); const terms = JSON.parse(s.importJson); let success = 0; for (const term of terms) { await glossaryService.addTerm(term); success++; } update({ importStatus: `✅ Imported ${success} terms successfully!`, importJson: '' }); const allTerms = await glossaryService.getAllTerms(); const allTags = [...new Set(allTerms.flatMap(term => term.tags || []))].sort(); update({ terms: allTerms, tags: allTags }); } catch (err) { update({ importStatus: `❌ Import failed: ${err.message}` }); } },
    cleanupBlankEntries: async () => { try { update({ importStatus: 'Cleaning up blank entries...' }); const blankTerms = s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled'); let deleted = 0; for (const term of blankTerms) { await glossaryService.deleteTerm(term.id); deleted++; } update({ importStatus: `✅ Cleaned up ${deleted} blank entries!` }); const allTerms = await glossaryService.getAllTerms(); const allTags = [...new Set(allTerms.flatMap(term => term.tags || []))].sort(); update({ terms: allTerms, tags: allTags }); } catch (err) { update({ importStatus: `❌ Cleanup failed: ${err.message}` }); } }
  };

  const getFilteredTerms = () => { let filtered = s.terms; if (s.selectedTag !== 'all') filtered = filtered.filter(term => term.tags?.includes(s.selectedTag)); if (s.search) filtered = filtered.filter(term => term.term.toLowerCase().includes(s.search.toLowerCase()) || term.definition.toLowerCase().includes(s.search.toLowerCase()) || term.mandarin?.toLowerCase().includes(s.search.toLowerCase()) || term.tags?.some(tag => tag.toLowerCase().includes(s.search.toLowerCase()))); return filtered; };

  if (s.loading) return <div className="w-full max-w-md mx-auto min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading glossary...</p></div></div>;
  if (s.error) return <div className="w-full max-w-md mx-auto min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><div className="text-destructive mb-4">⚠️</div><p className="text-destructive mb-4">{s.error}</p><Button onClick={() => window.location.reload()}>Try Again</Button></div></div>;

  return <div className="w-full max-w-md mx-auto min-h-screen bg-background flex flex-col">
    {s.view === 'list' ? <div className="flex flex-col h-screen w-full">
        <div className="text-center mb-6"><h1 className="text-5xl font-bold text-primary" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>fingloss</h1></div>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search" value={s.search} onChange={(e) => update({ search: e.target.value })} className="w-full pl-10 h-10 text-sm" onKeyDown={(e) => e.key === 'Enter' && s.search && !s.terms.length && h.add(s.search)} /></div>
          {s.tags.length > 0 && <div className="relative tag-dropdown">
            <Button variant="outline" size="sm" onClick={() => update({ tagDropdownOpen: !s.tagDropdownOpen })} className="h-10 px-3 text-sm whitespace-nowrap">
              <Tag className="h-4 w-4 mr-2" />{s.selectedTag === 'all' ? 'All Tags' : s.selectedTag}<ChevronDown className="h-4 w-4 ml-2" />
            </Button>
            {s.tagDropdownOpen && <div className="absolute top-full right-0 mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
              <div className="p-1">
                <Button variant={s.selectedTag === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => { update({ selectedTag: 'all', tagDropdownOpen: false }); }} className="w-full justify-start text-sm"><Tag className="h-4 w-4 mr-2" />All Tags</Button>
                {s.tags.map(tag => <Button key={tag} variant={s.selectedTag === tag ? 'default' : 'ghost'} size="sm" onClick={() => { update({ selectedTag: tag, tagDropdownOpen: false }); }} className="w-full justify-start text-sm"><Tag className="h-4 w-4 mr-2" />{tag}</Button>)}
              </div>
            </div>}
          </div>}
        </div>
        <div className="flex-1 relative">
          <ScrollArea className="h-full">
            <div className="divide-y divide-border">
              {getFilteredTerms().map(term => <div key={term.id} className="p-4 hover:bg-accent active:bg-accent/80 cursor-pointer transition-colors" onClick={() => { update({ selected: term, view: 'detail' }); }}><div className="flex items-center gap-2 mb-1"><div className="font-medium text-base text-foreground break-words">{term.term || "Untitled"}</div>{term.ipa && <div className="text-sm text-muted-foreground font-mono">{term.ipa}</div>}</div>{term.mandarin && <div className="text-sm text-muted-foreground font-medium mb-1">{term.mandarin}</div>}<div className="text-sm text-muted-foreground line-clamp-2 break-words mb-2">{term.definition || "Tap to add definition"}</div>{term.tags && term.tags.length > 0 && <div className="flex flex-wrap gap-1">{term.tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"><Tag className="h-2 w-2 mr-1" />{tag}</span>)}</div>}</div>)}
              {s.terms.length === 0 && <div className="p-8 text-center text-muted-foreground">{s.search ? 'No matches - press Enter to create' : 'No terms yet'}</div>}
            </div>
          </ScrollArea>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
        </div>
        <div className="flex-none p-4"><div className="flex gap-2"><Button className="flex-1 h-12" onClick={() => h.add()}><Plus className="h-4 w-4 mr-2" />Add Term</Button><Button className="flex-1 h-12" variant="outline" onClick={() => update({ view: 'import' })}>📥 Import</Button></div></div>
        <div className="p-2 text-center">
          <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
        </div>
      </div> : s.view === 'import' ? <div className="flex flex-col h-screen w-full">
      <div className="flex-none p-4 border-b border-border bg-background flex justify-between items-center">
        <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => update({ view: 'list' })}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <span className="text-lg font-medium">Import Terms</span>
        <div></div>
      </div>
      <ScrollArea className="flex-1"><div className="p-4 space-y-4">
        <div className="bg-muted border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">JSON Format</h3>
          <pre className="text-xs text-muted-foreground bg-muted/50 p-2 rounded overflow-x-auto">{`[{"term": "Algorithm", "definition": "Step-by-step procedure...", "ipa": "/ˈælɡərɪðəm/", "mandarin": "算法", "tags": ["computer-science", "programming"]}]`}</pre>
        </div>
        <Textarea placeholder="Paste your JSON array here..." value={s.importJson} onChange={(e) => update({ importJson: e.target.value })} className="w-full min-h-60 text-sm font-mono" rows={15} />
        {s.importStatus && <div className={`text-sm p-3 rounded ${s.importStatus.includes('✅') ? 'bg-green-100 text-green-700' : s.importStatus.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.importStatus}</div>}
        <div className="space-y-2">
          <Button className="w-full h-12" onClick={h.importTerms} disabled={!s.importJson.trim()}>Import Terms</Button>
          <Button className="w-full h-12" variant="destructive" onClick={h.cleanupBlankEntries} disabled={s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled').length === 0}>🧹 Clean Blank Entries ({s.terms.filter(term => !term.term || term.term.trim() === '' || term.term === 'Untitled').length})</Button>
        </div>
      </div></ScrollArea>
      <div className="p-2 text-center">
        <p className="text-xs text-muted-foreground">Version 1</p>
      </div>
    </div> : <div className="flex flex-col h-screen w-full">
      <div className="flex-none p-4 border-b border-border bg-background flex justify-between items-center">
        <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => update({ view: 'list', selected: null })}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm('Delete this term?')) { h.delete(s.selected.id); update({ view: 'list', selected: null }); } }}>Delete</Button>
      </div>
      <ScrollArea className="flex-1"><div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Term" value={s.localTerm?.term || ''} onChange={(e) => h.inputChange('term', e.target.value)} className="flex-1 h-12 text-lg font-medium" />
            {s.localTerm?.term && (
              <Button size="sm" variant="outline" onClick={h.speak} disabled={s.isGeneratingAudio} className="h-12 px-3">
                <Volume2 className="h-4 w-4 mr-1" />
                {s.isGeneratingAudio ? 'Loading...' : 'Listen'}
              </Button>
            )}
          </div>
          {s.localTerm?.term && (
            <Button
              onClick={() => update({ pronunciationModalOpen: true })}
              variant="outline"
              className="w-full"
            >
              <Mic className="h-4 w-4 mr-2" />
              Practice Pronunciation
            </Button>
          )}
        </div>
        <Input placeholder="IPA" value={s.localTerm?.ipa || ''} onChange={(e) => h.inputChange('ipa', e.target.value)} className="w-full h-12 text-base font-mono" />
        <Input placeholder="Mandarin" value={s.localTerm?.mandarin || ''} onChange={(e) => h.inputChange('mandarin', e.target.value)} className="w-full h-12 text-base" />
        <Textarea placeholder="Definition" value={s.localTerm?.definition || ''} onChange={(e) => h.inputChange('definition', e.target.value)} className="w-full min-h-40 text-base resize-none" rows={10} />
        <div className="space-y-3">{s.localTerm?.tags && s.localTerm.tags.length > 0 && <div className="flex flex-wrap gap-2">{s.localTerm.tags.map(tag => <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"><Tag className="h-3 w-3 mr-1" />{tag}<button onClick={() => h.removeTag(tag)} className="ml-2 hover:text-primary/80"><X className="h-3 w-3" /></button></span>)}</div>}<div className="flex gap-2"><Input placeholder="Tag" value={s.newTag} onChange={(e) => update({ newTag: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && h.addTag()} className="flex-1 text-sm" /><Button size="sm" variant="outline" onClick={h.addTag} disabled={!s.newTag.trim()}><Tag className="h-3 w-3 mr-1" />Add</Button></div></div>
      </div></ScrollArea>
      <div className="p-2 text-center">
        <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
      </div>
    </div>}
    
    {/* Pronunciation Practice Modal */}
    {s.localTerm?.term && (
      <PronunciationPractice 
        term={s.localTerm.term} 
        onScore={h.onPronunciationScore}
        open={s.pronunciationModalOpen}
        onOpenChange={(open) => update({ pronunciationModalOpen: open })}
      />
    )}
  </div>;
}