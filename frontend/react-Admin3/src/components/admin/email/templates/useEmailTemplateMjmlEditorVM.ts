import { useState, useRef, useCallback, useEffect } from 'react';
import mjml2html from 'mjml-browser';
import emailService from '../../../../services/emailService';

const CONTENT_PLACEHOLDER = '<!-- CONTENT_PLACEHOLDER -->';
const SIGNATURE_PLACEHOLDER = '<!-- SIGNATURE_PLACEHOLDER -->';

export interface EmailTemplateMjmlEditorVM {
    mjmlContent: string;
    htmlPreview: string;
    compileError: string | null;
    isDirty: boolean;
    isSaving: boolean;
    shellLoading: boolean;
    handleContentChange: (content: string) => void;
    handleSave: () => Promise<void>;
    initContent: (content: string) => void;
    refreshSignature: () => Promise<void>;
}

const useEmailTemplateMjmlEditorVM = (templateId: number): EmailTemplateMjmlEditorVM => {
    const [mjmlContent, setMjmlContent] = useState<string>('');
    const [htmlPreview, setHtmlPreview] = useState<string>('');
    const [compileError, setCompileError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [shellLoading, setShellLoading] = useState<boolean>(true);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shellRef = useRef<string | null>(null);
    const signatureRef = useRef<string>('');

    // Fetch the MJML shell (master + banner + styles + footer) once on mount
    useEffect(() => {
        let cancelled = false;
        const fetchShell = async () => {
            try {
                const { shell } = await emailService.getMjmlShell();
                if (!cancelled) {
                    shellRef.current = shell;
                }
                // Also fetch signature MJML for this template
                try {
                    const { signature_mjml } = await emailService.getSignatureMjml(templateId);
                    if (!cancelled) {
                        signatureRef.current = signature_mjml;
                    }
                } catch (sigErr) {
                    console.error('Error fetching signature MJML:', sigErr);
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

    const compileMjml = useCallback((content: string) => {
        if (!content.trim()) {
            setHtmlPreview('');
            setCompileError(null);
            return;
        }

        // If we have the shell, wrap content in it for a full-email preview
        let fullMjml: string;
        if (shellRef.current) {
            fullMjml = shellRef.current
                .replace(CONTENT_PLACEHOLDER, content)
                .replace(SIGNATURE_PLACEHOLDER, signatureRef.current);
        } else {
            // Fallback: compile content fragment only
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

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await emailService.patchTemplate(templateId, { mjml_content: mjmlContent });
            setIsDirty(false);
        } catch (err) {
            console.error('Error saving MJML content:', err);
            setCompileError('Failed to save MJML content. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const initContent = useCallback(
        (content: string) => {
            setMjmlContent(content);
            compileMjml(content);
            setIsDirty(false);
        },
        [compileMjml]
    );

    const refreshSignature = useCallback(async () => {
        try {
            const { signature_mjml } = await emailService.getSignatureMjml(templateId);
            signatureRef.current = signature_mjml;
            if (mjmlContent) {
                compileMjml(mjmlContent);
            }
        } catch (err) {
            console.error('Error refreshing signature MJML:', err);
        }
    }, [templateId, mjmlContent, compileMjml]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Re-compile when shell finishes loading (so initial content gets the full preview)
    useEffect(() => {
        if (!shellLoading && mjmlContent) {
            compileMjml(mjmlContent);
        }
    }, [shellLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        mjmlContent,
        htmlPreview,
        compileError,
        isDirty,
        isSaving,
        shellLoading,
        handleContentChange,
        handleSave,
        initContent,
        refreshSignature,
    };
};

export default useEmailTemplateMjmlEditorVM;
