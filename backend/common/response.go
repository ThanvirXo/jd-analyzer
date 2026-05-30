package common

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Status  string        `json:"-"`
	Message *string       `json:"message"`
	Data    *any          `json:"data,omitempty"`
	Meta    *ResponseMeta `json:"meta,omitempty"`
}

type ResponseMeta struct {
	CurrentPage int `json:"current_page"`
	LastPage    int `json:"last_page"`
	PerPage     int `json:"per_page"`
	Total       int `json:"total"`
}

// ResponseType is an int64 with two possible values. SUCCESS and ERROR.
// Since golang has nothing called enums, we have to make do with manually
// Build and convert it into a string that can be sent to Response.Status
type ResponseType int64

const (
	SUCCESS ResponseType = iota
	ERROR
	NOT_FOUND
	SERVER_ERROR
	UNAUTHORIZED
	UNPROCESSABLE_ENTITY
	FORBIDDEN
)

// Build is responsible to convert ResponseType which is of type int64 into
// a string which can be passed along to Response.Status
func (t ResponseType) Build() *Response {
	switch t {
	case SUCCESS:
		return &Response{Status: "SUCCESS"}
	case ERROR:
		return &Response{Status: "ERROR"}
	case UNAUTHORIZED:
		return &Response{Status: "UNAUTHORIZED"}
	case SERVER_ERROR:
		return &Response{Status: "SERVER_ERROR"}
	case NOT_FOUND:
		return &Response{Status: "NOT_FOUND"}
	case UNPROCESSABLE_ENTITY:
		return &Response{Status: "UNPROCESSABLE_ENTITY"}
	case FORBIDDEN:
		return &Response{Status: "FORBIDDEN"}
	default:
		return &Response{Status: "Unknown"}
	}
}

// NewResponse is the constructor for the whole Response builder.
// It takes minimal required values and builds the most minimal
// Response struct that can be sent to client
func NewResponse(status ResponseType, message string) (res *Response) {
	res = status.Build()
	res.Message = &message

	return res
}

// SetData sets Response.Data
func (r *Response) SetData(data interface{}) *Response {
	r.Data = &data

	return r
}

// SetPagination sets pagination data. Maybe you somehow figured
// out to properly paginate? Good luck, have fun this :)
func (r *Response) SetMeta(pagination ResponseMeta) *Response {
	r.Meta = &pagination

	return r
}

// Respond is the guy who takes out the whole Response struct,
// assumes you have set all required data into it, marshals the
// whole thing into JSON and pushes it to client.
//
// It will set content-type of the response, set the header.
//
// This will be the last step in response building. Thus, it's the
// only method that can communicate with http.ResponseWriter
func (r *Response) Respond(ctx *gin.Context) {
	var code int = 200

	switch r.Status {
	case "SUCCESS":
		code = http.StatusOK
	case "ERROR":
		code = http.StatusBadRequest
	case "UNAUTHORIZED":
		code = http.StatusUnauthorized
	case "UNPROCESSABLE_ENTITY":
		code=http.StatusUnprocessableEntity
	case "SERVER_ERROR":
		code = http.StatusInternalServerError
	case "NOT_FOUND":
		code = http.StatusNotFound
	case "FORBIDDEN":
		code = http.StatusForbidden
	}

	ctx.JSON(code, r)
}
