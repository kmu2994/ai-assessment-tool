import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

interface AccessibilityContextType {
    textToSpeech: boolean;
    highContrast: boolean;
    toggleTextToSpeech: () => void;
    toggleHighContrast: () => void;
    speak: (text: string) => void;
    stopSpeaking: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [textToSpeech, setTextToSpeech] = useState(() => {
        return localStorage.getItem('textToSpeech') === 'true';
    });

    const [highContrast, setHighContrast] = useState(() => {
        return localStorage.getItem('highContrast') === 'true';
    });

    // Apply high contrast class to root
    useEffect(() => {
        const root = document.documentElement;
        if (highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }
        localStorage.setItem('highContrast', String(highContrast));
    }, [highContrast]);

    // Save text-to-speech preference
    useEffect(() => {
        localStorage.setItem('textToSpeech', String(textToSpeech));
    }, [textToSpeech]);

    const toggleTextToSpeech = () => {
        setTextToSpeech(prev => !prev);
    };

    const toggleHighContrast = () => {
        setHighContrast(prev => !prev);
    };

    const speak = useCallback((text: string) => {
        if (!textToSpeech || !('speechSynthesis' in window)) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    }, [textToSpeech]);

    const stopSpeaking = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    return (
        <AccessibilityContext.Provider
            value={{
                textToSpeech,
                highContrast,
                toggleTextToSpeech,
                toggleHighContrast,
                speak,
                stopSpeaking
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}
