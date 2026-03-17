import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import {
    navSelectSubject,
    navSelectProductGroup,
    navSelectProduct,
} from '../../store/slices/filtersSlice.js';

interface Subject {
    id: number;
    code: string;
    description: string;
    active?: boolean;
}

interface NavProduct {
    id: number | string;
    shortname: string;
}

interface NavProductGroup {
    name: string;
    products: NavProduct[];
}

interface TutorialFormat {
    filter_type: string;
    group_name: string;
    name: string;
}

export interface ProductGroups {
    coreStudyMaterials: NavProduct[];
    revisionMaterials: NavProduct[];
    markingProducts: NavProduct[];
    tutorialLocations: NavProduct[];
    tutorialFormats: TutorialFormat[];
}

export interface FooterVM {
    subjects: Subject[];
    productGroups: ProductGroups;
    handleSubjectClick: (subjectCode: string) => void;
    handleProductGroupClick: (groupName: string) => void;
    handleSpecificProductClick: (productId: number | string) => void;
}

const TUTORIAL_FORMATS: TutorialFormat[] = [
    { filter_type: 'classroom', group_name: 'Classroom', name: 'Classroom' },
    { filter_type: 'online', group_name: 'Online', name: 'Online' },
    { filter_type: 'distance', group_name: 'Distance Learning', name: 'Distance Learning' },
];

const useFooterVM = (): FooterVM => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [navbarProductGroups, setNavbarProductGroups] = useState<NavProductGroup[]>([]);

    useEffect(() => {
        const fetchNavigationData = async () => {
            try {
                const data = await productService.getNavigationData();
                const activeSubjects = ((data.subjects || []) as Subject[]).filter(
                    (subject) => subject.active !== false
                );
                setSubjects(activeSubjects);
                setNavbarProductGroups(data.navbarProductGroups || []);
            } catch (error) {
                console.error('Error fetching footer navigation data:', error);
            }
        };
        fetchNavigationData();
    }, []);

    const getProductsByGroupName = (groupName: string): NavProduct[] => {
        const group = navbarProductGroups.find((g) => g.name === groupName);
        return group?.products || [];
    };

    const productGroups: ProductGroups = {
        coreStudyMaterials: getProductsByGroupName('Core Study Materials'),
        revisionMaterials: getProductsByGroupName('Revision Materials'),
        markingProducts: [
            ...getProductsByGroupName('Marking'),
            ...getProductsByGroupName('Voucher'),
        ],
        tutorialLocations: getProductsByGroupName('Tutorial'),
        tutorialFormats: TUTORIAL_FORMATS,
    };

    const handleSubjectClick = (subjectCode: string) => {
        dispatch(navSelectSubject(subjectCode));
        navigate('/products');
    };

    const handleProductGroupClick = (groupName: string) => {
        dispatch(navSelectProductGroup(groupName));
        navigate('/products');
    };

    const handleSpecificProductClick = (productId: number | string) => {
        dispatch(navSelectProduct(productId));
        navigate('/products');
    };

    return {
        subjects,
        productGroups,
        handleSubjectClick,
        handleProductGroupClick,
        handleSpecificProductClick,
    };
};

export default useFooterVM;
