import { type ComponentType, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root') as HTMLElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

function render(App: ComponentType) {
  return root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export default render;
