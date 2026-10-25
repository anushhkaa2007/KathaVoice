import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Volume2,
  Smartphone,
  Keyboard,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { ExtractedTransaction, TransactionType } from '../types/khata';
import { findCustomerMatch, formatINR, validateTransactionInput } from '../utils/accounting';

interface EditableReviewItem extends ExtractedTransaction {
  id: string;
  selectedCustomerId?: string;
  isNewCustomerSelected?: boolean;
  errors?: string[];
}

interface SpeechErrorInfo {
  type: 'permission' | 'unsupported' | 'insecure' | 'no-speech' | 'network' | 'generic';
  title: string;
  message: string;
  showBrowserGuide?: boolean;
}

export const AddEntryView: React.FC<{
  initialText?: string;
  onEntrySaved?: (customerId: string) => void;
}> = ({ initialText = '', onEntrySaved }) => {
  const { customers, addTransaction, setActiveView, setSelectedCustomerId } = useKhata();

  const [inputPrompt, setInputPrompt] = useState(initialText);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<EditableReviewItem[] | null>(null);
  const [extractionAmbiguities, setExtractionAmbiguities] = useState<string[]>([]);
  const [extractionEngine, setExtractionEngine] = useState<'gemini' | 'rules' | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [lastSavedCustomerId, setLastSavedCustomerId] = useState<string | null>(null);

  // Built-in Web Speech API dictation state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<SpeechErrorInfo | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(true);
  const [showGuideDetails, setShowGuideDetails] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isManuallyStoppedRef = useRef(false);

  // Check speech recognition capability on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  /**
   * Initiates voice dictation through browser APIs:
   * 1. Checks secure context requirements
   * 2. Checks browser SpeechRecognition support
   * 3. Explicitly verifies/requests microphone permissions via navigator.mediaDevices.getUserMedia
   * 4. Starts speech recognition only upon confirmed permission
   */
  const startListening = useCallback(async () => {
    setSpeechError(null);
    setInterimText('');

    // Check secure context
    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      setSpeechError({
        type: 'insecure',
        title: 'Secure Connection (HTTPS) Required',
        message:
          'Browsers restrict microphone access to secure HTTPS connections or localhost. Please access the application over HTTPS or type your transaction manually.',
        showBrowserGuide: false,
      });
      return;
    }

    // Check SpeechRecognition API presence
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError({
        type: 'unsupported',
        title: 'Speech Recognition Not Available in This Browser',
        message:
          'Your browser does not support the Web Speech API. Chrome, Edge, Safari, and Chromium-based mobile browsers support this. You can also use your mobile keyboard microphone, Wispr Flow on desktop, or type manually.',
        showBrowserGuide: false,
      });
      return;
    }

    // Request microphone access explicitly through getUserMedia
    // This triggers the standard browser permission prompt with proper OS authorization
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted: immediately release the test stream
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: any) {
        console.warn('getUserMedia permission error:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setSpeechError({
            type: 'permission',
            title: 'Microphone Permission Blocked',
            message:
              'Microphone access was denied. Your browser blocked audio recording for this page. Follow the instructions below to enable it and click Retry, or continue typing manually.',
            showBrowserGuide: true,
          });
          return;
        } else if (micErr.name === 'NotFoundError' || micErr.name === 'DevicesNotFoundError') {
          setSpeechError({
            type: 'generic',
            title: 'No Microphone Detected',
            message:
              'No audio input device was found on your system. Please connect a microphone or use keyboard entry.',
            showBrowserGuide: false,
          });
          return;
        } else if (micErr.name === 'SecurityError') {
          setSpeechError({
            type: 'permission',
            title: 'Iframe / Security Policy Blocked Microphone',
            message:
              'Microphone access is blocked by the embedding frame or security policy. If viewing inside an embedded preview, open the app in a new top-level browser tab.',
            showBrowserGuide: true,
          });
          return;
        }
      }
    }

    // Initialize clean SpeechRecognition instance
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English defaults, understands English & Hindi terms

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setInterimText('');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalizedChunks = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalizedChunks += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        if (finalizedChunks.trim()) {
          setInputPrompt((prev) => {
            const cleanedPrev = prev.trim();
            return cleanedPrev ? `${cleanedPrev} ${finalizedChunks.trim()}` : finalizedChunks.trim();
          });
        }

        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error event:', event.error);
        setIsListening(false);
        setInterimText('');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError({
            type: 'permission',
            title: 'Microphone Access Denied',
            message:
              'Microphone access was denied by your browser or operating system settings. Please grant microphone access in your browser settings to dictate, or type manually.',
            showBrowserGuide: true,
          });
        } else if (event.error === 'no-speech') {
          setSpeechError({
            type: 'no-speech',
            title: 'No Speech Detected',
            message: 'No speech was heard. Please speak closer to your microphone and try again.',
            showBrowserGuide: false,
          });
        } else if (event.error === 'network') {
          setSpeechError({
            type: 'network',
            title: 'Speech Recognition Network Error',
            message:
              'Network connection issue with browser speech service. You can type manually or try again.',
            showBrowserGuide: false,
          });
        } else if (event.error !== 'aborted') {
          setSpeechError({
            type: 'generic',
            title: 'Dictation Interrupted',
            message: `Speech recognition halted (${event.error}). You can retry or type directly.`,
            showBrowserGuide: false,
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      isManuallyStoppedRef.current = false;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech start exception:', err);
      setIsListening(false);
      setSpeechError({
        type: 'generic',
        title: 'Could Not Start Speech Recognition',
        message: err?.message || 'Failed to initialize speech recognition. Please retry or type manually.',
        showBrowserGuide: true,
      });
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleReviewEntry = async () => {
    if (isListening) {
      stopListening();
    }

    if (!inputPrompt.trim()) return;

    setIsExtracting(true);
    setSaveSuccessMessage(null);
    setExtractionAmbiguities([]);

    try {
      const existingNames = customers.map((c) => c.name);
      const res = await fetch('/api/extract-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputPrompt.trim(),
          existingCustomers: existingNames,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rawExtracted: ExtractedTransaction[] = data.transactions || [];
      const ambiguities: string[] = data.ambiguities || [];
      const engine: 'gemini' | 'rules' = data.extractedBy || 'rules';

      setExtractionEngine(engine);
      setExtractionAmbiguities(ambiguities);

      // Process extracted items and match against existing customers
      const prepared: EditableReviewItem[] = rawExtracted.map((item, idx) => {
        const { exactMatch, closeMatches } = findCustomerMatch(item.customerName, customers);
        const resolvedId = exactMatch ? exactMatch.id : closeMatches.length === 1 ? closeMatches[0].id : undefined;

        return {
          ...item,
          id: `item-${Date.now()}-${idx}`,
          customerName: exactMatch ? exactMatch.name : item.customerName,
          selectedCustomerId: resolvedId,
          isNewCustomerSelected: !resolvedId,
          amountRupees: item.amountRupees || 0,
          date: item.date || new Date().toISOString().split('T')[0],
          description: item.description || (item.type === 'credit' ? 'Groceries & provisions' : 'Payment received'),
          errors: [],
        };
      });

      if (prepared.length === 0) {
        prepared.push({
          id: `item-${Date.now()}-0`,
          customerName: '',
          type: 'credit',
          amountRupees: 0,
          description: '',
          date: new Date().toISOString().split('T')[0],
          isNewCustomerSelected: true,
          errors: ['Please enter customer and amount details'],
        });
      }

      setExtractedItems(prepared);
    } catch (err) {
      console.error('Extraction failed:', err);
      setExtractedItems([
        {
          id: `item-${Date.now()}-fallback`,
          customerName: '',
          type: 'credit',
          amountRupees: 0,
          description: '',
          date: new Date().toISOString().split('T')[0],
          isNewCustomerSelected: true,
          errors: ['Extraction service unavailable. Please review and fill manually.'],
        },
      ]);
      setExtractionAmbiguities(['Could not connect to extraction service. You can fill the fields manually below.']);
      setExtractionEngine('rules');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateItemField = (
    id: string,
    field: keyof EditableReviewItem,
    value: any
  ) => {
    setExtractedItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };

            if (field === 'customerName') {
              const { exactMatch } = findCustomerMatch(String(value), customers);
              if (exactMatch) {
                updated.selectedCustomerId = exactMatch.id;
                updated.isNewCustomerSelected = false;
              } else {
                updated.selectedCustomerId = undefined;
                updated.isNewCustomerSelected = true;
              }
            }

            return updated;
          })
        : null
    );
  };

  const handleAddNewItemCard = () => {
    setExtractedItems((prev) => [
      ...(prev || []),
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        customerName: '',
        type: 'credit',
        amountRupees: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        isNewCustomerSelected: true,
      },
    ]);
  };

  const handleRemoveItemCard = (id: string) => {
    setExtractedItems((prev) => (prev ? prev.filter((item) => item.id !== id) : null));
  };

  const handleSaveEntry = async () => {
    if (!extractedItems || extractedItems.length === 0) return;

    let hasErrors = false;
    const validatedItems = extractedItems.map((item) => {
      const validation = validateTransactionInput({
        customerName: item.customerName,
        customerId: item.selectedCustomerId,
        type: item.type,
        amountRupees: item.amountRupees,
        date: item.date,
      });

      if (!validation.isValid) {
        hasErrors = true;
        return { ...item, errors: validation.errors };
      }
      return { ...item, errors: [] };
    });

    setExtractedItems(validatedItems);

    if (hasErrors) {
      return;
    }

    let lastCustomerId = '';
    let savedSummaryNames: string[] = [];

    for (const item of extractedItems) {
      const result = await addTransaction({
        customerId: item.selectedCustomerId,
        customerName: item.customerName,
        type: item.type,
        amountRupees: Number(item.amountRupees),
        description: item.description,
        date: item.date,
        notes: item.notes,
      });
      lastCustomerId = result.customer.id;
      savedSummaryNames.push(`${result.customer.name} (₹${item.amountRupees})`);
    }

    setLastSavedCustomerId(lastCustomerId);
    setSaveSuccessMessage(
      `Successfully saved ${extractedItems.length} transaction entry: ${savedSummaryNames.join(', ')}.`
    );
    setExtractedItems(null);
    setInputPrompt('');

    if (onEntrySaved && lastCustomerId) {
      onEntrySaved(lastCustomerId);
    }
  };

  const samplePrompts = [
    'Sharma ji took rice and oil worth 340 rupees today',
    'Received 200 payment from Sharma ji via UPI',
    'Patel brother bought 5kg sugar and detergent for ₹450',
    'Gupta Kirana paid ₹1,500 advance cash',
    'Ramesh took biscuits for ₹120 and Verma paid ₹500',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Instruction Banner */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs laser-paper relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F3EC] text-[#164E35] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Dictation & Smart Extraction</span>
            </div>
            <h2 className="font-canto text-2xl font-bold text-[#103325]">
              Speak naturally. Review the details. Save your entry.
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
              Dictate or type daily credit purchases and payments. The app extracts customer name, transaction type, amount in INR, and date for your explicit review before saving.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-[#E6F3EC] border border-[#164E35]/30 text-[#103325] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#164E35] shrink-0" />
            <div className="text-sm font-medium">{saveSuccessMessage}</div>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedCustomerId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(lastSavedCustomerId);
                  setActiveView('customers');
                }}
                className="px-3 py-1.5 rounded-md bg-[#164E35] text-white text-xs font-semibold hover:bg-[#103325] transition-colors"
              >
                View Customer Ledger &rarr;
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Central Input Box */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Label & Active Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label
            htmlFor="describe-transaction-textarea"
            className="text-sm font-bold text-[#103325] flex items-center gap-2"
          >
            <span>Describe the transaction</span>
            <span className="text-xs font-normal text-stone-600">(Dictate or type)</span>
          </label>

          {/* Primary Voice Control Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all shadow-xs ${
                isListening
                  ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                  : 'bg-[#164E35] text-white hover:bg-[#103325] active:scale-[0.98]'
              }`}
              aria-label={isListening ? 'Stop voice dictation' : 'Start built-in voice dictation'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <span>Stop Dictation</span>
                  <span className="flex gap-0.5 items-center ml-1">
                    <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-[#E6F3EC]" />
                  <span>{speechSupported ? 'Dictate (Browser Mic)' : 'Microphone'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recording active banner */}
        {isListening && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3 text-xs text-red-800 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="font-semibold">Listening...</span>
              <span className="text-stone-700">Speak clearly. Words will appear in the box below.</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-xs font-bold text-red-700 underline hover:text-red-900"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Comprehensive Speech Error & Permission Alert with Retry & Guide */}
        {speechError && (
          <div className="p-4 bg-[#FCF4F1] border border-[#C25438]/40 rounded-xl space-y-3 text-xs text-[#9E3E23]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#C25438] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#7A2E19]">{speechError.title}</div>
                  <p className="leading-relaxed text-stone-800">{speechError.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startListening}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C25438] text-white font-semibold rounded-lg hover:bg-[#9E3E23] transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechError(null)}
                  className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition-colors"
                  aria-label="Dismiss error notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clear Browser Permission Instructions */}
            {speechError.showBrowserGuide && (
              <div className="pt-2 border-t border-[#C25438]/20">
                <button
                  type="button"
                  onClick={() => setShowGuideDetails(!showGuideDetails)}
                  className="flex items-center gap-1 font-bold text-[#7A2E19] hover:underline"
                >
                  <span>{showGuideDetails ? 'Hide' : 'Show'} instructions to allow microphone in your browser</span>
                  {showGuideDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showGuideDetails && (
                  <div className="mt-2.5 p-3 bg-white rounded-lg border border-[#E6E0D2] space-y-2.5 text-stone-700 text-xs">
                    <div>
                      <strong className="text-stone-900">Chrome / Edge / Brave:</strong>
                      <p className="mt-0.5 text-stone-600">
                        1. Look at the left side of your browser address bar and click the <strong>tune icon / padlock</strong>.<br />
                        2. Find <strong>Microphone</strong> and switch it from <em>Blocked</em> to <strong>Allow</strong>.<br />
                        3. Click the <strong>Retry</strong> button above.
                      </p>
                    </div>

                    <div>
                      <strong className="text-stone-900">Safari (Mac, iPhone, iPad):</strong>
                      <p className="mt-0.5 text-stone-600">
                        • <strong>Mac:</strong> Menu bar &gt; <em>Safari &gt; Settings &gt; Websites &gt; Microphone</em> &gt; Set this site to <strong>Allow</strong>.<br />
                        • <strong>iPhone/iPad:</strong> Tap <em>aA</em> in the URL bar &gt; <em>Website Settings</em> &gt; <em>Microphone</em> &gt; <strong>Allow</strong>.
                      </p>
                    </div>

                    <div>
                      <strong className="text-stone-900">Firefox:</strong>
                      <p className="mt-0.5 text-stone-600">
                        Click the crossed-out microphone icon next to the URL, remove the block, and click <strong>Retry</strong>.
                      </p>
                    </div>

                    <div className="p-2 bg-[#FAF7F2] rounded border border-[#E6E0D2] text-[11px] text-stone-600">
                      <strong>AI Studio Preview Note:</strong> If testing inside an embedded preview iframe, microphone permissions may be restricted by the parent tab. Open the app in its own dedicated tab via the top-level URL to allow microphone access directly.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1 text-[11px] text-stone-600">
              💡 <em>Manual typing and desktop Wispr Flow dictation remain 100% available at all times.</em>
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="describe-transaction-textarea"
            rows={4}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Sharma ji took rice and oil worth 340 rupees today."
            className="w-full p-4 rounded-xl bg-[#FAF7F2] border border-[#D5CEBE] text-stone-900 placeholder:text-stone-700 text-base leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#164E35]/40 focus:border-[#164E35] transition-all font-sans"
          />

          {/* Real-time interim transcript preview tag */}
          {isListening && interimText && (
            <div className="absolute bottom-3 left-4 right-4 bg-white/95 px-3 py-1.5 rounded-lg border border-[#D5CEBE] text-xs text-stone-600 italic shadow-xs flex items-center gap-1.5 pointer-events-none">
              <Volume2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="truncate">Hearing: &ldquo;{interimText}&rdquo;</span>
            </div>
          )}
        </div>

        {/* Voice Input Options Help Section */}
        <div className="border border-[#E6E0D2] bg-[#FAF7F2] rounded-xl overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowVoiceHelp(!showVoiceHelp)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-[#F5F2EB] transition-colors"
            aria-expanded={showVoiceHelp}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#164E35]" />
              <span>Voice input options</span>
              <span className="text-[11px] font-normal text-stone-600">(Built-in Mic, Mobile Keyboard, or Wispr Flow)</span>
            </div>
            <div className="flex items-center gap-1 text-stone-600">
              <span className="text-[11px]">{showVoiceHelp ? 'Hide' : 'Show'}</span>
              {showVoiceHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showVoiceHelp && (
            <div className="px-4 pb-4 pt-1 border-t border-[#E6E0D2] text-xs text-stone-700 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Option 1: Built-in Dictation */}
                <div className="p-3 bg-white rounded-lg border border-[#E6E0D2] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#103325]">
                    <Mic className="w-3.5 h-3.5 text-[#164E35]" />
                    <span>1. Built-in Dictation</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Tap the green <strong>Microphone</strong> button to dictate directly using your browser's speech recognition. No extra software needed.
                  </p>
                </div>

                {/* Option 2: Mobile / Keyboard Dictation */}
                <div className="p-3 bg-white rounded-lg border border-[#E6E0D2] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#103325]">
                    <Smartphone className="w-3.5 h-3.5 text-[#164E35]" />
                    <span>2. Keyboard Dictation</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    On mobile or tablet, tap inside the text box and tap the microphone icon on your on-screen keyboard (Gboard, Apple Dictation, etc.).
                  </p>
                </div>

                {/* Option 3: Optional Wispr Flow on Desktop */}
                <div className="p-3 bg-white rounded-lg border border-[#E6E0D2] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#103325]">
                    <Keyboard className="w-3.5 h-3.5 text-[#164E35]" />
                    <span>3. Optional Wispr Flow</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    On desktop, if you have Wispr Flow installed, simply click the text field and press your configured system shortcut to type.
                  </p>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-stone-600 leading-relaxed flex items-center justify-between flex-wrap gap-2">
                <span>
                  • <em>Note:</em> Wispr Flow is an optional external desktop tool. Katha Voice Easy does not require Wispr Flow installation, account login, or API keys. Manual typing is always fully available.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Sample Prompts */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Try Sample Dictation:
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputPrompt(sample)}
                className="px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D5CEBE] text-stone-700 hover:text-[#164E35] hover:border-[#164E35] hover:bg-[#F2F8F4] rounded-lg transition-colors text-left"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Review Entry */}
        <div className="pt-2 flex items-center justify-between border-t border-[#E6E0D2]">
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              setInputPrompt('');
              setExtractedItems(null);
              setExtractionAmbiguities([]);
              setSpeechError(null);
            }}
            disabled={!inputPrompt && !extractedItems}
            className="text-xs text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:hover:text-stone-600 flex items-center gap-1 py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleReviewEntry}
            disabled={isExtracting || !inputPrompt.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#164E35] text-white font-semibold text-sm hover:bg-[#103325] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ring-1 ring-[#103325]"
          >
            {isExtracting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Extracting Details...</span>
              </>
            ) : (
              <>
                <span>Review Entry</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Review & Edit Form Before Saving (The Core Validation Step) */}
      {extractedItems && (
        <div className="bg-[#FFFFFF] border-2 border-[#164E35]/40 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6E0D2]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-canto text-xl font-bold text-[#103325]">
                  Review & Confirm Structured Entry
                </h3>
                {extractionEngine && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#E6F3EC] text-[#164E35] font-semibold">
                    {extractionEngine === 'gemini' ? 'Gemini 3.8 Flash' : 'Rule-Based Parser'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Review extracted fields carefully. Application code validates amounts and balances before saving.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddNewItemCard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FAF7F2] border border-[#D5CEBE] text-xs font-semibold text-[#164E35] hover:bg-[#E6F3EC] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Item/Transaction</span>
            </button>
          </div>

          {/* Ambiguity Warning Banner if AI flagged anything unclear */}
          {extractionAmbiguities.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[#FCF4F1] border border-[#C25438]/30 text-xs text-[#9E3E23] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#C25438]" />
              <div>
                <strong className="font-semibold">Review Alert:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {extractionAmbiguities.map((amb, i) => (
                    <li key={i}>{amb}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Editable Cards List */}
          <div className="space-y-5">
            {extractedItems.map((item, index) => {
              const matchedCustomer = customers.find((c) => c.id === item.selectedCustomerId);
              const isCredit = item.type === 'credit';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-xl bg-[#FAF7F2] border border-[#D5CEBE] relative space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6E0D2]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#164E35] text-white text-xs font-bold font-num flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Transaction #{index + 1}
                      </span>
                    </div>

                    {extractedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemCard(item.id)}
                        className="text-stone-600 hover:text-[#9E3E23] p-1 rounded-md"
                        title="Remove transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Errors on this item */}
                  {item.errors && item.errors.length > 0 && (
                    <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                      {item.errors.join(' • ')}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Field 1: Customer Name & Matching */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={item.customerName}
                        onChange={(e) => updateItemField(item.id, 'customerName', e.target.value)}
                        placeholder="e.g. Sharma Ji"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                      />

                      {/* Customer Matching Status */}
                      <div className="pt-1">
                        {matchedCustomer ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#164E35] font-medium bg-[#E6F3EC] px-2 py-1 rounded">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Matched: <strong>{matchedCustomer.name}</strong>
                            </span>
                          </div>
                        ) : item.customerName.trim() ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 bg-stone-100 px-2 py-1 rounded">
                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                            <span>New customer account will be created</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Field 2: Transaction Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Transaction Type *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateItemField(item.id, 'type', 'credit')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                            isCredit
                              ? 'bg-[#FBECE8] border-[#C25438] text-[#9E3E23]'
                              : 'bg-white border-[#D5CEBE] text-stone-700 hover:bg-[#F5F2EB]'
                          }`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#C25438]" />
                          <span>Credit / Udhari</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateItemField(item.id, 'type', 'payment')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                            !isCredit
                              ? 'bg-[#E6F3EC] border-[#164E35] text-[#164E35]'
                              : 'bg-white border-[#D5CEBE] text-stone-700 hover:bg-[#F5F2EB]'
                          }`}
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-[#164E35]" />
                          <span>Payment / Jama</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-600">
                        {isCredit ? 'Increases customer debt' : 'Decreases customer debt'}
                      </p>
                    </div>

                    {/* Field 3: Amount in INR */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Amount (INR) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-600 font-num">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.amountRupees || ''}
                          onChange={(e) =>
                            updateItemField(item.id, 'amountRupees', parseFloat(e.target.value) || 0)
                          }
                          placeholder="340"
                          className="w-full pl-7 pr-3 py-2 text-sm font-bold font-num bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                        />
                      </div>
                    </div>

                    {/* Field 4: Item Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Item Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                        placeholder={isCredit ? 'e.g. rice and oil' : 'e.g. Cash / UPI payment'}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                      />
                    </div>

                    {/* Field 5: Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItemField(item.id, 'date', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35] font-num"
                      />
                    </div>

                    {/* Field 6: Optional Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Notes / Context (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItemField(item.id, 'notes', e.target.value)}
                        placeholder="e.g. Dictated entry"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explicit Save Action */}
          <div className="pt-4 border-t border-[#E6E0D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-stone-600">
              Deterministic paise calculations will update customer balance immediately.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExtractedItems(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white border border-[#D5CEBE] rounded-lg hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEntry}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#164E35] text-white font-bold text-sm hover:bg-[#103325] active:scale-[0.98] transition-all shadow-sm ring-1 ring-[#103325]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
