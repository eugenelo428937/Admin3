import React from 'react';
import {
    Box,
    Grid,
    Typography,
    Stack,
    IconButton,
    useTheme,
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import {
    FaFacebook,
    FaTwitter,
    FaLinkedin,
    FaYoutube,
    FaComments,
} from 'react-icons/fa';
import useFooterVM, { ProductGroups } from './useFooterVM';

// Subject category filters (same as NavigationMenu.js)
const SUBJECT_CATEGORIES = {
    corePrinciples: {
        header: 'Core Principles',
        filter: (s: { code: string }) => /^(CB|CS|CM)/.test(s.code),
    },
    corePractices: {
        header: 'Core Practices',
        filter: (s: { code: string }) => /^CP[1-3]$/.test(s.code),
    },
    specialistAdvanced: {
        header: 'Specialist Advanced',
        filter: (s: { code: string }) => /^SA/.test(s.code),
    },
    specialistPrinciples: {
        header: 'Specialist Principles',
        filter: (s: { code: string }) => /^SP/.test(s.code),
    },
};

const SUPPORT_LINKS = [
    { label: 'FAQ', to: '/faq' },
    { label: 'Student Brochure 2026 Exam', to: '/brochure-2026' },
    { label: 'Materials Application Form', to: '/materials-application' },
    { label: 'Tutorial Application Form', to: '/tutorial-application' },
];

const SOCIAL_MEDIA = [
    { icon: FaFacebook, label: 'Facebook', url: 'https://www.facebook.com/bppacted' },
    { icon: FaTwitter, label: 'Twitter', url: 'https://twitter.com/bppacted' },
    { icon: FaLinkedin, label: 'LinkedIn', url: 'https://www.linkedin.com/company/bpp-actuarial-education' },
    { icon: FaYoutube, label: 'YouTube', url: 'https://www.youtube.com/bppacted' },
    { icon: FaComments, label: 'Comments', url: '/contact' },
];

const BOTTOM_LINKS = [
    { label: 'General Terms of Use', to: '/terms-of-use' },
    { label: 'Cookie Use', to: '/cookie-policy' },
    { label: 'Complaints', to: '/complaints' },
];

interface SubjectItem {
    id: number;
    code: string;
    description: string;
}

// Reusable header components
const SectionSubHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography
        variant="captionSemiBold"
        sx={(theme: any) => ({
            color: theme.palette.scales.granite[30],
            mb: 0.36,
            display: 'block',
        })}
    >
        {children}
    </Typography>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography
        variant="captionSemiBold"
        sx={(theme: any) => ({
            color: theme.palette.scales.granite[20],
            mb: 0.6,
            display: 'block',
            borderBottom: `1px solid ${theme.palette.scales.granite[70]}`,
        })}
    >
        {children}
    </Typography>
);

const MainSectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography
        variant="captionBold"
        sx={(theme: any) => ({
            color: theme.palette.scales.granite[10],
            mb: 1.2,
            display: 'block',
            borderBottom: `1px solid ${theme.palette.scales.granite[50]}`,
        })}
    >
        {children}
    </Typography>
);

interface FooterLinkProps {
    to: string;
    onClick?: () => void;
    children: React.ReactNode;
    external?: boolean;
}

const FooterLink: React.FC<FooterLinkProps> = ({ to, onClick, children, external = false }) => {
    const linkStyles = (theme: any) => ({
        color: theme.palette.scales.granite[30],
        textDecoration: 'none',
        display: 'block',
        py: 0.25,
        '&:hover': {
            color: theme.palette.scales.granite[0],
            textDecoration: 'underline',
        },
    });

    if (external) {
        return (
            <Typography
                variant="caption2"
                component="a"
                href={to}
                target="_blank"
                rel="noopener noreferrer"
                sx={linkStyles}
            >
                {children}
            </Typography>
        );
    }

    return (
        <Typography
            variant="caption2"
            component={NavLink}
            to={to}
            onClick={onClick}
            sx={linkStyles}
        >
            {children}
        </Typography>
    );
};

// Subjects Section
interface SubjectsSectionProps {
    subjects: SubjectItem[];
    handleSubjectClick: (code: string) => void;
}

const SubjectsSection: React.FC<SubjectsSectionProps> = ({ subjects, handleSubjectClick }) => (
    <Box sx={{ textAlign: 'left' }}>
        <MainSectionHeader>Subjects</MainSectionHeader>
        <Box sx={{ columnCount: 2 }}>
            <Stack sx={{ paddingBottom: 1 }}>
                <SectionHeader>{SUBJECT_CATEGORIES.corePrinciples.header}</SectionHeader>
                <Box>
                    {subjects
                        ?.filter(SUBJECT_CATEGORIES.corePrinciples.filter)
                        .map((subject) => (
                            <FooterLink
                                key={subject.id}
                                to={`/products?subject_code=${subject.code}`}
                                onClick={() => handleSubjectClick?.(subject.code)}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                    <Box sx={{ textWrap: 'nowrap' }}>{subject.code}&nbsp;-&nbsp;</Box>
                                    <Box sx={{ textWrap: 'pretty' }}>{subject.description}</Box>
                                </Box>
                            </FooterLink>
                        ))}
                </Box>
            </Stack>

            <Stack sx={{ paddingBottom: 1 }}>
                <SectionHeader>{SUBJECT_CATEGORIES.specialistAdvanced.header}</SectionHeader>
                <Box>
                    {subjects
                        ?.filter(SUBJECT_CATEGORIES.specialistAdvanced.filter)
                        .map((subject) => (
                            <FooterLink
                                key={subject.id}
                                to={`/products?subject_code=${subject.code}`}
                                onClick={() => handleSubjectClick?.(subject.code)}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                    <Box sx={{ textWrap: 'nowrap' }}>{subject.code}&nbsp;-&nbsp;</Box>
                                    <Box sx={{ textWrap: 'pretty' }}>{subject.description}</Box>
                                </Box>
                            </FooterLink>
                        ))}
                </Box>
            </Stack>
            <Stack sx={{ paddingBottom: 1 }}>
                <SectionHeader>{SUBJECT_CATEGORIES.corePractices.header}</SectionHeader>
                <Box>
                    {subjects
                        ?.filter(SUBJECT_CATEGORIES.corePractices.filter)
                        .map((subject) => (
                            <FooterLink
                                key={subject.id}
                                to={`/products?subject_code=${subject.code}`}
                                onClick={() => handleSubjectClick?.(subject.code)}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                    <Box sx={{ textWrap: 'nowrap' }}>{subject.code}&nbsp;-&nbsp;</Box>
                                    <Box sx={{ textWrap: 'pretty' }}>{subject.description}</Box>
                                </Box>
                            </FooterLink>
                        ))}
                </Box>
            </Stack>
            <Stack sx={{ paddingBottom: 1 }}>
                <SectionHeader>{SUBJECT_CATEGORIES.specialistPrinciples.header}</SectionHeader>
                <Box>
                    {subjects
                        ?.filter(SUBJECT_CATEGORIES.specialistPrinciples.filter)
                        .map((subject) => (
                            <FooterLink
                                key={subject.id}
                                to={`/products?subject_code=${subject.code}`}
                                onClick={() => handleSubjectClick?.(subject.code)}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                    <Box sx={{ textWrap: 'nowrap' }}>{subject.code}&nbsp;-&nbsp;</Box>
                                    <Box sx={{ textWrap: 'pretty' }}>{subject.description}</Box>
                                </Box>
                            </FooterLink>
                        ))}
                </Box>
            </Stack>
        </Box>
    </Box>
);

// Products Section
interface ProductsSectionProps {
    productGroups: ProductGroups;
    handleProductGroupClick: (groupName: string) => void;
    handleSpecificProductClick: (productId: number | string) => void;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({
    productGroups,
    handleProductGroupClick,
    handleSpecificProductClick,
}) => (
    <Box sx={{ textAlign: 'left' }}>
        <MainSectionHeader>Products</MainSectionHeader>
        <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
                <Stack>
                    <SectionHeader>Core Study Materials</SectionHeader>
                    {productGroups?.coreStudyMaterials?.map((product) => (
                        <FooterLink
                            key={product.id}
                            to={`/products/${product.id}`}
                            onClick={() => handleSpecificProductClick?.(product.id)}
                        >
                            {product.shortname}
                        </FooterLink>
                    ))}
                </Stack>
            </Grid>
            <Grid size={{ xs: 4 }}>
                <Stack>
                    <SectionHeader>Revision Materials</SectionHeader>
                    {productGroups?.revisionMaterials?.map((product) => (
                        <FooterLink
                            key={product.id}
                            to={`/products/${product.id}`}
                            onClick={() => handleSpecificProductClick?.(product.id)}
                        >
                            {product.shortname}
                        </FooterLink>
                    ))}
                </Stack>
            </Grid>
            <Grid size={{ xs: 4 }}>
                <Stack>
                    <SectionHeader>Marking Products</SectionHeader>
                    {productGroups?.markingProducts?.map((product) => (
                        <FooterLink
                            key={product.id}
                            to={`/products/${product.id}`}
                            onClick={() => handleSpecificProductClick?.(product.id)}
                        >
                            {product.shortname}
                        </FooterLink>
                    ))}
                </Stack>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <SectionHeader>Tutorial</SectionHeader>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 8 }}>
                        <SectionSubHeader>Location</SectionSubHeader>
                        <Box sx={{ columnCount: 3 }}>
                            {productGroups?.tutorialLocations?.map((product) => (
                                <FooterLink
                                    key={product.id}
                                    to={`/products/${product.id}`}
                                    onClick={() => handleSpecificProductClick?.(product.id)}
                                >
                                    {product.shortname}
                                </FooterLink>
                            ))}
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                        <SectionSubHeader>Format</SectionSubHeader>
                        {productGroups?.tutorialFormats?.map((format) => (
                            <FooterLink
                                key={format.filter_type}
                                to={`/products?group=${format.group_name}`}
                                onClick={() => handleProductGroupClick?.(format.group_name)}
                            >
                                {format.name}
                            </FooterLink>
                        ))}
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    </Box>
);

// Support Section
const SupportSection: React.FC = () => (
    <Box sx={{ textAlign: 'left' }}>
        <MainSectionHeader>Support</MainSectionHeader>
        <Stack spacing={0.1} alignItems="flex-start">
            {SUPPORT_LINKS.map((link) => (
                <FooterLink key={link.to} to={link.to}>
                    {link.label}
                </FooterLink>
            ))}
        </Stack>
    </Box>
);

// Social Media Section
const SocialMediaSection: React.FC = () => (
    <Stack direction="row" spacing={0.2} justifyContent="flex-start">
        {SOCIAL_MEDIA.map((social) => {
            const IconComponent = social.icon;
            return (
                <IconButton
                    key={social.label}
                    component="a"
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    sx={(theme: any) => ({
                        color: theme.palette.scales.granite[30],
                        '&:hover': {
                            color: theme.palette.scales.granite[0],
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                    })}
                >
                    <IconComponent size={18} />
                </IconButton>
            );
        })}
    </Stack>
);

// Copyright Section
const CopyrightSection: React.FC = () => (
    <Box>
        <Typography
            variant="caption2"
            sx={(theme: any) => ({ color: theme.palette.scales.granite[30] })}
        >
            Copyright &copy; 2026 BPP Actuarial Education - Part of the BPP
            Professional Education Group -{' '}
        </Typography>
        <Typography
            variant="caption2"
            component="a"
            href="mailto:acted@bpp.com"
            sx={(theme: any) => ({
                color: theme.palette.scales.granite[30],
                textDecoration: 'none',
                '&:hover': {
                    color: theme.palette.scales.granite[0],
                    textDecoration: 'underline',
                },
            })}
        >
            acted@bpp.com
        </Typography>
    </Box>
);

// Bottom Links Section
const BottomLinksSection: React.FC = () => (
    <Stack
        direction="row"
        spacing={1}
        divider={
            <Typography
                variant="caption2"
                sx={(theme: any) => ({ color: theme.palette.scales.granite[40] })}
            >
                |
            </Typography>
        }
        justifyContent="flex-start"
    >
        {BOTTOM_LINKS.map((link) => (
            <FooterLink key={link.to} to={link.to}>
                {link.label}
            </FooterLink>
        ))}
    </Stack>
);

// Main Footer Component
const Footer: React.FC = () => {
    const theme = useTheme();
    const {
        subjects,
        productGroups,
        handleSubjectClick,
        handleProductGroupClick,
        handleSpecificProductClick,
    } = useFooterVM();

    return (
        <Box
            component="footer"
            sx={{
                backgroundColor: (theme as any).palette.scales.granite[80],
                pt: (theme as any).spacingTokens.lg,
                px: (theme as any).spacingTokens.xl[1],
                zIndex: 99,
                position: 'relative',
            }}
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 10 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                            <SubjectsSection
                                subjects={subjects}
                                handleSubjectClick={handleSubjectClick}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                            <ProductsSection
                                productGroups={productGroups}
                                handleProductGroupClick={handleProductGroupClick}
                                handleSpecificProductClick={handleSpecificProductClick}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid size={{ xs: 12, md: 2 }}>
                    <SupportSection />
                </Grid>

                <Grid
                    size={{ xs: 12, md: 12 }}
                    sx={{
                        justifyItems: 'start',
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'flex-start', md: 'center' },
                        justifyContent: 'space-between',
                        gap: { xs: 1.5, md: 0 },
                    }}
                >
                    <SocialMediaSection />
                    <CopyrightSection /> <BottomLinksSection />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Footer;
