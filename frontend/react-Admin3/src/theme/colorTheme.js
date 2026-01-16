// Color Theme - All color definitions extracted from theme.js
// Contains BPP Color System, Material Design 3, and Liftkit colors

const colorTheme = {
	palette: {
		offwhite: {
			"000": "#fdfdfd", // #fdfdfd
			"001": "#F4F4F4", // #F4F4F4
			"002": "#ECECEC", // #ECECEC
			"003": "#E3E3E3", // #E3E3E3
			"005": "#DADADA", // #DADADA
			"006": "#D2D2D2", // #D2D2D2
			"007": "#C9C9C9", // #C9C9C9
			"008": "#C1C1C1", // #C1C1C1
			"009": "#B8B8B8", // #B8B8B8
		},
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
			"100": "#111110", // rgb(17,17,16) converted to hex
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
			"035": "#669dfd", // rgb(125,172,254) converted to hex
			"040": "#669dfd", // rgb(102,157,253) converted to hex
			"045": "#568ded", // rgb(86,141,237) converted to hex
			"050": "#4481ec", // rgb(68,129,236) converted to hex
			"055": "#3774dd", // rgb(55,116,221) converted to hex
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
		primary: {
			main: "#4658ac", // light__primary_lkv #4658ac
			light: "#b9c3ff", // light__inverseprimary_lkv / dark__primary_lkv #b9c3ff
			dark: "#2d3f93", // light__onprimaryfixedvariant_lkv #2d3f93
			contrastText: "#fefbff", // light__onprimary_lkv #fefbff
		},
		secondary: {
			main: "#5a5d72", // light__secondary_lkv #5a5d72
			light: "#c3c5dd", // dark__secondary_lkv #c3c5dd
			dark: "#434659", // light__onsecondaryfixedvariant_lkv #434659
			contrastText: "#fff",
		},
		tertiary: {
			main: "#76546e", // light__tertiary_lkv #76546e
			light: "#e5bad8", // dark__tertiary_lkv #e5bad8
			dark: "#5c3c55", // light__ontertiaryfixedvariant_lkv #5c3c55
			contrastText: "#fff",
		},
		error: {
			main: "#ba1a1a", // light__error_lkv #ba1a1a
			light: "#ffb4ab", // dark__error_lkv #ffb4ab
			dark: "#93000a", // dark__errorcontainer_lkv #93000a
			background: "#ffc3bb",
			contrastText: "#fff",
		},
		warning: {
			main: "#7c5800", // light__warning_lkv #7c5800
			light: "#f7bd48", // dark__warning_lkv #f7bd48
			dark: "#4b3400", // dark__warningcontainer_lkv #5e4200
			background: "#fcebc8",
			contrastText: "#fff",
		},
		info: {
			main: "#1758c7", // light__info_lkv #1758c7
			light: "#b1c5ff", // dark__info_lkv #eaefff 
			dark: "#002d6e ", // dark__infocontainer_lkv #002d6e 
			background: "#ecf0ff",
			contrastText: "#fff",
		},
		success: {
			main: "#006d3d", // light__success_lkv #006d3d
			light: "#76db9a", // dark__success_lkv #76db9a
			dark: "#00522c", // dark__successcontainer_lkv #00522c
			background: "#c8f0d6",
			contrastText: "#fff",
		},
		background: {
			default: "#fefbff", // light__background_lkv
			paper: "#fdfdfd", // light__surfacecontainer_lkv
		},
		surface: {
			main: "#e8eced", // light__surface_lkv #e8eced
			variant: "#e3e1ec", // light__surfacevariant_lkv #e3e1ec
			containerLowest: "#fff", // light__surfacecontainerlowest_lkv #fff
			containerLow: "#cbdadd", // light__surfacecontainerlow_lkv #cbdadd
			container: "#f0edf1", // light__surfacecontainer_lkv #f0edf1
			containerHigh: "#eae7ec", // light__surfacecontainerhigh_lkv #eae7ec
			containerHighest: "#e4e1e6", // light__surfacecontainerhighest_lkv #e4e1e6
		},
		text: {
			primary: "#1b1b1f", // light__onsurface_lkv #1b1b1f
			secondary: "#45464f", // light__onsurfacevariant_lkv #45464f
		},

		// Material Design 3 System Colors
		md3: {
			primary: "#755085", // #755085
            surfaceTint: "#755085", // #755085
            onPrimary: "#FFFFFF", // #FFFFFF
            primaryContainer: "#F7D8FF", // #F7D8FF
            onPrimaryContainer: "#5C396C", // #5C396C
            secondary: "#69596D", // #69596D
            onSecondary: "#FFFFFF", // #FFFFFF
            secondaryContainer: "#F1DCF4", // #F1DCF4
            onSecondaryContainer: "#504255", // #504255
            tertiary: "#815251", // #815251
            onTertiary: "#FFFFFF", // #FFFFFF
            tertiaryContainer: "#FFDAD8", // #FFDAD8
            onTertiaryContainer: "#663B3A", // #663B3A
            error: "#904A43", // #904A43
            onError: "#FFFFFF", // #FFFFFF
            errorContainer: "#FFDAD5", // #FFDAD5
            onErrorContainer: "#73342D", // #73342D
            background: "#FFF7FB", // #FFF7FB
            onBackground: "#1E1A1F", // #1E1A1F
            surface: "#FDF8FF", // #FDF8FF
            onSurface: "#1C1B20", // #1C1B20
            surfaceVariant: "#E5E1EC", // #E5E1EC
            onSurfaceVariant: "#47464F", // #47464F
            outline: "#787680", // #787680
            outlineVariant: "#C9C5D0", // #C9C5D0
            shadow: "#000000", // #000000
            scrim: "#000000", // #000000
            inverseSurface: "#312F36", // #312F36
            inverseOnSurface: "#F4EFF7", // #F4EFF7
            inversePrimary: "#E3B7F3", // #E3B7F3
            primaryFixed: "#F7D8FF", // #F7D8FF
            onPrimaryFixed: "#2D0B3D", // #2D0B3D
            primaryFixedDim: "#E3B7F3", // #E3B7F3
            onPrimaryFixedVariant: "#5C396C", // #5C396C
            secondaryFixed: "#F1DCF4", // #F1DCF4
            onSecondaryFixed: "#231728", // #231728
            secondaryFixedDim: "#D4C0D7", // #D4C0D7
            onSecondaryFixedVariant: "#504255", // #504255
            tertiaryFixed: "#FFDAD8", // #FFDAD8
            onTertiaryFixed: "#331111", // #331111
            tertiaryFixedDim: "#F5B7B5", // #F5B7B5
            onTertiaryFixedVariant: "#663B3A", // #663B3A
            surfaceDim: "#DDD8E0", // #DDD8E0
            surfaceBright: "#FDF8FF", // #FDF8FF
            surfaceContainerLowest: "#FFFFFF", // #FFFFFF
            surfaceContainerLow: "#F7F2FA", // #F7F2FA
            surfaceContainer: "#F1ECF4", // #F1ECF4
            surfaceContainerHigh: "#EBE6EE", // #EBE6EE
            surfaceContainerHighest: "#E6E1E9", // #E6E1E9
		},

		// Liftkit Theme
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
				outline: "#90909a", // rgb(144,144,154) converted to hex
				error: "#ffb4ab", // rgb(255,180,171) converted to hex
				primary: "#b9c3ff", // rgb(185,195,255) converted to hex
				onPrimary: "#11277c", // rgb(17,39,124) converted to hex
				primaryContainer: "#2d3f93", // rgb(45,63,147) converted to hex
				onPrimaryContainer: "#dee1ff", // rgb(222,225,255) converted to hex
				secondary: "#c3c5dd", // rgb(195,197,221) converted to hex
				onSecondary: "#2c2f42", // rgb(44,47,66) converted to hex
				secondaryContainer: "#434659", // rgb(67,70,89) converted to hex
				onSecondaryContainer: "#dfe1f9", // rgb(223,225,249) converted to hex
				tertiary: "#e5bad8", // rgb(229,186,216) converted to hex
				onTertiary: "#44263e", // rgb(68,38,62) converted to hex
				tertiaryContainer: "#5c3c55", // rgb(92,60,85) converted to hex
				onTertiaryContainer: "#ffd7f2", // rgb(255,215,242) converted to hex
				onError: "#690005", // rgb(105,0,5) converted to hex
				errorContainer: "#93000a", // rgb(147,0,10) converted to hex
				onErrorContainer: "#ffb4ab", // rgb(255,180,171) converted to hex
				background: "#1b1b1f", // rgb(27,27,31) converted to hex
				onBackground: "#e4e1e6", // rgb(228,225,230) converted to hex
				surface: "#131316", // rgb(19,19,22) converted to hex
				onSurface: "#e4e1e6", // rgb(228,225,230) converted to hex
				onSurfaceVariant: "#c6c5d0", // rgb(198,197,208) converted to hex
				surfaceVariant: "#45464f", // rgb(69,70,79) converted to hex
				shadow: "#000", // rgb(0,0,0) converted to hex
				inverseSurface: "#e4e1e6", // rgb(228,225,230) converted to hex
				scrim: "#000", // rgb(0,0,0) converted to hex
				inverseOnSurface: "#303034", // rgb(48,48,52) converted to hex
				inversePrimary: "#4658ac", // rgb(70,88,172) converted to hex
				success: "#76db9a", // rgb(118,219,154) converted to hex
				onSuccess: "#00391d", // rgb(0,57,29) converted to hex
				successContainer: "#00522c", // rgb(0,82,44) converted to hex
				onSuccessContainer: "#92f8b4", // rgb(146,248,180) converted to hex
				warning: "#f7bd48", // rgb(247,189,72) converted to hex
				onWarning: "#412d00", // rgb(65,45,0) converted to hex
				warningContainer: "#5e4200", // rgb(94,66,0) converted to hex
				onWarningContainer: "#ffdea7", // rgb(255,222,167) converted to hex
				info: "#b1c5ff", // rgb(177,197,255) converted to hex
				onInfo: "#002c71", // rgb(0,44,113) converted to hex
				infoContainer: "#00419e", // rgb(0,65,158) converted to hex
				onInfoContainer: "#dae2ff", // rgb(218,226,255) converted to hex
			},
		},
	},
};

export default colorTheme;