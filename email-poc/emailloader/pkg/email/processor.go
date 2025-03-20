package email

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jhillyerd/enmime"
)

// Process the email content, including headers, body, and attachments
func ProcessEmailContent(env *enmime.Envelope, localFilePath string) error {
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

// Process a single local .eml file: parse and handle attachments
func ProcessLocalEMLFile(localFilePath string) error {
	// Parse the .eml file
	env, err := ParseEMLFile(localFilePath)
	if err != nil {
		failureLogger.Printf(err)
		return err
	}

	// Process headers, body, and attachments
	if err := ProcessEmailContent(env, localFilePath); err != nil {
		failureLogger.Printf("Failed to process email content for local file %s: %v", localFilePath, err)
		return err
	}

	return nil
}
