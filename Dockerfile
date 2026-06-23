# Deprecated — deploy with Cloudflare Workers instead:
#   pnpm db:migrate:remote && pnpm deploy
FROM alpine:3.20
RUN echo "This project deploys to Cloudflare Workers. Use: pnpm deploy"
CMD exit 1
