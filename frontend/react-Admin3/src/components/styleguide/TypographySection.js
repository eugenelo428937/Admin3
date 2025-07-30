import React from "react";
import {
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	Divider,
	Grid,
	Stack,
} from "@mui/material";

const TypographySection = () => {
	return (
		<Card
			elevation={2}
			sx={{ width: "100%" }}
			className="p-left__2xl p-right__2xl p-top__lg">
			<CardHeader
				title={<Typography variant="h3">Typography & Spacing</Typography>}
				subheader={
					<Typography variant="subtitle2">
						Material UI Typography variants from theme.js with LiftKit
						spacing.
					</Typography>
				}
			/>
			<Divider />
			<CardContent>
				<Grid container spacing={2}>
					<Grid size={{ xs: 12, md: 12, lg: 6 }}>
						<Typography variant="h4">Typography</Typography>
						<Divider />
						<Grid container spacing={2} className="m-top__md">
							<Grid size={{ xs: 12, md: 12, lg: 6 }}>
								<Stack spacing={2} textAlign="left">
									<Box>
										<Typography variant="h1">Heading 1</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h1" - Page titles
										</Typography>
									</Box>
									<Box>
										<Typography variant="h2">Heading 2</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h2" - Section titles
										</Typography>
									</Box>
									<Box>
										<Typography variant="h3">Heading 3</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h3" - Subsection titles
										</Typography>
									</Box>
									<Box>
										<Typography variant="h4">Heading 4</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h4" - Component titles
										</Typography>
									</Box>
									<Box>
										<Typography variant="h5">Heading 5</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h5" - Small headings
										</Typography>
									</Box>
									<Box>
										<Typography variant="h6">Heading 6</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="h6" - Card titles
										</Typography>
									</Box>
								</Stack>
							</Grid>
							<Grid size={{ xs: 12, md: 12, lg: 6 }}>
								<Stack
									spacing={2}
									textAlign="left"
									className="justify-content__end">
									<Box>
										<Typography
											variant="h1"
											sx={{ fontSize: "2rem" }}
											className="opacity__0">
											spacer
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary"
											className="opacity__0">
											spacer
										</Typography>
									</Box>
									<Box>
										<Typography variant="subtitle1">
											Subtitle 1 - Large subtitles
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="subtitle1"
										</Typography>
									</Box>
									<Box>
										<Typography variant="subtitle2">
											Subtitle 2 - Small subtitles
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="subtitle2"
										</Typography>
									</Box>
									<Box>
										<Typography variant="body1">
											Body 1 - Primary body text
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="body1"
										</Typography>
									</Box>
									<Box>
										<Typography variant="body2">
											Body 2 - Secondary content with tighter spacing
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary">
											variant="body2"
										</Typography>
									</Box>
									<Box>
										<Typography variant="button" wrap="nowrap">
											Button text - Button labels
										</Typography>
										<br />
										<Typography
											variant="caption"
											color="text.secondary">
											variant="button"
										</Typography>
									</Box>
									<Box>
										<Typography variant="caption">
											Caption text - Small annotations
										</Typography>
										<br />
										<Typography
											variant="caption"
											color="text.secondary">
											variant="caption"
										</Typography>
									</Box>
									<Box>
										<Typography variant="overline">
											OVERLINE TEXT - Labels
										</Typography>
										<br />
										<Typography
											variant="caption"
											color="text.secondary">
											variant="overline"
										</Typography>
									</Box>
								</Stack>
							</Grid>
						</Grid>
					</Grid>
					<Grid size={{ xs: 12, md: 12, lg: 4 }}>
						<Card elevation={2}>
							<CardHeader
								title={
									<Typography variant="h4">LiftKit Spacing</Typography>
								}
								subheader={
									<Typography variant="subtitle2">
										Material UI Spacing from theme.js with LiftKit
									</Typography>
								}
							/>
							<Divider />
							<CardContent>
								<Box
									sx={{ "& > div": { mb: 2 } }}
									textAlign="left"
									className="m-top__md">
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--2xs)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--2xs spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--xs)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--xs spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--sm)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--sm spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--md)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--md spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--lg)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--lg spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--xl)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--xl spacing
										</Typography>
									</Box>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
										}}>
										<Box
											sx={{
												width: "var(--2xl)",
												height: 16,
												backgroundColor: "primary.main",
											}}
										/>
										<Typography variant="body2">
											--2xl spacing
										</Typography>
									</Box>
								</Box>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</CardContent>
		</Card>
	);
};

export default TypographySection;
