import React from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import { CartPlus, ExclamationCircle } from 'react-bootstrap-icons';
import productService from '../services/productService';

const MarkingProductCard = ({ product, onAddToCart }) => {
    const [deadlines, setDeadlines] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showAllDeadlines, setShowAllDeadlines] = React.useState(false);

    React.useEffect(() => {
        const fetchDeadlines = async () => {
            setLoading(true);
            try {
                const esspId = product.id || product.product_id;
                const data = await productService.getMarkingDeadlines(esspId);
                setDeadlines(data || []);
            } catch (e) {
                setDeadlines([]);
            }
            setLoading(false);
        };
        fetchDeadlines();
    }, [product]);

    const now = new Date();
    const parsedDeadlines = deadlines.map(d => ({
        ...d,
        deadline: new Date(d.deadline),
        recommended_submit_date: new Date(d.recommended_submit_date)
    }));
    const upcoming = parsedDeadlines.filter(d => d.deadline > now).sort((a, b) => a.deadline - b.deadline);
    const expired = parsedDeadlines.filter(d => d.deadline <= now).sort((a, b) => b.deadline - a.deadline);
    const allExpired = deadlines.length > 0 && expired.length === deadlines.length;

    return (
        <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white product-card-header">
                <h5 className="mb-0">{product.subject_code}</h5>
            </Card.Header>
            <Card.Body>
                <Card.Title>{product.product_name}</Card.Title>
                <div className="mt-2">
                    {loading ? (
                        <Spinner animation="border" size="sm" />
                    ) : (
                        <>
                            {upcoming.length > 0 && (
                                <div>
                                    <strong>Up coming deadlines:</strong>{' '}
                                    {showAllDeadlines ? (
                                        <span>
                                            {parsedDeadlines
                                                .sort((a, b) => a.deadline - b.deadline)
                                                .map((d, i) => (
                                                    <span key={i}>
                                                        {d.deadline.toLocaleDateString()}&nbsp;
                                                    </span>
                                                ))}
                                        </span>
                                    ) : (
                                        <span>{upcoming[0].deadline.toLocaleDateString()}</span>
                                    )}
                                </div>
                            )}
                            {expired.length > 0 && !allExpired && (
                                <div className="text-warning d-flex align-items-center mt-1">
                                    <ExclamationCircle className="me-1" />
                                    {expired.length} expired
                                </div>
                            )}
                            {allExpired && (
                                <div className="text-danger d-flex align-items-center mt-1">
                                    <ExclamationCircle className="me-1" />
                                    All deadline expired
                                </div>
                            )}
                            {deadlines.length > 1 && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 mt-1"
                                    onClick={() => setShowAllDeadlines((v) => !v)}>
                                    {showAllDeadlines
                                        ? 'Hide deadlines'
                                        : 'Show all deadlines'}
                                </Button>
                            )}
                        </>
                    )}
                </div>
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
    );
};

export default MarkingProductCard;
