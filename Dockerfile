# Stage 1: Build Material 3 Expressive Web App & Offline PWA
FROM node:24-alpine AS web-builder
WORKDIR /src/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN mkdir -p /src/internal/ui/dist && npm run build

# Stage 2: Build Pure-Go Static Single Binary (CGO_ENABLED=0)
FROM golang:1.24-alpine AS go-builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
COPY --from=web-builder /src/internal/ui/dist ./internal/ui/dist
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/autofit ./cmd/autofit

# Stage 3: Minimal Distroless Runtime (<35 MB total image)
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=go-builder /out/autofit /app/autofit
ENV AUTOFIT_ADDR=":8080"
ENV AUTOFIT_DB_PATH="/data/autofit.db"
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/autofit"]
CMD ["serve"]
