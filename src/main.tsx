// Root contains the main dependencies and providers of the base app
//  - React, ReactDom, RecoilRoot, HelmetProvider, ThemeProvider, MUI-core)
// App contains the main structure of the base app

// These are the two main chunks that are used to render the core structure of the app
// Importing them with Promise.all (by using HTTP/2 multiplexing) we can load them in parallel
// and achieve the best possible performance
import './index.css';
// import '@pigment-css/react/styles.css';

import render from './root.tsx';

import('./App.tsx').then(({ default: App }) => {
  render(App);
});

// ts(1208)
export {};

// // import './lib/monaco-editor'; // Add this line at the top
// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import './index.css';
// import App from './App.tsx';
//
// import { Buffer } from 'buffer';
// window.Buffer = Buffer;
//
// // In your App.tsx or main.tsx
// /*import { loader } from '@monaco-editor/react';
//
// // Configure the loader
// loader.config({
//   paths: {
//     vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs',
//   },
//   'vs/nls': {
//     availableLanguages: {
//       '*': 'en',
//     },
//   },
// });*/
//
// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// );
