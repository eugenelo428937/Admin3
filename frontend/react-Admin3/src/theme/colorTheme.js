// Color Theme - All color definitions extracted from theme.js
// Contains BPP Color System, Material Design 3, and Liftkit colors

const colorTheme = {
	// Core Material-UI palette using Liftkit colors
	primary: {
		main: "#4658ac", // light__primary_lkv
		light: "#b9c3ff", // light__inverseprimary_lkv / dark__primary_lkv
		dark: "#2d3f93", // light__onprimaryfixedvariant_lkv
		contrastText: "#fefbff", // light__onprimary_lkv
	},
	secondary: {
		main: "#5a5d72", // light__secondary_lkv
		light: "#c3c5dd", // dark__secondary_lkv
		dark: "#434659", // light__onsecondaryfixedvariant_lkv
		contrastText: "#fff",
	},
	tertiary: {
		main: "#76546e", // light__tertiary_lkv
		light: "#e5bad8", // dark__tertiary_lkv
		dark: "#5c3c55", // light__ontertiaryfixedvariant_lkv
		contrastText: "#fff",
	},
	error: {
		main: "#ba1a1a", // light__error_lkv
		light: "#ffb4ab", // dark__error_lkv
		dark: "#93000a", // dark__errorcontainer_lkv
		contrastText: "#fff",
	},
	warning: {
		main: "#7c5800", // light__warning_lkv
		light: "#f7bd48", // dark__warning_lkv
		dark: "#5e4200", // dark__warningcontainer_lkv
		contrastText: "#fff",
	},
	info: {
		main: "#1758c7", // light__info_lkv
		light: "#b1c5ff", // dark__info_lkv
		dark: "#00419e", // dark__infocontainer_lkv
		contrastText: "#fff",
	},
	success: {
		main: "#006d3d", // light__success_lkv
		light: "#76db9a", // dark__success_lkv
		dark: "#00522c", // dark__successcontainer_lkv
		contrastText: "#fff",
	},
	background: {
		default: "#fefbff", // light__background_lkv
		paper: "#f0edf1", // light__surfacecontainer_lkv
	},
	surface: {
		main: "#e8eced", // light__surface_lkv
		variant: "#e3e1ec", // light__surfacevariant_lkv
		containerLowest: "#fff", // light__surfacecontainerlowest_lkv
		containerLow: "#cbdadd", // light__surfacecontainerlow_lkv
		container: "#f0edf1", // light__surfacecontainer_lkv
		containerHigh: "#eae7ec", // light__surfacecontainerhigh_lkv
		containerHighest: "#e4e1e6", // light__surfacecontainerhighest_lkv
	},
	text: {
		primary: "#1b1b1f", // light__onsurface_lkv
		secondary: "#45464f", // light__onsurfacevariant_lkv
	},

	// BPP Color System
	bpp: {
		granite: {
			"000": "#ffffff", // rgb(255,255,255) converted to hex
			"010": "#f1f1f1", // rgb(241,241,241) converted to hex
			"020": "#d9d9d9", // rgb(217,217,217) converted to hex
			"030": "#bababa", // rgb(186,186,186) converted to hex
			"040": "#9e9e9e", // rgb(158,158,158) converted to hex
			"050": "#848484", // rgb(132,132,132) converted to hex
			"060": "#6a6a6a", // rgb(106,106,106) converted to hex
			"070": "#525252", // rgb(82,82,82) converted to hex
			"080": "#3b3b3a", // rgb(59,59,58) converted to hex
			"090": "#272524", // rgb(39,37,36) converted to hex
			100: "#111110", // rgb(17,17,16) converted to hex
		},
		purple: {
			"010": "#f1eefc",
			"020": "#dfd4f7", // rgb(223,212,247) converted to hex
			"030": "#beb1ee", // rgb(190,177,238) converted to hex
			"040": "#a592e5", // rgb(165,146,229) converted to hex
			"050": "#8f72dc", // rgb(143,114,220) converted to hex
			"060": "#7950d1", // rgb(121,80,209) converted to hex
			"070": "#6332b9", // rgb(99,50,185) converted to hex
			"080": "#4e0e9d", // rgb(78,14,157) converted to hex
			"090": "#310075", // rgb(49,0,117) converted to hex
			100: "#140043", // rgb(20,0,67) converted to hex
			110: "#8953fd", // rgb(137,83,253) converted to hex
		},
		sky: {
			"010": "#e5f9ff", // rgb(229,249,255) converted to hex
			"020": "#8ae6ff", // rgb(138,230,255) converted to hex
			"030": "#2bcbf8", // rgb(43,188,248) converted to hex
			"040": "#00abd9", // rgb(0,171,217) converted to hex
			"050": "#008ebb", // rgb(0,142,187) converted to hex
			"060": "#006f99", // rgb(0,111,153) converted to hex
			"070": "#005782", // rgb(0,87,130) converted to hex
			"080": "#003d67", // rgb(0,61,103) converted to hex
			"090": "#00264e", // rgb(0,38,78) converted to hex
			100: "#00141a", // rgb(0,20,26) converted to hex
			110: "#23cefd", // rgb(35,206,253) converted to hex
		},
		mint: {
			"010": "#dcfefb", // rgb(220,254,251) converted to hex
			"020": "#7eece3", // rgb(126,236,227) converted to hex
			"030": "#00cfbf", // rgb(0,207,191) converted to hex
			"040": "#00b2a4", // rgb(0,178,164) converted to hex
			"050": "#009487", // rgb(0,148,135) converted to hex
			"060": "#00776b", // rgb(0,119,107) converted to hex
			"070": "#005d52", // rgb(0,93,82) converted to hex
			"080": "#00423d", // rgb(0,66,61) converted to hex
			"090": "#022c25", // rgb(2,44,37) converted to hex
			100: "#001500", // rgb(0,21,0) converted to hex
			110: "#1ff9e8", // rgb(31,249,232) converted to hex
		},
		orange: {
			"010": "#fff2eb", // rgb(255,242,235) converted to hex
			"020": "#ffcfb8", // rgb(255,207,184) converted to hex
			"030": "#ffa27a", // rgb(255,162,122) converted to hex
			"040": "#ff7536", // rgb(255,117,54) converted to hex
			"050": "#e85100", // rgb(232,81,0) converted to hex
			"060": "#c83000", // rgb(200,48,0) converted to hex
			"070": "#a90000", // rgb(169,0,0) converted to hex
			"080": "#7d0000", // rgb(125,0,0) converted to hex
			"090": "#550000", // rgb(85,0,0) converted to hex
			100: "#2d0000", // rgb(45,0,0) converted to hex
			110: "#ff6717", // rgb(255,103,23) converted to hex
		},
		pink: {
			"010": "#fff0f7", // rgb(255,240,247) converted to hex
			"020": "#ffccdd", // rgb(255,204,221) converted to hex
			"030": "#ff9bbd", // rgb(255,155,189) converted to hex
			"040": "#ff69a2", // rgb(255,105,162) converted to hex
			"050": "#f33089", // rgb(243,48,137) converted to hex
			"060": "#cf006c", // rgb(207,0,108) converted to hex
			"070": "#a4004b", // rgb(164,0,75) converted to hex
			"080": "#7b002d", // rgb(123,0,45) converted to hex
			"090": "#540014", // rgb(84,0,20) converted to hex
			100: "#2d0002", // rgb(45,0,2) converted to hex
			110: "#fa388e", // rgb(250,56,142) converted to hex
		},
		yellow: {
			"010": "#fff8db", // rgb(255,248,219) converted to hex
			"020": "#f3d972", // rgb(243,217,114) converted to hex
			"030": "#d9b600", // rgb(217,182,0) converted to hex
			"040": "#be9a00", // rgb(190,154,0) converted to hex
			"050": "#a27f00", // rgb(162,127,0) converted to hex
			"060": "#856300", // rgb(133,99,0) converted to hex
			"070": "#6f4901", // rgb(111,73,1) converted to hex
			"080": "#563300", // rgb(86,51,0) converted to hex
			"090": "#3f1d00", // rgb(63,29,0) converted to hex
			100: "#280500", // rgb(40,5,0) converted to hex
			110: "#ffdb46", // rgb(255,219,70) converted to hex
		},
		cobalt: {
			"010": "#e9f1ff", // rgb(233,241,255) converted to hex
			"020": "#c7daff", // rgb(199,218,255) converted to hex
			"030": "#94bcff", // rgb(148,188,255) converted to hex
			"040": "#669dfd", // rgb(102,157,253) converted to hex
			"050": "#4481ec", // rgb(68,129,236) converted to hex
			"060": "#2a65ce", // rgb(42,101,206) converted to hex
			"070": "#0e4cb1", // rgb(14,76,177) converted to hex
			"080": "#003195", // rgb(0,49,149) converted to hex
			"090": "#00147b", // rgb(0,20,123) converted to hex
			100: "#09004a", // rgb(9,0,74) converted to hex
			110: "#518ffb", // rgb(81,143,251) converted to hex
		},
		green: {
			"010": "#dbfaed", // rgb(219,254,237) converted to hex
			"020": "#b4e4cf", // rgb(180,228,207) converted to hex
			"030": "#7dcaa8", // rgb(125,202,168) converted to hex
			"040": "#4eb186", // rgb(78,177,134) converted to hex
			"050": "#2f9569", // rgb(47,149,105) converted to hex
			"060": "#007a46", // rgb(0,122,70) converted to hex
			"070": "#005f2d", // rgb(0,95,45) converted to hex
			"080": "#004514", // rgb(0,69,20) converted to hex
			"090": "#002e12", // rgb(0,46,18) converted to hex
			100: "#001600", // rgb(0,22,0) converted to hex
			110: "#00e582", // rgb(0,229,130) converted to hex
		},
		red: {
			"010": "#ffedf3", // rgb(255,237,243) converted to hex
			"020": "#ffccd0", // rgb(255,204,208) converted to hex
			"030": "#fba2aa", // rgb(251,162,170) converted to hex
			"040": "#f37887", // rgb(243,120,135) converted to hex
			"050": "#e84a67", // rgb(232,74,103) converted to hex
			"060": "#d30047", // rgb(211,0,71) converted to hex
			"070": "#a70026", // rgb(167,0,38) converted to hex
			"080": "#7d0006", // rgb(125,0,6) converted to hex
			"090": "#550000", // rgb(85,0,0) converted to hex
			100: "#2d0000", // rgb(45,0,0) converted to hex
			110: "#df1156", // rgb(223,17,86) converted to hex
		},
	},

	// Material Design 3 System Colors
	md3: {
		primary: "#006874", // rgb(0,104,116) converted to hex
		onPrimary: "#ffffff", // rgb(255,255,255) converted to hex
		primaryContainer: "#9eeffd", // rgb(158,239,253) converted to hex
		onPrimaryContainer: "#004f58", // rgb(0,79,88) converted to hex
		secondary: "#296379", // rgb(41,99,121) converted to hex
		onSecondary: "#ffffff", // rgb(255,255,255) converted to hex
		secondaryContainer: "#9eeffd", // rgb(158,239,253) converted to hex
		onSecondaryContainer: "#004f58", // rgb(0,79,88) converted to hex
		tertiary: "#525e7d", // rgb(82,94,125) converted to hex
		onTertiary: "#ffffff", // rgb(255,255,255) converted to hex
		tertiaryContainer: "#dae2ff", // rgb(218,226,255) converted to hex
		onTertiaryContainer: "#3b4664", // rgb(59,70,100) converted to hex
		error: "#ba1a1a", // rgb(186,26,26) converted to hex
		onError: "#ffffff", // rgb(255,255,255) converted to hex
		errorContainer: "#ffdad6", // rgb(255,218,214) converted to hex
		onErrorContainer: "#93000a", // rgb(147,0,10) converted to hex
		background: "#f5fafb", // rgb(245,250,251) converted to hex
		onBackground: "#171d1e", // rgb(23,29,30) converted to hex
		surface: "#f5fafb", // rgb(245,250,251) converted to hex
		onSurface: "#171d1e", // rgb(23,29,30) converted to hex
		surfaceVariant: "#dbe4e6", // rgb(219,228,230) converted to hex
		onSurfaceVariant: "#3f484a", // rgb(63,72,74) converted to hex
		outline: "#6f797a", // rgb(111,121,122) converted to hex
		outlineVariant: "#bfc8ca", // rgb(191,200,202) converted to hex
		shadow: "#000000", // rgb(0,0,0) converted to hex
		scrim: "#000000", // rgb(0,0,0) converted to hex
		inverseSurface: "#2b3133", // rgb(43,49,51) converted to hex
		inverseOnSurface: "#ecf2f3", // rgb(236,242,243) converted to hex
		inversePrimary: "#82d3e0", // rgb(130,211,224) converted to hex
	},

	// Liftkit Light Theme
	liftkit: {
		light: {
			background: "#fefbff", // rgb(254,251,255) converted to hex
			onSurface: "#1b1b1f", // rgb(27,27,31) converted to hex
			primary: "#4658ac", // rgb(70,88,172) converted to hex
			surfaceContainerLowest: "#fff", // rgb(255,255,255) converted to hex
			onSurfaceVariant: "#45464f", // rgb(69,70,79) converted to hex
			onPrimary: "#fefbff", // rgb(254,251,255) converted to hex
			outlineVariant: "#c6c5d0", // rgb(198,197,208) converted to hex
			shadow: "#000", // rgb(0,0,0) converted to hex
			info: "#1758c7", // rgb(23,88,199) converted to hex
			secondary: "#5a5d72", // rgb(90,93,114) converted to hex
			outline: "#767680", // rgb(118,118,128) converted to hex
			inversePrimary: "#b9c3ff", // rgb(185,195,255) converted to hex
			surfaceContainerLow: "#cbdadd", // rgb(203,218,220) converted to hex
			successContainer: "#92f8b4", // rgb(146,248,180) converted to hex
			onSuccessContainer: "#00210f", // rgb(0,33,15) converted to hex
			infoContainer: "#dae2ff", // rgb(218,226,255) converted to hex
			onInfoContainer: "#001946", // rgb(0,25,70) converted to hex
			warningContainer: "#ffdea7", // rgb(255,222,167) converted to hex
			onWarningContainer: "#271900", // rgb(39,25,0) converted to hex
			errorContainer: "#ffdad6", // rgb(255,218,214) converted to hex
			onErrorContainer: "#410002", // rgb(65,0,2) converted to hex
			onSecondaryContainer: "#171b2c", // rgb(23,27,44) converted to hex
			primaryContainer: "#dee1ff", // rgb(222,225,255) converted to hex
			onPrimaryContainer: "#001258", // rgb(0,18,88) converted to hex
			onSecondary: "#fff", // rgb(255,255,255) converted to hex
			secondaryContainer: "#dfe1f9", // rgb(223,225,249) converted to hex
			tertiary: "#76546e", // rgb(118,84,110) converted to hex
			onTertiary: "#fff", // rgb(255,255,255) converted to hex
			tertiaryContainer: "#ffd7f2", // rgb(255,215,242) converted to hex
			onTertiaryContainer: "#2d1228", // rgb(45,18,40) converted to hex
			error: "#ba1a1a", // rgb(186,26,26) converted to hex
			onError: "#fff", // rgb(255,255,255) converted to hex
			onBackground: "#1b1b1f", // rgb(27,27,31) converted to hex
			surface: "#e8eced", // rgb(232,237,237) converted to hex
			surfaceVariant: "#e3e1ec", // rgb(227,225,236) converted to hex
			scrim: "#000", // rgb(0,0,0) converted to hex
			inverseSurface: "#303034", // rgb(48,48,52) converted to hex
			inverseOnSurface: "#f3f0f4", // rgb(243,240,244) converted to hex
			success: "#006d3d", // rgb(0,109,61) converted to hex
			onSuccess: "#fff", // rgb(255,255,255) converted to hex
			warning: "#7c5800", // rgb(124,88,0) converted to hex
			onWarning: "#fff", // rgb(255,255,255) converted to hex
			onInfo: "#fff", // rgb(255,255,255) converted to hex
		},

		// Liftkit Dark Theme
		dark: {
			outline: "#90909a",
			error: "#ffb4ab",
			primary: "#b9c3ff",
			onPrimary: "#11277c",
			primaryContainer: "#2d3f93",
			onPrimaryContainer: "#dee1ff",
			secondary: "#c3c5dd",
			onSecondary: "#2c2f42",
			secondaryContainer: "#434659",
			onSecondaryContainer: "#dfe1f9",
			tertiary: "#e5bad8",
			onTertiary: "#44263e",
			tertiaryContainer: "#5c3c55",
			onTertiaryContainer: "#ffd7f2",
			onError: "#690005",
			errorContainer: "#93000a",
			onErrorContainer: "#ffb4ab",
			background: "#1b1b1f",
			onBackground: "#e4e1e6",
			surface: "#131316",
			onSurface: "#e4e1e6",
			onSurfaceVariant: "#c6c5d0",
			surfaceVariant: "#45464f",
			shadow: "#000",
			inverseSurface: "#e4e1e6",
			scrim: "#000",
			inverseOnSurface: "#303034",
			inversePrimary: "#4658ac",
			success: "#76db9a",
			onSuccess: "#00391d",
			successContainer: "#00522c",
			onSuccessContainer: "#92f8b4",
			warning: "#f7bd48",
			onWarning: "#412d00",
			warningContainer: "#5e4200",
			onWarningContainer: "#ffdea7",
			info: "#b1c5ff",
			onInfo: "#002c71",
			infoContainer: "#00419e",
			onInfoContainer: "#dae2ff",
		},
	},
};

export default colorTheme;