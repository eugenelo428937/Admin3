import React from 'react';
import {
    Button, Container, Alert, Box, Typography,
    FormControl, FormLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import useProductImportVM from './useProductImportVM';

const AdminProductImport: React.FC = () => {
    const vm = useProductImportVM();

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>Import Products</Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}
            {vm.success && <Alert severity="success" sx={{ mb: 3 }}>{vm.success}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Upload CSV File</FormLabel>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={vm.handleFileChange}
                        required
                        style={{ marginTop: '8px' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        The CSV file should include columns: code, name, description (optional), active (true/false).
                    </Typography>
                </FormControl>

                {vm.preview.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Preview</Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {Object.keys(vm.preview[0]).map((key) => (
                                            <TableCell key={key}>{key}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vm.preview.map((row, i) => (
                                        <TableRow key={i}>
                                            {Object.values(row).map((val, j) => (
                                                <TableCell key={j}>{val as string}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            Showing first {vm.preview.length} rows
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        type="submit"
                        disabled={vm.loading || !vm.file}
                    >
                        {vm.loading ? 'Importing...' : 'Import Products'}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>CSV Format Guide</Typography>
                <Typography sx={{ mb: 2 }}>Your CSV file should follow this format:</Typography>
                <Box
                    component="pre"
                    sx={{
                        bgcolor: 'grey.100',
                        p: 3,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflowX: 'auto',
                    }}
                >
                    code,fullname,shortname,description,active{'\n'}
                    PRD001,Product One Complete Name,Prod1,This is product one,true{'\n'}
                    PRD002,Product Two Complete Name,Prod2,This is product two,true{'\n'}
                    PRD003,Product Three Complete Name,Prod3,This is product three,false
                </Box>
                <Box component="ul" sx={{ mt: 2 }}>
                    <li><strong>code</strong> - Unique product identifier (required)</li>
                    <li><strong>fullname</strong> - Complete product name (required)</li>
                    <li><strong>shortname</strong> - Abbreviated product name (required)</li>
                    <li><strong>description</strong> - Product description (optional)</li>
                    <li><strong>active</strong> - Product status (true/false)</li>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductImport;
