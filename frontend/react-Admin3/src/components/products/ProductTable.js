// src/components/products/ProductTable.js
import React from "react";
import { Link } from "react-router-dom";
import { Table, Button } from "react-bootstrap";

const ProductTable = ({ products, onDelete }) => {
    return (
        <Table striped bordered hover>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {products.map((product) => (
                    <tr key={product.id}>
                        <td>{product.code}</td>
                        <td>{product.name}</td>
                        <td>{product.active ? "Active" : "Inactive"}</td>
                        <td>
                            <Link to={`/products/${product.id}`}>
                                <Button variant="info" size="sm">
                                    View
                                </Button>
                            </Link>
                            {" "}
                            <Link to={`/products/edit/${product.id}`}>
                                <Button variant="warning" size="sm">
                                    Edit
                                </Button>
                            </Link>
                            {" "}
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => onDelete(product.id)}
                            >
                                Delete
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default ProductTable;
