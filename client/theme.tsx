import { tagAnatomy } from "@chakra-ui/anatomy";
import {
  createMultiStyleConfigHelpers,
  defineStyleConfig,
  extendTheme,
  StyleFunctionProps
} from "@chakra-ui/react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";

// Generated from https://palette.saas-ui.dev/
const colors = {
  black: "#0e1012",
  gray: {
    "50": "#f9fafa",
    "100": "#f1f1f2",
    "200": "#e7e7e8",
    "300": "#d3d4d5",
    "400": "#abadaf",
    "500": "#7d7f83",
    "600": "#52555a",
    "700": "#33373d",
    "800": "#1d2025",
    "900": "#171a1d"
  },
  blue: {
    "50": "#eef7ff",
    "100": "#c0e2ff",
    "200": "#91cbff",
    "300": "#59b2ff",
    "400": "#1f96ff",
    "500": "#1581df",
    "600": "#126cbb",
    "700": "#0d528f",
    "800": "#0b4475",
    "900": "#093760"
  },
  purple: {
    "50": "#f8f6ff",
    "100": "#e4d9ff",
    "200": "#d1bdff",
    "300": "#b393ff",
    "400": "#9e75ff",
    "500": "#804aff",
    "600": "#6625ff",
    "700": "#5115dd",
    "800": "#4311b7",
    "900": "#320d89"
  },
  pink: {
    "50": "#fff5fa",
    "100": "#ffd6ec",
    "200": "#ffb2db",
    "300": "#ff7ec3",
    "400": "#ff4fad",
    "500": "#e91686",
    "600": "#c81373",
    "700": "#a40f5f",
    "800": "#810c4a",
    "900": "#600937"
  },
  orange: {
    "50": "#fffaf5",
    "100": "#ffe9d6",
    "200": "#ffd0a6",
    "300": "#ffa85c",
    "400": "#fa8118",
    "500": "#d76f14",
    "600": "#b65e11",
    "700": "#914b0e",
    "800": "#723b0b",
    "900": "#5e3109"
  },
  yellow: {
    "50": "#fffefa",
    "100": "#fff9e1",
    "200": "#ffeda4",
    "300": "#ffdd55",
    "400": "#f3c717",
    "500": "#c8a413",
    "600": "#a0830f",
    "700": "#7d660c",
    "800": "#5e4d09",
    "900": "#4d3f07"
  },
  green: {
    "50": "#effff7",
    "100": "#9bffca",
    "200": "#17f57f",
    "300": "#15da71",
    "400": "#12bf63",
    "500": "#0fa455",
    "600": "#0d8846",
    "700": "#0a6a37",
    "800": "#08572d",
    "900": "#074725"
  },
  teal: {
    "50": "#e4fffe",
    "100": "#5dfff9",
    "200": "#16ede5",
    "300": "#14d3cd",
    "400": "#11b4ae",
    "500": "#0e9994",
    "600": "#0c7c78",
    "700": "#09615d",
    "800": "#08514e",
    "900": "#064240"
  },
  cyan: {
    "50": "#eefdff",
    "100": "#b0f4ff",
    "200": "#87efff",
    "300": "#4de7ff",
    "400": "#15c6e1",
    "500": "#13b6cf",
    "600": "#12a4ba",
    "700": "#0f889a",
    "800": "#0c6f7f",
    "900": "#095662"
  },
  navbar: "#001529",
  border: "rgba(0,0,0,.125)",
  page: {
    bg: "#f0f2f5"
  },
  session: {
    bg: "#e6f7ff"
  }
};

const { definePartsStyle: definePartsStyleTag } = createMultiStyleConfigHelpers(
  tagAnatomy.keys
);
const Tag = defineStyleConfig({
  variants: {
    outline: ({ colorScheme }) =>
      definePartsStyleTag({
        container: {
          borderRadius: "2px",
          bgColor: `${colorScheme}.50`,
          minWidth: "fit-content"
        }
      })
  }
});

const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: "2px"
  },
  variants: {
    solid: ({ colorScheme }: StyleFunctionProps) => ({
      bgColor: `${colorScheme}.400`,
      _hover: {
        bgColor: `${colorScheme}.600`
      }
    }),
    pagination: ({ colorScheme }: StyleFunctionProps) => ({
      border: "1px solid",
      borderColor: "border",
      cursor: "pointer",
      _active: {
        borderColor: `${colorScheme}.400 !important`,
        color: `${colorScheme}.400 !important`
      },
      _disabled: {
        borderColor: `gray.400 !important`,
        color: `gray.400 !important`
      },
      _hover: {
        borderColor: `${colorScheme}.400`,
        color: `${colorScheme}.400`
      }
    })
  }
});

const Link = defineStyleConfig({
  baseStyle: ({ colorScheme }: StyleFunctionProps) => ({
    color: `${colorScheme}.400`,
    fontWeight: "bold",
    _hover: {
      color: `${colorScheme}.500`
    }
  })
});

export const theme = extendTheme({
  colors,
  fonts: {
    body: `'Inter', sans-serif`
  },
  styles: {
    global: {
      html: {
        fontSize: "14px",
        fontStyle: "normal"
      }
    }
  },
  components: {
    Button,
    Link,
    Tag
  }
});
