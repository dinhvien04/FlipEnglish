import React, { useState, useRef, useEffect } from 'react';
import {
  DetectedObject,
  Lesson,
  VocabWord,
  QuizQuestion,
} from '../types';
import {
  processAndCompressImage,
  processRemoteImageUrl,
  SAMPLE_PHOTOS,
  ProcessedImage,
} from '../utils/imageUtils';
import { speakWord, stopSpeech } from '../utils/speech';
import { generateQuiz } from '../utils/quizGenerator';
import { FlashCard } from '../components/FlashCard';
import { ProgressBar } from '../components/ProgressBar';
import { QuizQuestionCard } from '../components/QuizQuestionCard';
import confetti from 'canvas-confetti';

interface FlipLensProps {
  onBackToHome: () => void;
}

type FlipLensStep =
  | 'upload'
  | 'preview'
  | 'analyzing'
  | 'detected'
  | 'empty-result'
  | 'learn'
  | 'quiz'
  | 'result';

export const FlipLens: React.FC<FlipLensProps> = ({ onBackToHome }) => {
  const [step, setStep] = useState<FlipLensStep>('upload');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ProcessedImage | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gemini Vision Detection Results
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null);

  // Flashcards & Learning State
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [hasCompletedCards, setHasCompletedCards] = useState<boolean>(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizMistakes, setQuizMistakes] = useState<VocabWord[]>([]);
  const [isReviewingMistakes, setIsReviewingMistakes] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const listRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Clean up speech when navigating steps
  useEffect(() => {
    stopSpeech();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Handle selected file from desktop or camera
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    setErrorMessage(null);
    setIsCompressing(true);

    try {
      const processed = await processAndCompressImage(file, 1600, 0.85);
      setImageData(processed);
      setImageSrc(processed.dataUrl);
      setStep('preview');
    } catch (err: any) {
      console.error('Error preparing image:', err);
      setErrorMessage(err.message || 'Could not process this image. Please try another one.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle preset sample photo selection
  const handleSelectSample = async (sample: (typeof SAMPLE_PHOTOS)[0]) => {
    setErrorMessage(null);
    setIsCompressing(true);

    try {
      const processed = await processRemoteImageUrl(sample.url, 1600, 0.85);
      setImageData(processed);
      setImageSrc(processed.dataUrl);
      setStep('preview');
    } catch (err: any) {
      console.error('Error loading sample image:', err);
      setErrorMessage('Could not load sample image. Please try another or upload your own.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Call server-side Gemini Vision API
  const handleAnalyzePhoto = async () => {
    if (!imageData || !imageData.dataUrl) return;

    setStep('analyzing');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData.dataUrl,
          mimeType: imageData.mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze photo.');
      }

      const objects: DetectedObject[] = Array.isArray(data.objects) ? data.objects : [];

      if (objects.length === 0) {
        setStep('empty-result');
        return;
      }

      setDetectedObjects(objects);

      // Select all detected words by default (up to 8 items)
      const initialSelected = new Set<string>();
      objects.slice(0, 8).forEach((o) => initialSelected.add(o.id));
      setSelectedWordIds(initialSelected);

      setStep('detected');
    } catch (err: any) {
      console.error('Error analyzing photo with Gemini:', err);
      setErrorMessage(
        err.message ||
          "We couldn't analyze this photo right now. Please try another photo or return to the regular lessons."
      );
      setStep('preview');
    }
  };

  // Toggle selection for a word
  const handleToggleWord = (id: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    detectedObjects.forEach((o) => all.add(o.id));
    setSelectedWordIds(all);
  };

  const handleClearAll = () => {
    setSelectedWordIds(new Set());
  };

  // Construct temporary lesson from selected objects
  const getSelectedWordsAsVocab = (): VocabWord[] => {
    const selected = detectedObjects.filter((o) => selectedWordIds.has(o.id));
    return selected.map((obj, idx) => ({
      id: obj.id || `fl-${idx}-${obj.word.toLowerCase()}`,
      word: obj.word,
      pronunciation: obj.pronunciation || `/${obj.word.toLowerCase()}/`,
      meaning: obj.meaning,
      partOfSpeech: obj.partOfSpeech,
      example: obj.example || `I see the ${obj.word.toLowerCase()}.`,
      imageUrl: imageSrc || '',
      imageAlt: obj.word,
    }));
  };

  const getTemporaryLesson = (): Lesson => {
    const words = getSelectedWordsAsVocab();
    return {
      id: 'flip-lens-session',
      title: 'My Photo Lesson',
      level: 'A1',
      levelTitle: 'Real-World Visuals',
      description: 'Vocabulary detected from your uploaded photograph',
      imageUrl: imageSrc || '',
      words,
    };
  };

  // Start Flashcards
  const handleCreateLesson = () => {
    if (selectedWordIds.size === 0) return;
    setCurrentCardIndex(0);
    setHasCompletedCards(false);
    setStep('learn');
  };

  // Flashcards navigation
  const selectedVocabWords = getSelectedWordsAsVocab();
  const currentVocabWord = selectedVocabWords[currentCardIndex];

  const handleCardNext = () => {
    if (currentCardIndex < selectedVocabWords.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setHasCompletedCards(true);
    }
  };

  const handleCardPrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  // Start Quiz
  const handleStartPhotoQuiz = () => {
    const tempLesson = getTemporaryLesson();
    const generated = generateQuiz(tempLesson);
    setQuizQuestions(generated);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizMistakes([]);
    setIsReviewingMistakes(false);
    setStep('quiz');
  };

  // Handle quiz question answer
  const handleQuizAnswerSubmit = (isCorrect: boolean) => {
    const currentQ = quizQuestions[currentQuizIndex];
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    } else {
      setQuizMistakes((prev) => {
        if (!prev.some((w) => w.id === currentQ.word.id)) {
          return [...prev, currentQ.word];
        }
        return prev;
      });
    }

    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      // Finished Quiz
      const finalScore = isCorrect ? quizScore + 1 : quizScore;
      const totalQ = quizQuestions.length;
      if (finalScore / totalQ >= 0.7) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
      setStep('result');
    }
  };

  // Reset & Try another photo
  const handleReset = () => {
    stopSpeech();
    setImageSrc(null);
    setImageData(null);
    setDetectedObjects([]);
    setSelectedWordIds(new Set());
    setErrorMessage(null);
    setStep('upload');
  };

  // Review mistakes flashcards
  const handleStartReviewMistakes = () => {
    if (quizMistakes.length === 0) return;
    setIsReviewingMistakes(true);
    setCurrentCardIndex(0);
    setHasCompletedCards(false);
    setStep('learn');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="min-h-11 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center"
        >
          Back to Learning Path
        </button>

        <div className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide uppercase">
          FlipLens AI Vision
        </div>
      </div>

      {/* ======================================================================= */}
      {/* STEP 1: UPLOAD / CAMERA SELECT */}
      {/* ======================================================================= */}
      {step === 'upload' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-10 border border-slate-800 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                Real-World Learning
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Learn English <span className="text-indigo-400">From Your World</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Take or upload a real photo. Gemini will identify everyday objects around you and turn them into an instant vocabulary lesson with native audio and interactive practice.
              </p>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all bg-white shadow-xs ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs uppercase tracking-wider shadow-xs">
                {isCompressing ? '...' : 'Photo'}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-900">
                  {isCompressing ? 'Preparing image...' : 'Take or Upload a Photo'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Drag and drop here, or choose an option below. Accepts JPEG, PNG, or WebP.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  id="fliplens-upload-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="min-h-12 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center"
                >
                  Choose Image File
                </button>

                <button
                  type="button"
                  id="fliplens-camera-btn"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isCompressing}
                  className="min-h-12 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm shadow-md shadow-slate-200 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center"
                >
                  Take Photo (Camera)
                </button>
              </div>

              {/* Suggestions */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-700">Recommended scenes to photograph:</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-2xs font-semibold">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">Study Desk</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">Kitchen Table</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">Living Room</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">Food & Drinks</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">Classroom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Preset Samples */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Or try an instant sample photo:
              </h3>
              <span className="text-xs text-slate-500">1-click demo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SAMPLE_PHOTOS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  disabled={isCompressing}
                  className="group text-left bg-white rounded-2xl p-3 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col gap-2.5 cursor-pointer focus:outline-hidden disabled:opacity-60"
                >
                  <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80">
                    <img
                      src={sample.url}
                      alt={sample.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-2xs font-bold">
                      {sample.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{sample.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-rose-700/80 text-xs mt-0.5">
                  High demand spikes are usually brief. You can retry or choose another photo.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 2: PREVIEW & CONFIRM */}
      {/* ======================================================================= */}
      {step === 'preview' && imageSrc && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Photo Ready for Analysis</h2>
            <p className="text-sm text-slate-500">
              Gemini will identify useful visible objects and create vocabulary cards.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-md space-y-5">
            {/* Image Preview Box */}
            <div className="relative aspect-16/10 sm:aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Uploaded photo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Privacy Note */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
              <p className="leading-relaxed">
                <strong>Privacy Assurance:</strong> Your photo is analyzed securely only to create this lesson and is <strong>not saved</strong> by FlipEnglish.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto min-h-12 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                Choose Another Photo
              </button>

              <button
                type="button"
                id="fliplens-analyze-btn"
                onClick={handleAnalyzePhoto}
                className="w-full sm:w-auto min-h-12 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center"
              >
                Analyze Photo with Gemini
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-rose-700/80 text-xs mt-0.5">
                  Temporary high demand spikes usually resolve quickly. Click below to retry.
                </p>
              </div>
              <button
                type="button"
                id="fliplens-retry-btn"
                onClick={handleAnalyzePhoto}
                className="shrink-0 min-h-10 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center"
              >
                Retry Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 3: ANALYZING LOADING STATE */}
      {/* ======================================================================= */}
      {step === 'analyzing' && imageSrc && (
        <div className="max-w-2xl mx-auto space-y-6 text-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
            {/* Visual Radar Scan Effect */}
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Analyzing photo"
                className="w-full h-full object-cover opacity-60 filter blur-xs"
              />
              <div className="absolute inset-0 bg-indigo-950/40" />

              {/* Animated scanline */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#818cf8] animate-bounce" />

              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-indigo-400/40 text-xs font-black tracking-wider uppercase">
                  Scan
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black tracking-tight">Looking around...</p>
                  <p className="text-xs text-indigo-200">
                    Gemini is finding English words in your photo
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span>Detecting concrete vocabulary, IPA notation, and Vietnamese meanings...</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 4: DETECTED OBJECTS & INTERACTIVE OVERLAY */}
      {/* ======================================================================= */}
      {step === 'detected' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                I found {detectedObjects.length} things you can learn
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select the words you want to practice in your personalized photo lesson.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Grid Layout: Interactive Photo + Vocabulary List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Image with Bounding Boxes */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-4 border border-slate-200/90 shadow-md space-y-3 sticky top-20">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>Interactive Photo Map</span>
                <span className="text-indigo-600 font-semibold text-2xs">Tap tags to select</span>
              </div>

              <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 select-none">
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt="Detected objects"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Bounding Box Overlays */}
                {detectedObjects.map((obj) => {
                  if (!obj.box_2d) return null;
                  const [ymin, xmin, ymax, xmax] = obj.box_2d;
                  const top = ymin / 10;
                  const left = xmin / 10;
                  const width = (xmax - xmin) / 10;
                  const height = (ymax - ymin) / 10;

                  const isSelected = selectedWordIds.has(obj.id);
                  const isHovered = hoveredWordId === obj.id;

                  return (
                    <div
                      key={obj.id}
                      onClick={() => {
                        handleToggleWord(obj.id);
                        listRefs.current[obj.id]?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        });
                      }}
                      onMouseEnter={() => setHoveredWordId(obj.id)}
                      onMouseLeave={() => setHoveredWordId(null)}
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      className={`absolute cursor-pointer transition-all duration-200 rounded-lg flex flex-col justify-start items-start p-1 ${
                        isSelected
                          ? 'border-2 border-indigo-400 bg-indigo-600/20 shadow-md ring-2 ring-indigo-400/40'
                          : 'border border-dashed border-white/80 bg-black/20 hover:bg-indigo-500/20'
                      } ${isHovered ? 'scale-102 ring-2 ring-amber-300 border-amber-300' : ''}`}
                    >
                      <span
                        className={`text-2xs font-extrabold px-1.5 py-0.5 rounded shadow-xs tracking-tight transition-colors pointer-events-none truncate max-w-full ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-black/75 text-white'
                        }`}
                      >
                        {obj.word}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Use different photo
                </button>
                <span className="text-2xs text-slate-400">
                  {detectedObjects.filter((o) => o.box_2d).length} mapped regions
                </span>
              </div>
            </div>

            {/* Right Column: Vocabulary Cards List */}
            <div className="lg:col-span-7 space-y-3">
              {detectedObjects.map((obj) => {
                const isSelected = selectedWordIds.has(obj.id);
                const isHovered = hoveredWordId === obj.id;

                return (
                  <div
                    key={obj.id}
                    ref={(el) => (listRefs.current[obj.id] = el)}
                    onClick={() => handleToggleWord(obj.id)}
                    onMouseEnter={() => setHoveredWordId(obj.id)}
                    onMouseLeave={() => setHoveredWordId(null)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 bg-white ${
                      isSelected
                        ? 'border-indigo-600 shadow-sm bg-indigo-50/20 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 opacity-80'
                    } ${isHovered ? 'border-amber-400 ring-2 ring-amber-200' : ''}`}
                  >
                    {/* Checkbox text badge */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-2xs font-extrabold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'border-2 border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>

                    {/* Word Details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            {obj.word}
                          </h4>
                          {obj.pronunciation && (
                            <span className="text-xs font-mono font-medium text-slate-500">
                              {obj.pronunciation}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(obj.word);
                            }}
                            className="px-2 py-0.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                            title="Hear pronunciation"
                          >
                            Listen
                          </button>
                        </div>

                        {/* Level badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {obj.partOfSpeech}
                          </span>
                          <span className="text-2xs font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {obj.level}
                          </span>
                        </div>
                      </div>

                      {/* Vietnamese Meaning */}
                      <p className="text-sm font-bold text-indigo-950">
                        {obj.meaning}
                      </p>

                      {/* Example Sentence */}
                      {obj.example && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          "{obj.example}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Action Card */}
              <div className="pt-3 sticky bottom-4">
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Selected Vocabulary
                    </p>
                    <p className="text-base font-extrabold text-white">
                      {selectedWordIds.size} of {detectedObjects.length} words chosen
                    </p>
                  </div>

                  <button
                    type="button"
                    id="fliplens-create-lesson-btn"
                    onClick={handleCreateLesson}
                    disabled={selectedWordIds.size === 0}
                    className={`w-full sm:w-auto min-h-12 px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                      selectedWordIds.size > 0
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/30 cursor-pointer active:scale-98'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Create My Lesson · {selectedWordIds.size} Words
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 4B: EMPTY RESULT FALLBACK */}
      {/* ======================================================================= */}
      {step === 'empty-result' && (
        <div className="max-w-md mx-auto py-8 text-center space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-md space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                We couldn't find enough clear vocabulary in this photo
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Try taking a clearer, well-lit photo of:
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs font-semibold text-slate-700">
                <span className="bg-slate-100 px-3 py-1 rounded-full">Your desk</span>
                <span className="bg-slate-100 px-3 py-1 rounded-full">Kitchen table</span>
                <span className="bg-slate-100 px-3 py-1 rounded-full">Your room</span>
                <span className="bg-slate-100 px-3 py-1 rounded-full">Food plate</span>
                <span className="bg-slate-100 px-3 py-1 rounded-full">Classroom</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full min-h-12 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center"
              >
                Try Another Photo
              </button>
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full min-h-11 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                Back to Learning Path
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 5: FLASHCARDS LEARNING */}
      {/* ======================================================================= */}
      {step === 'learn' && currentVocabWord && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('detected')}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Back to Word List
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  FlipLens
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {isReviewingMistakes ? 'Reviewing Mistakes' : 'Photo Flashcards'}
                </h2>
              </div>
            </div>

            <div className="w-16 text-right text-xs font-bold text-slate-500">
              {currentCardIndex + 1} / {selectedVocabWords.length}
            </div>
          </div>

          <ProgressBar
            current={hasCompletedCards ? selectedVocabWords.length : currentCardIndex + 1}
            total={selectedVocabWords.length}
            label={`Cards: ${
              hasCompletedCards ? selectedVocabWords.length : currentCardIndex + 1
            } of ${selectedVocabWords.length}`}
          />

          {!hasCompletedCards ? (
            <div className="mt-4">
              <FlashCard
                word={currentVocabWord}
                currentIndex={currentCardIndex}
                totalWords={selectedVocabWords.length}
                onNext={handleCardNext}
                onPrev={handleCardPrev}
                isFirst={currentCardIndex === 0}
                isLast={currentCardIndex === selectedVocabWords.length - 1}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-md text-center max-w-lg mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {isReviewingMistakes ? 'Mistakes Reviewed!' : 'All Cards Completed!'}
                </h3>
                <p className="text-sm sm:text-base text-slate-600">
                  Great job reviewing the vocabulary from your photo. Ready to test your memory?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCardIndex(0);
                    setHasCompletedCards(false);
                  }}
                  className="w-full sm:w-auto min-h-12 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Review Cards Again
                </button>

                <button
                  type="button"
                  id="fliplens-start-quiz-btn"
                  onClick={handleStartPhotoQuiz}
                  className="w-full sm:w-auto min-h-12 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-98 cursor-pointer flex items-center justify-center"
                >
                  Start Photo Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 6: QUIZ SESSION */}
      {/* ======================================================================= */}
      {step === 'quiz' && quizQuestions.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('learn')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Back to Cards
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Photo Quiz Challenge
              </span>
            </div>

            <div className="w-16 text-right text-xs font-bold text-slate-500">
              {currentQuizIndex + 1} / {quizQuestions.length}
            </div>
          </div>

          <ProgressBar
            current={currentQuizIndex + 1}
            total={quizQuestions.length}
            label={`Quiz Question ${currentQuizIndex + 1} of ${quizQuestions.length}`}
          />

          <QuizQuestionCard
            key={quizQuestions[currentQuizIndex].id}
            question={quizQuestions[currentQuizIndex]}
            questionNumber={currentQuizIndex + 1}
            totalQuestions={quizQuestions.length}
            onAnswerSubmit={handleQuizAnswerSubmit}
            lessonTitle="My Photo Lesson"
            lessonLevel="A1-A2"
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* STEP 7: RESULTS */}
      {/* ======================================================================= */}
      {step === 'result' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-md text-center space-y-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                Photo Lesson Complete
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {quizScore} / {quizQuestions.length}
              </h2>
              <p className="text-base font-bold text-indigo-600">
                {Math.round((quizScore / (quizQuestions.length || 1)) * 100)}% Accuracy
              </p>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                You just learned {selectedVocabWords.length} real-world vocabulary words from your own photo!
              </p>
            </div>

            {/* List of Words Learned */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Words from this photo:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedVocabWords.map((word) => (
                  <div
                    key={word.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 block text-sm">{word.word}</strong>
                      <span className="text-slate-500">{word.meaning}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakWord(word.word)}
                      className="px-2 py-0.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                      title="Hear audio"
                    >
                      Listen
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {quizMistakes.length > 0 && (
                <button
                  type="button"
                  onClick={handleStartReviewMistakes}
                  className="w-full sm:w-auto min-h-12 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center"
                >
                  Review {quizMistakes.length} Mistakes
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto min-h-12 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-98 cursor-pointer flex items-center justify-center"
              >
                Try Another Photo
              </button>

              <button
                type="button"
                onClick={onBackToHome}
                className="w-full sm:w-auto min-h-12 px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                Back to Learning Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
