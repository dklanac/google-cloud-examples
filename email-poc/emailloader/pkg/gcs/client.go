package gcs

import (
	"context"

	"cloud.google.com/go/storage"
)

// initializes a new storage client
func NewClient(ctx context.Context) (*storage.Client, error) {
	return storage.NewClient(ctx)
}
