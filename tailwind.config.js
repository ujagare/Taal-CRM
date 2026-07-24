/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950:'#070707',
          900:'#111113',
          850:'#19191D',
          800:'#202026',
          700:'#2D2E36',
          600:'#3F414B',
          500:'#70737F',
        },
        brand: {DEFAULT:'#DC2626',300:'#F87171'},
        gold: {DEFAULT:'#F59E0B',300:'#FBBF24'},
        coral:'#EF4444', sky:'#38BDF8', emerald:'#34D399', mist:'#A1A1AA', cream:'#F8FAFC',
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
