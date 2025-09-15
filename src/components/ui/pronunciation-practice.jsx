import { useState, useEffect } from 'react';
import { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { Mic, MicOff, Volume2, CheckCircle, AlertCircle, X } from 'lucide-react';

export function PronunciationPractice({ term, onScore }) {
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Calculate pronunciation score
  const calculateScore = (spoken, target) => {
    if (!spoken || !target) return 0;
    
    const spokenLower = spoken.toLowerCase().trim();
    const targetLower = target.toLowerCase().trim();
    
    if (spokenLower === targetLower) return 100;
    if (spokenLower.includes(targetLower) || targetLower.includes(spokenLower)) return 85;
    
    // Levenshtein distance-based similarity
    const distance = levenshteinDistance(spokenLower, targetLower);
    const maxLength = Math.max(spokenLower.length, targetLower.length);
    return Math.round(((maxLength - distance) / maxLength) * 100);
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
    if (finalTranscript && term) {
      const pronunciationScore = calculateScore(finalTranscript, term);
      setScore(pronunciationScore);
      
      let feedbackMessage = `You said: "${finalTranscript}"`;
      if (pronunciationScore >= 90) {
        feedbackMessage += " - Excellent!";
      } else if (pronunciationScore >= 70) {
        feedbackMessage += " - Good job!";
      } else if (pronunciationScore >= 50) {
        feedbackMessage += " - Keep practicing!";
      } else {
        feedbackMessage += " - Try again!";
      }
      
      setFeedback(feedbackMessage);
      onScore?.(pronunciationScore, finalTranscript);
      setIsListening(false);
    }
  }, [finalTranscript, term, onScore]);

  // Play audio using Web Speech API
  const playAudio = () => {
    if (!term) return;
    
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    speechSynthesis.speak(utterance);
  };

  // Start listening
  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      setFeedback('Speech recognition not supported in this browser');
      return;
    }
    
    resetTranscript();
    setScore(null);
    setFeedback('');
    setIsListening(true);
  };

  // Stop listening
  const stopListening = () => {
    setIsListening(false);
  };

  // Reset practice
  const resetPractice = () => {
    resetTranscript();
    setScore(null);
    setFeedback('');
    setIsListening(false);
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Pronunciation Practice
          </CardTitle>
          <CardDescription>
            Speech recognition is not supported in this browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Pronunciation Practice
        </CardTitle>
        <CardDescription>
          Practice pronouncing: <strong>{term}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Playback */}
        <div className="flex gap-2">
          <Button
            onClick={playAudio}
            disabled={isPlaying || !term}
            variant="outline"
            className="flex-1"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            {isPlaying ? 'Playing...' : 'Listen'}
          </Button>
        </div>

        {/* Practice Controls */}
        <div className="flex gap-2">
          {!isListening ? (
            <Button
              onClick={startListening}
              disabled={!term}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Speaking
            </Button>
          ) : (
            <Button
              onClick={stopListening}
              variant="destructive"
              className="flex-1"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Stop Speaking
            </Button>
          )}
          
          {(score !== null || transcript) && (
            <Button
              onClick={resetPractice}
              variant="outline"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Live Transcript */}
        {(transcript || interimTranscript) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">What you're saying:</p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {transcript && <span className="font-medium">{transcript}</span>}
                {interimTranscript && (
                  <span className="text-muted-foreground italic">
                    {interimTranscript}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {score !== null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Score:</span>
              <Badge
                variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}
                className="text-lg px-3 py-1"
              >
                {score}%
              </Badge>
            </div>
            
            <Progress value={score} className="h-2" />
            
            <div className="flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                score >= 80 ? 'bg-green-100 text-green-600' :
                score >= 60 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {score >= 80 ? (
                  <CheckCircle className="h-6 w-6" />
                ) : score >= 60 ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </div>
            </div>
            
            {feedback && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!isListening && score === null && (
          <div className="text-center text-sm text-muted-foreground">
            Click "Start Speaking" and say the word clearly
          </div>
        )}
      </CardContent>
    </Card>
  );
}
