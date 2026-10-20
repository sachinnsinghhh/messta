// defineConfig gives autocomplete/validation for Vite's config options
import { defineConfig } from "vite";

// Official plugin so Vite understands JSX/React syntax
import react from "@vitejs/plugin-react";

// Plugin that wires Tailwind into Vite's build pipeline
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});



//import react from '@vitejs/plugin-react'
//import { defineConfig } from 'vite'

// https://vite.dev/config/
//export default defineConfig({
 // plugins: [react()],
//})
