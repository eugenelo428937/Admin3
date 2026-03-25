import React, { useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface MjmlPreviewPaneProps {
    html: string;
    error: string | null;
}

const MjmlPreviewPane: React.FC<MjmlPreviewPaneProps> = ({ html, error }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            iframeRef.current.srcdoc = html
                || '<p style="color:#999;text-align:center;padding:2rem;">No preview available</p>';
        }
    }, [html]);

    return (
        <div className="tw:flex tw:h-full tw:flex-col">
            {error && (
                <div
                    role="alert"
                    className="tw:mb-2 tw:flex tw:items-start tw:gap-2 tw:rounded-md tw:border tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:p-3 tw:text-sm tw:text-admin-destructive"
                >
                    <AlertCircle className="tw:mt-0.5 tw:size-4 tw:shrink-0" />
                    {error}
                </div>
            )}
            <div
                className="tw:flex-1 tw:overflow-hidden tw:rounded-md tw:border tw:border-admin-border tw:bg-card"
                style={{ minHeight: 500 }}
            >
                <iframe
                    ref={iframeRef}
                    title="MJML Preview"
                    sandbox=""
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 500,
                        border: 'none',
                    }}
                />
            </div>
        </div>
    );
};

export default MjmlPreviewPane;
