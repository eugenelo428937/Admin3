// src/components/admin/products/ProductTable.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
  Box,
  IconButton,
  Collapse,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ProductVariationsPanel from "./ProductVariationsPanel.js";

const AdminProductTable = ({ products, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null);

    const handleToggleExpand = (productId) => {
        setExpandedId(prev => prev === productId ? null : productId);
    };

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 50 }} />
                        <TableCell>Code</TableCell>
                        <TableCell>Full Name</TableCell>
                        <TableCell>Short Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>Buy Both</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product) => (
                        <React.Fragment key={product.id}>
                            <TableRow hover>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleToggleExpand(product.id)}
                                        aria-label={expandedId === product.id ? `Collapse variations for ${product.code}` : `Expand variations for ${product.code}`}
                                    >
                                        {expandedId === product.id
                                            ? <KeyboardArrowUpIcon />
                                            : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </TableCell>
                                <TableCell>{product.code}</TableCell>
                                <TableCell>{product.fullname}</TableCell>
                                <TableCell>{product.shortname}</TableCell>
                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {product.description || '-'}
                                </TableCell>
                                <TableCell>{product.is_active ? "Active" : "Inactive"}</TableCell>
                                <TableCell>{product.buy_both ? "Yes" : "No"}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            component={Link}
                                            to={`/admin/products/${product.id}`}
                                            variant="contained"
                                            color="info"
                                            size="small"
                                        >
                                            View
                                        </Button>
                                        <Button
                                            component={Link}
                                            to={`/admin/products/${product.id}/edit`}
                                            variant="contained"
                                            color="warning"
                                            size="small"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            onClick={() => onDelete(product.id)}
                                        >
                                            Delete
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            <TableRow aria-hidden={expandedId !== product.id}>
                                <TableCell sx={{ py: 0 }} colSpan={8}>
                                    <Collapse in={expandedId === product.id} timeout="auto" unmountOnExit>
                                        <ProductVariationsPanel productId={product.id} />
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AdminProductTable;
