package requests

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
)

func DecodeBody[T any](body io.ReadCloser) (T, error) {
	var req T
	if err := json.NewDecoder(body).Decode(&req); err != nil {
		return req, err
	}
	return req, nil
}

type AnalyzeRequest struct {
	Resume string `json:"resume"`
	JD     string `json:"jd"`
}


func (r *AnalyzeRequest) Validate() error {
	var missingFields []string
	if r.Resume == "" {
		missingFields = append(missingFields, "resume")
	}
	if r.JD == "" {
		
		missingFields = append(missingFields, "jd")
	}
	if len(missingFields) > 0 {
		return errors.New("missing required fields: " + strings.Join(missingFields, ", "))
	}
	return nil
}