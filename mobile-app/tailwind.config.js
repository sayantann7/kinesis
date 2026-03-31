/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrainsMono_400Regular'],
        'mono-light': ['JetBrainsMono_300Light'],
        'mono-medium': ['JetBrainsMono_500Medium'],
        'mono-bold': ['JetBrainsMono_700Bold'],
        // Fallback for font-heading if we don't have Cabinet Grotesk yet
        heading: ['JetBrainsMono_700Bold'],
      }
    },
  },
  plugins: [],
}
