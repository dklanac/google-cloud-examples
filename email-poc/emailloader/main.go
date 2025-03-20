package main

import (
	"bufio"
	"bytes"
	"context"
	"emailloader/pkg/gcs"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"cloud.google.com/go/storage"
	"github.com/jhillyerd/enmime"
)

var (
	fileWriter    *bufio.Writer
	file          *os.File
	writeMutex    sync.Mutex
	failureLogger *log.Logger
)

// Initialize the failure logger to log errors to failures.log
func initFailureLogger() error {
	// Open the failures.log file for appending
	file, err := os.OpenFile("failures.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		return fmt.Errorf("failed to open failures.log: %v", err)
	}

	// Create a logger that writes to the file
	failureLogger = log.New(file, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
	return nil
}

// Download all .eml files in parallel using a worker pool
func downloadAllEMLFiles(ctx context.Context, client *storage.Client, bucketName string, emlFiles []string, numWorkers, batchSize int) error {
	var wg sync.WaitGroup
	fileChan := make(chan []string, numWorkers)

	// Start workers to download files
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for batch := range fileChan {
				for _, fileName := range batch {
					// Download the file to local disk
					if err := gcs.DownloadEMLFile(ctx, client, bucketName, fileName); err != nil {
						log.Printf("Error downloading file %s: %v", fileName, err)
						continue
					}

					// Log completed download
					log.Printf("Completed download of file: %s", fileName)
				}
			}
		}()
	}

	// Send files to workers
	for i := 0; i < len(emlFiles); i += batchSize {
		end := i + batchSize
		if end > len(emlFiles) {
			end = len(emlFiles)
		}
		fileChan <- emlFiles[i:end]
	}

	// for _, file := range emlFiles {
	// 	fileChan <- file
	// }
	close(fileChan)

	// Wait for all workers to finish
	wg.Wait()
	return nil
}

// Process a single local .eml file: parse and handle attachments
func processLocalEMLFile(localFilePath string) error {
	// Open the local .eml file
	file, err := os.Open(localFilePath)
	if err != nil {
		failureLogger.Printf("Failed to open local file %s: %v", localFilePath, err)
		return fmt.Errorf("failed to open local file %s: %v", localFilePath, err)
	}
	defer file.Close()

	// Read the file content
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		failureLogger.Printf("Failed to read local file %s: %v", localFilePath, err)
		return fmt.Errorf("failed to read local file %s: %v", localFilePath, err)
	}

	// Parse the .eml file
	env, err := enmime.ReadEnvelope(&buf)
	if err != nil {
		failureLogger.Printf("Failed to parse local .eml file %s: %v", localFilePath, err)
		return fmt.Errorf("failed to parse local .eml file %s: %v", localFilePath, err)
	}

	// Process headers, body, and attachments
	if err := processEmailContent(env, localFilePath); err != nil {
		failureLogger.Printf("Failed to process email content for local file %s: %v", localFilePath, err)
		return err
	}

	return nil
}

// Process the email content, including headers, body, and attachments
func processEmailContent(env *enmime.Envelope, localFilePath string) error {
	// Create a JSON structure for the email
	emailData := map[string]interface{}{
		"subject":     env.GetHeader("Subject"),
		"from":        env.GetHeader("From"),
		"to":          env.GetHeader("To"),
		"cc":          env.GetHeader("Cc"), // Capture CC header
		"date":        env.GetHeader("Date"),
		"text":        env.Text,
		"html":        env.HTML,
		"attachments": []string{},
		"x_headers":   map[string]string{}, // Capture X-headers
	}

	// Extract the base email file name
	baseFileName := filepath.Base(localFilePath)

	// Use that file name to create a subdirectory with the same name
	attachmentDir := filepath.Join("./attachments", baseFileName)
	if err := os.MkdirAll(attachmentDir, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create attachment directory %s: %v", attachmentDir, err)
	}

	// Capture X-headers
	xHeaders := make(map[string]string)
	for key, values := range env.Root.Header {
		if strings.HasPrefix(key, "X-") {
			xHeaders[key] = strings.Join(values, ", ")
		}
	}

	xHeadersJSON, err := json.Marshal(xHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal X-headers to JSON: %v", err)
	}

	emailData["x_headers"] = string(xHeadersJSON)

	// Process attachments
	for _, att := range env.Attachments {
		attachmentPath := filepath.Join(attachmentDir, att.FileName)
		if err := saveAttachmentToDisk(attachmentPath, att.Content); err != nil {
			return fmt.Errorf("failed to save attachment %s: %v", att.FileName, err)
		}
		emailData["attachments"] = append(emailData["attachments"].([]string), attachmentPath)
	}

	// Write the email data to the ND-JSON file
	return writeEmailToJSON(emailData)
}

// Save an attachment to the local disk
func saveAttachmentToDisk(attachmentPath string, content []byte) error {
	// Create the local file for the attachment
	localFile, err := os.Create(attachmentPath)
	if err != nil {
		return fmt.Errorf("failed to create local attachment file %s: %v", attachmentPath, err)
	}
	defer localFile.Close()

	// Write the attachment content to the local file
	if _, err := localFile.Write(content); err != nil {
		return fmt.Errorf("failed to write attachment to %s: %v", attachmentPath, err)
	}

	return nil
}

// Initialize the file writer once
func initFileWriter() error {
	var err error
	file, err = os.OpenFile("emails.json", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		return fmt.Errorf("failed to open emails.json: %v", err)
	}
	fileWriter = bufio.NewWriter(file)
	return nil
}

// Flush and close the file writer when done
func closeFileWriter() error {
	writeMutex.Lock()
	defer writeMutex.Unlock()

	if err := fileWriter.Flush(); err != nil {
		return fmt.Errorf("failed to flush file writer: %v", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("failed to close file: %v", err)
	}
	return nil
}

// Write the email data to the ND-JSON file
func writeEmailToJSON(emailData map[string]interface{}) error {
	writeMutex.Lock()
	defer writeMutex.Unlock()

	// Convert email data to JSON
	emailJSON, err := json.Marshal(emailData)
	if err != nil {
		return fmt.Errorf("failed to marshal email data: %v", err)
	}

	// Append the JSON to the file
	if _, err := file.Write(append(emailJSON, '\n')); err != nil {
		return fmt.Errorf("failed to write email data to emails.json: %v", err)
	}

	return nil
}

// Process downloaded .eml files in parallel using a worker pool
func processDownloadedEMLFiles(emlFiles []string, numWorkers int) error {
	var wg sync.WaitGroup
	fileChan := make(chan string, numWorkers)
	// Start workers to process files
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for fileName := range fileChan {
				// Extract the base file name (e.g., "11812428.eml") from the full GCS path
				baseFileName := filepath.Base(fileName)

				// Log starting processing
				// log.Printf("Starting processing of file: %s", baseFileName)

				// Create the local file path in the email_staging directory
				localFilePath := fmt.Sprintf("./email_staging/%s", baseFileName)

				// Process the local file
				if err := processLocalEMLFile(localFilePath); err != nil {
					log.Printf("Error processing file %s: %v", fileName, err)
					continue
				}

				// Log completed processing
				log.Printf("Completed processing of file: %s", baseFileName)
			}
		}()
	}

	// Send files to workers
	for _, file := range emlFiles {
		fileChan <- file
	}
	close(fileChan)

	// Wait for all workers to finish
	wg.Wait()
	return nil
}

// Upload the processed emails.json and attachments to GCS
// func uploadProcessedContent(ctx context.Context, client *storage.Client, bucketName string) error {
// 	// Upload emails.json to GCS
// 	emailsFile, err := os.Open("emails.json")
// 	if err != nil {
// 		return fmt.Errorf("failed to open emails.json: %v", err)
// 	}
// 	defer emailsFile.Close()

// 	wc := client.Bucket(bucketName).Object("processed/emails.json").NewWriter(ctx)
// 	defer wc.Close()

// 	if _, err := io.Copy(wc, emailsFile); err != nil {
// 		return fmt.Errorf("failed to upload emails.json to GCS: %v", err)
// 	}

// 	// Upload attachments to GCS
// 	attachmentsDir := "./attachments"
// 	err = filepath.Walk(attachmentsDir, func(path string, info os.FileInfo, err error) error {
// 		if err != nil {
// 			return err
// 		}
// 		if !info.IsDir() {
// 			relPath, err := filepath.Rel(attachmentsDir, path)
// 			if err != nil {
// 				return err
// 			}

// 			// Open the local attachment file
// 			file, err := os.Open(path)
// 			if err != nil {
// 				return fmt.Errorf("failed to open attachment file %s: %v", path, err)
// 			}
// 			defer file.Close()

// 			// Upload the attachment to GCS
// 			wc := client.Bucket(bucketName).Object(fmt.Sprintf("processed/attachments/%s", relPath)).NewWriter(ctx)
// 			defer wc.Close()

// 			if _, err := io.Copy(wc, file); err != nil {
// 				return fmt.Errorf("failed to upload attachment %s to GCS: %v", relPath, err)
// 			}
// 		}
// 		return nil
// 	})

// 	if err != nil {
// 		return fmt.Errorf("failed to upload attachments to GCS: %v", err)
// 	}

// 	return nil
// }

// Main function
func main() {
	// Define a command-line flag for the bucket name
	bucketName := flag.String("bucket", "", "The name of the GCS bucket containing the .eml files")
	flag.Parse()

	// Ensure the bucket name is provided
	if *bucketName == "" {
		log.Fatalf("You must specify a bucket name using the -bucket flag")
	}

	ctx := context.Background()

	// Initialize the failure logger
	if err := initFailureLogger(); err != nil {
		log.Fatalf("Failed to initialize failure logger: %v", err)
	}

	// Initialize the GCS client
	client, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatalf("Failed to create GCS client: %v", err)
	}
	defer client.Close()

	// Initialize the file writer for emails.json
	if err := initFileWriter(); err != nil {
		log.Fatalf("Failed to initialize the file writer: %v", err)
	}

	// Ensure that the file writer eventually gets closed at end of main
	defer func() {
		if err := closeFileWriter(); err != nil {
			log.Fatalf("Failed to close the file writer: %v", err)
		}
	}()

	// List all .eml files in the bucket
	emlFiles, err := gcs.ListEMLFiles(ctx, client, *bucketName)
	if err != nil {
		log.Fatalf("Failed to list .eml files: %v", err)
	}

	// Dynamically set the number of workers based on the number of CPU cores
	numCPUs := runtime.NumCPU()
	numWorkers := numCPUs * 4
	batchSize := 10
	log.Printf("Found %d CPUs", numCPUs)
	log.Printf("Using %d workers for parallel processing", numWorkers)

	// Phase 1: Download all .eml files in parallel
	log.Println("Starting to download all .eml files...")
	if err := downloadAllEMLFiles(ctx, client, *bucketName, emlFiles, numWorkers, batchSize); err != nil {
		log.Fatalf("Failed to download .eml files: %v", err)
	}
	log.Println("All .eml files downloaded successfully.")

	// Phase 2: Process the downloaded .eml files in parallel
	log.Println("Starting to process downloaded .eml files...")
	if err := processDownloadedEMLFiles(emlFiles, numWorkers); err != nil {
		log.Fatalf("Failed to process .eml files: %v", err)
	}
	log.Println("All .eml files processed successfully.")

	// After processing, upload the emails.json and attachments to GCS
	// log.Println("Uploading processed content to GCS...")
	// if err := uploadProcessedContent(ctx, client, *bucketName); err != nil {
	// 	log.Fatalf("Failed to upload processed content to GCS: %v", err)
	// }
	// log.Println("All processed content uploaded successfully.")
}
