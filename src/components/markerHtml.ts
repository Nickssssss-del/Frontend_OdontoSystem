/**
 * HTML template for the custom Leaflet marker.
 * Kept in a separate .ts file so Vite does not try to parse it as JSX.
 */
export const PIN_HTML_TEMPLATE = `
<div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;" title="{TITULO}">
  <div style="background: #006B68; color: #FFFFFF; width: 34px; height: 34px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0, 107, 104, 0.4), 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  </div>
  <div style="width: 2px; height: 8px; background: #006B68; border-radius: 1px;"></div>
  <div style="width: 8px; height: 3px; background: rgba(0, 107, 104, 0.35); border-radius: 9999px; filter: blur(0.5px);"></div>
</div>
`;
