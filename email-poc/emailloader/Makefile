all: build

build:
	echo "Building..."
	if [ ! -d "dist" ]; then mkdir dist; fi
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags netgo -ldflags '-extldflags "-static"' -o dist/email_loader main.go
