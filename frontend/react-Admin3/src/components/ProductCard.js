import React from 'react';
import { Col, Card, Button } from 'react-bootstrap';
import "../styles/product_card.css";
import {
	CartPlus,
	ExclamationCircle
} from "react-bootstrap-icons";
import { useCart } from "../CartContext";
import MarkingProductCard from "./MarkingProductCard";

const ProductCard = ({ product, onAddToCart }) => {
    if (product.type === 'Markings') {
        return <MarkingProductCard product={product} onAddToCart={onAddToCart} />;
    }

    return (
			<Col>
				<Card className="h-100 shadow-sm">
					<Card.Header className="bg-primary text-white product-card-header">
						<h5 className="mb-0">{product.subject_code}</h5>
					</Card.Header>
					<Card.Body>
						<Card.Title>{product.product_name}</Card.Title>
					</Card.Body>
					<Card.Footer className="bg-white border-0 d-flex flex-row flex-wrap justify-content-end">
						<Button
							variant="success"
							className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
							onClick={() => onAddToCart(product)}>
							<CartPlus className="bi d-flex flex-row align-items-center" />
						</Button>
					</Card.Footer>
				</Card>
			</Col>
		);
};

export default ProductCard;
