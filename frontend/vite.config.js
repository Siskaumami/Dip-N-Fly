import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  base: "/Dip-N-Fly/", // nama repo GitHub kamu
})
