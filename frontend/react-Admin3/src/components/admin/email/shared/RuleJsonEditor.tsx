import React, { useRef, useEffect, useMemo } from 'react';
import { Check, AlertCircle } from 'lucide-react';
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

    const borderClass = error
        ? 'tw:border-admin-destructive'
        : isValid === false
            ? 'tw:border-amber-400'
            : 'tw:border-admin-border';

    return (
        <div>
            <div className={`tw:overflow-hidden tw:rounded-md tw:border ${borderClass}`}>
                <style>{`
                    .cm-editor { height: 300px; min-height: 300px; }
                    .cm-scroller { overflow: auto; }
                `}</style>
                <div ref={editorRef} style={{ height: 300, minHeight: 300 }} />
            </div>
            <div className="tw:mt-1 tw:flex tw:items-center tw:gap-1">
                {error ? (
                    <>
                        <AlertCircle className="tw:size-3.5 tw:text-admin-destructive" />
                        <span className="tw:text-xs tw:text-admin-destructive">{error}</span>
                    </>
                ) : isValid === true ? (
                    <>
                        <Check className="tw:size-3.5 tw:text-admin-success" />
                        <span className="tw:text-xs tw:text-admin-success">Valid JSON</span>
                    </>
                ) : isValid === false ? (
                    <>
                        <AlertCircle className="tw:size-3.5 tw:text-amber-500" />
                        <span className="tw:text-xs tw:text-amber-500">Invalid JSON syntax</span>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default RuleJsonEditor;
