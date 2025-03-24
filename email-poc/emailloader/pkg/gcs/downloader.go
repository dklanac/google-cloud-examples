package gcs

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
)

// List all .eml files in the GCS bucket, including nested directories
func ListEMLFiles(ctx context.Context, client *storage.Client, bucketName string) ([]string, error) {
	var emlFiles []string
	it := client.Bucket(bucketName).Objects(ctx, &storage.Query{
		Prefix: "", // Start from the root of the bucket
	})

	fmt.Println("Starting to gather EML files...")

	for {
		objAttrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		// Check if the file has a .eml extension
		if filepath.Ext(objAttrs.Name) == ".eml" {
			emlFiles = append(emlFiles, objAttrs.Name)
		}
	}

	fmt.Println("Finished gathering EML files...")

	return emlFiles, nil
}

// Download a .eml file from GCS to the local disk
func DownloadEMLFile(ctx context.Context, client *storage.Client, bucketName, fileName string) error {
	// Ensure the email_staging directory exists
	if err := os.MkdirAll("./email_staging", os.ModePerm); err != nil {
		return fmt.Errorf("failed to create email_staging directory: %v", err)
	}

	// Extract the base file name (e.g., "11812428.eml") from the full GCS path
	baseFileName := filepath.Base(fileName)

	// Create the local file path in the email_staging directory
	localFilePath := fmt.Sprintf("./email_staging/%s", baseFileName)

	// Create the local file
	localFile, err := os.Create(localFilePath)
	if err != nil {
		return fmt.Errorf("failed to create local file %s: %v", localFilePath, err)
	}
	defer localFile.Close()

	// Download the .eml file from GCS
	rc, err := client.Bucket(bucketName).Object(fileName).NewReader(ctx)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %v", fileName, err)
	}
	defer rc.Close()

	// Use a buffered writer for disk I/O
	bufWriter := bufio.NewWriter(localFile)
	if _, err := io.Copy(bufWriter, rc); err != nil {
		return fmt.Errorf("failed to copy the file %s to local disk: %v", fileName, err)
	}

	// Flush the buffer to ensure all data is written to disk
	if err := bufWriter.Flush(); err != nil {
		return fmt.Errorf("failed to flush buffer for file %s: %v", fileName, err)
	}

	return nil
}
