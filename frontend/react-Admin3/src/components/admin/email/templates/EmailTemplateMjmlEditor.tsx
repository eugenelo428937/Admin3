import React, { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Badge } from '@/components/admin/ui/badge';
import { AdminConfirmDialog } from '@/components/admin/composed';
import { AdminSelect } from '@/components/admin/composed';
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
        <div className="tw:flex tw:flex-col tw:gap-4">
            {/* Toolbar */}
            <div className="tw:flex tw:items-center tw:justify-between">
                <div className="tw:flex tw:items-center tw:gap-3">
                    <div className="tw:w-40">
                        <AdminSelect
                            options={[
                                { value: 'basic', label: 'Basic Mode' },
                                { value: 'advanced', label: 'Advanced Mode' },
                            ]}
                            value={vm.editorMode}
                            onChange={handleModeChange}
                        />
                    </div>
                    {vm.shellLoading && (
                        <Badge variant="outline" className="tw:gap-1">
                            <Loader2 className="tw:size-3 tw:animate-spin" />
                            Loading preview shell...
                        </Badge>
                    )}
                    {vm.isDirty && (
                        <Badge variant="outline" className="tw:border-amber-300 tw:bg-amber-50 tw:text-amber-700">
                            Unsaved changes
                        </Badge>
                    )}
                </div>
                <Button
                    size="sm"
                    onClick={vm.handleSave}
                    disabled={vm.isSaving || !vm.isDirty}
                >
                    {vm.isSaving ? 'Saving...' : 'Save'}
                </Button>
            </div>

            {vm.editorMode === 'basic' && (
                <BasicModeToolbar editorViewRef={editorViewRef} disabled={!isEditorReady} />
            )}

            {/* Split pane: Editor + Preview */}
            <div className="tw:flex tw:gap-4 tw:min-h-[500px]">
                {/* Left: CodeMirror Editor */}
                <div
                    className="tw:flex-1 tw:overflow-hidden tw:rounded-md tw:border tw:border-admin-border"
                    style={{
                        /* CodeMirror sizing */
                    }}
                >
                    <style>{`
                        .cm-editor { height: 100%; min-height: 500px; text-align: left; }
                        .cm-scroller { overflow: auto; }
                        .cm-content { padding-left: 0; text-align: left; }
                        .cm-line { padding-left: 2px; text-align: left; }
                    `}</style>
                    <div ref={editorRef} className="tw:h-full tw:min-h-[500px]" />
                </div>

                {/* Right: Preview */}
                <div className="tw:flex-1">
                    <MjmlPreviewPane
                        html={vm.htmlPreview}
                        error={vm.compileError}
                    />
                </div>
            </div>

            <AdminConfirmDialog
                open={confirmDialogOpen}
                title="Switch to Advanced Mode?"
                description="Switching to Advanced Mode will convert your content to MJML. You won't be able to switch back to Basic Mode. Continue?"
                confirmLabel="Switch to Advanced"
                onConfirm={confirmSwitchToAdvanced}
                onCancel={() => setConfirmDialogOpen(false)}
            />
        </div>
    );
};

export default EmailTemplateMjmlEditor;
