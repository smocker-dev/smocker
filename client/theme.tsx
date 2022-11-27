import { extendTheme } from "@chakra-ui/react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";

const colors = {
  primary: "#1890ff",
  hover: {
    primary: "#40a9ff"
  },
  red: {
    light: "#fc5c65",
    dark: "#eb3b5a"
  },
  orange: {
    light: "#fd9644",
    dark: "#fa8231"
  },
  yellow: {
    light: "#fed330",
    dark: "#f7b731"
  },
  green: {
    light: "#26de81",
    dark: "#20bf6b"
  },
  teal: {
    light: "#2bcbba",
    dark: "#0fb9b1"
  },
  blue: {
    light: "#45aaf2",
    dark: "#2d98da"
  },
  azure: {
    light: "#4b7bec",
    dark: "#3867d6"
  },
  navy: {
    light: "#0056a7",
    dark: "#001529"
  },
  purple: {
    light: "#a55eea",
    dark: "#8854d0"
  },
  grey: {
    light: "#d1d8e0",
    dark: "#a5b1c2"
  },
  darkgrey: {
    light: "#778ca3",
    dark: "#4b6584"
  },
  black: {
    light: "#353b48",
    dark: "#2f3640"
  },
  white: {
    light: "#f5f6fa",
    dark: "#dcdde1"
  },
  sidebar: {
    border: "rgba(0,0,0,.125)",
    header: "rgba(0,0,0,.45)"
  },
  page: {
    bg: "#f0f2f5"
  }
};

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
  }
});
