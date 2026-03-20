import { useState } from 'react';
import { readString } from 'react-papaparse';
import subjectService from '../../../services/subjectService';
import type { SubjectInput } from '../../../types/subject';

export interface SubjectImportVM {
    // State
    file: File | null;
    message: string;
    loading: boolean;

    // Derived
    isError: boolean;

    // Actions
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImport: () => void;
}

const useSubjectImportVM = (): SubjectImportVM => {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const isError = message.includes('Error');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
        setMessage('');
    };

    const handleImport = () => {
        if (!file) {
            setMessage('Please select a CSV file');
            return;
        }

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const csvData = event.target?.result as string;
                const results = readString(csvData, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results: any) => results,
                });

                const subjects: SubjectInput[] = (results as any).data
                    .slice(1)
                    .map((row: string[]) => ({
                        code: row[0],
                        description: row[1],
                        active: row[2]?.toLowerCase() === 'true',
                    }))
                    .filter((subject: SubjectInput) => subject.code);

                const data = await subjectService.bulkImport(subjects);
                if ((data as any).error) {
                    throw new Error((data as any).error);
                }
                setMessage(`Successfully imported ${subjects.length} subjects`);
            } catch (error: any) {
                setMessage('Error processing file: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        reader.readAsText(file);
    };

    return {
        file, message, loading,
        isError,
        handleFileChange, handleImport,
    };
};

export default useSubjectImportVM;
