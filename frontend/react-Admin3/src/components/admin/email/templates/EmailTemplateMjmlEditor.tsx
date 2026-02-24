import React, { useRef, useEffect } from 'react';
import { Box, Button, Typography, Chip, CircularProgress } from '@mui/material';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import MjmlPreviewPane from '../shared/MjmlPreviewPane';
import useEmailTemplateMjmlEditorVM from './useEmailTemplateMjmlEditorVM';

interface EmailTemplateMjmlEditorProps {
    templateId: number;
    initialContent: string;
}

const EmailTemplateMjmlEditor: React.FC<EmailTemplateMjmlEditorProps> = ({
    templateId,
    initialContent,
}) => {
    const vm = useEmailTemplateMjmlEditorVM(templateId);
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const initializedRef = useRef<boolean>(false);

    // Initialize CodeMirror editor with initialContent directly (avoids race condition
    // where vm.mjmlContent is still '' because setMjmlContent hasn't flushed yet)
    useEffect(() => {
        if (!editorRef.current) return;

        // Seed the VM state so preview compiles and isDirty stays false
        if (initialContent && !initializedRef.current) {
            vm.initContent(initialContent);
            initializedRef.current = true;
        }

        const state = EditorState.create({
            doc: initialContent || '',
            extensions: [
                basicSetup,
                xml(),
                oneDark,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        vm.handleContentChange(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: editorRef.current });
        viewRef.current = view;

        return () => view.destroy();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1">MJML Editor</Typography>
                    {vm.shellLoading && (
                        <Chip
                            label="Loading preview shell..."
                            size="small"
                            variant="outlined"
                            icon={<CircularProgress size={14} />}
                        />
                    )}
                    {vm.isDirty && (
                        <Chip
                            label="Unsaved changes"
                            color="warning"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={vm.handleSave}
                        disabled={vm.isSaving || !vm.isDirty}
                    >
                        {vm.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </Box>
            </Box>

            {/* Split pane: Editor + Preview */}
            <Box sx={{ display: 'flex', gap: 2, minHeight: 500 }}>
                {/* Left: CodeMirror Editor */}
                <Box
                    sx={{
                        flex: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        '& .cm-editor': {
                            height: '100%',
                            minHeight: 500,
                            textAlign: 'left',
                        },
                        '& .cm-scroller': {
                            overflow: 'auto',
                        },
                        '& .cm-content': {
                            paddingLeft: 0,
                            textAlign: 'left',
                        },
                        '& .cm-line': {
                            paddingLeft: '2px',
                            textAlign: 'left',
                        },
                    }}
                >
                    <div ref={editorRef} style={{ height: '100%', minHeight: 500 }} />
                </Box>

                {/* Right: Preview */}
                <Box sx={{ flex: 1 }}>
                    <MjmlPreviewPane
                        html={vm.htmlPreview}
                        error={vm.compileError}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default EmailTemplateMjmlEditor;
