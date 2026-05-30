# ---- Build stage ----
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ---- Run stage ----
FROM alpine:3.20

WORKDIR /app

# TLS roots so the backend can call the hosted LLM over HTTPS.
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server .

# Production mode skips loading .env; provide config via real env vars instead.
ENV APP_STAGE=production
ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
