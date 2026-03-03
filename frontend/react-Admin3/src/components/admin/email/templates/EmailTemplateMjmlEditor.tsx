import React, { useRef, useEffect, useState } from 'react';
import {
    Box, Button, Chip, CircularProgress,
    Select, MenuItem, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions,
} from '@mui/material';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import MjmlPreviewPane from '../shared/MjmlPreviewPane';
import BasicModeToolbar from './BasicModeToolbar';
import useEmailTemplateMjmlEditorVM from './useEmailTemplateMjmlEditorVM';

interface EmailTemplateMjmlEditorProps {
    templateId: number;
    initialContent: string;
    initialBasicModeContent: string;
}

const EmailTemplateMjmlEditor: React.FC<EmailTemplateMjmlEditorProps> = ({
    templateId,
    initialContent,
    initialBasicModeContent,
}) => {
    const vm = useEmailTemplateMjmlEditorVM(templateId);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Initialize VM state from props
    useEffect(() => {
        if (!isInitialized) {
            vm.initContent(initialContent || '', initialBasicModeContent || '');
            setIsInitialized(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Create/recreate CodeMirror when mode changes or after initialization
    useEffect(() => {
        if (!editorRef.current || !isInitialized) return;

        if (editorViewRef.current) {
            editorViewRef.current.destroy();
            editorViewRef.current = null;
            setIsEditorReady(false);
        }

        const isBasic = vm.editorMode === 'basic';
        const doc = isBasic ? vm.basicModeContent : vm.mjmlContent;
        const lang = isBasic ? markdown() : xml();
        const changeHandler = isBasic
            ? vm.handleBasicContentChange
            : vm.handleContentChange;

        const state = EditorState.create({
            doc: doc || '',
            extensions: [
                basicSetup,
                lang,
                oneDark,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        changeHandler(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: editorRef.current });
        editorViewRef.current = view;
        setIsEditorReady(true);

        return () => {
            view.destroy();
            editorViewRef.current = null;
            setIsEditorReady(false);
        };
    }, [vm.editorMode, isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleModeChange = (newMode: string) => {
        if (newMode === vm.editorMode) return;
        if (newMode === 'advanced' && vm.editorMode === 'basic') {
            setConfirmDialogOpen(true);
        } else {
            vm.setEditorMode(newMode as 'basic' | 'advanced');
        }
    };

    const confirmSwitchToAdvanced = () => {
        setConfirmDialogOpen(false);
        vm.setEditorMode('advanced');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Select
                        value={vm.editorMode}
                        onChange={(e) => handleModeChange(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="basic">Basic Mode</MenuItem>
                        <MenuItem value="advanced">Advanced Mode</MenuItem>
                    </Select>
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

            {vm.editorMode === 'basic' && (
                <BasicModeToolbar editorViewRef={editorViewRef} disabled={!isEditorReady} />
            )}

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

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Switch to Advanced Mode?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Switching to Advanced Mode will convert your content to MJML.
                        You won't be able to switch back to Basic Mode. Continue?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmSwitchToAdvanced} variant="contained">
                        Switch to Advanced
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmailTemplateMjmlEditor;
