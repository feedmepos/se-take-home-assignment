.PHONY: deploy dev build preview

dev:
	cd pos && bun run dev

build:
	pnpm --filter pos build
	rm -rf .vercel/output
	cp -r pos/.vercel/output .vercel/output

preview:
	cd pos/.vercel/output && npx srvx --static ../static ./functions/__server.func/index.mjs

deploy: build
	vercel deploy --prod --prebuilt
