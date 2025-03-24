package email

import (
	"bytes"
	"fmt"
	"io"
	"os"

	"github.com/jhillyerd/enmime"
)

// Process a single local .eml file: parse and handle attachments
func ParseEMLFile(localFilePath string) (*enmime.Envelope, error) {
	// Open the local .eml file
	file, err := os.Open(localFilePath)
	if err != nil {
		return fmt.Errorf("failed to open local file %s: %v", localFilePath, err)
	}
	defer file.Close()

	// Read the file content
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		return fmt.Errorf("failed to read local file %s: %v", localFilePath, err)
	}

	// Parse the .eml file
	env, err := enmime.ReadEnvelope(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to parse local .eml file %s: %v", localFilePath, err)
	}

	return env, nil
}
