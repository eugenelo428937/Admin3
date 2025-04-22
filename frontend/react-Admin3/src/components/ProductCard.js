import React from 'react';
import { Col, Card, Button } from 'react-bootstrap';
import "../styles/product_card.css";
import { useCart } from "../CartContext";

const ProductCard = ({ product, onAddToCart }) => {
    return (
        <Col>
            <Card className="h-100 shadow-sm">
                <Card.Header className="bg-primary text-white product-card-header">
                    <h5 className="mb-0">{product.subject_code}</h5>
                </Card.Header>
                <Card.Body>
                    <Card.Title>{product.product_name}</Card.Title>
                    <Card.Text>
                        Product Code: {product.product_code}
                        <br />
                        Type: {product.product_type}
                        <br />
                        Subtype: {product.product_subtype}
                    </Card.Text>
                </Card.Body>
                <Card.Footer className="bg-white border-0">
                    <Button
                        variant="success"
                        className="w-100"
                        onClick={() => onAddToCart(product)}>
                        Add to Cart
                    </Button>
                </Card.Footer>
            </Card>
        </Col>
    );
};

export default ProductCard;
