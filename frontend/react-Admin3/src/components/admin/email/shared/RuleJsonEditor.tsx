import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { Check as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

export interface RuleJsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    error: string | null;
}

const RuleJsonEditor: React.FC<RuleJsonEditorProps> = ({ value, onChange, error }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const isValid = useMemo(() => {
        if (!value || value.trim() === '') return null;
        try {
            JSON.parse(value);
            return true;
        } catch {
            return false;
        }
    }, [value]);

    // Initialize CodeMirror editor
    useEffect(() => {
        if (!editorRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                json(),
                oneDark,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: editorRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value changes into editor (if content differs)
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const currentDoc = view.state.doc.toString();
        if (currentDoc !== value) {
            view.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: value },
            });
        }
    }, [value]);

    return (
        <Box>
            <Box
                sx={{
                    border: '1px solid',
                    borderColor: error ? 'error.main' : isValid === false ? 'warning.main' : 'grey.300',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '& .cm-editor': { height: 300, minHeight: 300 },
                    '& .cm-scroller': { overflow: 'auto' },
                }}
            >
                <div ref={editorRef} style={{ height: 300, minHeight: 300 }} />
            </Box>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {error ? (
                    <>
                        <ErrorIcon fontSize="small" color="error" />
                        <Typography variant="caption" color="error">{error}</Typography>
                    </>
                ) : isValid === true ? (
                    <>
                        <CheckIcon fontSize="small" color="success" />
                        <Typography variant="caption" color="success.main">Valid JSON</Typography>
                    </>
                ) : isValid === false ? (
                    <>
                        <ErrorIcon fontSize="small" color="warning" />
                        <Typography variant="caption" color="warning.main">Invalid JSON syntax</Typography>
                    </>
                ) : null}
            </Box>
        </Box>
    );
};

export default RuleJsonEditor;
