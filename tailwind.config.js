/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950:'#F7F8FA',
          900:'#FFFFFF',
          850:'#FFFFFF',
          800:'#F1F5F9',
          700:'#E2E8F0',
          600:'#CBD5E1',
          500:'#64748B',
        },
        brand: {DEFAULT:'#E31B23',300:'#F04444'},
        gold: {DEFAULT:'#C88719',300:'#EAB308'},
        coral:'#EF4444', sky:'#0284C7', emerald:'#059669', mist:'#64748B', cream:'#111827',
      },
      fontFamily: {
        display: ['Fraunces','serif'],
        sans: ['Outfit','sans-serif'],
      },
      boxShadow: {
        card:'0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)',
        lift:'0 16px 48px rgba(0,0,0,.08)',
        premium:'0 1px 2px rgba(0,0,0,.06), 0 12px 32px rgba(0,0,0,.12)',
        glow:'0 0 0 1px rgba(220,38,38,.08), 0 8px 32px rgba(220,38,38,.06)',
      },
      keyframes: {
        rise:{'0%':{opacity:0,transform:'translateY(14px)'},'100%':{opacity:1,transform:'translateY(0)'}},
        riseStaggered:{'0%':{opacity:0,transform:'translateY(20px)'},'100%':{opacity:1,transform:'translateY(0)'}},
        pulseDot:{'0%,100%':{boxShadow:'0 0 0 0 rgba(220,38,38,.4)'},'50%':{boxShadow:'0 0 0 6px rgba(220,38,38,0)'}},
        pulseRing:{'0%,100%':{boxShadow:'0 0 0 0 rgba(59,130,246,.4)'},'50%':{boxShadow:'0 0 0 8px rgba(59,130,246,0)'}},
        shine:{'0%':{transform:'translateX(-100%)'},'100%':{transform:'translateX(200%)'}},
      },
      animation: {
        rise:'rise .55s cubic-bezier(.22,1,.36,1) both',
        'rise-delayed':'riseStaggered .6s cubic-bezier(.22,1,.36,1) .15s both',
        pulseDot:'pulseDot 2s infinite',
        pulseRing:'pulseRing 2.5s infinite',
        shine:'shine 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
