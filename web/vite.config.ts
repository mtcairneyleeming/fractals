import { defineConfig } from "vite"

// The page lives in web/index.html (root), the build goes to dist/, which the server serves.
export default defineConfig({
    root: "web",
    base: "./",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        sourcemap: false,
    },
    worker: { format: "es" },
    server: {
        // `cargo run` in server/ on its default port; `npm run dev` forwards the API there.
        proxy: { "/api": "http://127.0.0.1:8000" },
    },
})
