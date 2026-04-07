import { useState, useRef, useCallback, useEffect } from 'react';
import mjml2html from 'mjml-browser';
import emailService from '../../../../services/emailService';
import { EmailMjmlElement } from '../../../../types/email/emailMjmlElement.types';
import { markdownToMjml } from '../../../../utils/email/markdownToMjml';
import { mjmlToMarkdown } from '../../../../utils/email/mjmlToMarkdown';
import { formatMjml } from '../../../../utils/email/formatMjml';

const CONTENT_PLACEHOLDER = '<!-- CONTENT_PLACEHOLDER -->';
const SIGNATURE_PLACEHOLDER = '<!-- SIGNATURE_PLACEHOLDER -->';

export type EditorMode = 'basic' | 'advanced';

export interface QueueContentEditorVM {
    mjmlContent: string;
    htmlPreview: string;
    compileError: string | null;
    isDirty: boolean;
    shellLoading: boolean;
    editorMode: EditorMode;
    basicModeContent: string;
    elements: EmailMjmlElement[];
    handleContentChange: (content: string) => void;
    handleBasicContentChange: (content: string) => void;
    initContent: (mjmlContent: string, basicModeContent: string) => void;
    setEditorMode: (mode: EditorMode) => void;
}

/**
 * Reusable MJML content editor VM — same core as useEmailTemplateMjmlEditorVM
 * but without template-specific save/signature logic.
 * Used for editing queue item content overrides.
 */
const useQueueContentEditorVM = (templateId: number | null): QueueContentEditorVM => {
    const [mjmlContent, setMjmlContent] = useState<string>('');
    const [htmlPreview, setHtmlPreview] = useState<string>('');
    const [compileError, setCompileError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [shellLoading, setShellLoading] = useState<boolean>(true);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shellRef = useRef<string | null>(null);
    const signatureRef = useRef<string>('');
    const [editorMode, setEditorModeState] = useState<EditorMode>('advanced');
    const [basicModeContent, setBasicModeContent] = useState<string>('');
    const [elements, setElements] = useState<EmailMjmlElement[]>([]);
    const elementsRef = useRef<EmailMjmlElement[]>([]);

    // Fetch MJML shell + signature on mount
    useEffect(() => {
        let cancelled = false;
        const fetchShell = async () => {
            try {
                const { shell } = await emailService.getMjmlShell();
                if (!cancelled) {
                    shellRef.current = shell;
                }
                if (templateId) {
                    try {
                        const { signature_mjml } = await emailService.getSignatureMjml(templateId);
                        if (!cancelled) {
                            signatureRef.current = signature_mjml;
                        }
                    } catch (sigErr) {
                        console.error('Error fetching signature MJML:', sigErr);
                    }
                }
                if (!cancelled) {
                    setShellLoading(false);
                }
            } catch (err) {
                console.error('Error fetching MJML shell:', err);
                if (!cancelled) {
                    shellRef.current = null;
                    setShellLoading(false);
                }
            }
        };
        fetchShell();
        return () => { cancelled = true; };
    }, [templateId]);

    // Fetch MJML element templates on mount
    useEffect(() => {
        let cancelled = false;
        const fetchElements = async () => {
            try {
                const data = await emailService.getMjmlElements();
                if (!cancelled) {
                    setElements(data);
                    elementsRef.current = data;
                }
            } catch (err) {
                console.error('Error fetching MJML elements:', err);
            }
        };
        fetchElements();
        return () => { cancelled = true; };
    }, []);

    const compileMjml = useCallback((content: string) => {
        if (!content.trim()) {
            setHtmlPreview('');
            setCompileError(null);
            return;
        }

        let fullMjml: string;
        if (shellRef.current) {
            fullMjml = shellRef.current
                .replace(CONTENT_PLACEHOLDER, content)
                .replace(SIGNATURE_PLACEHOLDER, signatureRef.current);
        } else {
            fullMjml = content;
        }

        try {
            const result = mjml2html(fullMjml, { validationLevel: 'soft' });
            setHtmlPreview(result.html);
            if (result.errors && result.errors.length > 0) {
                setCompileError(result.errors.map((e: any) => e.formattedMessage || e.message).join('\n'));
            } else {
                setCompileError(null);
            }
        } catch (err: any) {
            setCompileError(err.message || 'MJML compilation error');
            setHtmlPreview('');
        }
    }, []);

    const handleContentChange = useCallback(
        (content: string) => {
            setMjmlContent(content);
            setIsDirty(true);

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                compileMjml(content);
            }, 500);
        },
        [compileMjml]
    );

    const handleBasicContentChange = useCallback(
        (content: string) => {
            setBasicModeContent(content);
            setIsDirty(true);

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                const mjml = markdownToMjml(content, elementsRef.current);
                setMjmlContent(mjml);
                compileMjml(mjml);
            }, 500);
        },
        [compileMjml]
    );

    const initContent = useCallback(
        (mjmlContentArg: string, basicModeContentArg: string) => {
            setMjmlContent(mjmlContentArg);

            const basicContent = basicModeContentArg || mjmlToMarkdown(mjmlContentArg);
            setBasicModeContent(basicContent);
            setEditorModeState('basic');

            if (mjmlContentArg) {
                compileMjml(mjmlContentArg);
            }
            setIsDirty(false);
        },
        [compileMjml]
    );

    const setEditorMode = useCallback(
        (mode: EditorMode) => {
            if (mode === 'advanced' && editorMode === 'basic') {
                const mjml = formatMjml(markdownToMjml(basicModeContent, elements));
                setMjmlContent(mjml);
                setBasicModeContent('');
                compileMjml(mjml);
            } else if (mode === 'basic' && editorMode === 'advanced') {
                const md = basicModeContent || mjmlToMarkdown(mjmlContent);
                setBasicModeContent(md);
                if (md) {
                    const recompiled = markdownToMjml(md, elementsRef.current);
                    setMjmlContent(recompiled);
                    compileMjml(recompiled);
                }
            }
            setEditorModeState(mode);
        },
        [editorMode, basicModeContent, mjmlContent, elements, compileMjml]
    );

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Re-compile when shell finishes loading
    useEffect(() => {
        if (!shellLoading && mjmlContent) {
            compileMjml(mjmlContent);
        }
    }, [shellLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    // When elements load and we're in basic mode, compile the initial content
    useEffect(() => {
        if (elements.length > 0 && editorMode === 'basic' && basicModeContent) {
            const mjml = markdownToMjml(basicModeContent, elements);
            setMjmlContent(mjml);
            compileMjml(mjml);
        }
    }, [elements.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        mjmlContent,
        htmlPreview,
        compileError,
        isDirty,
        shellLoading,
        editorMode,
        basicModeContent,
        elements,
        handleContentChange,
        handleBasicContentChange,
        initContent,
        setEditorMode,
    };
};

export default useQueueContentEditorVM;
