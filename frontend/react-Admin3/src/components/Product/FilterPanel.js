import React, { useState, useEffect } from "react";
import { Col, Button, Accordion } from "react-bootstrap";
import { FilterCircle } from "react-bootstrap-icons";
import { Typography } from "@mui/material";
import Select from "react-select";
import subjectService from "../services/subjectService";
import productService from "../services/productService";
import "../styles/product_list.css";

const FilterPanel = ({ 
    onFiltersChange, 
    categoryFilter, 
    subjectFilter,
    isSearchMode = false,
    isMobile = false 
}) => {
    // Filter state
    const [mainCategory, setMainCategory] = useState([]);
    const [subjectGroup, setSubjectGroup] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState([]);
    const [groupFilters, setGroupFilters] = useState({
        MAIN_CATEGORY: [],
        DELIVERY_METHOD: [],
    });
    const [groupOptions, setGroupOptions] = useState({
        MAIN_CATEGORY: [],
        DELIVERY_METHOD: [],
    });
    const [subjectOptions, setSubjectOptions] = useState([]);
    const [showFilters, setShowFilters] = useState(true);

    // Reset category filter when it changes from navbar
    useEffect(() => {
        console.log('🏷️ [FilterPanel] Category filter useEffect triggered');
        console.log('🏷️ [FilterPanel] categoryFilter:', categoryFilter, 'isSearchMode:', isSearchMode);
        
        // Don't set regular filters if we're in search mode
        if (!isSearchMode) {
            console.log('🏷️ [FilterPanel] Not in search mode, setting category filter');
            setMainCategory(categoryFilter ? [categoryFilter] : []);
            setDeliveryMethod([]);
        } else {
            console.log('🏷️ [FilterPanel] In search mode, skipping category filter');
        }
    }, [categoryFilter, isSearchMode]);

    // Fetch all subjects for the Subject filter
    useEffect(() => {
        subjectService.getAll().then((subjects) => {
            setSubjectOptions(
                (subjects || []).map((s) => ({
                    value: s.id,
                    label: s.name || s.code,
                }))
            );
            
            // If we have a subject_code from URL, convert it to subject ID
            // Only do this if we're NOT in search mode
            if (!isSearchMode && subjectFilter && typeof subjectFilter === 'string' && isNaN(parseInt(subjectFilter))) {
                const foundSubject = subjects.find(s => s.code === subjectFilter);
                if (foundSubject) {
                    console.log(`Converting subject_code ${subjectFilter} to ID ${foundSubject.id}`);
                    setSubjectGroup([foundSubject.id]);
                }
            }
        });
    }, [subjectFilter, isSearchMode]);

    // Fetch product group filters for MAIN_CATEGORY and DELIVERY_METHOD only
    useEffect(() => {
        productService.getProductGroupFilters().then((filters) => {
            const filterMap = { MAIN_CATEGORY: [], DELIVERY_METHOD: [] };
            const optionMap = { MAIN_CATEGORY: [], DELIVERY_METHOD: [] };
            filters.forEach((f) => {
                if (f.filter_type === "MAIN_CATEGORY") {
                    filterMap.MAIN_CATEGORY.push(...f.groups);
                    optionMap.MAIN_CATEGORY.push(
                        ...f.groups
                            .filter((g) => g && g.id !== undefined && g.name)
                            .map((g) => ({ value: g.id, label: g.name }))
                    );
                }
                if (f.filter_type === "DELIVERY_METHOD") {
                    filterMap.DELIVERY_METHOD.push(...f.groups);
                    optionMap.DELIVERY_METHOD.push(
                        ...f.groups
                            .filter((g) => g && g.id !== undefined && g.name)
                            .map((g) => ({ value: g.id, label: g.name }))
                    );
                }
            });
            setGroupFilters(filterMap);
            setGroupOptions(optionMap);
        });
    }, []);

    // Notify parent component when filters change
    useEffect(() => {
        if (onFiltersChange) {
            onFiltersChange({
                mainCategory,
                subjectGroup,
                deliveryMethod
            });
        }
    }, [mainCategory, subjectGroup, deliveryMethod, onFiltersChange]);

    // Handle filter changes
    const handleMainCategoryChange = (selected) =>
        setMainCategory(selected ? selected.map((opt) => opt.value) : []);
    
    const handleSubjectGroupChange = (selected) =>
        setSubjectGroup(selected ? selected.map((opt) => opt.value) : []);
    
    const handleDeliveryMethodChange = (selected) =>
        setDeliveryMethod(selected ? selected.map((opt) => opt.value) : []);
    
    const handleFilterToggle = () => setShowFilters((prev) => !prev);

    return (
        <>
            {/* Filter Toggle Button */}
            <div className="d-flex align-items-center mb-3">
                {!isSearchMode && (
                    <button
                        className="filter-toggle-btn"
                        onClick={handleFilterToggle}
                        aria-label="Toggle Filters"					
                        style={{
                            border: 0,
                            backgroundColor: "var(--main-backgound-color)",						
                        }}>
                        <FilterCircle size={18} style={{ marginRight: 6 }} />
                        <span>
                            <Typography variant="button" color="text-primary">
                                Filter
                            </Typography>
                        </span>
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            <Col
                xs={12}
                md={1}
                lg={1}
                className={`filter-panel${showFilters ? " show" : " hide"}${
                    isMobile ? " mobile" : ""
                }`}
                style={{
                    position: isMobile ? "static" : "absolute",
                    left: 0,
                    top: 0,
                    zIndex: 3,
                    width: isMobile ? "100%" : showFilters ? "20%" : 0,
                    minWidth: isMobile ? undefined : showFilters ? "200px" : 0,
                    maxWidth: isMobile ? undefined : showFilters ? "300px" : 0,
                    background: isMobile ? undefined : "white",
                    boxShadow:
                        showFilters && !isMobile
                            ? "2px 0 8px rgba(0,0,0,0.08)"
                            : "none",
                    transition: "all 0.5s cubic-bezier(.5,.5,.5,.5)",
                    overflow: "hidden",
                    display: (showFilters || isMobile) && !isSearchMode ? "block" : "none",
                }}>
                <div
                    className="filters-wrapper p-3 bg-light rounded shadow-sm mb-4 rf-searchfilters"
                    id="rf-searchfilters">
                    <Accordion
                        defaultActiveKey={[
                            "subject",
                            "main_category",
                            "delivery_method",
                        ]}
                        alwaysOpen>
                        <Accordion.Item eventKey="subject">
                            <Accordion.Header>Subject</Accordion.Header>
                            <Accordion.Body>
                                <fieldset className="rf-facetlist">
                                    <ul className="rf-facetlist-list">
                                        {subjectOptions.map((opt) => (
                                            <li
                                                className="rf-facetlist-item"
                                                key={opt.value}>
                                                <input
                                                    type="checkbox"
                                                    id={`subject-${opt.value}`}
                                                    checked={subjectGroup.includes(
                                                        opt.value
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSubjectGroup([
                                                                ...subjectGroup,
                                                                opt.value,
                                                            ]);
                                                        } else {
                                                            setSubjectGroup(
                                                                subjectGroup.filter(
                                                                    (id) => id !== opt.value
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    className="me-1"
                                                />
                                                <label htmlFor={`subject-${opt.value}`}>
                                                    {opt.label}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </fieldset>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="main_category">
                            <Accordion.Header>Main Category</Accordion.Header>
                            <Accordion.Body>
                                <fieldset className="rf-facetlist">
                                    <ul className="rf-facetlist-list">
                                        {groupOptions.MAIN_CATEGORY.map((opt) => (
                                            <li
                                                className="rf-facetlist-item"
                                                key={opt.value}>
                                                <input
                                                    type="checkbox"
                                                    id={`maincat-${opt.value}`}
                                                    checked={mainCategory.includes(
                                                        opt.value
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setMainCategory([
                                                                ...mainCategory,
                                                                opt.value,
                                                            ]);
                                                        } else {
                                                            setMainCategory(
                                                                mainCategory.filter(
                                                                    (id) => id !== opt.value
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    className="me-1"
                                                />
                                                <label htmlFor={`maincat-${opt.value}`}>
                                                    {opt.label}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </fieldset>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="delivery_method">
                            <Accordion.Header>Delivery Method</Accordion.Header>
                            <Accordion.Body>
                                <fieldset className="rf-facetlist">
                                    <ul className="rf-facetlist-list">
                                        {groupOptions.DELIVERY_METHOD.map((opt) => (
                                            <li
                                                className="rf-facetlist-item"
                                                key={opt.value}>
                                                <input
                                                    type="checkbox"
                                                    id={`delivery-${opt.value}`}
                                                    checked={deliveryMethod.includes(
                                                        opt.value
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setDeliveryMethod([
                                                                ...deliveryMethod,
                                                                opt.value,
                                                            ]);
                                                        } else {
                                                            setDeliveryMethod(
                                                                deliveryMethod.filter(
                                                                    (id) => id !== opt.value
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    className="me-1"
                                                />
                                                <label htmlFor={`delivery-${opt.value}`}>
                                                    {opt.label}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </fieldset>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </div>
            </Col>
        </>
    );
};

export default FilterPanel; 