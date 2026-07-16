// src/styles/GlobalStyles.js (or top of App.jsx)
import { createGlobalStyle } from 'styled-components';
import KareFont from '../assets/fonts/client/src/assets/fonts/kare-trial.otf'; 

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'Kare';
    src: url(${KareFont}) format('truetype');
    font-weight: normal;
    font-style: normal;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Helvetica Neue', sans-serif;
  }
`;

export default GlobalStyle;