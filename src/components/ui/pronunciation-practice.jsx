import { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Mic, MicOff, CheckCircle, AlertCircle, X } from 'lucide-react';

export function PronunciationPractice({ term, onScore, open, onOpenChange }) {
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [manualStop, setManualStop] = useState(false);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      resetTranscript();
      setScore(null);
      setFeedback('');
      setIsListening(false);
      setManualStop(false);
    }
  }, [open, resetTranscript]);

  // Calculate pronunciation score
  const calculateScore = (spoken, target) => {
    if (!spoken || !target) return 0;
    
    // Debug logging
    console.log('Scoring:', { spoken, target });
    
    // Special handling for problematic words that speech recognition struggles with
    const problematicWords = {
      'underscore': ['underscore', 'under score', 'under-score', 'under_score', '_'],
      'ampersand': ['ampersand', 'and symbol', 'and sign', '&'],
      'asterisk': ['asterisk', 'star', '*'],
      'parentheses': ['parentheses', 'parens', 'brackets', '()'],
      'brackets': ['brackets', 'square brackets', '[]'],
      'curly braces': ['curly braces', 'braces', '{}'],
      'backslash': ['backslash', 'back slash', '\\'],
      'forward slash': ['forward slash', 'slash', '/'],
      'pipe': ['pipe', 'vertical bar', '|'],
      'tilde': ['tilde', '~'],
      'hash': ['hash', '#'],
      'at symbol': ['at symbol', 'at sign', '@'],
      'percent': ['percent', '%'],
      'dollar': ['dollar', '$'],
      'exclamation': ['exclamation', 'exclamation mark', '!'],
      'question': ['question', 'question mark', '?'],
      'comma': ['comma', ','],
      'period': ['period', 'dot', '.'],
      'colon': ['colon', ':'],
      'semicolon': ['semicolon', ';'],
      'quotes': ['quotes', 'quotation marks', '"'],
      'apostrophe': ['apostrophe', "'"]
    };
    
    // Check if the target is a problematic word
    const targetLower = target.toLowerCase();
    const isProblematic = problematicWords[targetLower];
    
    if (isProblematic) {
      const spokenLower = spoken.toLowerCase().trim();
      
      // Check if the spoken word matches any of the acceptable variations
      for (const variation of isProblematic) {
        if (spokenLower === variation || spokenLower.includes(variation)) {
          console.log('Matched problematic word variation:', { spoken, target, variation });
          return 100;
        }
      }
      
      // If no exact match, try fuzzy matching on the variations
      let bestScore = 0;
      for (const variation of isProblematic) {
        const distance = levenshteinDistance(spokenLower, variation);
        const maxLength = Math.max(spokenLower.length, variation.length);
        const score = Math.round(((maxLength - distance) / maxLength) * 100);
        bestScore = Math.max(bestScore, score);
      }
      
      console.log('Problematic word fuzzy match:', { spoken, target, bestScore });
      return bestScore;
    }
    
    // Normalize both strings: convert to lowercase, trim, and handle special characters
    // Only replace underscores with spaces if the target actually contains underscores
    const normalizeText = (text, hasUnderscores = false) => {
      let normalized = text.toLowerCase().trim();
      
      if (hasUnderscores) {
        normalized = normalized.replace(/_/g, ' ');  // Replace underscores with spaces
      }
      
      // Remove other special characters for comparison, but keep letters and spaces
      normalized = normalized.replace(/[^\w\s]/g, '');
      // Normalize multiple spaces to single space
      normalized = normalized.replace(/\s+/g, ' ').trim();
      
      return normalized;
    };
    
    const hasUnderscores = target.includes('_');
    const spokenNormalized = normalizeText(spoken, hasUnderscores);
    const targetNormalized = normalizeText(target, hasUnderscores);
    
    console.log('Normalized:', { 
      hasUnderscores, 
      spokenNormalized, 
      targetNormalized,
      exactMatch: spokenNormalized === targetNormalized
    });
    
    if (spokenNormalized === targetNormalized) return 100;
    if (spokenNormalized.includes(targetNormalized) || targetNormalized.includes(spokenNormalized)) return 85;
    
    // Levenshtein distance-based similarity
    const distance = levenshteinDistance(spokenNormalized, targetNormalized);
    const maxLength = Math.max(spokenNormalized.length, targetNormalized.length);
    const score = Math.round(((maxLength - distance) / maxLength) * 100);
    
    console.log('Levenshtein score:', { distance, maxLength, score });
    
    return score;
  };

  // Simple Levenshtein distance calculation
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Handle speech recognition result
  useEffect(() => {
    if (finalTranscript && term && !manualStop) {
      console.log('Speech recognition result:', { 
        finalTranscript, 
        term, 
        interimTranscript,
        transcript 
      });
      
      const pronunciationScore = calculateScore(finalTranscript, term);
      setScore(pronunciationScore);
      
      // Show feedback with appropriate normalization info
      const normalizeText = (text, hasUnderscores = false) => {
        let normalized = text.toLowerCase().trim();
        if (hasUnderscores) {
          normalized = normalized.replace(/_/g, ' ');
        }
        normalized = normalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        return normalized;
      };
      
      const hasUnderscores = term.includes('_');
      const normalizedTerm = normalizeText(term, hasUnderscores);
      const normalizedSpoken = normalizeText(finalTranscript, hasUnderscores);
      
      // Special handling for problematic words - show better feedback
      const targetLower = term.toLowerCase();
      const problematicWords = {
        'underscore': ['underscore', 'under score', 'under-score', 'under_score', '_'],
        'ampersand': ['ampersand', 'and symbol', 'and sign', '&'],
        'asterisk': ['asterisk', 'star', '*'],
        'parentheses': ['parentheses', 'parens', 'brackets', '()'],
        'brackets': ['brackets', 'square brackets', '[]'],
        'curly braces': ['curly braces', 'braces', '{}'],
        'backslash': ['backslash', 'back slash', '\\'],
        'forward slash': ['forward slash', 'slash', '/'],
        'pipe': ['pipe', 'vertical bar', '|'],
        'tilde': ['tilde', '~'],
        'hash': ['hash', '#'],
        'at symbol': ['at symbol', 'at sign', '@'],
        'percent': ['percent', '%'],
        'dollar': ['dollar', '$'],
        'exclamation': ['exclamation', 'exclamation mark', '!'],
        'question': ['question', 'question mark', '?'],
        'comma': ['comma', ','],
        'period': ['period', 'dot', '.'],
        'colon': ['colon', ':'],
        'semicolon': ['semicolon', ';'],
        'quotes': ['quotes', 'quotation marks', '"'],
        'apostrophe': ['apostrophe', "'"]
      };
      
      const isProblematic = problematicWords[targetLower];
      
      setFeedback('');
      onScore?.(pronunciationScore, finalTranscript);
      setIsListening(false);
    }
  }, [finalTranscript, term, onScore]);


  // Start listening
  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      setFeedback('Speech recognition not supported in this browser');
      return;
    }
    
    // Reset everything for a fresh attempt
    resetTranscript();
    setScore(null);
    setFeedback('');
    setIsListening(true);
    setManualStop(false);
    
    // Configure speech recognition with better settings
    SpeechRecognition.startListening({
      continuous: false,
      language: 'en-US',
      interimResults: true,
      maxAlternatives: 1
    });
  };

  // Stop listening
  const stopListening = () => {
    console.log('Stop listening clicked');
    setManualStop(true);
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    // Wait a moment for speech recognition to process, then use current transcript
    setTimeout(() => {
      const currentTranscript = transcript || interimTranscript;
      if (currentTranscript && term) {
        console.log('Processing manual stop with transcript:', currentTranscript);
        const pronunciationScore = calculateScore(currentTranscript, term);
        setScore(pronunciationScore);
        onScore?.(pronunciationScore, currentTranscript);
      }
    }, 100);
  };

  // Reset practice
  const resetPractice = () => {
    resetTranscript();
    setScore(null);
    setFeedback('');
    setIsListening(false);
    setManualStop(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-48 flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {term}
          </DialogTitle>
        </DialogHeader>
        
        {!browserSupportsSpeechRecognition ? (
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">
              Speech recognition is not supported in this browser
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
        {/* Practice Controls */}
        <div className="flex gap-3 justify-center items-center min-h-[60px]">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={!term}
            variant={isListening ? "destructive" : "default"}
            className={`w-auto px-6 transition-all duration-200 ${
              isListening ? 'animate-pulse' : ''
            }`}
          >
            {isListening ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
                <MicOff className="h-4 w-4 mr-2" />
                Recording...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Record
              </>
            )}
          </Button>
          
          {score !== null && (
            <Badge
              variant={score >= 80 ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {score}%
            </Badge>
          )}
        </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
