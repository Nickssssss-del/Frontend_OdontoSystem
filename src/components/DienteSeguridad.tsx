/**
 * Ilustración protagonista de la pantalla de recuperación: diente blanco
 * tridimensional con volumen, iluminación y sombra suave, protegido por un
 * escudo turquesa con marca de verificación, rodeado de curvas orbitales,
 * círculos translúcidos, puntos luminosos y formas abstractas en menta.
 * SVG independiente del logo corporativo (que se conserva intacto).
 */
export function DienteSeguridad({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Diente tridimensional protegido por un escudo con marca de verificación"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Halo menta que da profundidad luminosa al conjunto */}
        <radialGradient id="ds-halo" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#7FD7C9" stopOpacity="0.55" />
          <stop offset="58%" stopColor="#7FD7C9" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#7FD7C9" stopOpacity="0" />
        </radialGradient>

        {/* Volumen del diente: luz arriba, sombra suave abajo */}
        <linearGradient
          id="ds-diente"
          x1="112"
          y1="58"
          x2="298"
          y2="312"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#F8FDFC" />
          <stop offset="100%" stopColor="#C9E9E5" />
        </linearGradient>
        <linearGradient
          id="ds-diente-sombra"
          x1="200"
          y1="150"
          x2="200"
          y2="312"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#006B68" stopOpacity="0" />
          <stop offset="100%" stopColor="#006B68" stopOpacity="0.22" />
        </linearGradient>

        {/* Escudo turquesa */}
        <linearGradient
          id="ds-escudo"
          x1="242"
          y1="194"
          x2="344"
          y2="336"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00C8BA" />
          <stop offset="45%" stopColor="#00A99D" />
          <stop offset="100%" stopColor="#006B68" />
        </linearGradient>

        {/* Curvas orbitales */}
        <linearGradient
          id="ds-orbita"
          x1="20"
          y1="120"
          x2="380"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#7FD7C9" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#7FD7C9" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient
          id="ds-orbita-2"
          x1="380"
          y1="90"
          x2="20"
          y2="320"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#7FD7C9" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#7FD7C9" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7FD7C9" stopOpacity="0.1" />
        </linearGradient>

        <filter id="ds-sombra" x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#00322F" floodOpacity="0.38" />
        </filter>
        <filter id="ds-sombra-escudo" x="-60%" y="-60%" width="220%" height="230%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#00322F" floodOpacity="0.45" />
        </filter>
        <filter id="ds-suave" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="ds-brillo" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>
      {/* ---------- Fondo: halo y círculos translúcidos ---------- */}
      <circle cx="200" cy="196" r="158" fill="url(#ds-halo)" />
      <circle
        cx="200"
        cy="196"
        r="136"
        fill="none"
        stroke="#7FD7C9"
        strokeOpacity="0.4"
        strokeWidth="1.6"
      />
      <circle
        cx="200"
        cy="196"
        r="108"
        fill="#FFFFFF"
        fillOpacity="0.07"
        stroke="#FFFFFF"
        strokeOpacity="0.16"
        strokeWidth="1.2"
      />

      {/* ---------- Curvas orbitales ---------- */}
      <g>
        <ellipse
          cx="200"
          cy="200"
          rx="184"
          ry="72"
          transform="rotate(-17 200 200)"
          fill="none"
          stroke="url(#ds-orbita)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="164"
          ry="60"
          transform="rotate(26 200 200)"
          fill="none"
          stroke="url(#ds-orbita-2)"
          strokeWidth="2"
          strokeDasharray="9 15"
          strokeLinecap="round"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="146"
          ry="44"
          transform="rotate(86 200 200)"
          fill="none"
          stroke="#7FD7C9"
          strokeOpacity="0.4"
          strokeWidth="1.6"
        />
      </g>

      {/* ---------- Puntos luminosos y formas abstractas ---------- */}
      <g filter="url(#ds-brillo)">
        <circle cx="66" cy="128" r="5.5" fill="#7FD7C9" />
        <circle cx="336" cy="94" r="4.5" fill="#FFFFFF" />
        <circle cx="52" cy="286" r="4" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="348" cy="300" r="5" fill="#7FD7C9" />
        <circle cx="288" cy="52" r="3.6" fill="#7FD7C9" />
        <circle cx="118" cy="46" r="3" fill="#FFFFFF" fillOpacity="0.85" />
      </g>
      <g opacity="0.85">
        <rect
          x="330"
          y="172"
          width="17"
          height="17"
          rx="5"
          transform="rotate(24 338 180)"
          fill="#7FD7C9"
          fillOpacity="0.6"
        />
        <rect
          x="48"
          y="196"
          width="13"
          height="13"
          rx="4"
          transform="rotate(-18 54 202)"
          fill="#FFFFFF"
          fillOpacity="0.35"
        />
        <path
          d="M324 44 L327.5 54.5 L338 58 L327.5 61.5 L324 72 L320.5 61.5 L310 58 L320.5 54.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.8"
        />
        <path
          d="M74 336 L77 344.5 L85.5 347.5 L77 350.5 L74 359 L71 350.5 L62.5 347.5 L71 344.5 Z"
          fill="#7FD7C9"
          fillOpacity="0.9"
        />
      </g>

      {/* ---------- Sombra proyectada del diente ---------- */}
      <ellipse
        cx="200"
        cy="330"
        rx="94"
        ry="15"
        fill="#00322F"
        fillOpacity="0.4"
        filter="url(#ds-suave)"
      />
      {/* ---------- Diente tridimensional ---------- */}
      <g filter="url(#ds-sombra)">
        <path
          d="M200 66 C176 66 162 56 138 58 C106 61 84 84 84 122 C84 158 96 184 104 214 C110 238 111 268 118 290 C124 308 140 312 148 296 C156 280 158 250 166 230 C173 212 184 206 200 206 C216 206 227 212 234 230 C242 250 244 280 252 296 C260 312 276 308 282 290 C289 268 290 238 296 214 C304 184 316 158 316 122 C316 84 294 61 262 58 C238 56 224 66 200 66 Z"
          fill="url(#ds-diente)"
          stroke="#FFFFFF"
          strokeOpacity="0.65"
          strokeWidth="2"
        />
        {/* Sombra interna inferior: refuerza el volumen */}
        <path
          d="M200 66 C176 66 162 56 138 58 C106 61 84 84 84 122 C84 158 96 184 104 214 C110 238 111 268 118 290 C124 308 140 312 148 296 C156 280 158 250 166 230 C173 212 184 206 200 206 C216 206 227 212 234 230 C242 250 244 280 252 296 C260 312 276 308 282 290 C289 268 290 238 296 214 C304 184 316 158 316 122 C316 84 294 61 262 58 C238 56 224 66 200 66 Z"
          fill="url(#ds-diente-sombra)"
        />
        {/* Brillo especular superior izquierdo */}
        <ellipse
          cx="142"
          cy="112"
          rx="34"
          ry="21"
          transform="rotate(-30 142 112)"
          fill="#FFFFFF"
          fillOpacity="0.85"
          filter="url(#ds-suave)"
        />
        {/* Destello del esmalte */}
        <path
          d="M120 96 C126 82 138 72 152 68"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* ---------- Escudo turquesa con marca de verificación ---------- */}
      <g>
        <circle cx="292" cy="262" r="64" fill="#FFFFFF" fillOpacity="0.18" />
        <g filter="url(#ds-sombra-escudo)">
          <path
            d="M292 194 L346 215 V259 C346 299 322 326 292 338 C262 326 238 299 238 259 V215 Z"
            fill="url(#ds-escudo)"
            stroke="#FFFFFF"
            strokeOpacity="0.85"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Luz lateral del escudo */}
          <path
            d="M292 194 L346 215 V259 C346 299 322 326 292 338 Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />
          {/* Marca de verificación */}
          <path
            d="M266 263 L285 282 L320 241"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* ---------- Destellos finales ---------- */}
      <g filter="url(#ds-brillo)">
        <circle cx="356" cy="238" r="4" fill="#FFFFFF" />
        <circle cx="40" cy="238" r="3.4" fill="#7FD7C9" />
      </g>
    </svg>
  );
}
