import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ArrowLeft, Volume2, Mic, MicOff, Tag, X } from 'lucide-react';
import { glossaryService } from '@/lib/glossaryService';

// Simple debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ListView = ({ terms, search, onSearch, onSelect, onAdd, tags, selectedTag, onTagSelect }) => (
  <div className="flex flex-col h-screen w-full">
    {/* Fixed header */}
    <div className="flex-none p-4 border-b border-gray-200 bg-white space-y-3">
      <div className="relative max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
        <Input 
          placeholder="Search terms..." 
          value={search}
          onChange={onSearch}
          className="w-full pl-10 h-12 text-base bg-white border-gray-300 text-gray-900 placeholder-gray-600"
          onKeyDown={(e) => e.key === 'Enter' && search && !terms.length && onAdd(search)}
        />
      </div>
      
      {/* Tags filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedTag === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTagSelect('all')}
            className="text-xs"
          >
            All
          </Button>
          {tags.map(tag => (
            <Button
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTagSelect(tag)}
              className="text-xs"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Button>
          ))}
        </div>
      )}
    </div>

    {/* Scrollable content */}
    <ScrollArea className="flex-1">
      <div className="divide-y divide-gray-200">
        {terms.map(term => (
          <div 
            key={term.id}
            className="p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => onSelect(term)}
          >
            <div className="font-medium text-base mb-1 text-gray-900 break-words">
              {term.term || "Untitled"}
            </div>
            <div className="text-sm text-gray-700 line-clamp-2 break-words mb-2">
              {term.definition || "Tap to add definition"}
            </div>
            {term.tags && term.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {term.tags.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {terms.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            {search ? 'No matches - press Enter to create' : 'No terms yet'}
          </div>
        )}
      </div>
    </ScrollArea>

    {/* Fixed add button */}
    <div className="flex-none p-4">
      <Button 
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium" 
        onClick={() => onAdd()}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Term
      </Button>
    </div>
  </div>
);

const DetailView = ({ term, onBack, onChange, elevenLabsKey, setElevenLabsKey, isListening, setIsListening, feedback, setFeedback, isGeneratingAudio, setIsGeneratingAudio, onDelete }) => {
  const [recognition, setRecognition] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [localTerm, setLocalTerm] = useState(term);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalTerm(term);
  }, [term]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-AU';
      
      recognitionInstance.onresult = (event) => {
        const spoken = event.results[0][0].transcript.toLowerCase().trim();
        const target = localTerm?.term?.toLowerCase().trim();
        
        if (spoken === target) {
          setFeedback('Perfect! 🎉');
        } else if (spoken.includes(target) || target.includes(spoken)) {
          setFeedback('Close! Try again.');
        } else {
          setFeedback(`You said "${spoken}" - try saying "${localTerm?.term}"`);
        }
        setIsListening(false);
      };
      
      recognitionInstance.onerror = () => {
        setFeedback('Speech recognition error. Try again.');
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, [localTerm?.term, setFeedback, setIsListening]);

  const startListening = () => {
    if (recognition) {
      setFeedback('');
      setIsListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speakWithElevenLabs = async () => {
    if (!elevenLabsKey || !localTerm?.term) return;
    
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey
        },
        body: JSON.stringify({
          text: localTerm.term,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });
      
      if (response.ok) {
        const audio = new Audio();
        audio.src = URL.createObjectURL(await response.blob());
        audio.play();
      }
    } catch (error) {
      console.error('ElevenLabs error:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const speakTermFallback = () => {
    if ('speechSynthesis' in window && localTerm?.term) {
      const utterance = new SpeechSynthesisUtterance(localTerm.term);
      utterance.lang = 'en-AU';
      speechSynthesis.speak(utterance);
    }
  };

  const saveElevenLabsKey = (key) => {
    setElevenLabsKey(key);
    localStorage.setItem('elevenLabsKey', key);
  };

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (field, value) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onChange(field, value);
      } catch (error) {
        console.error('Error saving:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500),
    [onChange, isSaving]
  );

  // Handle input changes with local state
  const handleInputChange = (field, value) => {
    setLocalTerm(prev => ({ ...prev, [field]: value }));
    debouncedSave(field, value);
  };

  const addTag = () => {
    if (newTag.trim() && !localTerm.tags?.includes(newTag.trim())) {
      const updatedTags = [...(localTerm.tags || []), newTag.trim()];
      setLocalTerm(prev => ({ ...prev, tags: updatedTags }));
      onChange('tags', updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = localTerm.tags?.filter(tag => tag !== tagToRemove) || [];
    setLocalTerm(prev => ({ ...prev, tags: updatedTags }));
    onChange('tags', updatedTags);
  };

  const handleDelete = () => {
    if (confirm('Delete this term?')) {
      onDelete(term.id);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Fixed header */}
      <div className="flex-none p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <Button 
          variant="ghost" 
          className="h-12 px-4 text-base text-gray-900 hover:bg-gray-100" 
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Input 
              placeholder="Term name..."
              value={localTerm?.term || ''}
              onChange={(e) => handleInputChange('term', e.target.value)}
              className="w-full h-12 text-lg font-medium bg-white border-gray-300 text-gray-900 placeholder-gray-600 focus:border-blue-500 focus:ring-blue-500"
            />
            
            {/* API Key Input */}
            {!elevenLabsKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm font-medium text-yellow-800 mb-2">Add ElevenLabs API Key for Natural Australian Voice</div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="sk-..."
                    type="password"
                    onChange={(e) => saveElevenLabsKey(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://elevenlabs.io/app/settings/api-keys', '_blank')}
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                  >
                    Get Key
                  </Button>
                </div>
              </div>
            )}

            {/* Pronunciation Practice Section */}
            {localTerm?.term && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Practice Pronunciation</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={elevenLabsKey ? speakWithElevenLabs : speakTermFallback}
                      disabled={isGeneratingAudio}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      {isGeneratingAudio ? 'Loading...' : elevenLabsKey ? 'Listen (AusE)' : 'Listen'}
                    </Button>
                    <Button
                      size="sm"
                      variant={isListening ? "destructive" : "default"}
                      onClick={isListening ? stopListening : startListening}
                      className={isListening ? "" : "bg-blue-600 hover:bg-blue-700"}
                    >
                      {isListening ? <MicOff className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
                      {isListening ? 'Stop' : 'Practice'}
                    </Button>
                  </div>
                </div>
                {feedback && (
                  <div className={`text-sm p-2 rounded ${feedback.includes('Perfect') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {feedback}
                  </div>
                )}
                {isListening && (
                  <div className="text-sm text-blue-600 italic">
                    🎤 Listening... Say "{localTerm.term}"
                  </div>
                )}
              </div>
            )}
          </div>

          <Input 
            placeholder="IPA pronunciation (e.g., /ˌeɪ piː ˈaɪ/)..."
            value={localTerm?.ipa || ''}
            onChange={(e) => handleInputChange('ipa', e.target.value)}
            className="w-full h-12 text-base font-mono bg-white border-gray-300 text-blue-600 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
          />
          <Input 
            placeholder="Mandarin translation..."
            value={localTerm?.mandarin || ''}
            onChange={(e) => handleInputChange('mandarin', e.target.value)}
            className="w-full h-12 text-base bg-white border-gray-300 text-green-700 placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
          />
          <Textarea 
            placeholder="Add definition..."
            value={localTerm?.definition || ''}
            onChange={(e) => handleInputChange('definition', e.target.value)}
            className="w-full min-h-40 text-base resize-none bg-white border-gray-300 text-gray-900 placeholder-gray-600 focus:border-blue-500 focus:ring-blue-500"
            rows={10}
          />

          {/* Tags Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Tags</label>
            
            {/* Current tags */}
            {localTerm?.tags && localTerm.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localTerm.tags.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="flex gap-2">
              <Input 
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={addTag}
                disabled={!newTag.trim()}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Tag className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default function GlossaryApp() {
  const [terms, setTerms] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('list');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [elevenLabsKey, setElevenLabsKey] = useState(localStorage.getItem('elevenLabsKey') || '');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load terms from Firebase
  useEffect(() => {
    loadTerms();
    loadTags();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const allTerms = await glossaryService.getAllTerms();
      setTerms(allTerms);
      setError(null);
    } catch (err) {
      console.error('Error loading terms:', err);
      setError('Failed to load terms. Please check your Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const allTags = await glossaryService.getAllTags();
      setTags(allTags);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const getFilteredTerms = () => {
    let filtered = terms;

    // Filter by tag
    if (selectedTag !== 'all') {
      filtered = filtered.filter(term => term.tags?.includes(selectedTag));
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(term => 
        term.term.toLowerCase().includes(search.toLowerCase()) || 
        term.definition.toLowerCase().includes(search.toLowerCase()) ||
        term.mandarin?.toLowerCase().includes(search.toLowerCase()) ||
        term.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }

    return filtered;
  };

  const handleAdd = async (searchTerm = '') => {
    try {
      const termData = {
        term: searchTerm,
        definition: "",
        ipa: "",
        mandarin: "",
        tags: []
      };
      
      const termId = await glossaryService.addTerm(termData);
      const newTerm = { id: termId, ...termData };
      
      setTerms([newTerm, ...terms]);
      setSelected(newTerm);
      setView('detail');
      if (searchTerm) setSearch('');
    } catch (err) {
      console.error('Error adding term:', err);
      setError('Failed to add term. Please try again.');
    }
  };

  const handleSave = async (field, value) => {
    if (!selected) return;
    
    try {
      await glossaryService.updateTerm(selected.id, { [field]: value });
      
      const updated = terms.map(t => t.id === selected.id ? {...t, [field]: value} : t);
      setTerms(updated);
      setSelected({...selected, [field]: value});
      
      // Reload tags if we updated tags
      if (field === 'tags') {
        loadTags();
      }
    } catch (err) {
      console.error('Error updating term:', err);
      setError('Failed to update term. Please try again.');
    }
  };

  const handleDelete = async (termId) => {
    try {
      await glossaryService.deleteTerm(termId);
      setTerms(terms.filter(t => t.id !== termId));
      loadTags(); // Reload tags in case this term had unique tags
    } catch (err) {
      console.error('Error deleting term:', err);
      setError('Failed to delete term. Please try again.');
    }
  };

  const handleBack = () => {
    setView('list');
    setSelected(null);
  };

  const handleSelect = (term) => {
    setSelected(term);
    setView('detail');
  };

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading glossary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadTerms} className="bg-blue-600 hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      {view === 'list' ? (
        <ListView 
          terms={getFilteredTerms()}
          search={search}
          onSearch={(e) => setSearch(e.target.value)}
          onSelect={handleSelect}
          onAdd={handleAdd}
          tags={tags}
          selectedTag={selectedTag}
          onTagSelect={handleTagSelect}
        />
      ) : (
        <DetailView 
          term={selected}
          onBack={handleBack}
          onChange={handleSave}
          onDelete={handleDelete}
          elevenLabsKey={elevenLabsKey}
          setElevenLabsKey={setElevenLabsKey}
          isListening={isListening}
          setIsListening={setIsListening}
          feedback={feedback}
          setFeedback={setFeedback}
          isGeneratingAudio={isGeneratingAudio}
          setIsGeneratingAudio={setIsGeneratingAudio}
        />
      )}
    </div>
  );
}
